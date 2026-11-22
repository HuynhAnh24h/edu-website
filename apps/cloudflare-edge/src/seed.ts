import { hashPassword } from "./crypto";

export const SUBJECT_NAMES: Record<string, string> = {
  toan: "Toán học",
  "ngu-van": "Ngữ văn",
  "tieng-anh": "Tiếng Anh",
  "vat-ly": "Vật lý",
  "hoa-hoc": "Hóa học",
  "sinh-hoc": "Sinh học",
  khtn: "Khoa học tự nhiên",
  "lich-su": "Lịch sử",
  "dia-ly": "Địa lý",
  "tin-hoc": "Tin học",
  html: "Lập trình HTML5",
  css: "Thiết kế CSS3",
  javascript: "Lập trình JavaScript",
  typescript: "Lập trình TypeScript",
  python: "Lập trình Python",
  golang: "Lập trình Golang",
  mongodb: "Cơ sở dữ liệu MongoDB",
  postgresql: "Cơ sở dữ liệu PostgreSQL",
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

let seededInIsolate = false;

export async function ensureSeeded(db: D1Database): Promise<void> {
  if (seededInIsolate) return;

  // Khởi tạo schema nhanh nếu D1 chưa chạy migration
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', tier TEXT NOT NULL DEFAULT 'free', current_grade INTEGER, school_name TEXT DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS grades (id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, level TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, display_order INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, grade_id INTEGER NOT NULL, subject_code TEXT NOT NULL, subject_name TEXT NOT NULL, textbook TEXT NOT NULL DEFAULT 'kntt', chapter TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL, summary TEXT DEFAULT '', content_mdx TEXT NOT NULL, duration_min INTEGER DEFAULT 20, materials_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(grade_id, subject_code, textbook, chapter, slug))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, grade_id INTEGER NOT NULL, subject_code TEXT NOT NULL, subject_name TEXT NOT NULL, topic TEXT NOT NULL DEFAULT 'Tổng hợp', q_type TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'thong_hieu', content_mdx TEXT NOT NULL, options_json TEXT NOT NULL DEFAULT '[]', unit_hint TEXT DEFAULT '', answer_json TEXT NOT NULL, explanation_mdx TEXT DEFAULT '', points REAL NOT NULL DEFAULT 2.0, created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, grade_id INTEGER NOT NULL, subject_code TEXT NOT NULL, subject_name TEXT NOT NULL, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, mode TEXT NOT NULL DEFAULT 'mock_live', duration_minutes INTEGER NOT NULL DEFAULT 45, total_points REAL NOT NULL DEFAULT 10.0, question_ids_json TEXT NOT NULL DEFAULT '[]', question_points_json TEXT NOT NULL DEFAULT '{}', bundle_version INTEGER NOT NULL DEFAULT 1, starts_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS exam_attempts (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, user_id TEXT, user_name TEXT NOT NULL DEFAULT 'Học sinh K-12', status TEXT NOT NULL DEFAULT 'in_progress', shuffle_seed INTEGER NOT NULL DEFAULT 1, started_at TEXT NOT NULL DEFAULT (datetime('now')), submitted_at TEXT, graded_at TEXT, duration_sec INTEGER DEFAULT 0, score REAL DEFAULT 0, max_score REAL DEFAULT 10.0, correct_count INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, grading_latency_us INTEGER DEFAULT 0, answers_json TEXT NOT NULL DEFAULT '{}', details_json TEXT NOT NULL DEFAULT '[]', cheat_flags_json TEXT NOT NULL DEFAULT '[]')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS knowledge_chunks (id TEXT PRIMARY KEY, grade_id INTEGER NOT NULL, subject_code TEXT NOT NULL, textbook TEXT NOT NULL DEFAULT 'kntt', citation TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS classrooms (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, grade_id INTEGER NOT NULL, subject_code TEXT NOT NULL, subject_name TEXT NOT NULL, teacher_id TEXT NOT NULL, teacher_name TEXT NOT NULL, description TEXT DEFAULT '', allow_self_enroll INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS classroom_members (classroom_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', joined_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (classroom_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS classroom_assignments (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, item_title TEXT NOT NULL, due_at TEXT DEFAULT '', display_order INTEGER NOT NULL DEFAULT 0, assigned_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS classroom_live_sessions (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, title TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'webrtc', room_slug TEXT NOT NULL, stream_url TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'live', pinned_note TEXT DEFAULT '', host_id TEXT NOT NULL, host_name TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT (datetime('now')), ended_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS live_chat_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, classroom_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_role TEXT NOT NULL DEFAULT 'student', message TEXT NOT NULL, is_pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS live_attendance (session_id TEXT NOT NULL, classroom_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, joined_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (session_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS user_security (user_id TEXT PRIMARY KEY, auth_provider TEXT NOT NULL DEFAULT 'email', provider_id TEXT DEFAULT '', totp_secret TEXT DEFAULT '', totp_enabled INTEGER NOT NULL DEFAULT 0, recovery_codes_json TEXT DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS coding_progress (user_id TEXT NOT NULL, track_id TEXT NOT NULL, lesson_id TEXT NOT NULL, submitted_code TEXT DEFAULT '', passed_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, lesson_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, author_name TEXT NOT NULL, author_role TEXT NOT NULL DEFAULT 'teacher', author_school TEXT DEFAULT '', category TEXT NOT NULL DEFAULT 'lesson_share', grade_id INTEGER NOT NULL DEFAULT 0, subject_code TEXT NOT NULL DEFAULT 'chung', subject_name TEXT NOT NULL DEFAULT 'Liên môn', title TEXT NOT NULL, content TEXT NOT NULL, attachment_label TEXT DEFAULT '', attachment_url TEXT DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', is_pinned INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_post_likes (post_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (post_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_post_bookmarks (post_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (post_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_post_comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_role TEXT NOT NULL DEFAULT 'teacher', content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_follows (follower_id TEXT NOT NULL, teacher_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (follower_id, teacher_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS direct_messages (id TEXT PRIMARY KEY, room_key TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL, sender_role TEXT NOT NULL, receiver_id TEXT NOT NULL, receiver_name TEXT NOT NULL, receiver_role TEXT NOT NULL, content TEXT NOT NULL, is_flagged INTEGER NOT NULL DEFAULT 0, flag_reason TEXT DEFAULT '', is_blocked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS student_submissions (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, student_name TEXT NOT NULL, student_grade INTEGER NOT NULL DEFAULT 12, student_school TEXT DEFAULT '', submission_type TEXT NOT NULL DEFAULT 'software_project', subject_name TEXT NOT NULL DEFAULT 'Tin học / Lập trình', title TEXT NOT NULL, description TEXT NOT NULL, demo_url TEXT DEFAULT '', repo_url TEXT DEFAULT '', tech_stack TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS student_submission_reviews (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, teacher_id TEXT NOT NULL, teacher_name TEXT NOT NULL, score REAL NOT NULL DEFAULT 9.0, badge TEXT NOT NULL DEFAULT 'Xuất sắc', feedback TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS safety_incidents (id TEXT PRIMARY KEY, incident_code TEXT UNIQUE NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'high', status TEXT NOT NULL DEFAULT 'open', source_type TEXT NOT NULL, source_id TEXT DEFAULT '', suspect_user_id TEXT NOT NULL, suspect_name TEXT NOT NULL, suspect_email TEXT DEFAULT '', suspect_role TEXT DEFAULT 'student', reporter_id TEXT DEFAULT 'safety_bot', reporter_name TEXT DEFAULT 'BOT Quét An toàn EduK12', matched_keywords TEXT DEFAULT '', content_snapshot TEXT NOT NULL, context_json TEXT DEFAULT '{}', admin_note TEXT DEFAULT '', penalty_action TEXT DEFAULT '', escalated_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS user_notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL, message TEXT NOT NULL, link TEXT DEFAULT '', is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, teacher_name TEXT NOT NULL, teacher_school TEXT DEFAULT '', title TEXT NOT NULL, subject_name TEXT NOT NULL, grade_label TEXT NOT NULL DEFAULT 'Lớp 12', level TEXT NOT NULL DEFAULT 'Cơ bản → Nâng cao', cover_theme TEXT NOT NULL DEFAULT 'indigo', summary TEXT NOT NULL, modules_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS course_enrollments (course_id TEXT NOT NULL, user_id TEXT NOT NULL, completed_lessons_json TEXT NOT NULL DEFAULT '[]', enrolled_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (course_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS course_reviews (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_role TEXT NOT NULL DEFAULT 'student', rating INTEGER NOT NULL, comment TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(course_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS exam_level_controls (level TEXT PRIMARY KEY, label TEXT NOT NULL, min_grade INTEGER NOT NULL, max_grade INTEGER NOT NULL, is_unlocked INTEGER NOT NULL DEFAULT 1, exam_id TEXT DEFAULT '', announcement TEXT DEFAULT '', updated_by TEXT DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_profiles (user_id TEXT PRIMARY KEY, is_verified INTEGER NOT NULL DEFAULT 0, verification_status TEXT NOT NULL DEFAULT 'none', specialty TEXT DEFAULT '', bio TEXT DEFAULT '', years_exp INTEGER NOT NULL DEFAULT 1, proof_file_url TEXT DEFAULT '', proof_note TEXT DEFAULT '', admin_review_note TEXT DEFAULT '', verified_at TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS uploaded_files (id TEXT PRIMARY KEY, uploader_id TEXT NOT NULL, uploader_name TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, purpose TEXT NOT NULL DEFAULT 'general', created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS course_certificates (id TEXT PRIMARY KEY, cert_code TEXT UNIQUE NOT NULL, course_id TEXT NOT NULL, course_title TEXT NOT NULL, subject_name TEXT NOT NULL, teacher_name TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, issued_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(course_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS parent_student_links (parent_id TEXT NOT NULL, student_id TEXT NOT NULL, relation_label TEXT DEFAULT 'Phụ huynh', linked_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (parent_id, student_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS student_link_codes (student_id TEXT PRIMARY KEY, link_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_post_clones (post_id TEXT NOT NULL, teacher_id TEXT NOT NULL, classroom_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (post_id, classroom_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_audit_logs (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, actor_email TEXT DEFAULT '', actor_role TEXT DEFAULT 'admin', action TEXT NOT NULL, target_type TEXT DEFAULT '', target_id TEXT DEFAULT '', summary TEXT NOT NULL, metadata_json TEXT DEFAULT '{}', ip_address TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS system_backups (id TEXT PRIMARY KEY, backup_code TEXT UNIQUE NOT NULL, trigger_type TEXT NOT NULL DEFAULT 'manual', actor_name TEXT NOT NULL, tables_summary_json TEXT NOT NULL DEFAULT '{}', size_bytes INTEGER NOT NULL DEFAULT 0, kv_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT NOT NULL, code_6 TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_by TEXT DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, endpoint TEXT NOT NULL, device_label TEXT DEFAULT '', platform TEXT DEFAULT 'web-pwa', permission_status TEXT NOT NULL DEFAULT 'granted', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
  ]);

  // Nâng cấp cột đính kèm tệp cho direct_messages an toàn nếu bảng cũ chưa có
  for (const alterSql of [
    "ALTER TABLE direct_messages ADD COLUMN attachment_url TEXT DEFAULT ''",
    "ALTER TABLE direct_messages ADD COLUMN attachment_name TEXT DEFAULT ''",
  ]) {
    try {
      await db.prepare(alterSql).run();
    } catch {
      // Cột đã tồn tại
    }
  }

  // Luôn đảm bảo có sẵn 2 lớp học mẫu nếu bảng classrooms chưa có dữ liệu
  const clsRow = await db.prepare("SELECT COUNT(*) as cnt FROM classrooms").first<{ cnt: number }>();
  if (!clsRow || clsRow.cnt === 0) {
    const sampleLesson12 = await db
      .prepare("SELECT id, title FROM lessons WHERE grade_id = 12 AND subject_code = 'toan' LIMIT 2")
      .all<{ id: string; title: string }>();
    const sampleLesson9 = await db
      .prepare("SELECT id, title FROM lessons WHERE grade_id = 9 AND subject_code = 'toan' LIMIT 2")
      .all<{ id: string; title: string }>();

    const clsStmts: D1PreparedStatement[] = [
      db
        .prepare(
          "INSERT OR IGNORE INTO classrooms (id, code, name, grade_id, subject_code, subject_name, teacher_id, teacher_name, description, allow_self_enroll) VALUES (?, ?, ?, 12, 'toan', 'Toán học', 'u-teacher-1', 'Thầy Nguyễn Văn Minh (GV Toán)', ?, 1)"
        )
        .bind(
          "cls-toan-12a1",
          "TOAN12-A1",
          "Lớp Toán 12A1 — Luyện thi Tốt nghiệp THPT 2025+",
          "Học theo đúng giáo án tuần, làm bài kiểm tra trắc nghiệm định kỳ và theo dõi điểm số trực tiếp."
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO classrooms (id, code, name, grade_id, subject_code, subject_name, teacher_id, teacher_name, description, allow_self_enroll) VALUES (?, ?, ?, 9, 'toan', 'Toán học', 'u-teacher-1', 'Thầy Nguyễn Văn Minh (GV Toán)', ?, 1)"
        )
        .bind(
          "cls-toan-9-v10",
          "TOAN9-V10",
          "Lớp Toán 9 — Chuyên đề Ôn thi Tuyển sinh vào 10",
          "Lộ trình ôn tập Căn thức, Định lý Viète, Tứ giác nội tiếp kèm đề thi thử hàng tuần."
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO classroom_members (classroom_id, user_id, user_name, user_email, status) VALUES ('cls-toan-12a1', 'u-student-1', 'Nguyễn Minh Anh', 'hocsinh@eduk12.vn', 'active')"
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, due_at, display_order) VALUES ('asg-exam-12', 'cls-toan-12a1', 'exam', 'exam-toan-12-thpt-2025', 'Kỳ thi thử THPT Quốc gia 2025 — Môn Toán (Chuẩn 3 Phần)', '2026-12-30', 10)"
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, due_at, display_order) VALUES ('asg-exam-9', 'cls-toan-9-v10', 'exam', 'exam-toan-9-tuyen-sinh-10', 'Thi thử Tuyển sinh vào lớp 10 — Chuyên đề Đại số trọng tâm', '2026-12-30', 10)"
        ),
    ];

    sampleLesson12.results.forEach((l, i) => {
      clsStmts.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES (?, 'cls-toan-12a1', 'lesson', ?, ?, ?)"
          )
          .bind(`asg-l12-${i + 1}`, l.id, l.title, i + 1)
      );
    });
    sampleLesson9.results.forEach((l, i) => {
      clsStmts.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES (?, 'cls-toan-9-v10', 'lesson', ?, ?, ?)"
          )
          .bind(`asg-l9-${i + 1}`, l.id, l.title, i + 1)
      );
    });
    await db.batch(clsStmts);
  }

  // Luôn đảm bảo có sẵn 2 Lớp Lập trình Cộng đồng mẫu (grade_id = 0) để học sinh & giáo viên thử ngay
  const codeClsRow = await db
    .prepare("SELECT COUNT(*) as cnt FROM classrooms WHERE grade_id = 0")
    .first<{ cnt: number }>();
  if (!codeClsRow || codeClsRow.cnt === 0) {
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO classrooms (id, code, name, grade_id, subject_code, subject_name, teacher_id, teacher_name, description, allow_self_enroll) VALUES (?, ?, ?, 0, 'javascript', 'Lập trình JavaScript', 'u-teacher-1', 'Thầy Nguyễn Văn Minh (Mentor Dev)', ?, 1)"
        )
        .bind(
          "cls-code-web",
          "CODE-JS01",
          "Lớp Lập trình Web Cộng đồng — HTML, CSS, JavaScript & TypeScript",
          "Thực hành code trực tiếp trên trình duyệt có chấm test tự động, học Livestream cùng mentor và hỗ trợ tư duy 3 tầng."
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO classrooms (id, code, name, grade_id, subject_code, subject_name, teacher_id, teacher_name, description, allow_self_enroll) VALUES (?, ?, ?, 0, 'golang', 'Lập trình Golang', 'u-teacher-1', 'Thầy Nguyễn Văn Minh (Mentor Dev)', ?, 1)"
        )
        .bind(
          "cls-code-be",
          "CODE-GO01",
          "Lớp Backend Thực chiến — Golang, Python, MongoDB & PostgreSQL",
          "Xây dựng tư duy Backend & Database thực tế: biên dịch Go thật, chạy Python WebAssembly và truy vấn SQL/NoSQL ngay trên web."
        ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-html', 'cls-code-web', 'coding', 'html', 'Khóa Thực hành HTML5 (3 bài có chấm test)', 1)"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-css', 'cls-code-web', 'coding', 'css', 'Khóa Thực hành CSS3 Flexbox & Grid (3 bài)', 2)"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-js', 'cls-code-web', 'coding', 'javascript', 'Khóa Thực hành JavaScript ES6+ (3 bài)', 3)"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-go', 'cls-code-be', 'coding', 'golang', 'Khóa Thực hành Golang Compiler (3 bài)', 1)"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-py', 'cls-code-be', 'coding', 'python', 'Khóa Thực hành Python WebAssembly (3 bài)', 2)"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO classroom_assignments (id, classroom_id, item_type, item_id, item_title, display_order) VALUES ('asg-code-pg', 'cls-code-be', 'coding', 'postgresql', 'Khóa Thực hành PostgreSQL & JOIN (3 bài)', 3)"
      ),
    ]);
  }

  // Seed dữ liệu Mạng Xã Hội Giáo Viên (bài chia sẻ giáo án, đề thi, thảo luận chuyên môn)
  const socialRow = await db.prepare("SELECT COUNT(*) as cnt FROM teacher_posts").first<{ cnt: number }>();
  if (!socialRow || socialRow.cnt === 0) {
    const teacherSampleHash = await hashPassword("Teacher@123");
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, school_name) VALUES (?, ?, ?, ?, 'teacher', 'pro', ?)"
        )
        .bind("u-teacher-2", "colan@eduk12.vn", teacherSampleHash, "Cô Trần Thị Lan (GV Ngữ văn)", "THPT Chuyên Lê Hồng Phong"),
      db
        .prepare(
          "INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, school_name) VALUES (?, ?, ?, ?, 'teacher', 'pro', ?)"
        )
        .bind("u-teacher-3", "thaynam@eduk12.vn", teacherSampleHash, "Thầy Lê Hoàng Nam (GV Tin học)", "THPT Gia Định"),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "post-toan12-de3phan",
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "teacher",
          "THPT Chuyên KHTN",
          "exam_share",
          12,
          "toan",
          "Toán học",
          "Chia sẻ trọn bộ Đề thi thử THPT 2025+ chuẩn 3 phần (Đúng/Sai & Trả lời ngắn)",
          "Chào quý thầy cô! Mình vừa hoàn thiện bộ đề ôn tập Chương 1 Ứng dụng đạo hàm bám sát ma trận đề minh họa mới của Bộ GD&ĐT (gồm 12 câu chọn 1, 4 câu Đúng/Sai và 6 câu trả lời ngắn).\n\nThầy cô có thể bấm mở đề bên dưới để xem cấu trúc, giao ngay cho lớp mình hoặc lưu lại tủ giáo án dùng cho tuần tới nhé!",
          "Mở đề thi thử Toán 12 (Chuẩn 3 phần)",
          "/thi",
          JSON.stringify(["Toán 12", "THPT 2025", "Đề chuẩn 3 phần"]),
          1
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "post-van12-cham-nghiluan",
          "u-teacher-2",
          "Cô Trần Thị Lan (GV Ngữ văn)",
          "teacher",
          "THPT Chuyên Lê Hồng Phong",
          "teaching_tip",
          12,
          "ngu-van",
          "Ngữ văn",
          "Kinh nghiệm hướng dẫn học sinh viết Nghị luận xã hội không bị văn mẫu",
          "Khi chuyển sang ngữ liệu ngoài sách giáo khoa, nhiều em bị lúng túng ở khâu tìm dẫn chứng đời sống. Mình áp dụng quy tắc 3 bước ngay trên lớp:\n1. Tách từ khóa cốt lõi của vấn đề.\n2. Đặt 2 câu hỏi ngược ('Nếu thiếu điều này thì sao?').\n3. Chọn 1 dẫn chứng thực tế trong 2 năm gần nhất.\n\nQuý thầy cô dạy Văn có mẹo nào hay cho học sinh lớp 11–12 chia sẻ thêm bên dưới nhé!",
          "Xem Kho bài giảng Ngữ văn 1–12",
          "/tai-lieu",
          JSON.stringify(["Ngữ văn", "Phương pháp dạy", "Nghị luận"]),
          0
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "post-code-python-go",
          "u-teacher-3",
          "Thầy Lê Hoàng Nam (GV Tin học)",
          "teacher",
          "THPT Gia Định",
          "lesson_share",
          0,
          "python",
          "Lập trình Python",
          "Lộ trình dạy Tin học & Lập trình thực hành ngay trên trình duyệt không cần cài máy",
          "Tin vui cho các thầy cô dạy Tin học ở trường máy cấu hình thấp: mình đang cho cả lớp thực hành Python, JavaScript và SQL ngay trên mục Lập trình của EduK12.\n\nĐiểm mình ưng nhất là cơ chế chấm test tự động và gợi ý tư duy 3 tầng — học sinh không thể copy-paste đáp án mà phải tự sửa code chạy ĐÚNG mới qua bài tiếp theo!",
          "Trải nghiệm Phòng thực hành Lập trình",
          "/lap-trinh",
          JSON.stringify(["Tin học", "Python", "Thực hành Code"]),
          0
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "post-live-toan9-vao10",
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "teacher",
          "THPT Chuyên KHTN",
          "class_promo",
          9,
          "toan",
          "Toán học",
          "Mở lớp Live miễn phí tối Thứ 5: Chuyên đề Viète & Tứ giác nội tiếp ôn thi vào 10",
          "Tuần này mình mở buổi Livestream giải đề tổng ôn miễn phí cho học sinh lớp 9. Thầy cô có thể giới thiệu mã lớp TOAN9-V10 cho các em tham gia học cùng hoặc vào dự giờ trao đổi cách trình bày bài hình học cho học sinh trung bình – khá nhé!",
          "Vào lớp Toán 9 (Mã: TOAN9-V10)",
          "/lop-hoc",
          JSON.stringify(["Lớp Live", "Toán 9", "Ôn thi vào 10"]),
          0
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_posts (id, author_id, author_name, author_role, author_school, category, grade_id, subject_code, subject_name, title, content, attachment_label, attachment_url, tags_json, is_pinned, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "post-thaoluan-hocsinh-matgoc",
          "u-teacher-2",
          "Cô Trần Thị Lan (GV Ngữ văn)",
          "teacher",
          "THPT Chuyên Lê Hồng Phong",
          "discussion",
          10,
          "chung",
          "Liên môn",
          "Thảo luận: Làm sao giữ tương tác tốt khi dạy lớp đông 45 học sinh qua Live?",
          "Mỗi lần dạy tăng cường buổi tối có hơn 40 em vào cùng lúc, mình hay chia nhỏ 15 phút giảng + 1 câu hỏi nhanh trên khung chat để điểm danh sự tập trung. Không biết các thầy cô môn Tự nhiên và Ngoại ngữ có cách nào giúp các em đỡ ngại bật mic/nhắn tin hơn không ạ?",
          "",
          "",
          JSON.stringify(["Thảo luận", "Kỹ năng sư phạm", "Dạy trực tuyến"]),
          0
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO teacher_post_comments (id, post_id, user_id, user_name, user_role, content) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "cmt-seed-1",
          "post-toan12-de3phan",
          "u-teacher-3",
          "Thầy Lê Hoàng Nam (GV Tin học)",
          "teacher",
          "Cảm ơn thầy Minh! Cấu trúc phần Đúng/Sai rất sát đề mẫu, mình đã lưu vào tủ giáo án để giới thiệu cho tổ Toán trường mình."
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO teacher_post_comments (id, post_id, user_id, user_name, user_role, content) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "cmt-seed-2",
          "post-thaoluan-hocsinh-matgoc",
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "teacher",
          "Mình thường ghim câu hỏi ngắn ở đầu khung chat và khen trực tiếp 3 bạn trả lời nhanh nhất, lớp sôi nổi hẳn lên cô Lan ạ!"
        ),
      db.prepare("INSERT OR IGNORE INTO teacher_post_likes (post_id, user_id) VALUES ('post-toan12-de3phan', 'u-teacher-2')"),
      db.prepare("INSERT OR IGNORE INTO teacher_post_likes (post_id, user_id) VALUES ('post-toan12-de3phan', 'u-teacher-3')"),
      db.prepare("INSERT OR IGNORE INTO teacher_post_likes (post_id, user_id) VALUES ('post-van12-cham-nghiluan', 'u-teacher-1')"),
      db.prepare("INSERT OR IGNORE INTO teacher_post_likes (post_id, user_id) VALUES ('post-code-python-go', 'u-teacher-1')"),
      db.prepare("INSERT OR IGNORE INTO teacher_follows (follower_id, teacher_id) VALUES ('u-teacher-2', 'u-teacher-1')"),
      db.prepare("INSERT OR IGNORE INTO teacher_follows (follower_id, teacher_id) VALUES ('u-teacher-3', 'u-teacher-1')"),
      db.prepare("INSERT OR IGNORE INTO teacher_follows (follower_id, teacher_id) VALUES ('u-student-1', 'u-teacher-1')"),
    ]);
  }

  // Seed Sản phẩm Phần mềm & Bài viết Học sinh mẫu + Chat mẫu Học sinh <-> Giáo viên
  const subRow = await db.prepare("SELECT COUNT(*) as cnt FROM student_submissions").first<{ cnt: number }>();
  if (!subRow || subRow.cnt === 0) {
    await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO student_submissions (id, student_id, student_name, student_grade, student_school, submission_type, subject_name, title, description, demo_url, repo_url, tech_stack, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "sub-app-flashcard",
          "u-student-1",
          "Nguyễn Minh Anh",
          12,
          "THPT Chu Văn An",
          "software_project",
          "Tin học / Lập trình",
          "Ứng dụng Web Học Từ Vựng Tiếng Anh 12 bằng Flashcard (HTML/CSS/JS)",
          "Em tự thiết kế ứng dụng thẻ ghi nhớ 300 từ vựng trọng tâm thi Tốt nghiệp THPT 2025+, có chế độ lật thẻ, đọc phát âm chuẩn và thống kê số từ đã thuộc theo ngày. Nhờ thầy cô xem góp ý giúp em cách tối ưu giao diện điện thoại ạ!",
          "/lap-trinh",
          "https://github.com/HuynhAnh24h/edu-website",
          "HTML5, CSS3, JavaScript"
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO student_submissions (id, student_id, student_name, student_grade, student_school, submission_type, subject_name, title, description, demo_url, repo_url, tech_stack, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "sub-article-toan12",
          "u-student-1",
          "Nguyễn Minh Anh",
          12,
          "THPT Chu Văn An",
          "student_article",
          "Toán học",
          "Bài viết tổng hợp: 3 lỗi sai hay gặp nhất khi xét dấu đạo hàm & cực trị",
          "Sau khi làm 5 đề thi thử trên EduK12, em tổng hợp lại 3 bẫy hay mất điểm ở phần Đúng/Sai: (1) Quên kiểm tra điều kiện xác định của hàm phân thức, (2) Nhầm điểm làm f'(x)=0 nhưng không đổi dấu là cực trị, (3) Đọc nhầm đồ thị f'(x) thành f(x). Em mong thầy cô xem và bổ sung giúp em ạ.",
          "/tai-lieu",
          "",
          "Toán 12 • Chương 1"
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO student_submission_reviews (id, submission_id, teacher_id, teacher_name, score, badge, feedback)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "rev-seed-1",
          "sub-app-flashcard",
          "u-teacher-3",
          "Thầy Lê Hoàng Nam (GV Tin học)",
          9.5,
          "Xuất sắc",
          "Ý tưởng rất thực tế và cấu trúc code sạch sẽ! Em có thể bổ sung thêm bộ lọc theo chủ đề Unit 1–10 và lưu tiến độ ôn tập để các bạn lớp 12 dùng lâu dài hơn nhé. Rất đáng khen!"
        ),
    ]);
  }

  const dmRow = await db.prepare("SELECT COUNT(*) as cnt FROM direct_messages").first<{ cnt: number }>();
  if (!dmRow || dmRow.cnt === 0) {
    const room = ["u-student-1", "u-teacher-1"].sort().join("__");
    await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO direct_messages (id, room_key, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "dm-seed-1",
          room,
          "u-student-1",
          "Nguyễn Minh Anh",
          "student",
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "teacher",
          "Em chào thầy ạ! Thầy cho em hỏi ở câu 2 phần Đúng/Sai đề Toán 12, khi hàm số có mẫu chứa x thì mình cần xét điều kiện xác định trước khi lập bảng biến thiên đúng không ạ?"
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO direct_messages (id, room_key, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "dm-seed-2",
          room,
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "teacher",
          "u-student-1",
          "Nguyễn Minh Anh",
          "student",
          "Đúng rồi em nhé! Bước 1 luôn phải tìm tập xác định D, sau đó đánh dấu gạch đôi tại điểm không xác định trên bảng biến thiên để tránh kết luận nhầm khoảng đồng biến."
        ),
    ]);
  }

  // Seed 3 Khóa học trực tuyến mẫu kèm bài giảng & đánh giá 5 sao
  const courseRow = await db.prepare("SELECT COUNT(*) as cnt FROM courses").first<{ cnt: number }>();
  if (!courseRow || courseRow.cnt === 0) {
    const c1Modules = [
      {
        id: "m1",
        title: "Bài 1: Xét dấu đạo hàm & Tính đơn điệu chuẩn 2025+",
        duration: "20 phút",
        video_url: "",
        content:
          "1. Tìm tập xác định D của hàm số.\n2. Tính đạo hàm f'(x) và tìm các điểm làm f'(x) = 0 hoặc không xác định.\n3. Lập bảng biến thiên xét dấu f'(x): khoảng nào f'(x) > 0 hàm đồng biến, f'(x) < 0 hàm nghịch biến.\n\nMẹo tránh bẫy đề Đúng/Sai: Không bao giờ gộp 2 khoảng đồng biến rời nhau bằng dấu hợp (∪), phải ghi 'và'!",
      },
      {
        id: "m2",
        title: "Bài 2: Cực trị hàm số & Đọc nhanh đồ thị f'(x)",
        duration: "25 phút",
        video_url: "",
        content:
          "Quy tắc vàng đọc đồ thị đạo hàm f'(x):\n- Số điểm cực trị = số nghiệm ĐƠN (cắt trục hoành, đổi dấu) của f'(x) = 0.\n- Đổi dấu từ (+) sang (-) -> Cực đại.\n- Đổi dấu từ (-) sang (+) -> Cực tiểu.\n- Tiếp xúc trục hoành nhưng không xuyên qua -> KHÔNG phải cực trị.",
      },
      {
        id: "m3",
        title: "Bài 3: Bài toán Thực tế Tối ưu (Dạng Trả lời ngắn mới)",
        duration: "30 phút",
        video_url: "",
        content:
          "4 bước giải bài toán tối ưu chi phí / diện tích / lợi nhuận:\n1. Đặt ẩn x và tìm điều kiện ràng buộc [a; b].\n2. Biểu diễn đại lượng cần tối ưu thành hàm f(x).\n3. Tính f'(x) = 0, so sánh các giá trị tại nghiệm và 2 đầu mút.\n4. Kết luận và làm tròn đúng theo yêu cầu đề bài.",
      },
    ];

    const c2Modules = [
      {
        id: "m1",
        title: "Bài 1: Giải mã ngữ liệu ngoài SGK trong 5 phút",
        duration: "18 phút",
        video_url: "",
        content:
          "Cách đọc nhanh văn bản mới không bị choáng:\n- Đọc câu hỏi trước để định vị từ khóa cần tìm.\n- Gạch chân các biện pháp tu từ, luận điểm chính ở câu đầu và câu cuối mỗi đoạn.\n- Tóm gọn thông điệp tác giả thành 1 câu ngắn trước khi đặt bút viết.",
      },
      {
        id: "m2",
        title: "Bài 2: Công thức 3 tầng lập luận cho bài Nghị luận Xã hội 9+",
        duration: "22 phút",
        video_url: "",
        content:
          "Tầng 1: Giải thích ngắn gọn bản chất vấn đề.\nTầng 2: Phân tích 2 mặt + 1 dẫn chứng đời sống cập nhật (từ 2023–2026).\nTầng 3: Phản đề sắc sảo & Liên hệ hành động cụ thể của người trẻ hôm nay.",
      },
      {
        id: "m3",
        title: "Bài 3: Luyện viết Mở bài & Kết bài ấn tượng không văn mẫu",
        duration: "20 phút",
        video_url: "",
        content:
          "Tránh các mẫu mở bài sáo rỗng. Hãy bắt đầu bằng một câu hỏi gợi suy ngẫm, một nghịch lý đời thường hoặc một số liệu thực tế gắn trực tiếp với đề bài.",
      },
    ];

    const c3Modules = [
      {
        id: "m1",
        title: "Bài 1: Cấu trúc trang Web chuẩn với HTML5 Semantic",
        duration: "20 phút",
        video_url: "",
        content:
          "Làm quen các thẻ ngữ nghĩa hiện đại: <header>, <nav>, <main>, <section>, <article>, <footer>. Thực hành xây dựng trang hồ sơ cá nhân đầu tiên ngay tại mục Lập trình của EduK12.",
      },
      {
        id: "m2",
        title: "Bài 2: Bố cục Responsive hiện đại với CSS Flexbox & Grid",
        duration: "25 phút",
        video_url: "",
        content:
          "Hiểu rõ display: flex, justify-content, align-items và CSS Grid để trang web hiển thị đẹp cả trên máy tính lẫn điện thoại.",
      },
      {
        id: "m3",
        title: "Bài 3: Thêm tương tác sống động với JavaScript & Đẩy sản phẩm cho Thầy Cô chấm",
        duration: "30 phút",
        video_url: "",
        content:
          "Sử dụng DOM Event, localStorage để làm ứng dụng Flashcard hoặc To-Do List, sau đó đăng vào mục Sản phẩm Học sinh trên /cong-dong để thầy cô chấm điểm góp ý!",
      },
    ];

    await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO courses (id, teacher_id, teacher_name, teacher_school, title, subject_name, grade_label, level, cover_theme, summary, modules_json, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "course-toan12-daoham",
          "u-teacher-1",
          "Thầy Nguyễn Văn Minh (GV Toán)",
          "THPT Chuyên KHTN",
          "Làm chủ Ứng dụng Đạo hàm & Khảo sát Hàm số — Toán 12 (Chuẩn 2025+)",
          "Toán học",
          "Lớp 12",
          "Luyện thi THPT",
          "indigo",
          "Khóa học cô đọng giúp học sinh nắm chắc toàn bộ dạng bài Đơn điệu, Cực trị và Bài toán Tối ưu thực tế theo đúng cấu trúc đề mới 3 phần.",
          JSON.stringify(c1Modules)
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO courses (id, teacher_id, teacher_name, teacher_school, title, subject_name, grade_label, level, cover_theme, summary, modules_json, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "course-van12-nghiluan",
          "u-teacher-2",
          "Cô Trần Thị Lan (GV Ngữ văn)",
          "THPT Chuyên Lê Hồng Phong",
          "Chinh phục Nghị luận Xã hội 9+ (Tư duy mới — Không học thuộc văn mẫu)",
          "Ngữ văn",
          "Lớp 11–12",
          "Nâng cao kỹ năng viết",
          "rose",
          "Rèn tư duy lập luận chặt chẽ, xử lý mượt ngữ liệu ngoài sách giáo khoa và cách chọn dẫn chứng thực tế ghi trọn điểm giám khảo.",
          JSON.stringify(c2Modules)
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO courses (id, teacher_id, teacher_name, teacher_school, title, subject_name, grade_label, level, cover_theme, summary, modules_json, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
        )
        .bind(
          "course-web-starter",
          "u-teacher-3",
          "Thầy Lê Hoàng Nam (GV Tin học)",
          "THPT Gia Định",
          "Xây dựng Website Đầu Tiên với HTML, CSS & JavaScript từ con số 0",
          "Lập trình Web",
          "THCS & THPT",
          "Người mới bắt đầu",
          "emerald",
          "Lộ trình thực hành trực quan dành cho học sinh yêu thích công nghệ: học xong tự tay tạo được website hoàn chỉnh để nộp dự thi sáng tạo trẻ.",
          JSON.stringify(c3Modules)
        ),
      db.prepare(
        "INSERT OR IGNORE INTO course_enrollments (course_id, user_id, completed_lessons_json) VALUES ('course-toan12-daoham', 'u-student-1', '[\"m1\"]')"
      ),
      db
        .prepare(
          "INSERT OR IGNORE INTO course_reviews (id, course_id, user_id, user_name, user_role, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "crev-seed-1",
          "course-toan12-daoham",
          "u-student-1",
          "Nguyễn Minh Anh",
          "student",
          5,
          "Thầy Minh giảng siêu dễ hiểu luôn ạ! Nhờ mẹo đọc đồ thị f'(x) trong Bài 2 mà em không còn bị nhầm câu Đúng/Sai nữa. 5 sao xứng đáng!"
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO course_reviews (id, course_id, user_id, user_name, user_role, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "crev-seed-2",
          "course-van12-nghiluan",
          "u-student-1",
          "Nguyễn Minh Anh",
          "student",
          5,
          "Công thức 3 tầng lập luận của cô Lan giúp em viết bài mạch lạc hơn hẳn, không bị bí ý khi gặp đề mới!"
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO course_reviews (id, course_id, user_id, user_name, user_role, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          "crev-seed-3",
          "course-web-starter",
          "u-student-1",
          "Nguyễn Minh Anh",
          "student",
          5,
          "Khóa học thực chiến rất hay, học xong em đã tự làm được web học từ vựng Tiếng Anh luôn!"
        ),
    ]);
  }

  // Seed cấu hình Mở/Khóa Thi Tổng hợp theo 3 cấp học (Tiểu học, THCS, THPT)
  const lvlRow = await db.prepare("SELECT COUNT(*) as cnt FROM exam_level_controls").first<{ cnt: number }>();
  if (!lvlRow || lvlRow.cnt === 0) {
    await db.batch([
      db.prepare(
        "INSERT OR IGNORE INTO exam_level_controls (level, label, min_grade, max_grade, is_unlocked, announcement) VALUES ('primary', 'Cấp Tiểu học (Lớp 1–5)', 1, 5, 1, 'Kỳ thi tổng hợp cấp Tiểu học đang mở cho học sinh luyện tập!')"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO exam_level_controls (level, label, min_grade, max_grade, is_unlocked, announcement) VALUES ('middle', 'Cấp THCS (Lớp 6–9)', 6, 9, 1, 'Kỳ thi tổng hợp THCS & Ôn thi vào 10 đang mở!')"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO exam_level_controls (level, label, min_grade, max_grade, is_unlocked, announcement) VALUES ('high', 'Cấp THPT (Lớp 10–12)', 10, 12, 1, 'Kỳ thi tổng hợp THPT 2025+ đang mở cho học sinh tham gia!')"
      ),
    ]);
  }

  // Seed Hồ sơ Giáo viên Tích xanh mẫu cho 3 thầy cô cộng đồng
  const tpRow = await db.prepare("SELECT COUNT(*) as cnt FROM teacher_profiles").first<{ cnt: number }>();
  if (!tpRow || tpRow.cnt === 0) {
    await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_profiles (user_id, is_verified, verification_status, specialty, bio, years_exp, verified_at)
           VALUES (?, 1, 'verified', ?, ?, ?, datetime('now'))`
        )
        .bind(
          "u-teacher-1",
          "Toán học THPT & Ôn thi vào 10",
          "12 năm kinh nghiệm giảng dạy Toán Chuyên và luyện thi Tốt nghiệp THPT. Đam mê xây dựng hệ thống bài giảng trực quan, dễ hiểu giúp học sinh mất gốc lấy lại nền tảng nhanh chóng.",
          12
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_profiles (user_id, is_verified, verification_status, specialty, bio, years_exp, verified_at)
           VALUES (?, 1, 'verified', ?, ?, ?, datetime('now'))`
        )
        .bind(
          "u-teacher-2",
          "Ngữ văn THPT & Nghị luận Xã hội",
          "10 năm giảng dạy Ngữ văn tại trường THPT Chuyên. Chia sẻ phương pháp tư duy phản biện, viết văn sáng tạo từ đời sống thực tế — nói không với văn mẫu sáo rỗng.",
          10
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO teacher_profiles (user_id, is_verified, verification_status, specialty, bio, years_exp, verified_at)
           VALUES (?, 1, 'verified', ?, ?, ?, datetime('now'))`
        )
        .bind(
          "u-teacher-3",
          "Tin học & Lập trình Web / Python / Golang",
          "8 năm đào tạo học sinh giỏi Tin học và hướng dẫn dự án KHKT phần mềm. Tập trung vào thực hành trực tiếp trên trình duyệt và tư duy giải quyết vấn đề.",
          8
        ),
    ]);
  }

  // Seed Mã liên kết Phụ huynh + Tài khoản Phụ huynh mẫu + 1 Chứng chỉ mẫu để thử nghiệm ngay
  const codeRow = await db.prepare("SELECT COUNT(*) as cnt FROM student_link_codes").first<{ cnt: number }>();
  if (!codeRow || codeRow.cnt === 0) {
    const parentHash = await hashPassword("Parent@123");
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, school_name) VALUES (?, ?, ?, ?, 'parent', 'free', ?)"
        )
        .bind("u-parent-1", "phuhuynh@eduk12.vn", parentHash, "Phụ huynh Nguyễn Văn Hùng", "Gia đình em Minh Anh"),
      db.prepare(
        "INSERT OR IGNORE INTO student_link_codes (student_id, link_code) VALUES ('u-student-1', 'PH-MINHANH12')"
      ),
      db.prepare(
        "INSERT OR IGNORE INTO parent_student_links (parent_id, student_id, relation_label) VALUES ('u-parent-1', 'u-student-1', 'Bố / Phụ huynh')"
      ),
      db
        .prepare(
          `INSERT OR IGNORE INTO course_certificates (id, cert_code, course_id, course_title, subject_name, teacher_name, user_id, user_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          "cert-seed-1",
          "OWLIE-CERT-2026-WEB01",
          "course-web-starter",
          "Xây dựng Website Đầu Tiên với HTML, CSS & JavaScript từ con số 0",
          "Lập trình Web",
          "Thầy Lê Hoàng Nam (GV Tin học)",
          "u-student-1",
          "Nguyễn Minh Anh"
        ),
    ]);
  }

  const row = await db.prepare("SELECT COUNT(*) as cnt FROM lessons").first<{ cnt: number }>();
  if (row && row.cnt > 0) {
    seededInIsolate = true;
    return;
  }

  // 1. Seed 12 khối lớp & 10 môn học
  const stmts: D1PreparedStatement[] = [];
  for (let g = 1; g <= 12; g++) {
    const level = g <= 5 ? "primary" : g <= 9 ? "middle" : "high";
    stmts.push(
      db.prepare("INSERT OR IGNORE INTO grades (id, name, slug, level) VALUES (?, ?, ?, ?)")
        .bind(g, `Lớp ${g}`, `lop-${g}`, level)
    );
  }
  let order = 1;
  for (const [code, name] of Object.entries(SUBJECT_NAMES)) {
    stmts.push(
      db.prepare("INSERT OR IGNORE INTO subjects (code, name, display_order) VALUES (?, ?, ?)")
        .bind(code, name, order++)
    );
  }

  // 2. Seed 3 tài khoản Demo RBAC
  const [adminH, teacherH, studentH] = await Promise.all([
    hashPassword("Admin@123"),
    hashPassword("Teacher@123"),
    hashPassword("Student@123"),
  ]);
  stmts.push(
    db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, school_name) VALUES (?, ?, ?, ?, ?, 'pro', ?)")
      .bind("u-admin-1", "admin@eduk12.vn", adminH, "Quản trị viên Hệ thống", "super_admin", "EduK12 Cloud Edge"),
    db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, school_name) VALUES (?, ?, ?, ?, ?, 'pro', ?)")
      .bind("u-teacher-1", "giaovien@eduk12.vn", teacherH, "Thầy Nguyễn Văn Minh (GV Toán)", "teacher", "THPT Chuyên KHTN"),
    db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, tier, current_grade, school_name) VALUES (?, ?, ?, ?, ?, 'pro', 12, ?)")
      .bind("u-student-1", "hocsinh@eduk12.vn", studentH, "Nguyễn Minh Anh", "student", "THPT Chu Văn An")
  );

  // 3. Seed Bài giảng đầy đủ 12 khối lớp (GDPT 2018)
  const seedLessons = [
    [1, "toan", "kntt", "Chương 2: Phép cộng phạm vi 10", "Phép cộng trong phạm vi 10 (Tư duy trực quan)", "Gộp hai nhóm đồ vật và tính nhẩm nhanh trong phạm vi 10.", "### 1. Gộp hai nhóm đồ vật\nKhi có **3 quả táo** thêm **4 quả táo**: $$3 + 4 = 7$$\n### 2. Tính chất giao hoán\n- $2 + 5 = 5 + 2 = 7$\n- $4 + 6 = 6 + 4 = 10$"],
    [2, "toan", "kntt", "Chương 2: Phép cộng có nhớ phạm vi 100", "Phép cộng có nhớ dạng 28 + 15", "Đặt tính thẳng hàng đơn vị, hàng chục và cộng có nhớ.", "### Quy tắc đặt tính\n$$28 + 15 = (20 + 10) + (8 + 5) = 43$$"],
    [3, "toan", "kntt", "Chương 3: Biểu thức số", "Tính giá trị biểu thức có ngoặc và nhân chia trước", "Quy tắc vàng tính giá trị biểu thức lớp 3.", "### 3 Quy tắc\n1. Tính trong ngoặc trước.\n2. Nhân chia trước, cộng trừ sau.\n**Ví dụ:** $(12 + 8) \\times 3 = 60$."],
    [4, "toan", "kntt", "Chương 4: Bài toán Tổng - Hiệu", "Tìm hai số khi biết Tổng và Hiệu", "Công thức giải nhanh bài toán điển hình lớp 4.", "### Công thức cốt lõi\n$$\\text{Số lớn} = \\frac{\\text{Tổng} + \\text{Hiệu}}{2}, \\quad \\text{Số bé} = \\frac{\\text{Tổng} - \\text{Hiệu}}{2}$$"],
    [5, "toan", "kntt", "Chương 5: Hình học & Chuyển động", "Diện tích tam giác, hình thang & Vận tốc", "Trọng tâm ôn thi lên lớp 6 Chất lượng cao.", "### Công thức chuẩn\n- Tam giác: $S = \\dfrac{a \\times h}{2}$\n- Hình thang: $S = \\dfrac{(a + b) \\times h}{2}$\n- Vận tốc: $v = \\dfrac{s}{t}$"],
    [6, "toan", "kntt", "Chương 3: Số nguyên", "Tập hợp số nguyên Z và Quy tắc dấu ngoặc", "Làm quen số nguyên âm và quy tắc phá ngoặc lớp 6.", "### Quy tắc dấu ngoặc\n- Trước ngoặc dấu $(+)$: giữ nguyên dấu.\n- Trước ngoặc dấu $(-)$: đổi dấu **tất cả** các số hạng."],
    [7, "toan", "kntt", "Chương 1: Số hữu tỉ", "5 Công thức Lũy thừa của số hữu tỉ", "Nền tảng đại số dùng suốt THCS và THPT.", "### 5 Công thức lũy thừa\n1. $x^m \\cdot x^n = x^{m+n}$\n2. $(x^m)^n = x^{mn}$\n3. $(xy)^n = x^n y^n$"],
    [8, "toan", "kntt", "Chương 2: Hằng đẳng thức đáng nhớ", "7 Hằng đẳng thức đáng nhớ & Phân tích đa thức", "3 hằng đẳng thức dùng nhiều nhất đến lớp 12.", "### 3 Hằng đẳng thức cốt lõi\n- $(A+B)^2 = A^2 + 2AB + B^2$\n- $(A-B)^2 = A^2 - 2AB + B^2$\n- $A^2 - B^2 = (A-B)(A+B)$"],
    [9, "toan", "ctst", "Chương 6: Phương trình bậc hai & Viète", "Công thức nghiệm bậc hai và Định lý Viète (Ôn thi vào 10)", "Trọng tâm tuyển sinh vào lớp 10: Biệt thức Delta và ứng dụng Viète.", "### Định lý Viète\nVới $ax^2 + bx + c = 0$ ($\\Delta = b^2 - 4ac \\ge 0$):\n$$S = x_1 + x_2 = -\\frac{b}{a}, \\qquad P = x_1 x_2 = \\frac{c}{a}$$\nBiểu thức hay gặp: $x_1^2 + x_2^2 = S^2 - 2P$."],
    [10, "toan", "kntt", "Chương 4: Vectơ trong mặt phẳng", "Tích vô hướng của hai vectơ & Tọa độ Oxy", "Điều kiện vuông góc và tính góc giữa hai vectơ.", "### Biểu thức tọa độ\n$$\\vec{a} \\cdot \\vec{b} = x_1 x_2 + y_1 y_2, \\qquad \\vec{a} \\perp \\vec{b} \\Leftrightarrow x_1 x_2 + y_1 y_2 = 0$$"],
    [11, "toan", "kntt", "Chương 6: Hàm số Mũ & Lôgarit", "Công thức Lôgarit và Phương trình Mũ cơ bản", "Hệ thống công thức biến đổi lôgarit chuẩn GDPT 2018.", "### Quy tắc Lôgarit\n$$\\log_a b = c \\Leftrightarrow a^c = b$$\n- $\\log_a(xy) = \\log_a x + \\log_a y$\n- $\\log_a(x^n) = n\\log_a x$"],
    [12, "toan", "kntt", "Chương 1: Ứng dụng đạo hàm", "Tính đơn điệu & Cực trị hàm số (Chuẩn THPT 2025+)", "Xét dấu đạo hàm $f'(x)$ tìm cực đại, cực tiểu và bài toán tối ưu.", "### Quy tắc tìm cực trị\n1. Tính $f'(x)$ và giải $f'(x) = 0$.\n2. Lập bảng biến thiên: đổi dấu $(+) \\to (-)$ là **cực đại**, $(-) \\to (+)$ là **cực tiểu**.\n**Ví dụ:** $y = x^3 - 3x + 2 \\Rightarrow y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$."],
    [12, "vat-ly", "kntt", "Chương 1: Vật lí nhiệt", "Nội năng và Định luật I Nhiệt động lực học", "Quy ước dấu $Q, A$ trong chương trình Vật lý 12 mới.", "### Định luật I Nhiệt động lực học\n$$\\Delta U = A + Q$$\n- $Q > 0$: nhận nhiệt; $A < 0$: thực hiện công.\n- Nhiệt lượng: $Q = m c \\Delta T$."],
    [12, "hoa-hoc", "kntt", "Chương 1: Ester - Lipid", "Cấu tạo, danh pháp IUPAC & Xà phòng hóa Ester", "Danh pháp chuẩn mới 2018 và bài toán xà phòng hóa.", "### Phản ứng xà phòng hóa\n$$\\text{RCOOR}' + \\text{NaOH} \\xrightarrow{t^\\circ} \\text{RCOONa} + \\text{R}'\\text{OH}$$\nVí dụ: $\\text{CH}_3\\text{COOC}_2\\text{H}_5$ (*ethyl acetate*)."],
  ] as const;

  for (const [g, sub, tb, ch, title, sum, mdx] of seedLessons) {
    const id = `les-${sub}-${g}-${slugify(title).slice(0, 20)}`;
    const mats = JSON.stringify([{ id: `m-${id}`, title: `Tài liệu tóm tắt ${title} (PDF)`, type: "pdf", url: "#cdn-r2", size_label: "PDF Chuẩn", is_free: true }]);
    stmts.push(
      db.prepare("INSERT OR IGNORE INTO lessons (id, grade_id, subject_code, subject_name, textbook, chapter, title, slug, summary, content_mdx, duration_min, materials_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 25, ?)")
        .bind(id, g, sub, SUBJECT_NAMES[sub] || sub, tb, ch, title, slugify(title), sum, mdx, mats),
      db.prepare("INSERT OR IGNORE INTO knowledge_chunks (id, grade_id, subject_code, textbook, citation, content) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(`kc-${id}`, g, sub, tb, `SGK ${SUBJECT_NAMES[sub]} Lớp ${g} — ${title}`, `${sum}\n${mdx}`)
    );
  }

  // 4. Seed Câu hỏi chuẩn 4 dạng GDPT 2018 + 2 Đề thi mẫu
  const seedQs = [
    {
      id: "q-12-1", g: 12, sub: "toan", topic: "Cực trị hàm số", type: "single_choice", diff: "nhan_biet", pts: 1.5,
      mdx: "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực đại của hàm số là:",
      opts: [{ key: "A", text: "$x = 1$" }, { key: "B", text: "$x = -1$" }, { key: "C", text: "$x = 4$" }, { key: "D", text: "$x = 0$" }],
      ans: { single: "B" },
      exp: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Qua $x = -1$, $y'$ đổi dấu từ $(+)$ sang $(-)$ nên $x = -1$ là điểm cực đại.",
    },
    {
      id: "q-12-2", g: 12, sub: "toan", topic: "Nguyên hàm - Tích phân", type: "single_choice", diff: "thong_hieu", pts: 1.5,
      mdx: "Tính tích phân $I = \\int_0^2 (3x^2 + 2x)\\,dx$:",
      opts: [{ key: "A", text: "$I = 12$" }, { key: "B", text: "$I = 10$" }, { key: "C", text: "$I = 8$" }, { key: "D", text: "$I = 14$" }],
      ans: { single: "A" },
      exp: "Nguyên hàm là $x^3 + x^2$, suy ra $I = (2^3 + 2^2) - 0 = 12$.",
    },
    {
      id: "q-12-3", g: 12, sub: "toan", topic: "Khảo sát hàm số (Đúng/Sai 2025)", type: "true_false_group", diff: "van_dung", pts: 4.0,
      mdx: "Cho hàm số $f(x) = \\dfrac{2x - 1}{x - 1}$. Xét tính **Đúng / Sai** của các mệnh đề sau:",
      opts: [
        { key: "a", text: "Tập xác định là $D = \\mathbb{R} \\setminus \\{1\\}$." },
        { key: "b", text: "Đạo hàm $f'(x) = \\dfrac{-1}{(x-1)^2} < 0$ với mọi $x \\neq 1$." },
        { key: "c", text: "Hàm số nghịch biến trên toàn tập xác định $D$." },
        { key: "d", text: "Đồ thị có tiệm cận ngang $y = 2$." },
      ],
      ans: { true_false: { a: true, b: true, c: false, d: true } },
      exp: "(a) Đúng, (b) Đúng, (c) Sai vì không kết luận nghịch biến trên hợp 2 khoảng rời nhau, (d) Đúng.",
    },
    {
      id: "q-12-4", g: 12, sub: "toan", topic: "GTLN - GTNN (Trả lời ngắn)", type: "short_answer", diff: "van_dung", pts: 3.0,
      mdx: "Tìm giá trị lớn nhất của hàm số $y = -x^2 + 4x$ trên đoạn $[0; 3]$.",
      opts: [],
      ans: { short: ["4", "4.0"] },
      exp: "$y' = -2x + 4 = 0 \\Leftrightarrow x = 2 \\in [0;3]$. $y(2) = 4$ là GTLN.",
    },
    {
      id: "q-9-1", g: 9, sub: "toan", topic: "Định lý Viète", type: "single_choice", diff: "thong_hieu", pts: 5.0,
      mdx: "Gọi $x_1, x_2$ là hai nghiệm của $x^2 - 5x + 6 = 0$. Tính $x_1^2 + x_2^2$:",
      opts: [{ key: "A", text: "$13$" }, { key: "B", text: "$19$" }, { key: "C", text: "$25$" }, { key: "D", text: "$37$" }],
      ans: { single: "A" },
      exp: "$x_1 + x_2 = 5, x_1 x_2 = 6 \\Rightarrow x_1^2 + x_2^2 = 5^2 - 2(6) = 13$.",
    },
    {
      id: "q-9-2", g: 9, sub: "toan", topic: "Hệ phương trình", type: "short_answer", diff: "nhan_biet", pts: 5.0,
      mdx: "Cho $\\begin{cases} x + y = 10 \\\\ x - y = 2 \\end{cases}$. Tìm giá trị của $x$:",
      opts: [],
      ans: { short: ["6"] },
      exp: "Cộng hai phương trình: $2x = 12 \\Rightarrow x = 6$.",
    },
  ];

  for (const q of seedQs) {
    stmts.push(
      db.prepare("INSERT OR IGNORE INTO questions (id, grade_id, subject_code, subject_name, topic, q_type, difficulty, content_mdx, options_json, unit_hint, answer_json, explanation_mdx, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(q.id, q.g, q.sub, SUBJECT_NAMES[q.sub], q.topic, q.type, q.diff, q.mdx, JSON.stringify(q.opts), q.type === "short_answer" ? "Nhập số" : "", JSON.stringify(q.ans), q.exp, q.pts)
    );
  }

  stmts.push(
    db.prepare("INSERT OR IGNORE INTO exams (id, grade_id, subject_code, subject_name, title, slug, mode, duration_minutes, total_points, question_ids_json, question_points_json) VALUES (?, 12, 'toan', 'Toán học', ?, ?, 'mock_live', 45, 10.0, ?, ?)")
      .bind("exam-toan-12-thpt-2025", "Kỳ thi thử THPT Quốc gia 2025 — Môn Toán (Chuẩn 3 Phần trên Cloudflare Edge)", "exam-toan-12-thpt-2025", JSON.stringify(["q-12-1", "q-12-2", "q-12-3", "q-12-4"]), JSON.stringify({ "q-12-1": 1.5, "q-12-2": 1.5, "q-12-3": 4.0, "q-12-4": 3.0 })),
    db.prepare("INSERT OR IGNORE INTO exams (id, grade_id, subject_code, subject_name, title, slug, mode, duration_minutes, total_points, question_ids_json, question_points_json) VALUES (?, 9, 'toan', 'Toán học', ?, ?, 'practice', 30, 10.0, ?, ?)")
      .bind("exam-toan-9-tuyen-sinh-10", "Thi thử Tuyển sinh vào lớp 10 — Chuyên đề Đại số trọng tâm", "exam-toan-9-tuyen-sinh-10", JSON.stringify(["q-9-1", "q-9-2"]), JSON.stringify({ "q-9-1": 5.0, "q-9-2": 5.0 }))
  );

  await db.batch(stmts);
  seededInIsolate = true;
}
