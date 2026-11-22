import { hashPassword, JwtClaims } from "./crypto";
import { pushRealtimeEvent } from "./realtime";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

export interface OpsEnv {
  DB: D1Database;
  EDU_KV: KVNamespace;
  REALTIME_HUB?: DurableObjectNamespace;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
}

function isAdminRole(role?: string): boolean {
  return role === "super_admin" || role === "content_admin";
}

// =========================================================================
// #10. CÔNG THỨC TÍNH ĐIỂM UY TÍN GIÁO VIÊN & XẾP HẠNG GIÁO ÁN CHUẨN
// =========================================================================
export function computeTeacherReputation(m: {
  is_verified: boolean;
  post_count: number;
  likes_received: number;
  clones_received: number;
  follower_count: number;
  avg_rating: number;
  review_count: number;
  safety_penalties?: number;
}) {
  const raw =
    (m.is_verified ? 100 : 0) +
    m.post_count * 8 +
    m.likes_received * 3 +
    m.clones_received * 10 +
    m.follower_count * 5 +
    Math.round(m.avg_rating * m.review_count * 12) -
    (m.safety_penalties || 0) * 50;

  const score = Math.max(0, raw);
  if (score >= 300) {
    return { score, tier: "ambassador", label: "Đại sứ Giáo dục", color: "amber" };
  }
  if (score >= 150) {
    return { score, tier: "distinguished", label: "Giáo viên Tiêu biểu", color: "emerald" };
  }
  if (score >= 60) {
    return { score, tier: "trusted", label: "Giáo viên Tin cậy", color: "sky" };
  }
  return { score, tier: "community", label: "Giáo viên Cộng đồng", color: "slate" };
}

