import { JwtClaims } from "./crypto";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

const CODING_TRACK_META = [
  { id: "html", name: "HTML5", total: 3 },
  { id: "css", name: "CSS3", total: 3 },
  { id: "javascript", name: "JavaScript", total: 3 },
  { id: "typescript", name: "TypeScript", total: 3 },
  { id: "react", name: "ReactJS", total: 3 },
  { id: "nextjs", name: "Next.js", total: 3 },
  { id: "nodejs", name: "Node.js", total: 3 },
  { id: "nestjs", name: "NestJS", total: 3 },
  { id: "python", name: "Python", total: 3 },
  { id: "golang", name: "Golang", total: 3 },
  { id: "mongodb", name: "MongoDB", total: 3 },
  { id: "postgresql", name: "PostgreSQL", total: 3 },
];

async function ensureStudentLinkCode(db: D1Database, studentId: string): Promise<string> {
  const existing = await db
    .prepare("SELECT link_code FROM student_link_codes WHERE student_id = ?")
    .bind(studentId)
    .first<{ link_code: string }>();
  if (existing?.link_code) return existing.link_code;

  const code = `PH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await db
    .prepare("INSERT OR IGNORE INTO student_link_codes (student_id, link_code) VALUES (?, ?)")
    .bind(studentId, code)
    .run();
  const row = await db
    .prepare("SELECT link_code FROM student_link_codes WHERE student_id = ?")
    .bind(studentId)
    .first<{ link_code: string }>();
  return row?.link_code || code;
}

async function buildStudentPortfolio(db: D1Database, studentId: string) {
  const user = await db
    .prepare("SELECT id, email, full_name, role, current_grade, school_name, created_at FROM users WHERE id = ?")
    .bind(studentId)
    .first<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      current_grade: number | null;
      school_name: string;
      created_at: string;
    }>();
  if (!user) return null;

  const [
    linkCode,
    attemptsRes,
    codingRes,
    certsRes,
    enrollRes,
    projectsRes,
    reviewsRes,
    liveAttRes,
    classroomsRes,
    safetyRes,
  ] = await Promise.all([
    ensureStudentLinkCode(db, studentId),
    db
      .prepare(
        `SELECT a.id, a.exam_id, a.score, a.max_score, a.correct_count, a.total_questions, a.duration_sec, a.graded_at,
                e.title as exam_title, e.subject_name, e.grade_id
         FROM exam_attempts a
         LEFT JOIN exams e ON e.id = a.exam_id
         WHERE a.user_id = ? AND a.status = 'graded'
         ORDER BY a.graded_at DESC
         LIMIT 20`
      )
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare("SELECT track_id, lesson_id, passed_at FROM coding_progress WHERE user_id = ?")
      .bind(studentId)
      .all<{ track_id: string; lesson_id: string; passed_at: string }>(),
    db
      .prepare("SELECT * FROM course_certificates WHERE user_id = ? ORDER BY issued_at DESC")
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT ce.course_id, ce.completed_lessons_json, ce.enrolled_at, c.title, c.subject_name, c.modules_json
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.user_id = ?
         ORDER BY ce.enrolled_at DESC`
      )
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare("SELECT * FROM student_submissions WHERE student_id = ? ORDER BY created_at DESC LIMIT 20")
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT r.submission_id, r.teacher_name, r.score, r.badge, r.feedback
         FROM student_submission_reviews r
         JOIN student_submissions s ON s.id = r.submission_id
         WHERE s.student_id = ?`
      )
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT la.session_id, la.joined_at, la.last_seen_at, ls.title as session_title, c.name as classroom_name
         FROM live_attendance la
         LEFT JOIN classroom_live_sessions ls ON ls.id = la.session_id
         LEFT JOIN classrooms c ON c.id = la.classroom_id
         WHERE la.user_id = ?
         ORDER BY la.joined_at DESC
         LIMIT 15`
      )
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT c.id, c.code, c.name, c.subject_name, c.teacher_id, c.teacher_name
         FROM classroom_members cm
         JOIN classrooms c ON c.id = cm.classroom_id
         WHERE cm.user_id = ?`
      )
      .bind(studentId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM safety_incidents WHERE suspect_user_id = ? AND status IN ('open', 'warned', 'locked', 'escalated_police')"
      )
      .bind(studentId)
      .first<{ cnt: number }>(),
  ]);

  const exams = attemptsRes.results.map((a) => ({
    id: String(a.id),
    exam_id: String(a.exam_id),
    exam_title: String(a.exam_title || "Đề thi trắc nghiệm"),
    subject_name: String(a.subject_name || "Tổng hợp"),
    grade_id: Number(a.grade_id || user.current_grade || 12),
    score: Number(a.score || 0),
    max_score: Number(a.max_score || 10),
    correct_count: Number(a.correct_count || 0),
    total_questions: Number(a.total_questions || 0),
    duration_sec: Number(a.duration_sec || 0),
    graded_at: String(a.graded_at || ""),
  }));

  const avgExamScore =
    exams.length > 0
      ? Math.round((exams.reduce((acc, e) => acc + e.score, 0) / exams.length) * 100) / 100
      : null;

  const trackCounts = new Map<string, number>();
  for (const cp of codingRes.results) {
    trackCounts.set(cp.track_id, (trackCounts.get(cp.track_id) || 0) + 1);
  }
  const codingTracks = CODING_TRACK_META.map((t) => ({
    ...t,
    passed: trackCounts.get(t.id) || 0,
    percent: Math.min(100, Math.round(((trackCounts.get(t.id) || 0) / t.total) * 100)),
  }));

  const courses = enrollRes.results.map((c) => {
    let done: string[] = [];
    let mods: unknown[] = [];
    try {
      done = JSON.parse(String(c.completed_lessons_json || "[]"));
      mods = JSON.parse(String(c.modules_json || "[]"));
    } catch {
      // ignore
    }
    const total = Math.max(1, mods.length);
    return {
      course_id: String(c.course_id),
      title: String(c.title),
      subject_name: String(c.subject_name),
      done_count: done.length,
      total_count: mods.length,
      percent: Math.min(100, Math.round((done.length / total) * 100)),
    };
  });

  const revBySub = new Map<string, Record<string, unknown>[]>();
  for (const r of reviewsRes.results) {
    const sid = String(r.submission_id);
    const list = revBySub.get(sid) || [];
    list.push(r);
    revBySub.set(sid, list);
  }

  const projects = projectsRes.results.map((p) => {
    const revs = revBySub.get(String(p.id)) || [];
    const avg =
      revs.length > 0
        ? Math.round((revs.reduce((acc, r) => acc + Number(r.score || 0), 0) / revs.length) * 10) / 10
        : null;
    return {
      id: String(p.id),
      title: String(p.title),
      submission_type: String(p.submission_type),
      subject_name: String(p.subject_name),
      avg_score: avg,
      reviews: revs,
      created_at: String(p.created_at),
    };
  });

  return {
    student: {
      ...user,
      parent_link_code: linkCode,
    },
    summary: {
      exams_taken: exams.length,
      avg_exam_score: avgExamScore,
      coding_passed: codingRes.results.length,
      coding_total: CODING_TRACK_META.reduce((s, t) => s + t.total, 0),
      certificates_count: certsRes.results.length,
      projects_count: projects.length,
      live_sessions_attended: liveAttRes.results.length,
      safety_alerts_count: Number(safetyRes?.cnt || 0),
    },
    exams,
    coding_tracks: codingTracks,
    courses,
    certificates: certsRes.results,
    projects,
    live_attendance: liveAttRes.results,
    classrooms: classroomsRes.results,
  };
}

export async function handlePortfolioAndParentRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonFn
): Promise<Response | null> {
  // 1. GET /api/v1/portfolio/me — Học bạ Số & Hồ sơ Năng lực của học sinh đang đăng nhập
  if (path === "/api/v1/portfolio/me" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để xem Học bạ Số" }, 401);
    const portfolio = await buildStudentPortfolio(db, claims.uid);
    if (!portfolio) return jsonRes({ error: "Không tìm thấy hồ sơ học sinh" }, 404);
    return jsonRes(portfolio);
  }

  // 2. POST /api/v1/parent/link — Phụ huynh nhập Mã liên kết (VD: PH-MINHANH12) để theo dõi con miễn phí
  if (path === "/api/v1/parent/link" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập tài khoản Phụ huynh để liên kết." }, 401);
    const body = (await request.json().catch(() => ({}))) as { link_code?: string; relation_label?: string };
    const code = (body.link_code || "").trim().toUpperCase();
    if (!code) return jsonRes({ error: "Vui lòng nhập Mã liên kết Phụ huynh của con (VD: PH-MINHANH12)." }, 400);

    const row = await db
      .prepare("SELECT student_id FROM student_link_codes WHERE UPPER(link_code) = ?")
      .bind(code)
      .first<{ student_id: string }>();
    if (!row) {
      return jsonRes({ error: "Mã liên kết không tồn tại. Hãy xem mã trong mục Học bạ Số (/hoc-ba) của con!" }, 404);
    }
    if (row.student_id === claims.uid) {
      return jsonRes({ error: "Bạn đang dùng chính tài khoản học sinh này rồi." }, 400);
    }

    const relation = (body.relation_label || "Phụ huynh").trim().slice(0, 40);
    await db
      .prepare(
        `INSERT INTO parent_student_links (parent_id, student_id, relation_label)
         VALUES (?, ?, ?)
         ON CONFLICT(parent_id, student_id) DO UPDATE SET relation_label = excluded.relation_label`
      )
      .bind(claims.uid, row.student_id, relation)
      .run();

    const child = await db
      .prepare("SELECT full_name FROM users WHERE id = ?")
      .bind(row.student_id)
      .first<{ full_name: string }>();

    return jsonRes(
      {
        ok: true,
        message: `Đã liên kết thành công với học sinh ${child?.full_name || ""}! Bạn có thể theo dõi tiến độ học tập của con ngay bên dưới.`,
      },
      201
    );
  }

  // 3. GET /api/v1/parent/children — Danh sách con đã liên kết & báo cáo học tập đầy đủ
  if (path === "/api/v1/parent/children" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const links = await db
      .prepare("SELECT student_id, relation_label, linked_at FROM parent_student_links WHERE parent_id = ? ORDER BY linked_at DESC")
      .bind(claims.uid)
      .all<{ student_id: string; relation_label: string; linked_at: string }>();

    const children = [];
    for (const l of links.results) {
      const p = await buildStudentPortfolio(db, l.student_id);
      if (p) {
        children.push({
          relation_label: l.relation_label,
          linked_at: l.linked_at,
          ...p,
        });
      }
    }
    return jsonRes({ children });
  }

  // 4. DELETE /api/v1/parent/links/:studentId — Hủy liên kết theo dõi
  const unlinkMatch = path.match(/^\/api\/v1\/parent\/links\/([^/]+)$/);
  if (unlinkMatch && method === "DELETE") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const sid = decodeURIComponent(unlinkMatch[1]);
    await db
      .prepare("DELETE FROM parent_student_links WHERE parent_id = ? AND student_id = ?")
      .bind(claims.uid, sid)
      .run();
    return jsonRes({ ok: true, message: "Đã hủy liên kết theo dõi." });
  }

  return null;
}
