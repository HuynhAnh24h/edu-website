import { JwtClaims } from "./crypto";
import { notifyAdmins, notifyUser } from "./safety";
import { pushRealtimeEvent } from "./realtime";
import { computeTeacherReputation, recordAuditLog } from "./admin-ops";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

const MAX_UPLOAD_BYTES_KV = 5 * 1024 * 1024; // 5 MB khi dùng KV
const MAX_UPLOAD_BYTES_R2 = 20 * 1024 * 1024; // 20 MB/file đề thi PDF/Word/Slide khi dùng R2
// Khóa trần an toàn ở 9.5 GB (dưới ngưỡng 10 GB miễn phí của Cloudflare R2) để đảm bảo luôn 0đ/tháng!
const R2_FREE_SAFETY_CAP_BYTES = Math.floor(9.5 * 1024 * 1024 * 1024);
const KV_FREE_SAFETY_CAP_BYTES = Math.floor(0.9 * 1024 * 1024 * 1024);

const ALLOWED_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "txt",
]);

function isAdminRole(role?: string): boolean {
  return role === "super_admin" || role === "content_admin";
}

function isTeacherOrAdmin(role?: string): boolean {
  return role === "teacher" || role === "content_admin" || role === "super_admin";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F\u1E00-\u1EFF ]+/g, "_").trim().slice(0, 140) || "file";
}

function getExt(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function inferMime(ext: string, fallback: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] || fallback || "application/octet-stream";
}