// =========================================================================
// #11. NHẬT KÝ QUẢN TRỊ (AUDIT LOG) & SAO LƯU DỮ LIỆU TỰ ĐỘNG
// =========================================================================
export async function recordAuditLog(
  db: D1Database,
  actor: { uid?: string; name?: string; email?: string; role?: string } | null,
  action: string,
  targetType: string,
  targetId: string,
  summary: string,
  metadata: Record<string, unknown> = {},
  request?: Request
): Promise<void> {
  try {
    const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ip = request?.headers.get("CF-Connecting-IP") || request?.headers.get("X-Forwarded-For") || "edge";
    await db
      .prepare(
        `INSERT INTO admin_audit_logs
         (id, actor_id, actor_name, actor_email, actor_role, action, target_type, target_id, summary, metadata_json, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        actor?.uid || "system",
        actor?.name || "Hệ thống Tự động",
        actor?.email || "system@owlie.edu",
        actor?.role || "system",
        action,
        targetType,
        targetId,
        summary.slice(0, 400),
        JSON.stringify(metadata).slice(0, 2000),
        ip.slice(0, 64)
      )
      .run();
  } catch {
    // Không làm gián đoạn luồng chính nếu audit gặp sự cố tạm thời
  }
}

export async function runFullDatabaseBackup(
  db: D1Database,
  kv: KVNamespace,
  triggerType: "manual" | "cron_daily",
  actorName: string
) {
  const backupId = `bkp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const backupCode = `OWLIE-BKP-${datePart}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const [
    usersRes,
    lessonsRes,
    examsRes,
    classroomsRes,
    coursesRes,
    certsRes,
    postsRes,
    linksRes,
    incidentsRes,
    settingsRes,
  ] = await Promise.all([
    db.prepare("SELECT id, email, full_name, role, tier, current_grade, school_name, is_active, created_at FROM users").all(),
    db.prepare("SELECT id, grade_id, subject_code, subject_name, textbook, chapter, title, slug, duration_min, updated_at FROM lessons").all(),
    db.prepare("SELECT id, grade_id, subject_code, subject_name, title, mode, duration_minutes, total_points, starts_at FROM exams").all(),
    db.prepare("SELECT * FROM classrooms").all(),
    db.prepare("SELECT id, teacher_id, teacher_name, title, subject_name, grade_label, status, created_at FROM courses").all(),
    db.prepare("SELECT * FROM course_certificates").all(),
    db.prepare("SELECT id, author_id, author_name, category, grade_id, subject_name, title, is_pinned, status, created_at FROM teacher_posts").all(),
    db.prepare("SELECT * FROM parent_student_links").all(),
    db.prepare("SELECT id, incident_code, category, severity, status, suspect_name, suspect_email, created_at FROM safety_incidents").all(),
    db.prepare("SELECT * FROM site_settings").all(),
  ]);

  const tablesSummary = {
    users: usersRes.results.length,
    lessons: lessonsRes.results.length,
    exams: examsRes.results.length,
    classrooms: classroomsRes.results.length,
    courses: coursesRes.results.length,
    course_certificates: certsRes.results.length,
    teacher_posts: postsRes.results.length,
    parent_student_links: linksRes.results.length,
    safety_incidents: incidentsRes.results.length,
  };

  const payload = {
    backup_code: backupCode,
    brand: "Owlie Edu",
    created_at: new Date().toISOString(),
    trigger_type: triggerType,
    actor_name: actorName,
    tables_summary: tablesSummary,
    data: {
      users: usersRes.results,
      lessons: lessonsRes.results,
      exams: examsRes.results,
      classrooms: classroomsRes.results,
      courses: coursesRes.results,
      course_certificates: certsRes.results,
      teacher_posts: postsRes.results,
      parent_student_links: linksRes.results,
      safety_incidents: incidentsRes.results,
      site_settings: settingsRes.results,
    },
  };

  const serialized = JSON.stringify(payload, null, 2);
  const sizeBytes = new TextEncoder().encode(serialized).byteLength;
  const kvKey = `backup:${backupId}`;

  // Lưu bản sao lưu trên KV với thời hạn 30 ngày (hoàn toàn miễn phí trong gói Free)
  await kv.put(kvKey, serialized, { expirationTtl: 30 * 86400 });

  await db
    .prepare(
      `INSERT INTO system_backups (id, backup_code, trigger_type, actor_name, tables_summary_json, size_bytes, kv_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(backupId, backupCode, triggerType, actorName, JSON.stringify(tablesSummary), sizeBytes, kvKey)
    .run();

  return {
    id: backupId,
    backup_code: backupCode,
    trigger_type: triggerType,
    actor_name: actorName,
    tables_summary: tablesSummary,
    size_bytes: sizeBytes,
    created_at: new Date().toISOString(),
  };
}

// =========================================================================
// ROUTER TỔNG HỢP #11, #12, #13
// =========================================================================
export async function handleAdminOpsAndPushRoutes(
  request: Request,
  env: OpsEnv,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonFn,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const db = env.DB;

  // -----------------------------------------------------------------------
  // 1. QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU QUA EMAIL (#12)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/auth/forgot-password" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return jsonRes({ error: "Vui lòng nhập địa chỉ Email hợp lệ." }, 400);
    }

    const user = await db
      .prepare("SELECT id, full_name, email FROM users WHERE LOWER(email) = ?")
      .bind(email)
      .first<{ id: string; full_name: string; email: string }>();

    if (!user) {
      return jsonRes({ error: "Không tìm thấy tài khoản nào đăng ký với Email này." }, 404);
    }

    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const code6 = String(100000 + (arr[0] % 900000));
    const token = crypto.randomUUID();
    const expiresIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db
      .prepare(
        `INSERT INTO password_reset_tokens (token, user_id, email, code_6, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(token, user.id, user.email, code6, expiresIso)
      .run();

    // Kiểm tra xem Admin đã gắn RESEND_API_KEY để gửi Email thật chưa
    const senderSetting = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'sender_email'")
      .first<{ value: string }>();
    const fromEmail = env.FROM_EMAIL || senderSetting?.value || "Owlie Edu <onboarding@resend.dev>";

    if (env.RESEND_API_KEY) {
      try {
        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [user.email],
            subject: `[Owlie Edu] Mã xác nhận đặt lại mật khẩu: ${code6}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
                <h2 style="color:#4f46e5;margin:0 0 12px">🦉 Owlie Edu — Khôi phục Mật khẩu</h2>
                <p>Xin chào <strong>${user.full_name}</strong>,</p>
                <p>Mã xác nhận 6 chữ số để đặt lại mật khẩu của bạn là:</p>
                <div style="font-size:32px;font-weight:900;letter-spacing:8px;color:#0f172a;background:#f1f5f9;padding:16px;text-align:center;border-radius:12px;margin:16px 0">${code6}</div>
                <p style="font-size:13px;color:#64748b">Mã có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
              </div>
            `,
          }),
        });
        if (mailRes.ok) {
          return jsonRes({
            ok: true,
            delivery_mode: "email_sent",
            message: `Đã gửi mã xác nhận 6 chữ số tới hộp thư ${user.email}. Vui lòng kiểm tra Email (kể cả mục Spam/Quảng cáo).`,
          });
        }
      } catch {
        // fallback bên dưới nếu Resend lỗi mạng tạm thời
      }
    }

    // Chế độ thử nghiệm khi chưa gắn RESEND_API_KEY (cho phép test trọn vẹn luồng khôi phục ngay lập tức)
    return jsonRes({
      ok: true,
      delivery_mode: "demo_preview",
      demo_code: code6,
      message: `Hệ thống đang ở chế độ chưa gắn khóa Resend Email. Mã xác nhận thử nghiệm 15 phút của bạn là: ${code6}`,
    });
  }

  if (path === "/api/v1/auth/reset-password" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      code?: string;
      new_password?: string;
    };
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const newPassword = body.new_password || "";

    if (!email || !code || newPassword.length < 6) {
      return jsonRes({ error: "Vui lòng nhập Email, mã 6 chữ số và mật khẩu mới (>= 6 ký tự)." }, 400);
    }

    const row = await db
      .prepare(
        `SELECT token, user_id, expires_at, used_at
         FROM password_reset_tokens
         WHERE LOWER(email) = ? AND code_6 = ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(email, code)
      .first<{ token: string; user_id: string; expires_at: string; used_at: string | null }>();

    if (!row) {
      return jsonRes({ error: "Mã xác nhận 6 chữ số không chính xác." }, 400);
    }
    if (row.used_at) {
      return jsonRes({ error: "Mã xác nhận này đã được sử dụng. Hãy yêu cầu mã mới." }, 400);
    }
    if (Date.parse(row.expires_at) < Date.now()) {
      return jsonRes({ error: "Mã xác nhận đã hết hạn (quá 15 phút). Hãy yêu cầu gửi lại mã." }, 400);
    }

    const newHash = await hashPassword(newPassword);
    await db.batch([
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, row.user_id),
      db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE token = ?").bind(row.token),
    ]);

    return jsonRes({
      ok: true,
      message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.",
    });
  }

  // -----------------------------------------------------------------------
  // 2. THÔNG BÁO ĐẨY ĐIỆN THOẠI & TRÌNH DUYỆT (PUSH NOTIFICATION #13)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/push/status" && method === "GET") {
    const totalRow = await db
      .prepare("SELECT COUNT(*) as cnt FROM push_subscriptions WHERE permission_status = 'granted'")
      .first<{ cnt: number }>();

    let myCount = 0;
    if (claims) {
      const meRow = await db
        .prepare("SELECT COUNT(*) as cnt FROM push_subscriptions WHERE user_id = ? AND permission_status = 'granted'")
        .bind(claims.uid)
        .first<{ cnt: number }>();
      myCount = Number(meRow?.cnt || 0);
    }
    return jsonRes({
      subscribed: myCount > 0,
      my_devices: myCount,
      total_subscribed_devices: Number(totalRow?.cnt || 0),
    });
  }

  if (path === "/api/v1/push/subscribe" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để bật Thông báo Đẩy." }, 401);
    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: string;
      device_label?: string;
      platform?: string;
    };
    const endpoint = (body.endpoint || `webpush://${claims.uid}/${Date.now()}`).slice(0, 500);
    const deviceLabel = (body.device_label || "Trình duyệt / Điện thoại").slice(0, 120);
    const platform = (body.platform || "web-pwa").slice(0, 40);
    const subId = `push-${claims.uid}-${platform}`;

    await db
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, device_label, platform, permission_status, updated_at)
         VALUES (?, ?, ?, ?, ?, 'granted', datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           endpoint = excluded.endpoint,
           device_label = excluded.device_label,
           permission_status = 'granted',
           updated_at = datetime('now')`
      )
      .bind(subId, claims.uid, endpoint, deviceLabel, platform)
      .run();

    return jsonRes({ ok: true, message: "Đã đăng ký nhận Thông báo Đẩy trên thiết bị này!" }, 201);
  }

  if (path === "/api/v1/push/subscribe" && method === "DELETE") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").bind(claims.uid).run();
    return jsonRes({ ok: true, message: "Đã tắt Thông báo Đẩy trên thiết bị của bạn." });
  }

  // Admin / Giáo viên phát sóng Thông báo Đẩy tức thì tới toàn hệ thống (Real-time Push Broadcast)
  if (path === "/api/v1/admin/push/broadcast" && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được phát sóng thông báo toàn hệ thống." }, 403);
    }
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      message?: string;
      link?: string;
    };
    const title = (body.title || "").trim().slice(0, 140);
    const message = (body.message || "").trim().slice(0, 400);
    const link = (body.link || "/").trim().slice(0, 200);
    if (!title || !message) {
      return jsonRes({ error: "Vui lòng nhập Tiêu đề và Nội dung thông báo." }, 400);
    }

    const users = await db.prepare("SELECT id FROM users WHERE is_active = 1 LIMIT 200").all<{ id: string }>();
    const stmts: D1PreparedStatement[] = [];
    for (const u of users.results) {
      const nid = `notif-bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      stmts.push(
        db
          .prepare("INSERT INTO user_notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'broadcast', ?, ?, ?)")
          .bind(nid, u.id, title, message, link)
      );
    }
    if (stmts.length > 0) {
      for (let i = 0; i < stmts.length; i += 40) {
        await db.batch(stmts.slice(i, i + 40));
      }
    }

    await pushRealtimeEvent(env.REALTIME_HUB, "social:feed", {
      type: "push_broadcast",
      title,
      message,
      link,
      sent_by: claims.name || claims.email,
      sent_at: new Date().toISOString(),
    });

    await recordAuditLog(
      db,
      claims,
      "push_broadcast",
      "system",
      "all_users",
      `Phát sóng Thông báo Đẩy tới ${users.results.length} tài khoản: "${title}"`,
      { link },
      request
    );

    return jsonRes({
      ok: true,
      recipients: users.results.length,
      message: `Đã phát sóng Thông báo Đẩy tới ${users.results.length} người dùng ngay lập tức!`,
    });
  }

  // -----------------------------------------------------------------------
  // 3. NHẬT KÝ QUẢN TRỊ (AUDIT LOG) & SAO LƯU DỮ LIỆU (#11)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/admin/audit-logs" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được xem Nhật ký Quản trị." }, 403);
    }
    const rows = await db
      .prepare("SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100")
      .all<Record<string, unknown>>();
    return jsonRes({ logs: rows.results });
  }

  if (path === "/api/v1/admin/backups" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được xem danh sách sao lưu." }, 403);
    }
    const rows = await db
      .prepare("SELECT * FROM system_backups ORDER BY created_at DESC LIMIT 30")
      .all<Record<string, unknown>>();
    const backups = rows.results.map((r) => {
      let tables: Record<string, number> = {};
      try {
        tables = JSON.parse(String(r.tables_summary_json || "{}"));
      } catch {
        // ignore
      }
      return {
        id: String(r.id),
        backup_code: String(r.backup_code),
        trigger_type: String(r.trigger_type),
        actor_name: String(r.actor_name),
        tables_summary: tables,
        size_bytes: Number(r.size_bytes || 0),
        created_at: String(r.created_at),
      };
    });
    return jsonRes({
      cron_schedule: "02:00 sáng hàng ngày (Tự động qua Cloudflare Cron Trigger — 0đ)",
      backups,
    });
  }

  if (path === "/api/v1/admin/backups/run" && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được chạy sao lưu dữ liệu." }, 403);
    }
    const backup = await runFullDatabaseBackup(db, env.EDU_KV, "manual", claims.name || claims.email);
    await recordAuditLog(
      db,
      claims,
      "run_backup",
      "system_backup",
      backup.backup_code,
      `Tạo bản sao lưu thủ công ${backup.backup_code} (${Math.round(backup.size_bytes / 1024)} KB)`,
      backup.tables_summary,
      request
    );
    return jsonRes({ ok: true, backup, message: `Đã sao lưu toàn bộ hệ thống thành công (${backup.backup_code})!` }, 201);
  }

  const dlBackupMatch = path.match(/^\/api\/v1\/admin\/backups\/([^/]+)\/download$/);
  if (dlBackupMatch && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được tải bản sao lưu." }, 403);
    }
    const bkpId = decodeURIComponent(dlBackupMatch[1]);
    const row = await db
      .prepare("SELECT backup_code, kv_key FROM system_backups WHERE id = ?")
      .bind(bkpId)
      .first<{ backup_code: string; kv_key: string }>();
    if (!row) return jsonRes({ error: "Không tìm thấy bản sao lưu này." }, 404);
    const content = await env.EDU_KV.get(row.kv_key);
    if (!content) {
      return jsonRes({ error: "Dữ liệu sao lưu này đã hết hạn lưu trữ 30 ngày trên KV." }, 404);
    }
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${row.backup_code}.json"`,
        ...corsHeaders,
      },
    });
  }

  // -----------------------------------------------------------------------
  // 4. CẤU HÌNH TÊN MIỀN RIÊNG, EMAIL QUÊN MẬT KHẨU & SEO (#12 & #14)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/admin/domain-email-config" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được xem cấu hình tên miền & email." }, 403);
    }
    const rows = await db.prepare("SELECT key, value, updated_by, updated_at FROM site_settings").all<{
      key: string;
      value: string;
      updated_by: string;
      updated_at: string;
    }>();
    const map = new Map(rows.results.map((r) => [r.key, r.value]));
    return jsonRes({
      custom_domain: map.get("custom_domain") || "owlie.vn",
      sender_email: map.get("sender_email") || "Owlie Edu <noreply@owlie.vn>",
      seo_title: map.get("seo_title") || "Owlie Edu — Học Phổ thông 1–12, Khóa học & Lập trình Miễn phí",
      seo_description:
        map.get("seo_description") ||
        "Nền tảng giáo dục mở miễn phí: 157+ bài giảng Lớp 1–12, Mạng Xã Hội Giáo Viên, Chứng chỉ QR, Học bạ Số & 8 ngôn ngữ lập trình.",
      current_worker_url: "https://owlie.eduk12-scale.workers.dev",
      resend_configured: Boolean(env.RESEND_API_KEY),
    });
  }

  if (path === "/api/v1/admin/domain-email-config" && method === "PATCH") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được cập nhật cấu hình." }, 403);
    }
    const body = (await request.json().catch(() => ({}))) as {
      custom_domain?: string;
      sender_email?: string;
      seo_title?: string;
      seo_description?: string;
    };
    const entries: [string, string][] = [];
    if (typeof body.custom_domain === "string") {
      entries.push(["custom_domain", body.custom_domain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").slice(0, 120)]);
    }
    if (typeof body.sender_email === "string") {
      entries.push(["sender_email", body.sender_email.trim().slice(0, 140)]);
    }
    if (typeof body.seo_title === "string") {
      entries.push(["seo_title", body.seo_title.trim().slice(0, 160)]);
    }
    if (typeof body.seo_description === "string") {
      entries.push(["seo_description", body.seo_description.trim().slice(0, 320)]);
    }

    if (entries.length > 0) {
      const actor = claims.name || claims.email;
      await db.batch(
        entries.map(([k, v]) =>
          db
            .prepare(
              `INSERT INTO site_settings (key, value, updated_by, updated_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
            )
            .bind(k, v, actor)
        )
      );
      await recordAuditLog(
        db,
        claims,
        "update_site_config",
        "site_settings",
        "domain_email_seo",
        `Cập nhật cấu hình Tên miền / Email / SEO (${entries.map(([k, v]) => `${k}=${v}`).join(", ")})`,
        Object.fromEntries(entries),
        request
      );
    }

    return jsonRes({ ok: true, message: "Đã lưu cấu hình Tên miền, Email & SEO thành công!" });
  }

  return null;
}
