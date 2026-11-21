import { JwtClaims } from "./crypto";
import { SUBJECT_NAMES } from "./seed";

type JsonResFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

function genJoinCode(subjectCode: string, gradeId: number): string {
  const prefix = subjectCode.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4) || "LOP";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}${gradeId}-${rand}`;
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
    const g = Number(url.searchParams.get("grade") || 0);
    const sub = url.searchParams.get("subject") || "";
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
        (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'lesson') as lesson_count,
        (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
      FROM classrooms c WHERE 1=1
    `;
    const binds: unknown[] = [];
    if (g > 0) {
      sql += " AND c.grade_id = ?";
      binds.push(g);
    }
    if (sub && sub !== "all") {
      sql += " AND c.subject_code = ?";
      binds.push(sub);
    }
    sql += " ORDER BY c.created_at DESC";

    const { results } = await db.prepare(sql).bind(...binds).all<Record<string, unknown>>();

    let enrolledSet = new Set<string>();
    if (claims) {
      const mems = await db
        .prepare("SELECT classroom_id FROM classroom_members WHERE user_id = ? AND status = 'active'")
        .bind(claims.uid)
        .all<{ classroom_id: string }>();
      enrolledSet = new Set(mems.results.map((r) => r.classroom_id));
    }

    const classrooms = results.map((c) => ({
      ...c,
      allow_self_enroll: Boolean(c.allow_self_enroll),
      is_enrolled: enrolledSet.has(String(c.id)),
    }));
    return jsonRes({ classrooms });
  }

  // === 2. LỚP HỌC CỦA TÔI (Học sinh đã đăng ký / Giáo viên đang phụ trách) ===
  if (path === "/api/v1/classrooms/my" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để xem lớp học của bạn" }, 401);
    const isStaff = ["teacher", "content_admin", "super_admin"].includes(claims.role);

    const sql = isStaff
      ? `SELECT c.*,
           (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'lesson') as lesson_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
         FROM classrooms c
         ${claims.role === "super_admin" ? "" : "WHERE c.teacher_id = ?"}
         ORDER BY c.created_at DESC`
      : `SELECT c.*,
           (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id AND m.status = 'active') as student_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'lesson') as lesson_count,
           (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id AND a.item_type = 'exam') as exam_count
         FROM classrooms c
         JOIN classroom_members cm ON cm.classroom_id = c.id
         WHERE cm.user_id = ? AND cm.status = 'active'
         ORDER BY cm.joined_at DESC`;

    const stmt =
      isStaff && claims.role === "super_admin"
        ? db.prepare(sql)
        : db.prepare(sql).bind(claims.uid);
    const { results } = await stmt.all<Record<string, unknown>>();
    return jsonRes({
      classrooms: results.map((c) => ({ ...c, allow_self_enroll: Boolean(c.allow_self_enroll), is_enrolled: true })),
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

  // === 4. CHI TIẾT LỚP HỌC (Giáo án + Bài kiểm tra + Danh sách học sinh + Bảng điểm) ===
  const detailMatch = path.match(/^\/api\/v1\/classrooms\/([^/]+)$/);
  if (detailMatch && method === "GET") {
    const classId = decodeURIComponent(detailMatch[1]);
    const cls = await db.prepare("SELECT * FROM classrooms WHERE id = ?").bind(classId).first<Record<string, unknown>>();
    if (!cls) return jsonRes({ error: "Không tìm thấy lớp học" }, 404);

    const { results: assignments } = await db
      .prepare("SELECT * FROM classroom_assignments WHERE classroom_id = ? ORDER BY display_order ASC, assigned_at DESC")
      .bind(classId)
      .all<Record<string, unknown>>();

    const { results: students } = await db
      .prepare("SELECT user_id, user_name, user_email, status, joined_at FROM classroom_members WHERE classroom_id = ? ORDER BY joined_at DESC")
      .bind(classId)
      .all<Record<string, unknown>>();

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
      classroom: { ...cls, allow_self_enroll: Boolean(cls.allow_self_enroll), is_enrolled: isEnrolled },
      assignments,
      students: isStaff ? students : [],
      student_count: students.length,
      gradebook,
    });
  }

  // === 5. CÁC ENDPOINT QUẢN TRỊ LỚP HỌC CỦA GIÁO VIÊN / ADMIN ===
  if (path.startsWith("/api/v1/cms/classrooms")) {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (!["teacher", "content_admin", "super_admin"].includes(claims.role)) {
      return jsonRes({ error: "Chỉ Giáo viên hoặc Admin mới được quản lý lớp học" }, 403);
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
      const gradeId = b.grade_id || 12;
      const sub = b.subject_code || "toan";
      const id = `cls-${crypto.randomUUID().slice(0, 8)}`;
      const code = genJoinCode(sub, gradeId);
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

    // Giáo viên giao Giáo án (lesson) hoặc Bài kiểm tra trực tuyến (exam) cho lớp
    const addAsgMatch = path.match(/^\/api\/v1\/cms\/classrooms\/([^/]+)\/assignments$/);
    if (addAsgMatch && method === "POST") {
      const classId = decodeURIComponent(addAsgMatch[1]);
      const b = (await request.json()) as { item_type?: string; item_id?: string; item_title?: string; due_at?: string };
      if (!b.item_id || !b.item_title || !["lesson", "exam"].includes(b.item_type || "")) {
        return jsonRes({ error: "Dữ liệu giao giáo án / bài kiểm tra không hợp lệ" }, 400);
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
