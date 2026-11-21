import { JwtClaims } from "./crypto";
import { SUBJECT_NAMES } from "./seed";

type JsonResFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

function genJoinCode(subjectCode: string, gradeId: number): string {
  const prefix = subjectCode.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4) || "LOP";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}${gradeId}-${rand}`;
}

function genLiveRoomSlug(classCode: string): string {
  const clean = classCode.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12) || "CLASS";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `EduK12-${clean}-${rand}`;
}

async function getActiveLiveMap(db: D1Database): Promise<Map<string, Record<string, unknown>>> {
  const { results } = await db
    .prepare(
      `SELECT ls.*,
        (SELECT COUNT(*) FROM live_attendance a WHERE a.session_id = ls.id) as attendance_count
       FROM classroom_live_sessions ls
       WHERE ls.status = 'live'
       ORDER BY ls.started_at DESC`
    )
    .all<Record<string, unknown>>();
  const map = new Map<string, Record<string, unknown>>();
  for (const row of results) {
    const cid = String(row.classroom_id);
    if (!map.has(cid)) map.set(cid, row);
  }
  return map;
}

async function canAccessClassroomLive(
  db: D1Database,
  classroomId: string,
  claims: JwtClaims | null
): Promise<{ allowed: boolean; isStaff: boolean }> {
  if (!claims) return { allowed: false, isStaff: false };
  const isStaff = ["teacher", "content_admin", "super_admin"].includes(claims.role);
  if (isStaff) return { allowed: true, isStaff: true };
  const mem = await db
    .prepare("SELECT user_id FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND status = 'active'")
    .bind(classroomId, claims.uid)
    .first();
  return { allowed: Boolean(mem), isStaff: false };
}

export async function handleClassroomRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  url: URL,
  claims: JwtClaims | null,
  jsonRes: JsonResFn
): Promise<Response | null> {
  // === 1. DANH SÁCH LỚP HỌC CÔNG KHAI (Cho học sinh khám phá & đăng ký) ===
  if (path === "/api/v1/classrooms" && method === "GET") {
    const gradeParam = url.searchParams.get("grade");
    const sub = url.searchParams.get("subject") || "";
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
        (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type IN ('lesson', 'coding')) as lesson_count,
        (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
      FROM classrooms c WHERE 1=1
    `;
    const binds: unknown[] = [];
    if (gradeParam === "coding") {
      sql += " AND c.grade_id = 0";
    } else if (gradeParam && Number(gradeParam) > 0) {
      sql += " AND c.grade_id = ?";
      binds.push(Number(gradeParam));
    }
    if (sub && sub !== "all") {
      sql += " AND c.subject_code = ?";
      binds.push(sub);
    }
    sql += " ORDER BY c.created_at DESC";

    const [{ results }, liveMap] = await Promise.all([
      db.prepare(sql).bind(...binds).all<Record<string, unknown>>(),
      getActiveLiveMap(db),
    ]);

    let enrolledSet = new Set<string>();
    if (claims) {
      const mems = await db
        .prepare("SELECT classroom_id FROM classroom_members WHERE user_id = ? AND status = 'active'")
        .bind(claims.uid)
        .all<{ classroom_id: string }>();
      enrolledSet = new Set(mems.results.map((r) => r.classroom_id));
    }

    const classrooms = results.map((c) => {
      const cid = String(c.id);
      const live = liveMap.get(cid) || null;
      return {
        ...c,
        allow_self_enroll: Boolean(c.allow_self_enroll),
        is_enrolled: enrolledSet.has(cid),
        is_live: Boolean(live),
        live_session: live,
      };
    });
    return jsonRes({ classrooms });
  }

  // === 2. LỚP HỌC CỦA TÔI (Học sinh đã đăng ký / Giáo viên đang phụ trách) ===
  if (path === "/api/v1/classrooms/my" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để xem lớp học của bạn" }, 401);
    const isStaff = ["teacher", "content_admin", "super_admin"].includes(claims.role);

    const sql = isStaff
      ? `SELECT c.*,
           (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type IN ('lesson', 'coding')) as lesson_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
         FROM classrooms c
         ${claims.role === "super_admin" ? "" : "WHERE c.teacher_id = ?"}
         ORDER BY c.created_at DESC`
      : `SELECT c.*,
           (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type IN ('lesson', 'coding')) as lesson_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
         FROM classrooms c
         JOIN classroom_members cm ON cm.classroom_id = c.id
         WHERE cm.user_id = ? AND cm.status = 'active'
         ORDER BY cm.joined_at DESC`;

    const stmt =
      isStaff && claims.role === "super_admin"
        ? db.prepare(sql)
        : db.prepare(sql).bind(claims.uid);
    const [{ results }, liveMap] = await Promise.all([
      stmt.all<Record<string, unknown>>(),
      getActiveLiveMap(db),
    ]);
    return jsonRes({
      classrooms: results.map((c) => {
        const live = liveMap.get(String(c.id)) || null;
        return {
          ...c,
          allow_self_enroll: Boolean(c.allow_self_enroll),
          is_enrolled: true,
          is_live: Boolean(live),
          live_session: live,
        };
      }),
    });
  }

  // === 3. HỌC SINH ĐĂNG KÝ / THAM GIA LỚP HỌC (theo classroom_id hoặc mã lớp code) ===
  if (path === "/api/v1/classrooms/join" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập tài khoản học sinh để đăng ký lớp học" }, 401);
    const body = (await request.json()) as { classroom_id?: string; code?: string };
    const cls = body.classroom_id
      ? await db.prepare("SELECT * FROM classrooms WHERE id = ?").bind(body.classroom_id).first<Record<string, unknown>>()
      : await db
          .prepare("SELECT * FROM classrooms WHERE UPPER(code) = UPPER(?)")
          .bind((body.code || "").trim())
          .first<Record<string, unknown>>();

    if (!cls) return jsonRes({ error: "Không tìm thấy lớp học hoặc mã lớp không đúng" }, 404);
    if (!cls.allow_self_enroll && !["teacher", "super_admin"].includes(claims.role)) {
      return jsonRes({ error: "Lớp học này hiện đã đóng tự đăng ký, hãy liên hệ giáo viên để được thêm vào lớp." }, 403);
    }

    await db
      .prepare(
        "INSERT OR REPLACE INTO classroom_members (classroom_id, user_id, user_name, user_email, status, joined_at) VALUES (?, ?, ?, ?, 'active', datetime('now'))"
      )
      .bind(String(cls.id), claims.uid, claims.name, claims.email)
      .run();

    return jsonRes({ status: "enrolled", classroom: cls });
  }

  // === 3B. PHÒNG HỌC LIVE: LẤY TRẠNG THÁI LIVE + CHAT + ĐIỂM DANH ===
  const liveGetMatch = path.match(/^\/api\/v1\/classrooms\/([^/]+)\/live$/);
  if (liveGetMatch && method === "GET") {
    const classId = decodeURIComponent(liveGetMatch[1]);
    const session = await db
      .prepare(
        "SELECT * FROM classroom_live_sessions WHERE classroom_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1"
      )
      .bind(classId)
      .first<Record<string, unknown>>();

    if (!session) {
      return jsonRes({ session: null, messages: [], attendance: [], online_count: 0 });
    }

    const access = await canAccessClassroomLive(db, classId, claims);
    if (!access.allowed) {
      return jsonRes({
        session: {
          id: session.id,
          title: session.title,
          mode: session.mode,
          status: session.status,
          host_name: session.host_name,
          started_at: session.started_at,
          locked: true,
        },
        messages: [],
        attendance: [],
        online_count: 0,
      });
    }

    const [{ results: messages }, { results: attendance }] = await Promise.all([
      db
        .prepare(
          "SELECT * FROM live_chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 120"
        )
        .bind(String(session.id))
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT user_id, user_name, user_email, joined_at, last_seen_at FROM live_attendance WHERE session_id = ? ORDER BY last_seen_at DESC LIMIT 200"
        )
        .bind(String(session.id))
        .all<Record<string, unknown>>(),
    ]);

    const nowMs = Date.now();
    const attendanceEnriched = attendance.map((a) => {
      const seenMs = Date.parse(String(a.last_seen_at).replace(" ", "T") + "Z");
      const isOnline = !Number.isNaN(seenMs) && nowMs - seenMs < 90_000;
      return { ...a, is_online: isOnline };
    });

    return jsonRes({
      session,
      messages: messages.map((m) => ({ ...m, is_pinned: Boolean(m.is_pinned) })),
      attendance: attendanceEnriched,
      online_count: attendanceEnriched.filter((a) => a.is_online).length,
    });
  }

  // === 3C. ĐIỂM DANH TỰ ĐỘNG & HEARTBEAT KHI VÀO PHÒNG LIVE ===
  const liveCheckinMatch = path.match(/^\/api\/v1\/classrooms\/([^/]+)\/live\/checkin$/);
  if (liveCheckinMatch && method === "POST") {
    const classId = decodeURIComponent(liveCheckinMatch[1]);
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để điểm danh phòng học Live" }, 401);
    const access = await canAccessClassroomLive(db, classId, claims);
    if (!access.allowed) {
      return jsonRes({ error: "Bạn cần đăng ký vào lớp học trước khi vào phòng Live!" }, 403);
    }

    const session = await db
      .prepare(
        "SELECT id FROM classroom_live_sessions WHERE classroom_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1"
      )
      .bind(classId)
      .first<{ id: string }>();
    if (!session) return jsonRes({ error: "Lớp học hiện chưa mở phòng Live" }, 404);

    await db
      .prepare(
        `INSERT INTO live_attendance (session_id, classroom_id, user_id, user_name, user_email, joined_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(session_id, user_id) DO UPDATE SET last_seen_at = datetime('now'), user_name = excluded.user_name`
      )
      .bind(session.id, classId, claims.uid, claims.name, claims.email)
      .run();

    return jsonRes({ status: "checked_in", session_id: session.id });
  }

  // === 3D. GỬI TIN NHẮN LIVE CHAT ===
  const liveMsgMatch = path.match(/^\/api\/v1\/classrooms\/([^/]+)\/live\/messages$/);
  if (liveMsgMatch && method === "POST") {
    const classId = decodeURIComponent(liveMsgMatch[1]);
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để chat trong lớp học" }, 401);
    const access = await canAccessClassroomLive(db, classId, claims);
    if (!access.allowed) {
      return jsonRes({ error: "Chỉ thành viên trong lớp mới có thể gửi tin nhắn" }, 403);
    }

    const body = (await request.json()) as { message?: string; session_id?: string };
    const text = (body.message || "").trim().slice(0, 600);
    if (!text) return jsonRes({ error: "Tin nhắn không được để trống" }, 400);

    const session = body.session_id
      ? await db
          .prepare("SELECT id, status FROM classroom_live_sessions WHERE id = ? AND classroom_id = ?")
          .bind(body.session_id, classId)
          .first<{ id: string; status: string }>()
      : await db
          .prepare(
            "SELECT id, status FROM classroom_live_sessions WHERE classroom_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1"
          )
          .bind(classId)
          .first<{ id: string; status: string }>();

    if (!session || session.status !== "live") {
      return jsonRes({ error: "Buổi học Live đã kết thúc" }, 400);
    }

    const msgId = `msg-${crypto.randomUUID().slice(0, 10)}`;
    await db
      .prepare(
        "INSERT INTO live_chat_messages (id, session_id, classroom_id, user_id, user_name, user_role, message) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(msgId, session.id, classId, claims.uid, claims.name, claims.role, text)
      .run();

    const saved = await db
      .prepare("SELECT * FROM live_chat_messages WHERE id = ?")
      .bind(msgId)
      .first<Record<string, unknown>>();

    return jsonRes({ message: saved ? { ...saved, is_pinned: Boolean(saved.is_pinned) } : null }, 201);
  }

  // === 4. CHI TIẾT LỚP HỌC (Giáo án + Bài kiểm tra + Danh sách học sinh + Bảng điểm + Trạng thái Live) ===
  const detailMatch = path.match(/^\/api\/v1\/classrooms\/([^/]+)$/);
  if (detailMatch && method === "GET") {
    const classId = decodeURIComponent(detailMatch[1]);
    const cls = await db.prepare("SELECT * FROM classrooms WHERE id = ?").bind(classId).first<Record<string, unknown>>();
    if (!cls) return jsonRes({ error: "Không tìm thấy lớp học" }, 404);

    const [{ results: assignments }, { results: students }, activeLive] = await Promise.all([
      db
        .prepare("SELECT * FROM classroom_assignments WHERE classroom_id = ? ORDER BY display_order ASC, assigned_at DESC")
        .bind(classId)
        .all<Record<string, unknown>>(),
      db
        .prepare("SELECT user_id, user_name, user_email, status, joined_at FROM classroom_members WHERE classroom_id = ? ORDER BY joined_at DESC")
        .bind(classId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT ls.*,
            (SELECT COUNT(*) FROM live_attendance a WHERE a.session_id = ls.id) as attendance_count
           FROM classroom_live_sessions ls
           WHERE ls.classroom_id = ? AND ls.status = 'live'
           ORDER BY ls.started_at DESC LIMIT 1`
        )
        .bind(classId)
        .first<Record<string, unknown>>(),
    ]);

    const isEnrolled = claims ? students.some((s) => s.user_id === claims.uid) : false;
    const isStaff = claims ? ["teacher", "content_admin", "super_admin"].includes(claims.role) : false;

    // Lấy điểm kiểm tra của các bài thi thuộc lớp này
    const examIds = assignments.filter((a) => a.item_type === "exam").map((a) => String(a.item_id));
    let gradebook: Record<string, unknown>[] = [];
    if (examIds.length > 0 && claims) {
      const placeholders = examIds.map(() => "?").join(",");
      if (isStaff) {
        const gRes = await db
          .prepare(
            `SELECT id as attempt_id, exam_id, user_id, user_name, score, max_score, correct_count, total_questions, duration_sec, graded_at
             FROM exam_attempts
             WHERE status = 'graded' AND exam_id IN (${placeholders})
             ORDER BY graded_at DESC LIMIT 100`
          )
          .bind(...examIds)
          .all<Record<string, unknown>>();
        gradebook = gRes.results;
      } else {
        const gRes = await db
          .prepare(
            `SELECT id as attempt_id, exam_id, user_id, user_name, score, max_score, correct_count, total_questions, duration_sec, graded_at
             FROM exam_attempts
             WHERE status = 'graded' AND user_id = ? AND exam_id IN (${placeholders})
             ORDER BY graded_at DESC LIMIT 50`
          )
          .bind(claims.uid, ...examIds)
          .all<Record<string, unknown>>();
        gradebook = gRes.results;
      }
    }

    return jsonRes({
      classroom: {
        ...cls,
        allow_self_enroll: Boolean(cls.allow_self_enroll),
        is_enrolled: isEnrolled,
        is_live: Boolean(activeLive),
        live_session: activeLive || null,
      },
      assignments,
      students: isStaff ? students : [],
      student_count: students.length,
      gradebook,
    });
  }

  // === 5. CÁC ENDPOINT QUẢN TRỊ LỚP HỌC & LIVESTREAM CỦA GIÁO VIÊN / ADMIN ===
  if (path.startsWith("/api/v1/cms/classrooms")) {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (!["teacher", "content_admin", "super_admin"].includes(claims.role)) {
      return jsonRes({ error: "Chỉ Giáo viên hoặc Admin mới được quản lý lớp học" }, 403);
    }

    // Bắt đầu buổi học Live / Livestream trong lớp
    const liveStartMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/live\/start$/);
    if (liveStartMatch && method === "POST") {
      const classId = decodeURIComponent(liveStartMatch[1]);
      const cls = await db
        .prepare("SELECT id, code, name FROM classrooms WHERE id = ?")
        .bind(classId)
        .first<{ id: string; code: string; name: string }>();
      if (!cls) return jsonRes({ error: "Không tìm thấy lớp học" }, 404);

      const b = (await request.json()) as {
        title?: string;
        mode?: "webrtc" | "youtube" | "stream_url";
        stream_url?: string;
        pinned_note?: string;
      };
      const mode = b.mode === "youtube" || b.mode === "stream_url" ? b.mode : "webrtc";
      if ((mode === "youtube" || mode === "stream_url") && !(b.stream_url || "").trim()) {
        return jsonRes({ error: "Vui lòng dán đường link Livestream (YouTube / HLS / Embed)" }, 400);
      }

      // Kết thúc phiên cũ nếu đang treo
      await db
        .prepare(
          "UPDATE classroom_live_sessions SET status = 'ended', ended_at = datetime('now') WHERE classroom_id = ? AND status = 'live'"
        )
        .bind(classId)
        .run();

      const sid = `live-${crypto.randomUUID().slice(0, 10)}`;
      const roomSlug = genLiveRoomSlug(cls.code);
      const title = (b.title || "").trim() || `Buổi học trực tuyến — ${cls.name}`;

      await db
        .prepare(
          `INSERT INTO classroom_live_sessions (id, classroom_id, title, mode, room_slug, stream_url, status, pinned_note, host_id, host_name)
           VALUES (?, ?, ?, ?, ?, ?, 'live', ?, ?, ?)`
        )
        .bind(
          sid,
          classId,
          title,
          mode,
          roomSlug,
          (b.stream_url || "").trim(),
          (b.pinned_note || "").trim(),
          claims.uid,
          claims.name
        )
        .run();

      // Tự động điểm danh giáo viên vào phòng
      await db
        .prepare(
          `INSERT OR REPLACE INTO live_attendance (session_id, classroom_id, user_id, user_name, user_email, joined_at, last_seen_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(sid, classId, claims.uid, claims.name, claims.email)
        .run();

      const session = await db
        .prepare("SELECT * FROM classroom_live_sessions WHERE id = ?")
        .bind(sid)
        .first<Record<string, unknown>>();

      return jsonRes({ session }, 201);
    }

    // Lịch sử các buổi Live & sĩ số điểm danh
    const liveHistMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/live\/history$/);
    if (liveHistMatch && method === "GET") {
      const classId = decodeURIComponent(liveHistMatch[1]);
      const { results } = await db
        .prepare(
          `SELECT ls.*,
            (SELECT COUNT(*) FROM live_attendance a WHERE a.session_id = ls.id) as attendance_count,
            (SELECT COUNT(*) FROM live_chat_messages m WHERE m.session_id = ls.id) as message_count
           FROM classroom_live_sessions ls
           WHERE ls.classroom_id = ?
           ORDER BY ls.started_at DESC LIMIT 20`
        )
        .bind(classId)
        .all<Record<string, unknown>>();
      return jsonRes({ sessions: results });
    }

    // Cập nhật thông báo ghim / link phát / kết thúc buổi Live
    const livePatchMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/live\/([^/]+)$/);
    if (livePatchMatch && method === "PATCH") {
      const classId = decodeURIComponent(livePatchMatch[1]);
      const sid = decodeURIComponent(livePatchMatch[2]);
      const b = (await request.json()) as {
        pinned_note?: string;
        title?: string;
        stream_url?: string;
        status?: "live" | "ended";
      };
      if (b.status === "ended") {
        await db
          .prepare(
            "UPDATE classroom_live_sessions SET status = 'ended', ended_at = datetime('now') WHERE id = ? AND classroom_id = ?"
          )
          .bind(sid, classId)
          .run();
      } else {
        await db
          .prepare(
            `UPDATE classroom_live_sessions
             SET pinned_note = COALESCE(?, pinned_note),
                 title = COALESCE(?, title),
                 stream_url = COALESCE(?, stream_url)
             WHERE id = ? AND classroom_id = ?`
          )
          .bind(
            b.pinned_note !== undefined ? b.pinned_note.trim() : null,
            b.title !== undefined && b.title.trim() ? b.title.trim() : null,
            b.stream_url !== undefined ? b.stream_url.trim() : null,
            sid,
            classId
          )
          .run();
      }
      const updated = await db
        .prepare("SELECT * FROM classroom_live_sessions WHERE id = ?")
        .bind(sid)
        .first<Record<string, unknown>>();
      return jsonRes({ session: updated });
    }

    // Kết thúc buổi Live
    const liveEndMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/live\/([^/]+)\/end$/);
    if (liveEndMatch && method === "POST") {
      const classId = decodeURIComponent(liveEndMatch[1]);
      const sid = decodeURIComponent(liveEndMatch[2]);
      await db
        .prepare(
          "UPDATE classroom_live_sessions SET status = 'ended', ended_at = datetime('now') WHERE id = ? AND classroom_id = ?"
        )
        .bind(sid, classId)
        .run();
      return jsonRes({ status: "ended" });
    }

    // Ghim / bỏ ghim tin nhắn trong Live Chat
    const livePinMatch = path.match(
      /^\/api\/v1\/cms\/classrooms\/([^/]+)\/live\/([^/]+)\/messages\/([^/]+)\/pin$/
    );
    if (livePinMatch && method === "PATCH") {
      const sid = decodeURIComponent(livePinMatch[2]);
      const msgId = decodeURIComponent(livePinMatch[3]);
      await db
        .prepare("UPDATE live_chat_messages SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ? AND session_id = ?")
        .bind(msgId, sid)
        .run();
      return jsonRes({ status: "toggled" });
    }

    // Tạo lớp học mới
    if (path === "/api/v1/cms/classrooms" && method === "POST") {
      const b = (await request.json()) as {
        name?: string;
        grade_id?: number;
        subject_code?: string;
        description?: string;
        allow_self_enroll?: boolean;
      };
      if (!b.name?.trim()) return jsonRes({ error: "Vui lòng nhập tên lớp học" }, 400);
      const gradeId = b.grade_id === 0 ? 0 : b.grade_id || 12;
      const sub = b.subject_code || "toan";
      const id = `cls-${crypto.randomUUID().slice(0, 8)}`;
      const code = gradeId === 0 ? genJoinCode("CODE", Math.floor(10 + Math.random() * 89)) : genJoinCode(sub, gradeId);
      const allow = b.allow_self_enroll === false ? 0 : 1;

      await db
        .prepare(
          "INSERT INTO classrooms (id, code, name, grade_id, subject_code, subject_name, teacher_id, teacher_name, description, allow_self_enroll) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id, code, b.name.trim(), gradeId, sub, SUBJECT_NAMES[sub] || sub, claims.uid, claims.name, b.description || "", allow)
        .run();

      return jsonRes({ classroom: { id, code, name: b.name.trim(), grade_id: gradeId, subject_code: sub } }, 201);
    }

    // Bật/tắt cho học sinh tự đăng ký
    const toggleMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/settings$/);
    if (toggleMatch && method === "PATCH") {
      const classId = decodeURIComponent(toggleMatch[1]);
      const b = (await request.json()) as { allow_self_enroll?: boolean };
      await db
        .prepare("UPDATE classrooms SET allow_self_enroll = ? WHERE id = ?")
        .bind(b.allow_self_enroll ? 1 : 0, classId)
        .run();
      return jsonRes({ status: "updated" });
    }

    // Giáo viên thêm học sinh trực tiếp bằng Email
    const addStuMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/students$/);
    if (addStuMatch && method === "POST") {
      const classId = decodeURIComponent(addStuMatch[1]);
      const b = (await request.json()) as { email?: string; full_name?: string };
      const email = (b.email || "").trim().toLowerCase();
      if (!email) return jsonRes({ error: "Vui lòng nhập email học sinh" }, 400);

      const user = await db
        .prepare("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?)")
        .bind(email)
        .first<{ id: string; full_name: string; email: string }>();

      if (!user) {
        return jsonRes({ error: `Chưa tìm thấy tài khoản học sinh với email "${email}". Hãy yêu cầu học sinh đăng ký tài khoản trước.` }, 404);
      }

      await db
        .prepare(
          "INSERT OR REPLACE INTO classroom_members (classroom_id, user_id, user_name, user_email, status, joined_at) VALUES (?, ?, ?, ?, 'active', datetime('now'))"
        )
        .bind(classId, user.id, user.full_name, user.email)
        .run();
      return jsonRes({ status: "added", student: user }, 201);
    }

    // Giáo viên xóa học sinh khỏi lớp
    const delStuMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/students\/([^/]+)$/);
    if (delStuMatch && method === "DELETE") {
      await db
        .prepare("DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?")
        .bind(decodeURIComponent(delStuMatch[1]), decodeURIComponent(delStuMatch[2]))
        .run();
      return jsonRes({ status: "removed" });
    }

    // Giáo viên giao Giáo án (lesson), Bài lập trình (coding) hoặc Bài kiểm tra trực tuyến (exam) cho lớp
    const addAsgMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/assignments$/);
    if (addAsgMatch && method === "POST") {
      const classId = decodeURIComponent(addAsgMatch[1]);
      const b = (await request.json()) as { item_type?: string; item_id?: string; item_title?: string; due_at?: string };
      if (!b.item_id || !b.item_title || !["lesson", "exam", "coding"].includes(b.item_type || "")) {
        return jsonRes({ error: "Dữ liệu giao giáo án / lập trình / bài kiểm tra không hợp lệ" }, 400);
      }
      const asgId = `asg-${crypto.randomUUID().slice(0, 8)}`;
      await db
        .prepare(
          "INSERT INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, due_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(asgId, classId, b.item_type, b.item_id, b.item_title, b.due_at || "")
        .run();
      return jsonRes({ assignment: { id: asgId } }, 201);
    }

    // Gỡ giáo án / bài kiểm tra khỏi lớp
    const delAsgMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/assignments\/([^/]+)$/);
    if (delAsgMatch && method === "DELETE") {
      await db
        .prepare("DELETE FROM classroom_assignments WHERE classroom_id = ? AND id = ?")
        .bind(decodeURIComponent(delAsgMatch[1]), decodeURIComponent(delAsgMatch[2]))
        .run();
      return jsonRes({ status: "deleted" });
    }
  }

  return null;
}