export async function handleTeachersAndFilesRoutes(
  request: Request,
  db: D1Database,
  kv: KVNamespace,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonFn,
  corsHeaders: Record<string, string>,
  hub?: DurableObjectNamespace,
  r2?: R2Bucket
): Promise<Response | null> {
  // =========================================================================
  // 0. THỐNG KÊ DUNG LƯỢNG & QUẢN LÝ TỆP ĐỀ THI / TÀI LIỆU (ADMIN)
  // =========================================================================
  if (path === "/api/v1/admin/storage/stats" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được xem thống kê dung lượng" }, 403);
    }
    const [agg, recentRes] = await Promise.all([
      db
        .prepare("SELECT COUNT(*) as total_files, COALESCE(SUM(size_bytes), 0) as total_bytes FROM uploaded_files")
        .first<{ total_files: number; total_bytes: number }>(),
      db
        .prepare(
          "SELECT id, uploader_id, uploader_name, filename, mime_type, size_bytes, purpose, created_at FROM uploaded_files ORDER BY created_at DESC LIMIT 80"
        )
        .all<Record<string, unknown>>(),
    ]);
    const usedBytes = Number(agg?.total_bytes || 0);
    const capBytes = r2 ? R2_FREE_SAFETY_CAP_BYTES : KV_FREE_SAFETY_CAP_BYTES;
    return jsonRes({
      backend: r2 ? "r2_10gb_free" : "kv_1gb_free",
      max_file_mb: r2 ? 20 : 5,
      total_files: Number(agg?.total_files || 0),
      used_bytes: usedBytes,
      used_mb: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      safety_cap_gb: r2 ? 9.5 : 0.9,
      free_tier_gb: r2 ? 10 : 1,
      percent_used: Math.min(100, Math.round((usedBytes / capBytes) * 10000) / 100),
      files: recentRes.results.map((f) => ({
        id: String(f.id),
        uploader_name: String(f.uploader_name || ""),
        filename: String(f.filename || ""),
        mime_type: String(f.mime_type || ""),
        size_bytes: Number(f.size_bytes || 0),
        purpose: String(f.purpose || "general"),
        created_at: String(f.created_at || ""),
        url: `/api/v1/files/${String(f.id)}`,
      })),
    });
  }

  const delFileMatch = path.match(/^\/api\/v1\/admin\/storage\/files\/([^/]+)$/);
  if (delFileMatch && method === "DELETE") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được xóa tệp lưu trữ" }, 403);
    }
    const fileId = decodeURIComponent(delFileMatch[1]);
    await Promise.all([
      r2 ? r2.delete(`materials/${fileId}`).catch(() => {}) : Promise.resolve(),
      kv.delete(`file:${fileId}`).catch(() => {}),
      db.prepare("DELETE FROM uploaded_files WHERE id = ?").bind(fileId).run(),
    ]);
    await recordAuditLog(db, claims, "delete_file", "uploaded_file", fileId, `Xóa tệp lưu trữ ${fileId}`, {}, request);
    return jsonRes({ ok: true, message: "Đã xóa tệp và giải phóng dung lượng kho tài liệu!" });
  }

  // =========================================================================
  // 1. UPLOAD & PHỤC VỤ TỆP HỌC LIỆU THẬT (ƯU TIÊN R2 10GB FREE -> FALLBACK KV)
  // =========================================================================
  if (path === "/api/v1/files/upload" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để tải tệp lên." }, 401);

    const me = await db
      .prepare("SELECT id, full_name, is_active FROM users WHERE id = ?")
      .bind(claims.uid)
      .first<{ id: string; full_name: string; is_active: number }>();
    if (!me || Number(me.is_active) === 0) {
      return jsonRes({ error: "Tài khoản đang bị tạm khóa." }, 403);
    }

    const ct = request.headers.get("Content-Type") || "";
    if (!ct.includes("multipart/form-data")) {
      return jsonRes({ error: "Vui lòng gửi tệp theo định dạng multipart/form-data." }, 400);
    }

    const form = await request.formData();
    const fileField = form.get("file");
    const purpose = String(form.get("purpose") || "general").slice(0, 40);

    if (!fileField || typeof fileField === "string") {
      return jsonRes({ error: "Chưa chọn tệp để tải lên." }, 400);
    }

    const file = fileField as File;
    if (file.size === 0) {
      return jsonRes({ error: "Tệp đang trống." }, 400);
    }
    const maxFileBytes = r2 ? MAX_UPLOAD_BYTES_R2 : MAX_UPLOAD_BYTES_KV;
    if (file.size > maxFileBytes) {
      return jsonRes(
        { error: `Kích thước tệp vượt quá giới hạn ${r2 ? "20 MB" : "5 MB"} mỗi tệp.` },
        400
      );
    }

    // Khóa trần dung lượng an toàn (9.5 GB với R2 / 0.9 GB với KV) -> Đảm bảo không bao giờ phát sinh phí!
    const usedRow = await db
      .prepare("SELECT COALESCE(SUM(size_bytes), 0) as total_bytes FROM uploaded_files")
      .first<{ total_bytes: number }>();
    const capBytes = r2 ? R2_FREE_SAFETY_CAP_BYTES : KV_FREE_SAFETY_CAP_BYTES;
    if (Number(usedRow?.total_bytes || 0) + file.size > capBytes) {
      return jsonRes(
        {
          error: `Kho tài liệu đã chạm ngưỡng an toàn miễn phí (${r2 ? "9.5 GB / 10 GB R2" : "0.9 GB / 1 GB KV"}). Quản trị viên vui lòng dọn tệp cũ hoặc mở rộng dung lượng.`,
        },
        413
      );
    }

    const safeName = sanitizeFilename(file.name || "tailieu");
    const ext = getExt(safeName);
    if (!ALLOWED_EXT.has(ext)) {
      return jsonRes(
        {
          error:
            "Định dạng tệp chưa được hỗ trợ. Vui lòng chọn PDF, Word (.doc/.docx), Slide (.ppt/.pptx), Excel hoặc Ảnh (.png/.jpg/.webp).",
        },
        400
      );
    }

    const mime = inferMime(ext, file.type);
    const fileId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = await file.arrayBuffer();

    if (r2) {
      await r2.put(`materials/${fileId}`, buf, {
        httpMetadata: { contentType: mime },
        customMetadata: { filename: safeName, uploader: me.id, purpose },
      });
    } else {
      await kv.put(`file:${fileId}`, buf, {
        metadata: { filename: safeName, mime_type: mime, size_bytes: file.size },
      });
    }

    await db
      .prepare(
        "INSERT INTO uploaded_files (id, uploader_id, uploader_name, filename, mime_type, size_bytes, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(fileId, me.id, me.full_name, safeName, mime, file.size, purpose)
      .run();

    const isImage = mime.startsWith("image/");
    return jsonRes(
      {
        id: fileId,
        url: `/api/v1/files/${fileId}`,
        filename: safeName,
        mime_type: mime,
        size_bytes: file.size,
        is_image: isImage,
        storage: r2 ? "r2" : "kv",
      },
      201
    );
  }

  const getFileMatch = path.match(/^\/api\/v1\/files\/([^/]+)$/);
  if (getFileMatch && method === "GET") {
    const fileId = decodeURIComponent(getFileMatch[1]);

    // Ưu tiên đọc từ Cloudflare R2 (10 GB miễn phí chuyên lưu Đề thi & Tài liệu)
    if (r2) {
      const obj = await r2.get(`materials/${fileId}`);
      if (obj) {
        const mime = obj.httpMetadata?.contentType || "application/octet-stream";
        const fname = obj.customMetadata?.filename || fileId;
        const inline = mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/");
        return new Response(obj.body, {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fname)}`,
            "Cache-Control": "public, max-age=31536000, immutable",
            ...corsHeaders,
          },
        });
      }
    }

    // Fallback về KV cho các tệp đã tải trước đó
    const item = await kv.getWithMetadata<{ filename?: string; mime_type?: string }>(`file:${fileId}`, "arrayBuffer");
    if (!item.value) {
      return jsonRes({ error: "Không tìm thấy tệp hoặc tệp đã hết hạn." }, 404);
    }
    const meta = item.metadata || {};
    const mime = meta.mime_type || "application/octet-stream";
    const fname = meta.filename || fileId;
    const inline = mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/");
    return new Response(item.value, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fname)}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...corsHeaders,
      },
    });
  }

  // =========================================================================
  // 2. TRANG HỒ SƠ CÁ NHÂN GIÁO VIÊN (TEACHER PROFILE WALL)
  // =========================================================================
  const profMatch = path.match(/^\/api\/v1\/teachers\/([^/]+)\/profile$/);
  if (profMatch && method === "GET") {
    const teacherId = decodeURIComponent(profMatch[1]);
    const u = await db
      .prepare("SELECT id, full_name, email, role, school_name, created_at, is_active FROM users WHERE id = ?")
      .bind(teacherId)
      .first<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        school_name: string;
        created_at: string;
        is_active: number;
      }>();
    if (!u) return jsonRes({ error: "Không tìm thấy hồ sơ giáo viên" }, 404);

    const [tp, followersCnt, isFollowingRow, postsRes, coursesRes, reviewsRes, likesCntRow, clonesCntRow] = await Promise.all([
      db.prepare("SELECT * FROM teacher_profiles WHERE user_id = ?").bind(teacherId).first<Record<string, unknown>>(),
      db
        .prepare("SELECT COUNT(*) as cnt FROM teacher_follows WHERE teacher_id = ?")
        .bind(teacherId)
        .first<{ cnt: number }>(),
      claims
        ? db
            .prepare("SELECT 1 as ok FROM teacher_follows WHERE follower_id = ? AND teacher_id = ?")
            .bind(claims.uid, teacherId)
            .first()
        : Promise.resolve(null),
      db
        .prepare("SELECT * FROM teacher_posts WHERE author_id = ? AND status = 'published' ORDER BY is_pinned DESC, created_at DESC LIMIT 30")
        .bind(teacherId)
        .all<Record<string, unknown>>(),
      db
        .prepare("SELECT * FROM courses WHERE teacher_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 20")
        .bind(teacherId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT r.id, r.course_id, r.user_name, r.rating, r.comment, r.created_at, c.title as course_title
           FROM course_reviews r
           JOIN courses c ON c.id = r.course_id
           WHERE c.teacher_id = ?
           ORDER BY r.updated_at DESC
           LIMIT 30`
        )
        .bind(teacherId)
        .all<Record<string, unknown>>(),
      db
        .prepare("SELECT COUNT(*) as cnt FROM teacher_post_likes l JOIN teacher_posts p ON p.id = l.post_id WHERE p.author_id = ?")
        .bind(teacherId)
        .first<{ cnt: number }>(),
      db
        .prepare("SELECT COUNT(*) as cnt FROM teacher_post_clones cl JOIN teacher_posts p ON p.id = cl.post_id WHERE p.author_id = ?")
        .bind(teacherId)
        .first<{ cnt: number }>(),
    ]);

    const reviewList = reviewsRes.results;
    const avgRating =
      reviewList.length > 0
        ? Math.round((reviewList.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviewList.length) * 10) / 10
        : 0;

    const reputation = computeTeacherReputation({
      is_verified: Number(tp?.is_verified || 0) === 1,
      post_count: postsRes.results.length,
      likes_received: Number(likesCntRow?.cnt || 0),
      clones_received: Number(clonesCntRow?.cnt || 0),
      follower_count: followersCnt?.cnt || 0,
      avg_rating: avgRating,
      review_count: reviewList.length,
    });

    const isOwnerOrAdmin = claims && (claims.uid === teacherId || isAdminRole(claims.role));

    return jsonRes({
      teacher: {
        id: u.id,
        full_name: u.full_name,
        role: u.role,
        school_name: u.school_name || "Cộng đồng Owlie Edu",
        created_at: u.created_at,
        is_active: Number(u.is_active ?? 1) === 1,
        is_verified: Number(tp?.is_verified || 0) === 1,
        verification_status: String(tp?.verification_status || "none"),
        specialty: String(tp?.specialty || "Giáo dục Phổ thông & Cộng đồng"),
        bio: String(tp?.bio || "Giáo viên cộng đồng chia sẻ kiến thức miễn phí trên Owlie Edu."),
        years_exp: Number(tp?.years_exp || 1),
        verified_at: tp?.verified_at ? String(tp.verified_at) : null,
        admin_review_note: isOwnerOrAdmin ? String(tp?.admin_review_note || "") : "",
        proof_file_url: isOwnerOrAdmin ? String(tp?.proof_file_url || "") : "",
      },
      stats: {
        follower_count: followersCnt?.cnt || 0,
        post_count: postsRes.results.length,
        course_count: coursesRes.results.length,
        avg_rating: avgRating,
        review_count: reviewList.length,
        total_clones: Number(clonesCntRow?.cnt || 0),
        reputation_score: reputation.score,
        reputation_tier: reputation.tier,
        reputation_label: reputation.label,
        is_following: Boolean(isFollowingRow),
      },
      posts: postsRes.results.map((p) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(String(p.tags_json || "[]"));
        } catch {
          tags = [];
        }
        return {
          id: String(p.id),
          category: String(p.category),
          grade_id: Number(p.grade_id || 0),
          subject_name: String(p.subject_name || "Liên môn"),
          title: String(p.title),
          content: String(p.content),
          attachment_label: String(p.attachment_label || ""),
          attachment_url: String(p.attachment_url || ""),
          tags,
          is_pinned: Number(p.is_pinned || 0) === 1,
          created_at: String(p.created_at),
        };
      }),
      courses: coursesRes.results.map((c) => {
        let mods: unknown[] = [];
        try {
          mods = JSON.parse(String(c.modules_json || "[]"));
        } catch {
          mods = [];
        }
        return {
          id: String(c.id),
          title: String(c.title),
          subject_name: String(c.subject_name),
          grade_label: String(c.grade_label),
          cover_theme: String(c.cover_theme || "indigo"),
          summary: String(c.summary),
          lesson_count: mods.length,
          created_at: String(c.created_at),
        };
      }),
      reviews: reviewList,
    });
  }

  // =========================================================================
  // 3. GIÁO VIÊN CẬP NHẬT HỒ SƠ & GỬI YÊU CẦU XÁC MINH TÍCH XANH
  // =========================================================================
  if (path === "/api/v1/teachers/me/profile" && method === "PATCH") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (!isTeacherOrAdmin(claims.role)) {
      return jsonRes({ error: "Chỉ tài khoản Giáo viên & Quản trị viên mới có hồ sơ giảng dạy" }, 403);
    }
    const b = (await request.json().catch(() => ({}))) as {
      specialty?: string;
      bio?: string;
      years_exp?: number;
      school_name?: string;
    };

    const specialty = (b.specialty || "").trim().slice(0, 120);
    const bio = (b.bio || "").trim().slice(0, 1200);
    const yearsExp = Math.min(50, Math.max(1, Number(b.years_exp || 1)));
    const school = (b.school_name || "").trim().slice(0, 120);

    if (school) {
      await db.prepare("UPDATE users SET school_name = ? WHERE id = ?").bind(school, claims.uid).run();
    }
    await db
      .prepare(
        `INSERT INTO teacher_profiles (user_id, specialty, bio, years_exp, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           specialty = excluded.specialty,
           bio = excluded.bio,
           years_exp = excluded.years_exp,
           updated_at = datetime('now')`
      )
      .bind(claims.uid, specialty, bio, yearsExp)
      .run();

    return jsonRes({ ok: true, message: "Đã cập nhật hồ sơ cá nhân giáo viên!" });
  }

  if (path === "/api/v1/teachers/verification/request" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (!isTeacherOrAdmin(claims.role)) {
      return jsonRes({ error: "Chỉ tài khoản Giáo viên mới có thể gửi yêu cầu xác minh Tích xanh." }, 403);
    }

    const b = (await request.json().catch(() => ({}))) as {
      specialty?: string;
      bio?: string;
      years_exp?: number;
      school_name?: string;
      proof_file_url?: string;
      proof_note?: string;
    };
    const proofUrl = (b.proof_file_url || "").trim();
    const proofNote = (b.proof_note || "").trim();
    if (!proofUrl && proofNote.length < 8) {
      return jsonRes(
        { error: "Vui lòng tải ảnh Thẻ Giáo viên / Giấy xác nhận công tác hoặc nhập thông tin trường để Admin xác minh." },
        400
      );
    }

    const school = (b.school_name || "").trim().slice(0, 120);
    if (school) {
      await db.prepare("UPDATE users SET school_name = ? WHERE id = ?").bind(school, claims.uid).run();
    }

    await db
      .prepare(
        `INSERT INTO teacher_profiles (user_id, verification_status, specialty, bio, years_exp, proof_file_url, proof_note, updated_at)
         VALUES (?, 'pending', ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           verification_status = 'pending',
           specialty = CASE WHEN excluded.specialty != '' THEN excluded.specialty ELSE teacher_profiles.specialty END,
           bio = CASE WHEN excluded.bio != '' THEN excluded.bio ELSE teacher_profiles.bio END,
           years_exp = excluded.years_exp,
           proof_file_url = excluded.proof_file_url,
           proof_note = excluded.proof_note,
           updated_at = datetime('now')`
      )
      .bind(
        claims.uid,
        (b.specialty || "").trim().slice(0, 120),
        (b.bio || "").trim().slice(0, 1200),
        Math.min(50, Math.max(1, Number(b.years_exp || 1))),
        proofUrl.slice(0, 300),
        proofNote.slice(0, 600)
      )
      .run();

    await notifyAdmins(
      db,
      `Yêu cầu Xác minh Tích xanh Giáo viên: ${claims.name}`,
      `${claims.name} (${school || "Chưa rõ trường"}) vừa gửi hồ sơ xin cấp Tích xanh Giáo viên Xác thực. Vui lòng kiểm tra ảnh thẻ & duyệt trong /quan-tri.`,
      "/quan-tri",
      hub
    );

    return jsonRes(
      { ok: true, message: "Đã gửi hồ sơ xác minh Tích xanh thành công! Quản trị viên sẽ kiểm tra và duyệt sớm nhất." },
      201
    );
  }

  // =========================================================================
  // 4. ADMIN DUYỆT / TỪ CHỐI / THU HỒI TÍCH XANH GIÁO VIÊN
  // =========================================================================
  if (path === "/api/v1/admin/teachers/verifications" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được duyệt hồ sơ Tích xanh Giáo viên" }, 403);
    }

    const rows = await db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.role, u.school_name, u.is_active, u.created_at,
                tp.is_verified, tp.verification_status, tp.specialty, tp.bio, tp.years_exp,
                tp.proof_file_url, tp.proof_note, tp.admin_review_note, tp.verified_at, tp.updated_at
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
         WHERE u.role IN ('teacher', 'content_admin', 'super_admin')
         ORDER BY
           CASE WHEN tp.verification_status = 'pending' THEN 0 WHEN tp.is_verified = 1 THEN 1 ELSE 2 END,
           u.created_at DESC`
      )
      .all<Record<string, unknown>>();

    const teachers = rows.results.map((r) => ({
      id: String(r.id),
      full_name: String(r.full_name),
      email: String(r.email),
      role: String(r.role),
      school_name: String(r.school_name || ""),
      is_active: Number(r.is_active ?? 1) === 1,
      is_verified: Number(r.is_verified || 0) === 1,
      verification_status: String(r.verification_status || "none"),
      specialty: String(r.specialty || ""),
      bio: String(r.bio || ""),
      years_exp: Number(r.years_exp || 1),
      proof_file_url: String(r.proof_file_url || ""),
      proof_note: String(r.proof_note || ""),
      admin_review_note: String(r.admin_review_note || ""),
      verified_at: r.verified_at ? String(r.verified_at) : null,
    }));

    const pendingCount = teachers.filter((t) => t.verification_status === "pending").length;
    const verifiedCount = teachers.filter((t) => t.is_verified).length;
    return jsonRes({ teachers, pending_count: pendingCount, verified_count: verifiedCount });
  }

  const verifyMatch = path.match(/^\/api\/v1\/admin\/teachers\/([^/]+)\/verify$/);
  if (verifyMatch && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới có quyền cấp/thu hồi Tích xanh" }, 403);
    }
    const targetId = decodeURIComponent(verifyMatch[1]);
    const b = (await request.json().catch(() => ({}))) as {
      action?: "approve" | "reject" | "revoke";
      note?: string;
    };
    const action = b.action || "approve";
    const note = (b.note || "").trim().slice(0, 500);

    if (action === "approve") {
      await db
        .prepare(
          `INSERT INTO teacher_profiles (user_id, is_verified, verification_status, admin_review_note, verified_at, updated_at)
           VALUES (?, 1, 'verified', ?, datetime('now'), datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             is_verified = 1,
             verification_status = 'verified',
             admin_review_note = excluded.admin_review_note,
             verified_at = datetime('now'),
             updated_at = datetime('now')`
        )
        .bind(targetId, note || "Đã xác minh hồ sơ giáo viên chính thức.")
        .run();

      await Promise.all([
        notifyUser(
          db,
          targetId,
          "verified_teacher",
          "Chúc mừng! Bạn đã được cấp Tích xanh Giáo viên Xác thực ✓",
          note || "Huy hiệu Tích xanh đã hiển thị trên Hồ sơ cá nhân, Mạng Xã Hội Giáo Viên và các Khóa học của bạn.",
          `/giao-vien?id=${encodeURIComponent(targetId)}`,
          hub
        ),
        pushRealtimeEvent(hub, "social:feed", { type: "social_update" }),
      ]);
      return jsonRes({ ok: true, message: "Đã duyệt & cấp Tích xanh Giáo viên Xác thực!" });
    }

    if (action === "reject") {
      await db
        .prepare(
          `INSERT INTO teacher_profiles (user_id, is_verified, verification_status, admin_review_note, updated_at)
           VALUES (?, 0, 'rejected', ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             is_verified = 0,
             verification_status = 'rejected',
             admin_review_note = excluded.admin_review_note,
             updated_at = datetime('now')`
        )
        .bind(targetId, note || "Hồ sơ xác minh chưa đủ rõ ràng, vui lòng tải lại ảnh thẻ giáo viên rõ nét.")
        .run();

      await notifyUser(
        db,
        targetId,
        "warning",
        "Hồ sơ xác minh Tích xanh cần bổ sung thêm thông tin",
        note || "Vui lòng cập nhật lại ảnh thẻ giáo viên / giấy xác nhận công tác rõ nét hơn để Admin duyệt lại.",
        `/giao-vien?id=${encodeURIComponent(targetId)}`,
        hub
      );
      return jsonRes({ ok: true, message: "Đã từ chối hồ sơ xác minh và gửi thông báo phản hồi." });
    }

    // revoke
    await db
      .prepare(
        "UPDATE teacher_profiles SET is_verified = 0, verification_status = 'none', admin_review_note = ?, updated_at = datetime('now') WHERE user_id = ?"
      )
      .bind(note || "Quản trị viên đã thu hồi Tích xanh.", targetId)
      .run();
    await Promise.all([
      notifyUser(
        db,
        targetId,
        "warning",
        "Thông báo thu hồi Tích xanh Giáo viên",
        note || "Huy hiệu Tích xanh của tài khoản đã được Quản trị viên thu hồi để rà soát lại thông tin.",
        `/giao-vien?id=${encodeURIComponent(targetId)}`,
        hub
      ),
      pushRealtimeEvent(hub, "social:feed", { type: "social_update" }),
    ]);
    return jsonRes({ ok: true, message: "Đã thu hồi Tích xanh Giáo viên." });
  }

  return null;
}
