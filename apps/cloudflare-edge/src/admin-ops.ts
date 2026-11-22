import { hashPassword, JwtClaims } from "./crypto";
import { pushRealtimeEvent } from "./realtime";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

export interface OpsEnv {
  DB: D1Database;
  EDU_KV: KVNamespace;
  REALTIME_HUB?: DurableObjectNamespace;
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  FROM_EMAIL?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFromHeader(fromRaw: string): { name: string; email: string } {
  const m = fromRaw.match(/^(.*)<([^>]+)>$/);
  if (m) {
    return { name: m[1].trim() || "Owlie Edu", email: m[2].trim() };
  }
  return { name: "Owlie Edu", email: fromRaw.trim() || "onboarding@resend.dev" };
}

async function sendTransactionalEmail(
  env: OpsEnv,
  fromRaw: string,
  toEmail: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; provider: "brevo" | "resend" | "none"; error?: string }> {
  const sender = parseFromHeader(fromRaw);

  // Ưu tiên 1: Brevo (Sendinblue) — 300 email/ngày miễn phí, gửi được từ Gmail cá nhân mà chưa cần mua tên miền riêng
  if (env.BREVO_API_KEY) {
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
        }),
      });
      if (r.ok) return { ok: true, provider: "brevo" };
      const errTxt = await r.text().catch(() => "");
      return { ok: false, provider: "brevo", error: `Brevo ${r.status}: ${errTxt.slice(0, 180)}` };
    } catch (e) {
      return { ok: false, provider: "brevo", error: e instanceof Error ? e.message : "Brevo network error" };
    }
  }

  // Ưu tiên 2: Resend — 3.000 email/tháng miễn phí, siêu nhanh & chuẩn deliverability
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromRaw,
          to: [toEmail],
          subject,
          html,
        }),
      });
      if (r.ok) return { ok: true, provider: "resend" };
      const errTxt = await r.text().catch(() => "");
      return { ok: false, provider: "resend", error: `Resend ${r.status}: ${errTxt.slice(0, 180)}` };
    } catch (e) {
      return { ok: false, provider: "resend", error: e instanceof Error ? e.message : "Resend network error" };
    }
  }

  return { ok: false, provider: "none", error: "Chưa gắn BREVO_API_KEY hoặc RESEND_API_KEY trên Cloudflare Worker." };
}

