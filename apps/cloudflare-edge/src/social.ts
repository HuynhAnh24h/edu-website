import { JwtClaims } from "./crypto";
import { SUBJECT_NAMES } from "./seed";
import { createSafetyIncident, notifyUser, scanContentWithHybridAI } from "./safety";
import { pushRealtimeEvent } from "./realtime";
import { computeTeacherReputation } from "./admin-ops";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

const ALLOWED_CATEGORIES = new Set([
  "lesson_share",
  "exam_share",
  "teaching_tip",
  "discussion",
  "class_promo",
]);

function isAdminRole(role?: string): boolean {
  return role === "super_admin" || role === "content_admin";
}

function isTeacherOrAdmin(role?: string): boolean {
  return role === "teacher" || role === "content_admin" || role === "super_admin";
}

export async function handleSocialRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  url: URL,
  claims: JwtClaims | null,
  jsonRes: JsonFn,
  hub?: DurableObjectNamespace,
  ai?: Ai
): Promise<Response | null> {
  // 1. GET /api/v1/social/stats — Thống kê nhanh Mạng xã hội Giáo viên
  if (path === "/api/v1/social/stats" && method === "GET") {
    const [postsCnt, teachersCnt, commentsCnt] = await Promise.all([
      db.prepare("SELECT COUNT(*) as cnt FROM teacher_posts WHERE status = 'published'").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role IN ('teacher', 'content_admin', 'super_admin') AND is_active = 1").first<{ cnt: number }>(),
      db.prepare("SELECT COUNT(*) as cnt FROM teacher_post_comments").first<{ cnt: number }>(),
    ]);

    let followingCnt = 0;
    let savedCnt = 0;
    let myPostsCnt = 0;
    if (claims) {
      const [fRow, sRow, mRow] = await Promise.all([
        db.prepare("SELECT COUNT(*) as cnt FROM teacher_follows WHERE follower_id = ?").bind(claims.uid).first<{ cnt: number }>(),
        db.prepare("SELECT COUNT(*) as cnt FROM teacher_post_bookmarks WHERE user_id = ?").bind(claims.uid).first<{ cnt: number }>(),
        db.prepare("SELECT COUNT(*) as cnt FROM teacher_posts WHERE author_id = ?").bind(claims.uid).first<{ cnt: number }>(),
      ]);
      followingCnt = fRow?.cnt || 0;
      savedCnt = sRow?.cnt || 0;
      myPostsCnt = mRow?.cnt || 0;
    }

    return jsonRes({
      total_posts: postsCnt?.cnt || 0,
      total_teachers: teachersCnt?.cnt || 0,
      total_comments: commentsCnt?.cnt || 0,
      following_count: followingCnt,
      saved_count: savedCnt,
      my_posts_count: myPostsCnt,
    });
  }

  // 2. GET /api/v1/social/teachers — Danh sách Giáo viên nổi bật để kết nối / theo dõi
  if (path === "/api/v1/social/teachers" && method === "GET") {
    const users = await db
      .prepare(
        `SELECT u.id, u.full_name, u.role, u.school_name, u.created_at,
                COALESCE(tp.is_verified, 0) as is_verified,
                COALESCE(tp.specialty, '') as specialty
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
         WHERE u.role IN ('teacher', 'content_admin', 'super_admin') AND u.is_active = 1
         ORDER BY COALESCE(tp.is_verified, 0) DESC, CASE WHEN u.role = 'teacher' THEN 0 ELSE 1 END, u.created_at ASC
         LIMIT 24`
      )
      .all<{
        id: string;
        full_name: string;
        role: string;
        school_name: string;
        created_at: string;
        is_verified: number;
        specialty: string;
      }>();

    const [postCounts, followerCounts, classCounts, likesByAuthor, clonesByAuthor, courseRatings, safetyPenalties, myFollows] =
      await Promise.all([
        db
          .prepare("SELECT author_id, COUNT(*) as cnt FROM teacher_posts WHERE status = 'published' GROUP BY author_id")
          .all<{ author_id: string; cnt: number }>(),
        db
          .prepare("SELECT teacher_id, COUNT(*) as cnt FROM teacher_follows GROUP BY teacher_id")
          .all<{ teacher_id: string; cnt: number }>(),
        db
          .prepare("SELECT teacher_id, COUNT(*) as cnt FROM classrooms GROUP BY teacher_id")
          .all<{ teacher_id: string; cnt: number }>(),
        db
          .prepare(
            `SELECT p.author_id, COUNT(*) as cnt
             FROM teacher_post_likes l JOIN teacher_posts p ON p.id = l.post_id
             GROUP BY p.author_id`
          )
          .all<{ author_id: string; cnt: number }>(),
        db
          .prepare(
            `SELECT p.author_id, COUNT(*) as cnt
             FROM teacher_post_clones cl JOIN teacher_posts p ON p.id = cl.post_id
             GROUP BY p.author_id`
          )
          .all<{ author_id: string; cnt: number }>(),
        db
          .prepare(
            `SELECT c.teacher_id, AVG(r.rating) as avg_r, COUNT(*) as cnt
             FROM course_reviews r JOIN courses c ON c.id = r.course_id
             GROUP BY c.teacher_id`
          )
          .all<{ teacher_id: string; avg_r: number; cnt: number }>(),
        db
          .prepare(
            "SELECT suspect_user_id, COUNT(*) as cnt FROM safety_incidents WHERE status IN ('warned', 'locked', 'escalated_police') GROUP BY suspect_user_id"
          )
          .all<{ suspect_user_id: string; cnt: number }>(),
        claims
          ? db
              .prepare("SELECT teacher_id FROM teacher_follows WHERE follower_id = ?")
              .bind(claims.uid)
              .all<{ teacher_id: string }>()
          : Promise.resolve({ results: [] as { teacher_id: string }[] }),
      ]);

    const pMap = new Map(postCounts.results.map((r) => [r.author_id, r.cnt]));
    const fMap = new Map(followerCounts.results.map((r) => [r.teacher_id, r.cnt]));
    const cMap = new Map(classCounts.results.map((r) => [r.teacher_id, r.cnt]));
    const lMap = new Map(likesByAuthor.results.map((r) => [r.author_id, r.cnt]));
    const clMap = new Map(clonesByAuthor.results.map((r) => [r.author_id, r.cnt]));
    const rMap = new Map(courseRatings.results.map((r) => [r.teacher_id, { avg: Number(r.avg_r || 0), cnt: Number(r.cnt || 0) }]));
    const penMap = new Map(safetyPenalties.results.map((r) => [r.suspect_user_id, r.cnt]));
    const followingSet = new Set(myFollows.results.map((r) => r.teacher_id));

    const teachers = users.results
      .map((u) => {
        const verified = Number(u.is_verified || 0) === 1;
        const postCount = pMap.get(u.id) || 0;
        const followerCount = fMap.get(u.id) || 0;
        const likesReceived = lMap.get(u.id) || 0;
        const clonesReceived = clMap.get(u.id) || 0;
        const ratingInfo = rMap.get(u.id) || { avg: 0, cnt: 0 };
        const rep = computeTeacherReputation({
          is_verified: verified,
          post_count: postCount,
          likes_received: likesReceived,
          clones_received: clonesReceived,
          follower_count: followerCount,
          avg_rating: ratingInfo.avg,
          review_count: ratingInfo.cnt,
          safety_penalties: penMap.get(u.id) || 0,
        });
        return {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          school_name: u.school_name || "Cộng đồng Owlie Edu",
          specialty: u.specialty || "",
          is_verified: verified,
          post_count: postCount,
          follower_count: followerCount,
          classroom_count: cMap.get(u.id) || 0,
          total_clones: clonesReceived,
          avg_course_rating: Math.round(ratingInfo.avg * 10) / 10,
          reputation_score: rep.score,
          reputation_tier: rep.tier,
          reputation_label: rep.label,
          is_following: followingSet.has(u.id),
        };
      })
      .sort((a, b) => b.reputation_score - a.reputation_score);

    return jsonRes({ teachers });
  }

  // 3. POST /api/v1/social/teachers/:id/follow — Theo dõi / Bỏ theo dõi giáo viên
  const followMatch = path.match(/^\/api\/v1\/social\/teachers\/([^/]+)\/follow$/);
  if (followMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để theo dõi giáo viên" }, 401);
    const teacherId = decodeURIComponent(followMatch[1]);
    if (teacherId === claims.uid) {
      return jsonRes({ error: "Không thể tự theo dõi chính mình" }, 400);
    }
    const existing = await db
      .prepare("SELECT 1 as ok FROM teacher_follows WHERE follower_id = ? AND teacher_id = ?")
      .bind(claims.uid, teacherId)
      .first();

    let isFollowing = false;
    if (existing) {
      await db
        .prepare("DELETE FROM teacher_follows WHERE follower_id = ? AND teacher_id = ?")
        .bind(claims.uid, teacherId)
        .run();
      isFollowing = false;
    } else {
      await db
        .prepare("INSERT OR IGNORE INTO teacher_follows (follower_id, teacher_id) VALUES (?, ?)")
        .bind(claims.uid, teacherId)
        .run();
      isFollowing = true;
    }
    const cnt = await db
      .prepare("SELECT COUNT(*) as cnt FROM teacher_follows WHERE teacher_id = ?")
      .bind(teacherId)
      .first<{ cnt: number }>();
    return jsonRes({ is_following: isFollowing, follower_count: cnt?.cnt || 0 });
  }

  // 4. GET /api/v1/social/posts — Bảng tin Mạng xã hội Giáo viên
  if (path === "/api/v1/social/posts" && method === "GET") {
    const category = url.searchParams.get("category") || "";
    const subject = url.searchParams.get("subject") || "";
    const gradeStr = url.searchParams.get("grade") || "";
    const feed = url.searchParams.get("feed") || "all";
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const includeHidden = url.searchParams.get("include_hidden") === "1" && isAdminRole(claims?.role);

    const where: string[] = [];
    const params: unknown[] = [];

    if (!includeHidden) {
      where.push("p.status = 'published'");
    }
    if (category && ALLOWED_CATEGORIES.has(category)) {
      where.push("p.category = ?");
      params.push(category);
    }
    if (subject && subject !== "all") {
      where.push("p.subject_code = ?");
      params.push(subject);
    }
    if (gradeStr !== "" && gradeStr !== "all") {
      where.push("p.grade_id = ?");
      params.push(Number(gradeStr));
    }
    if (feed === "mine") {
      if (!claims) return jsonRes({ posts: [] });
      where.push("p.author_id = ?");
      params.push(claims.uid);
    } else if (feed === "saved") {
      if (!claims) return jsonRes({ posts: [] });
      where.push("EXISTS (SELECT 1 FROM teacher_post_bookmarks b WHERE b.post_id = p.id AND b.user_id = ?)");
      params.push(claims.uid);
    } else if (feed === "following") {
      if (!claims) return jsonRes({ posts: [] });
      where.push("EXISTS (SELECT 1 FROM teacher_follows f WHERE f.teacher_id = p.author_id AND f.follower_id = ?)");
      params.push(claims.uid);
    }

    const sql = `
      SELECT p.*, COALESCE(tp.is_verified, 0) as author_verified
      FROM teacher_posts p
      LEFT JOIN teacher_profiles tp ON tp.user_id = p.author_id
      ${where.length > 0 ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT 60
    `;
    const rows = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();

    let filtered = rows.results;
    if (q) {
      filtered = filtered.filter((r) => {
        const hay = `${r.title} ${r.content} ${r.author_name} ${r.subject_name} ${r.tags_json}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const [likesAll, commentsAll, clonesAll, myLikes, mySaves, myFollows] = await Promise.all([
      db.prepare("SELECT post_id, COUNT(*) as cnt FROM teacher_post_likes GROUP BY post_id").all<{ post_id: string; cnt: number }>(),
      db
        .prepare("SELECT id, post_id, user_id, user_name, user_role, content, created_at FROM teacher_post_comments ORDER BY created_at ASC")
        .all<{ id: string; post_id: string; user_id: string; user_name: string; user_role: string; content: string; created_at: string }>(),
      db.prepare("SELECT post_id, COUNT(*) as cnt FROM teacher_post_clones GROUP BY post_id").all<{ post_id: string; cnt: number }>(),
      claims
        ? db.prepare("SELECT post_id FROM teacher_post_likes WHERE user_id = ?").bind(claims.uid).all<{ post_id: string }>()
        : Promise.resolve({ results: [] as { post_id: string }[] }),
      claims
        ? db.prepare("SELECT post_id FROM teacher_post_bookmarks WHERE user_id = ?").bind(claims.uid).all<{ post_id: string }>()
        : Promise.resolve({ results: [] as { post_id: string }[] }),
      claims
        ? db.prepare("SELECT teacher_id FROM teacher_follows WHERE follower_id = ?").bind(claims.uid).all<{ teacher_id: string }>()
        : Promise.resolve({ results: [] as { teacher_id: string }[] }),
    ]);

    const likeMap = new Map(likesAll.results.map((r) => [r.post_id, r.cnt]));
    const cloneMap = new Map(clonesAll.results.map((r) => [r.post_id, r.cnt]));
    const myLikeSet = new Set(myLikes.results.map((r) => r.post_id));
    const mySaveSet = new Set(mySaves.results.map((r) => r.post_id));
    const myFollowSet = new Set(myFollows.results.map((r) => r.teacher_id));

    const commentsByPost = new Map<string, typeof commentsAll.results>();
    for (const c of commentsAll.results) {
      const list = commentsByPost.get(c.post_id) || [];
      list.push(c);
      commentsByPost.set(c.post_id, list);
    }

    const sortMode = url.searchParams.get("sort") || "top";

    const posts = filtered.map((p) => {
      const id = String(p.id);
      const authorId = String(p.author_id);
      const cmts = commentsByPost.get(id) || [];
      const likesCnt = likeMap.get(id) || 0;
      const clonesCnt = cloneMap.get(id) || 0;
      const verified = Number(p.author_verified || 0) === 1;
      const hasAttachment = Boolean(String(p.attachment_url || "").trim());
      const pinned = Number(p.is_pinned || 0) === 1;
      const qualityScore =
        (verified ? 40 : 0) +
        likesCnt * 3 +
        clonesCnt * 10 +
        cmts.length * 2 +
        (hasAttachment ? 15 : 0) +
        (pinned ? 200 : 0);

      let tags: string[] = [];
      try {
        tags = JSON.parse(String(p.tags_json || "[]"));
      } catch {
        tags = [];
      }
      return {
        id,
        author_id: authorId,
        author_name: String(p.author_name),
        author_role: String(p.author_role || "teacher"),
        author_school: String(p.author_school || ""),
        author_verified: verified,
        category: String(p.category || "lesson_share"),
        grade_id: Number(p.grade_id || 0),
        subject_code: String(p.subject_code || "chung"),
        subject_name: String(p.subject_name || "Liên môn"),
        title: String(p.title),
        content: String(p.content),
        attachment_label: String(p.attachment_label || ""),
        attachment_url: String(p.attachment_url || ""),
        tags,
        is_pinned: pinned,
        status: String(p.status || "published"),
        created_at: String(p.created_at),
        likes_count: likesCnt,
        comments_count: cmts.length,
        clones_count: clonesCnt,
        quality_score: qualityScore,
        is_featured_lesson: qualityScore >= 55 && (p.category === "lesson_share" || p.category === "exam_share"),
        liked_by_me: myLikeSet.has(id),
        saved_by_me: mySaveSet.has(id),
        following_author: myFollowSet.has(authorId),
        comments: cmts.slice(-5),
      };
    });

    if (sortMode === "top") {
      posts.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.quality_score - a.quality_score);
    }

    return jsonRes({ posts });
  }

  // 5. POST /api/v1/social/posts — Giáo viên / Admin đăng bài chia sẻ mới
  if (path === "/api/v1/social/posts" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để đăng bài" }, 401);
    if (!isTeacherOrAdmin(claims.role)) {
      return jsonRes(
        { error: "Chức năng đăng bài chia sẻ chuyên môn chỉ dành cho tài khoản Giáo viên & Quản trị viên. Học sinh có thể thả tim, lưu bài và bình luận hỏi đáp!" },
        403
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      category?: string;
      grade_id?: number;
      subject_code?: string;
      attachment_label?: string;
      attachment_url?: string;
      tags?: string[];
    };

    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    if (title.length < 4 || content.length < 8) {
      return jsonRes({ error: "Vui lòng nhập tiêu đề và nội dung chia sẻ đầy đủ hơn." }, 400);
    }

    const category = ALLOWED_CATEGORIES.has(body.category || "") ? String(body.category) : "lesson_share";
    const gradeId = Number.isFinite(Number(body.grade_id)) ? Number(body.grade_id) : 0;
    const subjectCode = (body.subject_code || "chung").trim();
    const subjectName = subjectCode === "chung" ? "Liên môn" : SUBJECT_NAMES[subjectCode] || subjectCode;
    const attachmentLabel = (body.attachment_label || "").trim().slice(0, 120);
    let attachmentUrl = (body.attachment_url || "").trim().slice(0, 300);
    if (attachmentUrl && !attachmentUrl.startsWith("/") && !/^https?:\/\//i.test(attachmentUrl)) {
      attachmentUrl = "";
    }
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [];

    const author = await db
      .prepare("SELECT full_name, email, role, school_name FROM users WHERE id = ?")
      .bind(claims.uid)
      .first<{ full_name: string; email: string; role: string; school_name: string }>();

    const postId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // === BOT QUÉT AN TOÀN 2 TẦNG (TEENCODE + WORKERS AI) & KIỂM ĐỊNH GIÁO ÁN ===
    const scan = await scanContentWithHybridAI(ai, `${title}\n${content}`, {
      isLesson: category === "lesson_share" || category === "exam_share",
    });

    if (scan.blockImmediately && scan.category) {
      const inc = await createSafetyIncident(
        db,
        {
          category: scan.category,
          severity: scan.severity,
          source_type: "teacher_post",
          source_id: postId,
          suspect_user_id: claims.uid,
          suspect_name: author?.full_name || claims.name || "Giáo viên",
          suspect_email: author?.email || claims.email,
          suspect_role: author?.role || claims.role,
          matched_keywords: scan.matchedKeywords,
          content_snapshot: `${title}\n\n${content}`,
        },
        hub
      );
      return jsonRes(
        {
          error: `${scan.reason} Bài đăng đã bị BOT chặn và gửi cảnh báo (${inc.incident_code}) về tài khoản Quản trị viên!`,
        },
        400
      );
    }

    await db
      .prepare(
        `INSERT INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'published')`
      )
      .bind(
        postId,
        claims.uid,
        author?.full_name || claims.name || "Giáo viên EduK12",
        author?.role || claims.role,
        author?.school_name || "",
        category,
        gradeId,
        subjectCode,
        subjectName,
        title.slice(0, 180),
        content.slice(0, 4000),
        attachmentLabel,
        attachmentUrl,
        JSON.stringify(tags)
      )
      .run();

    // Nếu BOT phát hiện giáo án sơ sài / lạc hậu / nghi vấn mạo danh -> tạo cảnh báo để Admin kiểm tra
    if (scan.flagged && scan.category) {
      await createSafetyIncident(
        db,
        {
          category: scan.category,
          severity: scan.severity,
          source_type: "teacher_post",
          source_id: postId,
          suspect_user_id: claims.uid,
          suspect_name: author?.full_name || claims.name || "Giáo viên",
          suspect_email: author?.email || claims.email,
          suspect_role: author?.role || claims.role,
          matched_keywords: scan.matchedKeywords,
          content_snapshot: `${title}\n\n${content}`,
        },
        hub
      );
    }

    await pushRealtimeEvent(hub, "social:feed", { type: "social_update", post_id: postId });
    return jsonRes({ id: postId, message: "Đã đăng bài chia sẻ lên Mạng xã hội Giáo viên!" }, 201);
  }

  // 6. POST /api/v1/social/posts/:id/like — Thả tim / Hữu ích
  const likeMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/like$/);
  if (likeMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để tương tác" }, 401);
    const postId = decodeURIComponent(likeMatch[1]);
    const existing = await db
      .prepare("SELECT 1 as ok FROM teacher_post_likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, claims.uid)
      .first();

    let liked = false;
    if (existing) {
      await db.prepare("DELETE FROM teacher_post_likes WHERE post_id = ? AND user_id = ?").bind(postId, claims.uid).run();
      liked = false;
    } else {
      await db.prepare("INSERT OR IGNORE INTO teacher_post_likes (post_id, user_id) VALUES (?, ?)").bind(postId, claims.uid).run();
      liked = true;
    }
    const cnt = await db
      .prepare("SELECT COUNT(*) as cnt FROM teacher_post_likes WHERE post_id = ?")
      .bind(postId)
      .first<{ cnt: number }>();
    return jsonRes({ liked, likes_count: cnt?.cnt || 0 });
  }

  // 7. POST /api/v1/social/posts/:id/bookmark — Lưu vào Tủ Giáo án cá nhân
  const saveMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/bookmark$/);
  if (saveMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để lưu bài" }, 401);
    const postId = decodeURIComponent(saveMatch[1]);
    const existing = await db
      .prepare("SELECT 1 as ok FROM teacher_post_bookmarks WHERE post_id = ? AND user_id = ?")
      .bind(postId, claims.uid)
      .first();

    let saved = false;
    if (existing) {
      await db.prepare("DELETE FROM teacher_post_bookmarks WHERE post_id = ? AND user_id = ?").bind(postId, claims.uid).run();
      saved = false;
    } else {
      await db.prepare("INSERT OR IGNORE INTO teacher_post_bookmarks (post_id, user_id) VALUES (?, ?)").bind(postId, claims.uid).run();
      saved = true;
    }
    return jsonRes({ saved });
  }

  // 7b. POST /api/v1/social/posts/:id/clone-to-class — Nhân bản Giáo án / Đề thi của đồng nghiệp về Lớp tôi
  const cloneMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/clone-to-class$/);
  if (cloneMatch && method === "POST") {
    if (!claims || !isTeacherOrAdmin(claims.role)) {
      return jsonRes({ error: "Chỉ Giáo viên & Quản trị viên mới được nhân bản giáo án/đề thi về lớp học." }, 403);
    }
    const postId = decodeURIComponent(cloneMatch[1]);
    const body = (await request.json().catch(() => ({}))) as { classroom_id?: string; due_at?: string };
    const classroomId = (body.classroom_id || "").trim();
    if (!classroomId) {
      return jsonRes({ error: "Vui lòng chọn lớp học muốn nhân bản giáo án / đề thi về." }, 400);
    }

    const [post, cls] = await Promise.all([
      db.prepare("SELECT * FROM teacher_posts WHERE id = ?").bind(postId).first<Record<string, unknown>>(),
      db.prepare("SELECT * FROM classrooms WHERE id = ?").bind(classroomId).first<Record<string, unknown>>(),
    ]);
    if (!post) return jsonRes({ error: "Không tìm thấy bài chia sẻ này." }, 404);
    if (!cls) return jsonRes({ error: "Không tìm thấy lớp học được chọn." }, 404);
    if (String(cls.teacher_id) !== claims.uid && !isAdminRole(claims.role)) {
      return jsonRes({ error: "Bạn chỉ có thể nhân bản tài liệu về lớp do chính mình phụ trách." }, 403);
    }

    const itemType = String(post.category) === "exam_share" ? "exam" : "lesson";
    const asgId = `asg-clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cloneTitle = `[Nhân bản từ ${String(post.author_name)}] ${String(post.title)}`;

    await db.batch([
      db
        .prepare(
          `INSERT INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, due_at, display_order)
           VALUES (?, ?, ?, ?, ?, ?, 99)`
        )
        .bind(asgId, classroomId, itemType, postId, cloneTitle.slice(0, 180), (body.due_at || "").trim().slice(0, 30)),
      db
        .prepare("INSERT OR IGNORE INTO teacher_post_clones (post_id, teacher_id, classroom_id) VALUES (?, ?, ?)")
        .bind(postId, claims.uid, classroomId),
    ]);

    if (String(post.author_id) !== claims.uid) {
      await notifyUser(
        db,
        String(post.author_id),
        "clone",
        `Đồng nghiệp vừa nhân bản giáo án/đề thi của bạn!`,
        `${claims.name} đã nhân bản "${String(post.title)}" về giảng dạy cho lớp "${String(cls.name)}".`,
        "/cong-dong",
        hub
      );
    }
    await pushRealtimeEvent(hub, "social:feed", { type: "social_update", post_id: postId });

    return jsonRes(
      {
        ok: true,
        assignment_id: asgId,
        message: `Đã nhân bản "${String(post.title)}" về lớp ${String(cls.name)} thành công!`,
      },
      201
    );
  }

  // 8. GET & POST /api/v1/social/posts/:id/comments — Bình luận thảo luận
  const cmtMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/comments$/);
  if (cmtMatch && method === "GET") {
    const postId = decodeURIComponent(cmtMatch[1]);
    const rows = await db
      .prepare("SELECT id, post_id, user_id, user_name, user_role, content, created_at FROM teacher_post_comments WHERE post_id = ? ORDER BY created_at ASC")
      .bind(postId)
      .all();
    return jsonRes({ comments: rows.results });
  }

  if (cmtMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để bình luận" }, 401);
    const postId = decodeURIComponent(cmtMatch[1]);
    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const content = (body.content || "").trim();
    if (!content) return jsonRes({ error: "Nội dung bình luận không được trống" }, 400);

    const userRow = await db
      .prepare("SELECT full_name, email, role FROM users WHERE id = ?")
      .bind(claims.uid)
      .first<{ full_name: string; email: string; role: string }>();

    const cmtScan = await scanContentWithHybridAI(ai, content);
    if (cmtScan.blockImmediately && cmtScan.category) {
      const inc = await createSafetyIncident(
        db,
        {
          category: cmtScan.category,
          severity: cmtScan.severity,
          source_type: "post_comment",
          source_id: postId,
          suspect_user_id: claims.uid,
          suspect_name: userRow?.full_name || claims.name || "Thành viên",
          suspect_email: userRow?.email || claims.email,
          suspect_role: userRow?.role || claims.role,
          matched_keywords: cmtScan.matchedKeywords,
          content_snapshot: content,
        },
        hub
      );
      return jsonRes(
        {
          error: `${cmtScan.reason} Bình luận đã bị chặn và gửi cảnh báo (${inc.incident_code}) về Quản trị viên!`,
        },
        400
      );
    }

    const id = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db
      .prepare(
        "INSERT INTO teacher_post_comments (id, post_id, user_id, user_name, user_role, content) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        postId,
        claims.uid,
        userRow?.full_name || claims.name || "Thành viên",
        userRow?.role || claims.role,
        content.slice(0, 1200)
      )
      .run();

    await pushRealtimeEvent(hub, "social:feed", { type: "social_update", post_id: postId });

    return jsonRes(
      {
        comment: {
          id,
          post_id: postId,
          user_id: claims.uid,
          user_name: userRow?.full_name || claims.name || "Thành viên",
          user_role: userRow?.role || claims.role,
          content: content.slice(0, 1200),
          created_at: new Date().toISOString(),
        },
      },
      201
    );
  }

  // 9. PATCH /api/v1/social/posts/:id/moderate — Admin Ghim / Ẩn / Hiện bài viết
  const modMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/moderate$/);
  if (modMatch && method === "PATCH") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới có quyền kiểm duyệt bài đăng" }, 403);
    }
    const postId = decodeURIComponent(modMatch[1]);
    const body = (await request.json().catch(() => ({}))) as {
      is_pinned?: boolean;
      status?: "published" | "hidden";
    };
    const existing = await db
      .prepare("SELECT is_pinned, status FROM teacher_posts WHERE id = ?")
      .bind(postId)
      .first<{ is_pinned: number; status: string }>();
    if (!existing) return jsonRes({ error: "Không tìm thấy bài viết" }, 404);

    const nextPinned = typeof body.is_pinned === "boolean" ? (body.is_pinned ? 1 : 0) : existing.is_pinned;
    const nextStatus = body.status === "hidden" || body.status === "published" ? body.status : existing.status;

    await db
      .prepare("UPDATE teacher_posts SET is_pinned = ?, status = ? WHERE id = ?")
      .bind(nextPinned, nextStatus, postId)
      .run();

    return jsonRes({ ok: true, is_pinned: nextPinned === 1, status: nextStatus });
  }

  // 10. DELETE /api/v1/social/posts/:id — Tác giả hoặc Admin xóa bài
  const delMatch = path.match(/^\/api\/v1\/social\/posts\/([^/]+)$/);
  if (delMatch && method === "DELETE") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const postId = decodeURIComponent(delMatch[1]);
    const post = await db
      .prepare("SELECT author_id FROM teacher_posts WHERE id = ?")
      .bind(postId)
      .first<{ author_id: string }>();
    if (!post) return jsonRes({ error: "Không tìm thấy bài viết" }, 404);
    if (post.author_id !== claims.uid && !isAdminRole(claims.role)) {
      return jsonRes({ error: "Bạn không có quyền xóa bài viết này" }, 403);
    }

    await db.batch([
      db.prepare("DELETE FROM teacher_post_comments WHERE post_id = ?").bind(postId),
      db.prepare("DELETE FROM teacher_post_likes WHERE post_id = ?").bind(postId),
      db.prepare("DELETE FROM teacher_post_bookmarks WHERE post_id = ?").bind(postId),
      db.prepare("DELETE FROM teacher_posts WHERE id = ?").bind(postId),
    ]);
    return jsonRes({ ok: true });
  }

  return null;
}
