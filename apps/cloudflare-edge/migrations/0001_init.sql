-- Cloudflare D1 (SQLite) Schema cho EduK12 Scale Edge (Lớp 1–12 | CMS | Exam | AI RAG)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  tier TEXT NOT NULL DEFAULT 'free',
  current_grade INTEGER,
  school_name TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  grade_id INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  textbook TEXT NOT NULL DEFAULT 'kntt',
  chapter TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT DEFAULT '',
  content_mdx TEXT NOT NULL,
  duration_min INTEGER DEFAULT 20,
  materials_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(grade_id, subject_code, textbook, chapter, slug)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  grade_id INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Tổng hợp',
  q_type TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'thong_hieu',
  content_mdx TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  unit_hint TEXT DEFAULT '',
  answer_json TEXT NOT NULL,
  explanation_mdx TEXT DEFAULT '',
  points REAL NOT NULL DEFAULT 2.0,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  grade_id INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'mock_live',
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  total_points REAL NOT NULL DEFAULT 10.0,
  question_ids_json TEXT NOT NULL DEFAULT '[]',
  question_points_json TEXT NOT NULL DEFAULT '{}',
  bundle_version INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL DEFAULT 'Học sinh K-12',
  status TEXT NOT NULL DEFAULT 'in_progress',
  shuffle_seed INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  graded_at TEXT,
  duration_sec INTEGER DEFAULT 0,
  score REAL DEFAULT 0,
  max_score REAL DEFAULT 10.0,
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  grading_latency_us INTEGER DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}',
  details_json TEXT NOT NULL DEFAULT '[]',
  cheat_flags_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  grade_id INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  textbook TEXT NOT NULL DEFAULT 'kntt',
  citation TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_filter ON lessons(grade_id, subject_code, textbook);
CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions(grade_id, subject_code);
CREATE INDEX IF NOT EXISTS idx_attempts_exam ON exam_attempts(exam_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_grade ON knowledge_chunks(grade_id, subject_code);

INSERT OR IGNORE INTO grades (id, name, slug, level) VALUES
(1,'Lớp 1','lop-1','primary'),(2,'Lớp 2','lop-2','primary'),(3,'Lớp 3','lop-3','primary'),
(4,'Lớp 4','lop-4','primary'),(5,'Lớp 5','lop-5','primary'),(6,'Lớp 6','lop-6','middle'),
(7,'Lớp 7','lop-7','middle'),(8,'Lớp 8','lop-8','middle'),(9,'Lớp 9','lop-9','middle'),
(10,'Lớp 10','lop-10','high'),(11,'Lớp 11','lop-11','high'),(12,'Lớp 12','lop-12','high');

INSERT OR IGNORE INTO subjects (code, name, display_order) VALUES
('toan','Toán học',1),('ngu-van','Ngữ văn',2),('tieng-anh','Tiếng Anh',3),
('vat-ly','Vật lý',4),('hoa-hoc','Hóa học',5),('sinh-hoc','Sinh học',6),
('khtn','Khoa học tự nhiên',7),('lich-su','Lịch sử',8),('dia-ly','Địa lý',9),('tin-hoc','Tin học',10);