function buildCampaignHtml(params: {
  templateType: string;
  title: string;
  highlightBadge: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const accent =
    params.templateType === "discount_promo"
      ? { bg: "#e11d48", light: "#fff1f2", text: "#9f1239", label: "CHƯƠNG TRÌNH ƯU ĐÃI & HỌC BỔNG" }
      : params.templateType === "exam_event"
        ? { bg: "#059669", light: "#ecfdf5", text: "#065f46", label: "THÔNG BÁO KỲ THI & SỰ KIỆN" }
        : { bg: "#4f46e5", light: "#eef2ff", text: "#3730a3", label: "KHAI GIẢNG KHÓA HỌC MỚI" };

  const paragraphs = params.bodyText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#334155;">${escapeHtml(line)}</p>`)
    .join("");

  const safeUrl = params.ctaUrl.startsWith("http")
    ? params.ctaUrl
    : `https://owlie.eduk12-scale.workers.dev${params.ctaUrl.startsWith("/") ? "" : "/"}${params.ctaUrl}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
    <div style="background:${accent.bg};padding:28px 32px;color:#ffffff;">
      <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;opacity:0.9;">🦉 OWLIE EDU • ${accent.label}</div>
      <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;font-weight:900;">${escapeHtml(params.title)}</h1>
    </div>
    <div style="padding:28px 32px;">
      ${
        params.highlightBadge
          ? `<div style="margin:0 0 18px;padding:14px 18px;border-radius:14px;background:${accent.light};border:1px dashed ${accent.bg};color:${accent.text};font-size:14px;font-weight:800;text-align:center;">✨ ${escapeHtml(params.highlightBadge)}</div>`
          : ""
      }
      ${paragraphs}
      ${
        params.ctaLabel
          ? `<div style="margin:24px 0 8px;text-align:center;">
               <a href="${escapeHtml(safeUrl)}" style="display:inline-block;padding:13px 28px;border-radius:14px;background:${accent.bg};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;">${escapeHtml(params.ctaLabel)} →</a>
             </div>`
          : ""
      }
    </div>
    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
      <strong>Owlie Edu</strong> — Nền tảng Học Phổ thông 1–12, Khóa học 5★ &amp; Lập trình Cộng đồng<br/>
      <a href="https://owlie.eduk12-scale.workers.dev" style="color:#4f46e5;text-decoration:none;">owlie.eduk12-scale.workers.dev</a>
    </div>
  </div>
</body>
</html>`;
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

    const senderSetting = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'sender_email'")
      .first<{ value: string }>();
    const fromEmail = env.FROM_EMAIL || senderSetting?.value || "Owlie Edu <onboarding@resend.dev>";

    const resetHtml = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
        <h2 style="color:#4f46e5;margin:0 0 12px">🦉 Owlie Edu — Khôi phục Mật khẩu</h2>
        <p>Xin chào <strong>${escapeHtml(user.full_name)}</strong>,</p>
        <p>Mã xác nhận 6 chữ số để đặt lại mật khẩu của bạn là:</p>
        <div style="font-size:32px;font-weight:900;letter-spacing:8px;color:#0f172a;background:#f1f5f9;padding:16px;text-align:center;border-radius:12px;margin:16px 0">${code6}</div>
        <p style="font-size:13px;color:#64748b">Mã có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const mailAttempt = await sendTransactionalEmail(
      env,
      fromEmail,
      user.email,
      `[Owlie Edu] Mã xác nhận đặt lại mật khẩu: ${code6}`,
      resetHtml
    );
    if (mailAttempt.ok) {
      return jsonRes({
        ok: true,
        delivery_mode: "email_sent",
        provider: mailAttempt.provider,
        message: `Đã gửi mã xác nhận 6 chữ số tới hộp thư ${user.email}. Vui lòng kiểm tra Email (kể cả mục Spam/Quảng cáo).`,
      });
    }

    // Chế độ thử nghiệm khi chưa gắn BREVO_API_KEY / RESEND_API_KEY
    return jsonRes({
      ok: true,
      delivery_mode: "demo_preview",
      demo_code: code6,
      message: `Hệ thống chưa gắn khóa Host Mail (Brevo/Resend). Mã xác nhận thử nghiệm 15 phút của bạn là: ${code6}`,
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

  // -----------------------------------------------------------------------
  // 5. ĐĂNG KÝ NHẬN TIN KHAI GIẢNG & ƯU ĐÃI (NEWSLETTER CÔNG KHAI)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/newsletter/subscribe" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      full_name?: string;
      source?: string;
    };
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonRes({ error: "Vui lòng nhập địa chỉ Email hợp lệ." }, 400);
    }
    await db
      .prepare(
        `INSERT INTO newsletter_subscribers (email, full_name, source)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET full_name = CASE WHEN excluded.full_name != '' THEN excluded.full_name ELSE newsletter_subscribers.full_name END`
      )
      .bind(email, (body.full_name || "").trim().slice(0, 120), (body.source || "footer").slice(0, 40))
      .run();
    return jsonRes(
      { ok: true, message: "Đăng ký thành công! Bạn sẽ nhận sớm nhất thông báo khai giảng khóa học mới & ưu đãi học bổng." },
      201
    );
  }

  // -----------------------------------------------------------------------
  // 6. HOST MAIL & GỬI CHIẾN DỊCH EMAIL (KHAI GIẢNG / GIẢM GIÁ / SỰ KIỆN)
  // -----------------------------------------------------------------------
  if (path === "/api/v1/admin/mail/campaigns" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được truy cập Trung tâm Host Mail." }, 403);
    }

    const [
      senderRow,
      allUsersCnt,
      studentCnt,
      teacherCnt,
      parentCnt,
      newsletterCnt,
      campaignsRes,
      subscribersRes,
    ] = await Promise.all([
      db.prepare("SELECT value FROM site_settings WHERE key = 'sender_email'").first<{ value: string }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND role = 'student'").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND role = 'teacher'").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1 AND role = 'parent'").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM newsletter_subscribers").first<{ cnt: number }>(),
      db.prepare("SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT 30").all<Record<string, unknown>>(),
      db.prepare("SELECT email, full_name, source, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 30").all<Record<string, unknown>>(),
    ]);

    const activeProvider = env.BREVO_API_KEY
      ? "brevo"
      : env.RESEND_API_KEY
        ? "resend"
        : "none";

    return jsonRes({
      mail_host: {
        active_provider: activeProvider,
        brevo_configured: Boolean(env.BREVO_API_KEY),
        resend_configured: Boolean(env.RESEND_API_KEY),
        sender_email: env.FROM_EMAIL || senderRow?.value || "Owlie Edu <huynhanh4096it@gmail.com>",
      },
      audience_counts: {
        all: Number(allUsersCnt?.cnt || 0),
        student: Number(studentCnt?.cnt || 0),
        teacher: Number(teacherCnt?.cnt || 0),
        parent: Number(parentCnt?.cnt || 0),
        newsletter: Number(newsletterCnt?.cnt || 0),
      },
      campaigns: campaignsRes.results,
      subscribers: subscribersRes.results,
    });
  }

  if (path === "/api/v1/admin/mail/test" && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được gửi thử Email." }, 403);
    }
    const body = (await request.json().catch(() => ({}))) as { to_email?: string; sender_email?: string };
    const toEmail = (body.to_email || "").trim().toLowerCase();
    if (!toEmail || !toEmail.includes("@")) {
      return jsonRes({ error: "Vui lòng nhập Email người nhận thử nghiệm hợp lệ." }, 400);
    }
    const senderRow = await db.prepare("SELECT value FROM site_settings WHERE key = 'sender_email'").first<{ value: string }>();
    const fromEmail = (body.sender_email || "").trim() || env.FROM_EMAIL || senderRow?.value || "Owlie Edu <onboarding@resend.dev>";

    const html = buildCampaignHtml({
      templateType: "course_launch",
      title: "Kiểm tra kết nối Host Mail Owlie Edu thành công!",
      highlightBadge: "Hệ thống gửi Email Khai giảng & Ưu đãi đã sẵn sàng 100%",
      bodyText:
        "Xin chào Quản trị viên,\nĐây là thư kiểm tra gửi trực tiếp từ Host Mail của nền tảng Owlie Edu.\nTừ giờ bạn có thể gửi thông báo khai giảng khóa học mới, chương trình giảm giá học bổng và mã quên mật khẩu thẳng vào hộp thư học viên & phụ huynh!",
      ctaLabel: "Mở Trang Quản trị Owlie Edu",
      ctaUrl: "/quan-tri",
    });

    const sent = await sendTransactionalEmail(
      env,
      fromEmail,
      toEmail,
      "[Owlie Edu] Kiểm tra Host Mail gửi thành công!",
      html
    );

    if (!sent.ok) {
      return jsonRes({ ok: false, error: sent.error || "Chưa kết nối được Host Mail.", provider: sent.provider }, 400);
    }

    await recordAuditLog(
      db,
      claims,
      "test_mail_host",
      "mail_host",
      toEmail,
      `Gửi email thử nghiệm thành công tới ${toEmail} qua ${sent.provider}`,
      { provider: sent.provider },
      request
    );
    return jsonRes({
      ok: true,
      provider: sent.provider,
      message: `Đã gửi thành công email thử nghiệm tới ${toEmail} qua ${sent.provider.toUpperCase()}! Hãy kiểm tra hộp thư đến.`,
    });
  }

  if (path === "/api/v1/admin/mail/campaigns/send" && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được gửi chiến dịch Email." }, 403);
    }
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      subject?: string;
      audience_role?: "all" | "student" | "teacher" | "parent" | "newsletter" | "custom";
      custom_emails?: string;
      template_type?: "course_launch" | "discount_promo" | "exam_event";
      highlight_badge?: string;
      body_text?: string;
      cta_label?: string;
      cta_url?: string;
      sender_email?: string;
    };

    const title = (body.title || "").trim().slice(0, 160);
    const subject = (body.subject || title).trim().slice(0, 180);
    const bodyText = (body.body_text || "").trim().slice(0, 4000);
    const audience = body.audience_role || "all";
    const templateType = body.template_type || "course_launch";
    const highlightBadge = (body.highlight_badge || "").trim().slice(0, 180);
    const ctaLabel = (body.cta_label || "Khám phá ngay").trim().slice(0, 80);
    const ctaUrl = (body.cta_url || "/khoa-hoc").trim().slice(0, 240);

    if (!title || !bodyText) {
      return jsonRes({ error: "Vui lòng nhập Tiêu đề và Nội dung email chiến dịch." }, 400);
    }

    // Lưu sender_email mới nếu Admin cập nhật ngay trong form
    const senderRow = await db.prepare("SELECT value FROM site_settings WHERE key = 'sender_email'").first<{ value: string }>();
    const fromEmail = (body.sender_email || "").trim() || env.FROM_EMAIL || senderRow?.value || "Owlie Edu <onboarding@resend.dev>";
    if (body.sender_email && body.sender_email.trim()) {
      await db
        .prepare(
          `INSERT INTO site_settings (key, value, updated_by, updated_at)
           VALUES ('sender_email', ?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
        )
        .bind(body.sender_email.trim().slice(0, 140), claims.name || claims.email)
        .run();
    }

    // Thu thập danh sách email người nhận theo đối tượng
    const recipientSet = new Set<string>();
    if (audience === "custom") {
      const parts = (body.custom_emails || "")
        .split(/[\s,;]+/)
        .map((x) => x.trim().toLowerCase())
        .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      for (const e of parts) recipientSet.add(e);
    } else if (audience === "newsletter") {
      const rows = await db.prepare("SELECT email FROM newsletter_subscribers LIMIT 150").all<{ email: string }>();
      for (const r of rows.results) recipientSet.add(r.email.toLowerCase());
    } else {
      const sql =
        audience === "all"
          ? "SELECT email FROM users WHERE is_active = 1 LIMIT 150"
          : "SELECT email FROM users WHERE is_active = 1 AND role = ? LIMIT 150";
      const rows =
        audience === "all"
          ? await db.prepare(sql).all<{ email: string }>()
          : await db.prepare(sql).bind(audience).all<{ email: string }>();
      for (const r of rows.results) {
        if (r.email && !r.email.endsWith("@facebook.eduk12.vn")) {
          recipientSet.add(r.email.toLowerCase());
        }
      }
      if (audience === "all") {
        const subs = await db.prepare("SELECT email FROM newsletter_subscribers LIMIT 150").all<{ email: string }>();
        for (const s of subs.results) recipientSet.add(s.email.toLowerCase());
      }
    }

    const recipients = [...recipientSet];
    if (recipients.length === 0) {
      return jsonRes({ error: "Không có địa chỉ email người nhận nào thuộc nhóm đã chọn." }, 400);
    }

    const html = buildCampaignHtml({
      templateType,
      title,
      highlightBadge,
      bodyText,
      ctaLabel,
      ctaUrl,
    });

    const hasMailHost = Boolean(env.BREVO_API_KEY || env.RESEND_API_KEY);
    let sentCount = 0;
    let failedCount = 0;
    let providerUsed = "preview_no_key";
    let lastError = "";

    if (hasMailHost) {
      // Gửi từng lô song song 5 email để vừa nhanh vừa không chạm giới hạn kết nối Cloudflare
      for (let i = 0; i < recipients.length; i += 5) {
        const chunk = recipients.slice(i, i + 5);
        const resChunk = await Promise.all(
          chunk.map((to) => sendTransactionalEmail(env, fromEmail, to, subject, html))
        );
        for (const r of resChunk) {
          providerUsed = r.provider;
          if (r.ok) sentCount++;
          else {
            failedCount++;
            if (r.error) lastError = r.error;
          }
        }
      }
    }

    const campId = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const status = !hasMailHost
      ? "saved_draft_no_key"
      : sentCount > 0
        ? "sent"
        : "failed";

    await db
      .prepare(
        `INSERT INTO email_campaigns
         (id, title, subject, audience_role, template_type, highlight_badge, body_text, cta_label, cta_url, recipient_count, sent_count, failed_count, provider_used, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        campId,
        title,
        subject,
        audience,
        templateType,
        highlightBadge,
        bodyText,
        ctaLabel,
        ctaUrl,
        recipients.length,
        sentCount,
        failedCount,
        providerUsed,
        status,
        claims.name || claims.email
      )
      .run();

    await recordAuditLog(
      db,
      claims,
      "send_email_campaign",
      "email_campaign",
      campId,
      `Chiến dịch email "${title}" tới ${recipients.length} người (Thành công: ${sentCount}, Lỗi: ${failedCount}, Provider: ${providerUsed})`,
      { audience, templateType, sentCount, failedCount },
      request
    );

    if (!hasMailHost) {
      return jsonRes({
        ok: true,
        campaign_id: campId,
        status,
        recipient_count: recipients.length,
        sent_count: 0,
        message: `Đã lưu mẫu chiến dịch (${recipients.length} người nhận). Hãy gắn BREVO_API_KEY (miễn phí 300 thư/ngày) hoặc RESEND_API_KEY vào Cloudflare Secret để bắt đầu gửi thư thật!`,
      });
    }

    return jsonRes({
      ok: sentCount > 0,
      campaign_id: campId,
      status,
      provider: providerUsed,
      recipient_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      error: sentCount === 0 ? lastError : undefined,
      message:
        sentCount > 0
          ? `Đã gửi thành công ${sentCount}/${recipients.length} email qua ${providerUsed.toUpperCase()}!`
          : `Gửi chưa thành công (${lastError}). Kiểm tra lại Email gửi (From) đã được xác minh trên ${providerUsed.toUpperCase()} chưa nhé!`,
    });
  }

  return null;
}
