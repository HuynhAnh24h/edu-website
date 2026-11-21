import { JwtClaims } from "./crypto";
import { createSafetyIncident, notifyUser, scanContentWithSafetyBot } from "./safety";
import { pushRealtimeEvent } from "./realtime";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

interface CourseModule {
  id: string;
  title: string;
  duration: string;
  video_url: string;
  content: string;
}

function isAdminRole(role?: string): boolean {
  return role === "super_admin" || role === "content_admin";
}

function isTeacherOrAdmin(role?: string): boolean {
  return role === "teacher" || role === "content_admin" || role === "super_admin";
}

export async function handleCourseRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  url: URL,
  claims: JwtClaims | null,
  jsonRes: JsonFn,
  hub?: DurableObjectNamespace
): Promise<Response | null> {
  // 1. GET /api/v1/courses — Danh sách khóa học kèm điểm 5 sao, biểu đồ đánh giá & tiến độ học
  if (path === "/api/v1/courses" && method === "GET") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const subject = (url.searchParams.get("subject") || "").trim().toLowerCase();

    const [coursesRes, reviewsRes, enrollCountsRes, myEnrollsRes] = await Promise.all([
      db
        .prepare(
          `SELECT c.*, COALESCE(tp.is_verified, 0) as teacher_verified
           FROM courses c
           LEFT JOIN teacher_profiles tp ON tp.user_id = c.teacher_id
           WHERE c.status = 'published'
           ORDER BY COALESCE(tp.is_verified, 0) DESC, c.created_at DESC
           LIMIT 60`
        )
        .all<Record<string, unknown>>(),
      db.prepare("SELECT * FROM course_reviews ORDER BY updated_at DESC").all<Record<string, unknown>>(),
      db.prepare("SELECT course_id, COUNT(*) as cnt FROM course_enrollments GROUP BY course_id").all<{ course_id: string; cnt: number }>(),
      claims
        ? db
            .prepare("SELECT course_id, completed_lessons_json FROM course_enrollments WHERE user_id = ?")
            .bind(claims.uid)
            .all<{ course_id: string; completed_lessons_json: string }>()
        : Promise.resolve({ results: [] as { course_id: string; completed_lessons_json: string }[] }),
    ]);

    const enrollCountMap = new Map(enrollCountsRes.results.map((r) => [r.course_id, r.cnt]));
    const myEnrollMap = new Map(
      myEnrollsRes.results.map((r) => {
        let done: string[] = [];
        try {
          done = JSON.parse(r.completed_lessons_json || "[]");
        } catch {
          done = [];
        }
        return [r.course_id, done];
      })
    );

    const reviewsByCourse = new Map<string, Record<string, unknown>[]>();
    for (const r of reviewsRes.results) {
      const cid = String(r.course_id);
      const list = reviewsByCourse.get(cid) || [];
      list.push(r);
      reviewsByCourse.set(cid, list);
    }

    let list = coursesRes.results.map((c) => {
      const id = String(c.id);
      let modules: CourseModule[] = [];
      try {
        modules = JSON.parse(String(c.modules_json || "[]"));
      } catch {
        modules = [];
      }
      const reviews = reviewsByCourse.get(id) || [];
      const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let sum = 0;
      for (const r of reviews) {
        const star = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
        breakdown[star] = (breakdown[star] || 0) + 1;
        sum += star;
      }
      const avgRating = reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0;
      const myReview = claims ? reviews.find((r) => String(r.user_id) === claims.uid) || null : null;

      return {
        id,
        teacher_id: String(c.teacher_id),
        teacher_name: String(c.teacher_name),
        teacher_school: String(c.teacher_school || ""),
        teacher_verified: Number(c.teacher_verified || 0) === 1,
        title: String(c.title),
        subject_name: String(c.subject_name),
        grade_label: String(c.grade_label || "Lớp 12"),
        level: String(c.level || "Cơ bản"),
        cover_theme: String(c.cover_theme || "indigo"),
        summary: String(c.summary || ""),
        modules,
        created_at: String(c.created_at),
        student_count: enrollCountMap.get(id) || 0,
        enrolled_by_me: myEnrollMap.has(id),
        completed_lessons: myEnrollMap.get(id) || [],
        avg_rating: avgRating,
        review_count: reviews.length,
        rating_breakdown: breakdown,
        my_review: myReview,
        reviews,
      };
    });

    if (q) {
      list = list.filter((c) =>
        `${c.title} ${c.summary} ${c.subject_name} ${c.teacher_name} ${c.grade_label}`.toLowerCase().includes(q)
      );
    }
    if (subject && subject !== "all") {
      list = list.filter((c) => c.subject_name.toLowerCase().includes(subject));
    }

    return jsonRes({ courses: list });
  }

  // 2. POST /api/v1/courses — Giáo viên / Admin đăng Khóa học mới
  if (path === "/api/v1/courses" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để đăng khóa học." }, 401);
    if (!isTeacherOrAdmin(claims.role)) {
      return jsonRes({ error: "Chỉ tài khoản Giáo viên & Quản trị viên mới được đăng khóa học." }, 403);
    }

    const author = await db
      .prepare("SELECT full_name, email, role, school_name, is_active FROM users WHERE id = ?")
      .bind(claims.uid)
      .first<{ full_name: string; email: string; role: string; school_name: string; is_active: number }>();
    if (!author || Number(author.is_active) === 0) {
      return jsonRes({ error: "Tài khoản đang bị tạm khóa." }, 403);
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      subject_name?: string;
      grade_label?: string;
      level?: string;
      cover_theme?: string;
      summary?: string;
      modules?: Partial<CourseModule>[];
    };

    const title = (body.title || "").trim();
    const summary = (body.summary || "").trim();
    const rawModules = Array.isArray(body.modules) ? body.modules : [];
    const cleanModules: CourseModule[] = rawModules
      .map((m, idx) => {
        const video = (m.video_url || "").trim().slice(0, 300);
        return {
          id: `m${idx + 1}`,
          title: (m.title || "").trim().slice(0, 160),
          duration: (m.duration || "20 phút").trim().slice(0, 40),
          video_url: /^https?:\/\//i.test(video) ? video : "",
          content: (m.content || "").trim().slice(0, 6000),
        };
      })
      .filter((m) => m.title.length > 0 && m.content.length > 0);

    if (title.length < 4 || summary.length < 10 || cleanModules.length === 0) {
      return jsonRes(
        { error: "Vui lòng nhập đầy đủ Tên khóa học, Mô tả và ít nhất 1 Bài học có nội dung." },
        400
      );
    }

    const allText = `${title}\n${summary}\n${cleanModules.map((m) => `${m.title}\n${m.content}`).join("\n")}`;
    const scan = scanContentWithSafetyBot(allText, { isLesson: true });
    const courseId = `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (scan.blockImmediately && scan.category) {
      const inc = await createSafetyIncident(
        db,
        {
          category: scan.category,
          severity: scan.severity,
          source_type: "course",
          source_id: courseId,
          suspect_user_id: claims.uid,
          suspect_name: author.full_name,
          suspect_email: author.email,
          suspect_role: author.role,
          matched_keywords: scan.matchedKeywords,
          content_snapshot: allText.slice(0, 3000),
        },
        hub
      );
      return jsonRes(
        { error: `${scan.reason} Khóa học đã bị chặn và gửi cảnh báo (${inc.incident_code}) về Quản trị viên.` },
        400
      );
    }

    const allowedThemes = new Set(["indigo", "emerald", "rose", "amber", "sky"]);
    const theme = allowedThemes.has(body.cover_theme || "") ? String(body.cover_theme) : "indigo";

    await db
      .prepare(
        `INSERT INTO courses (id, teacher_id, teacher_name, teacher_school, title, subject_name, grade_label, level, cover_theme, summary, modules_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
      )
      .bind(
        courseId,
        claims.uid,
        author.full_name,
        author.school_name || "",
        title.slice(0, 180),
        (body.subject_name || "Tổng hợp").trim().slice(0, 60),
        (body.grade_label || "Lớp 12").trim().slice(0, 40),
        (body.level || "Cơ bản → Nâng cao").trim().slice(0, 60),
        theme,
        summary.slice(0, 1500),
        JSON.stringify(cleanModules)
      )
      .run();

    if (scan.flagged && scan.category) {
      await createSafetyIncident(
        db,
        {
          category: scan.category,
          severity: scan.severity,
          source_type: "course",
          source_id: courseId,
          suspect_user_id: claims.uid,
          suspect_name: author.full_name,
          suspect_email: author.email,
          suspect_role: author.role,
          matched_keywords: scan.matchedKeywords,
          content_snapshot: allText.slice(0, 3000),
        },
        hub
      );
    }

    await pushRealtimeEvent(hub, "social:feed", { type: "course_update", course_id: courseId });
    return jsonRes({ id: courseId, message: "Đã xuất bản khóa học mới lên Cổng Khóa học!" }, 201);
  }

  // 3. DELETE /api/v1/courses/:id — Tác giả hoặc Admin xóa khóa học
  const delMatch = path.match(/^\/api\/v1\/courses\/([^/]+)$/);
  if (delMatch && method === "DELETE") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const courseId = decodeURIComponent(delMatch[1]);
    const c = await db.prepare("SELECT teacher_id FROM courses WHERE id = ?").bind(courseId).first<{ teacher_id: string }>();
    if (!c) return jsonRes({ error: "Không tìm thấy khóa học" }, 404);
    if (c.teacher_id !== claims.uid && !isAdminRole(claims.role)) {
      return jsonRes({ error: "Bạn không có quyền xóa khóa học này" }, 403);
    }
    await db.batch([
      db.prepare("DELETE FROM course_reviews WHERE course_id = ?").bind(courseId),
      db.prepare("DELETE FROM course_enrollments WHERE course_id = ?").bind(courseId),
      db.prepare("DELETE FROM courses WHERE id = ?").bind(courseId),
    ]);
    await pushRealtimeEvent(hub, "social:feed", { type: "course_update", course_id: courseId });
    return jsonRes({ ok: true });
  }

  // 4. POST /api/v1/courses/:id/enroll — Học sinh ghi danh vào học miễn phí
  const enrollMatch = path.match(/^\/api\/v1\/courses\/([^/]+)\/enroll$/);
  if (enrollMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để tham gia khóa học" }, 401);
    const courseId = decodeURIComponent(enrollMatch[1]);
    await db
      .prepare("INSERT OR IGNORE INTO course_enrollments (course_id, user_id, completed_lessons_json) VALUES (?, ?, '[]')")
      .bind(courseId, claims.uid)
      .run();
    await pushRealtimeEvent(hub, "social:feed", { type: "course_update", course_id: courseId });
    return jsonRes({ ok: true, enrolled: true });
  }

  // 5. POST /api/v1/courses/:id/progress — Đánh dấu hoàn thành bài học trong khóa
  const progMatch = path.match(/^\/api\/v1\/courses\/([^/]+)\/progress$/);
  if (progMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const courseId = decodeURIComponent(progMatch[1]);
    const body = (await request.json().catch(() => ({}))) as { lesson_id?: string };
    const lessonId = (body.lesson_id || "").trim();
    if (!lessonId) return jsonRes({ error: "Thiếu mã bài học" }, 400);

    const existing = await db
      .prepare("SELECT completed_lessons_json FROM course_enrollments WHERE course_id = ? AND user_id = ?")
      .bind(courseId, claims.uid)
      .first<{ completed_lessons_json: string }>();

    let list: string[] = [];
    if (existing) {
      try {
        list = JSON.parse(existing.completed_lessons_json || "[]");
      } catch {
        list = [];
      }
    }
    if (list.includes(lessonId)) {
      list = list.filter((x) => x !== lessonId);
    } else {
      list.push(lessonId);
    }

    await db
      .prepare(
        `INSERT INTO course_enrollments (course_id, user_id, completed_lessons_json)
         VALUES (?, ?, ?)
         ON CONFLICT(course_id, user_id) DO UPDATE SET completed_lessons_json = excluded.completed_lessons_json`
      )
      .bind(courseId, claims.uid, JSON.stringify(list))
      .run();

    return jsonRes({ ok: true, completed_lessons: list });
  }

  // 6. POST /api/v1/courses/:id/reviews — Học sinh đánh giá 1-5 Sao + Bình luận khóa học (Real-time!)
  const revMatch = path.match(/^\/api\/v1\/courses\/([^/]+)\/reviews$/);
  if (revMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để đánh giá khóa học" }, 401);
    const courseId = decodeURIComponent(revMatch[1]);

    const me = await db
      .prepare("SELECT id, email, full_name, role, is_active FROM users WHERE id = ?")
      .bind(claims.uid)
      .first<{ id: string; email: string; full_name: string; role: string; is_active: number }>();
    if (!me || Number(me.is_active) === 0) {
      return jsonRes({ error: "Tài khoản đang bị tạm khóa." }, 403);
    }

    const course = await db
      .prepare("SELECT id, title, teacher_id FROM courses WHERE id = ?")
      .bind(courseId)
      .first<{ id: string; title: string; teacher_id: string }>();
    if (!course) return jsonRes({ error: "Không tìm thấy khóa học" }, 404);

    const body = (await request.json().catch(() => ({}))) as { rating?: number; comment?: string };
    const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating || 5))));
    const comment = (body.comment || "").trim();
    if (comment.length < 3) {
      return jsonRes({ error: "Vui lòng viết vài dòng nhận xét về khóa học nhé!" }, 400);
    }

    // BOT Quét An toàn cho bình luận đánh giá khóa học
    const scan = scanContentWithSafetyBot(comment);
    if (scan.blockImmediately && scan.category) {
      const inc = await createSafetyIncident(
        db,
        {
          category: scan.category,
          severity: scan.severity,
          source_type: "course_review",
          source_id: courseId,
          suspect_user_id: me.id,
          suspect_name: me.full_name,
          suspect_email: me.email,
          suspect_role: me.role,
          matched_keywords: scan.matchedKeywords,
          content_snapshot: `[Đánh giá khóa học ${course.title}]: ${comment}`,
        },
        hub
      );
      return jsonRes(
        { error: `${scan.reason} Đánh giá đã bị chặn và gửi cảnh báo (${inc.incident_code}) về Quản trị viên.` },
        400
      );
    }

    const revId = `crev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db
      .prepare(
        `INSERT INTO course_reviews (id, course_id, user_id, user_name, user_role, rating, comment, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(course_id, user_id) DO UPDATE SET
           rating = excluded.rating,
           comment = excluded.comment,
           user_name = excluded.user_name,
           updated_at = datetime('now')`
      )
      .bind(revId, courseId, me.id, me.full_name, me.role, rating, comment.slice(0, 1500))
      .run();

    // Thông báo real-time tới Giáo viên đứng lớp khi có học sinh đánh giá sao!
    const tasks: Promise<unknown>[] = [
      pushRealtimeEvent(hub, "social:feed", { type: "course_update", course_id: courseId }),
    ];
    if (course.teacher_id !== me.id) {
      tasks.push(
        notifyUser(
          db,
          course.teacher_id,
          "course_review",
          `Đánh giá mới ${"★".repeat(rating)} (${rating}/5) cho khóa học`,
          `${me.full_name} vừa đánh giá "${course.title}": ${comment.slice(0, 120)}`,
          "/khoa-hoc",
          hub
        )
      );
    }
    await Promise.all(tasks);

    return jsonRes({ ok: true, message: `Cảm ơn bạn đã gửi đánh giá ${rating} sao cho khóa học!` }, 201);
  }

  return null;
}
