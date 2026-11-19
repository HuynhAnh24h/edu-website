-- =============================================================================
-- EDU K-12 PLATFORM - PRODUCTION DATABASE SCHEMA (PostgreSQL 16+ / Citus Ready)
-- Quy mô mục tiêu: Lớp 1 - 12 | Tài liệu | Bài tập | Thi trắc nghiệm | AI Tutor
-- Hỗ trợ: Partitioning, pgvector (RAG), chuẩn đề thi GDPT 2018 (2025+)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Cho AI RAG & Semantic Search

-- =============================================================================
-- 1. NGƯỜI DÙNG & PHÂN QUYỀN (USERS & AUTH)
-- =============================================================================

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'parent', 'content_admin', 'super_admin');
CREATE TYPE subscription_tier AS ENUM ('free', 'plus', 'pro');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'student',
    tier            subscription_tier NOT NULL DEFAULT 'free',
    current_grade   SMALLINT CHECK (current_grade BETWEEN 1 AND 12),
    school_name     VARCHAR(200),
    province_code   VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_grade_role ON users (current_grade, role);

-- =============================================================================
-- 2. CHƯƠNG TRÌNH HỌC LỚP 1 - 12 & TÀI LIỆU HỌC TẬP (CURRICULUM & MATERIALS)
-- =============================================================================

CREATE TYPE education_level AS ENUM ('primary', 'middle', 'high'); -- Tiểu học (1-5), THCS (6-9), THPT (10-12)
CREATE TYPE textbook_series AS ENUM ('kntt', 'ctst', 'canh_dieu', 'general'); -- Kết nối tri thức, Chân trời sáng tạo, Cánh diều, Chung
CREATE TYPE material_type AS ENUM ('article', 'pdf', 'video_hls', 'slide', 'mindmap', 'flashcard');

CREATE TABLE grades (
    id              SMALLINT PRIMARY KEY CHECK (id BETWEEN 1 AND 12),
    name            VARCHAR(50) NOT NULL,           -- VD: 'Lớp 1', ..., 'Lớp 12'
    slug            VARCHAR(50) UNIQUE NOT NULL,    -- VD: 'lop-1', ..., 'lop-12'
    level           education_level NOT NULL
);

CREATE TABLE subjects (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,    -- VD: 'toan', 'ngu-van', 'tieng-anh', 'vat-ly'
    name            VARCHAR(100) NOT NULL,          -- VD: 'Toán học'
    icon_url        TEXT,
    display_order   SMALLINT NOT NULL DEFAULT 0
);

-- Bảng nối Lớp - Môn - Bộ sách (Mỗi lớp có các môn khác nhau, VD: Lý/Hóa/Sinh từ cấp 2-3)
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id        SMALLINT NOT NULL REFERENCES grades(id),
    subject_id      INT NOT NULL REFERENCES subjects(id),
    textbook        textbook_series NOT NULL DEFAULT 'general',
    title           VARCHAR(200) NOT NULL,          -- VD: 'Toán lớp 12 - Kết nối tri thức'
    slug            VARCHAR(220) UNIQUE NOT NULL,
    description     TEXT,
    thumbnail_url   TEXT,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grade_id, subject_id, textbook)
);

CREATE TABLE chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,          -- VD: 'Chương I: Ứng dụng đạo hàm'
    slug            VARCHAR(255) NOT NULL,
    display_order   SMALLINT NOT NULL DEFAULT 0,
    UNIQUE (course_id, slug)
);

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    summary         TEXT,
    content_mdx     TEXT,                           -- Nội dung lý thuyết Markdown + LaTeX (KaTeX)
    cdn_static_url  TEXT,                           -- URL bản build tĩnh trên CDN/R2
    duration_min    SMALLINT DEFAULT 15,
    display_order   SMALLINT NOT NULL DEFAULT 0,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chapter_id, slug)
);

CREATE TABLE study_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    type            material_type NOT NULL,
    storage_url     TEXT NOT NULL,                  -- Cloudflare R2 / S3 URL (PDF / HLS m3u8 / Image)
    file_size_bytes BIGINT,
    duration_sec    INT,                            -- Dành cho video
    is_free         BOOLEAN NOT NULL DEFAULT TRUE,
    download_count  BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_lesson ON study_materials (lesson_id, type);

-- =============================================================================
-- 3. NGÂN HÀNG CÂU HỎI & BÀI TẬP TRỰC TUYẾN (QUESTION BANK & EXERCISES)
-- =============================================================================

CREATE TYPE question_type AS ENUM (
    'single_choice',      -- Trắc nghiệm 1 đáp án (A/B/C/D)
    'multi_choice',       -- Chọn nhiều đáp án đúng
    'true_false_group',   -- 4 mệnh đề Đúng/Sai (chuẩn thi THPT 2025+)
    'short_answer'        -- Điền số / trả lời ngắn
);

CREATE TYPE cognitive_level AS ENUM (
    'nhan_biet',          -- Nhận biết
    'thong_hieu',         -- Thông hiểu
    'van_dung',           -- Vận dụng
    'van_dung_cao'        -- Vận dụng cao
);

CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id        SMALLINT NOT NULL REFERENCES grades(id),
    subject_id      INT NOT NULL REFERENCES subjects(id),
    chapter_id      UUID REFERENCES chapters(id) ON DELETE SET NULL,
    lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
    topic           VARCHAR(150) NOT NULL DEFAULT 'Tổng hợp',
    q_type          question_type NOT NULL,
    difficulty      cognitive_level NOT NULL DEFAULT 'nhan_biet',
    content_mdx     TEXT NOT NULL,                  -- Đề bài hỗ trợ LaTeX & ảnh CDN
    -- Cấu trúc options JSONB linh hoạt cho 4 dạng câu hỏi (KHÔNG chứa đáp án đúng ở trường này):
    -- single/multi: [{"key":"A","text":"..."}, ...]
    -- true_false_group: [{"key":"a","text":"..."}, {"key":"b","text":"..."}, ...]
    -- short_answer: {"unit":"cm","placeholder":"Nhập số nguyên"}
    options_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Đáp án chuẩn (CHỈ tồn tại phía backend/worker, tuyệt đối không xuất ra bundle đề thi):
    -- single: {"answer":"A"} | multi: {"answers":["A","C"]}
    -- true_false_group: {"a":true,"b":false,"c":true,"d":false}
    -- short_answer: {"accepted":["12.5","12,5"],"tolerance":0.01}
    answer_key_json JSONB NOT NULL,
    explanation_mdx TEXT,                           -- Lời giải chi tiết từng bước
    tags            TEXT[] DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_filter ON questions (grade_id, subject_id, chapter_id, difficulty) WHERE is_active = TRUE;
CREATE INDEX idx_questions_lesson ON questions (lesson_id) WHERE is_active = TRUE;
CREATE INDEX idx_questions_tags ON questions USING GIN (tags);

-- Bộ bài tập luyện tập gắn theo bài học hoặc chuyên đề
CREATE TABLE exercise_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID REFERENCES lessons(id) ON DELETE CASCADE,
    chapter_id      UUID REFERENCES chapters(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    question_ids    UUID[] NOT NULL,                -- Danh sách thứ tự câu hỏi
    pass_score_pct  SMALLINT NOT NULL DEFAULT 70,
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. THI TRẮC NGHIỆM TRỰC TUYẾN QUY MÔ LỚN (HIGH-CONCURRENCY EXAMS)
-- =============================================================================

CREATE TYPE exam_mode AS ENUM ('practice', 'mock_live', 'official');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted_queued', 'graded', 'invalidated');

CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id            SMALLINT NOT NULL REFERENCES grades(id),
    subject_id          INT NOT NULL REFERENCES subjects(id),
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    mode                exam_mode NOT NULL DEFAULT 'practice',
    duration_minutes    SMALLINT NOT NULL CHECK (duration_minutes > 0),
    total_points        NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    question_count      SMALLINT NOT NULL,
    -- Tối ưu 1M CCU: Xuất sẵn file đề JSON mã hóa lên CDN R2
    cdn_bundle_url      TEXT,                       -- File đề đã mã hóa AES-256-GCM trên R2
    bundle_version      INT NOT NULL DEFAULT 1,
    bundle_key_ref      VARCHAR(128),               -- Tham chiếu khóa giải mã trên Vault/Redis
    starts_at           TIMESTAMPTZ,                -- Thời gian mở phòng thi đồng loạt
    ends_at             TIMESTAMPTZ,
    shuffle_questions   BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options     BOOLEAN NOT NULL DEFAULT TRUE,
    is_published        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exams_grade_subject ON exams (grade_id, subject_id, mode, starts_at DESC);

CREATE TABLE exam_questions (
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id),
    display_order   SMALLINT NOT NULL,
    points          NUMERIC(5,2) NOT NULL DEFAULT 0.25,
    PRIMARY KEY (exam_id, question_id)
);

-- Bảng lưu lượt thi - PHÂN VÙNG (PARTITION) THEO THÁNG để chứa hàng trăm triệu lượt thi
CREATE TABLE exam_attempts (
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    exam_id             UUID NOT NULL REFERENCES exams(id),
    user_id             UUID REFERENCES users(id),
    user_name           VARCHAR(150) NOT NULL DEFAULT 'Học sinh K-12',
    status              attempt_status NOT NULL DEFAULT 'in_progress',
    shuffle_seed        INT NOT NULL,               -- Seed tái tạo thứ tự câu hỏi riêng cho user
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    graded_at           TIMESTAMPTZ,
    duration_sec        INT DEFAULT 0,
    score               NUMERIC(5,2) DEFAULT 0,
    correct_count       SMALLINT DEFAULT 0,
    wrong_count         SMALLINT DEFAULT 0,
    unanswered_count    SMALLINT DEFAULT 0,
    grading_latency_us  BIGINT DEFAULT 0,
    -- Lưu toàn bộ bài làm dạng JSONB nén (giảm hàng tỷ dòng JOIN khi chấm quy mô lớn)
    answers_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
    details_snapshot    JSONB NOT NULL DEFAULT '[]'::jsonb,
    cheat_flags_json    JSONB NOT NULL DEFAULT '[]'::jsonb, -- Log chuyển tab / thoát fullscreen
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Tạo sẵn partition mẫu + DEFAULT partition để không bao giờ lỗi khi sang tháng mới
CREATE TABLE exam_attempts_2026_11 PARTITION OF exam_attempts
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE exam_attempts_2026_12 PARTITION OF exam_attempts
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE exam_attempts_default PARTITION OF exam_attempts DEFAULT;

CREATE INDEX idx_attempts_user ON exam_attempts (user_id, created_at DESC);
CREATE INDEX idx_attempts_exam_score ON exam_attempts (exam_id, score DESC) WHERE status = 'graded';

-- Hồ sơ năng lực & Tiến độ học tập của học sinh theo từng bài/chương
CREATE TABLE user_skill_mastery (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id          UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    total_answered      INT NOT NULL DEFAULT 0,
    total_correct       INT NOT NULL DEFAULT 0,
    mastery_pct         NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- 0.00 -> 100.00
    last_practiced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, chapter_id)
);

-- =============================================================================
-- 5. AI DẠY HỌC (AI TUTOR, RAG KNOWLEDGE BASE & SEMANTIC CACHE)
-- =============================================================================

-- Kho tri thức SGK lớp 1-12 đã chia đoạn (chunk) & vector hóa để AI không bịa / không giải vượt cấp
CREATE TABLE knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id        SMALLINT NOT NULL REFERENCES grades(id),
    subject_id      INT NOT NULL REFERENCES subjects(id),
    textbook        textbook_series NOT NULL DEFAULT 'general',
    lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
    chunk_text      TEXT NOT NULL,
    metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding       vector(768),                    -- Tương thích model embedding 768 dims (hoặc đồng bộ sang Qdrant)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_filter ON knowledge_chunks (grade_id, subject_id, textbook);
CREATE INDEX idx_knowledge_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_id        SMALLINT NOT NULL REFERENCES grades(id),
    subject_id      INT REFERENCES subjects(id),
    lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title           VARCHAR(200),
    tutor_mode      VARCHAR(30) NOT NULL DEFAULT 'socratic', -- 'socratic' | 'explain' | 'check_homework'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_user ON ai_conversations (user_id, updated_at DESC);

-- Tin nhắn AI - PHÂN VÙNG THEO THÁNG để chịu tải hàng trăm triệu lượt hỏi đáp
CREATE TABLE ai_messages (
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content_mdx         TEXT NOT NULL,
    image_url           TEXT,                       -- Ảnh chụp đề bài của học sinh trên R2
    model_used          VARCHAR(60),                -- VD: 'semantic-cache', 'vllm-edu-8b', 'gemini-flash'
    cache_hit           BOOLEAN NOT NULL DEFAULT FALSE,
    prompt_tokens       INT DEFAULT 0,
    completion_tokens   INT DEFAULT 0,
    latency_ms          INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE ai_messages_2026_11 PARTITION OF ai_messages
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE ai_messages_2026_12 PARTITION OF ai_messages
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE ai_messages_default PARTITION OF ai_messages DEFAULT;

CREATE INDEX idx_ai_messages_conv ON ai_messages (conversation_id, created_at ASC);

-- Dữ liệu khởi tạo chuẩn 12 khối lớp & các môn học phổ thông
INSERT INTO grades (id, name, slug, level) VALUES
(1,  'Lớp 1',  'lop-1',  'primary'),
(2,  'Lớp 2',  'lop-2',  'primary'),
(3,  'Lớp 3',  'lop-3',  'primary'),
(4,  'Lớp 4',  'lop-4',  'primary'),
(5,  'Lớp 5',  'lop-5',  'primary'),
(6,  'Lớp 6',  'lop-6',  'middle'),
(7,  'Lớp 7',  'lop-7',  'middle'),
(8,  'Lớp 8',  'lop-8',  'middle'),
(9,  'Lớp 9',  'lop-9',  'middle'),
(10, 'Lớp 10', 'lop-10', 'high'),
(11, 'Lớp 11', 'lop-11', 'high'),
(12, 'Lớp 12', 'lop-12', 'high')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (code, name, display_order) VALUES
('toan',      'Toán học',            1),
('ngu-van',   'Ngữ văn',             2),
('tieng-anh', 'Tiếng Anh',           3),
('vat-ly',    'Vật lý',              4),
('hoa-hoc',   'Hóa học',             5),
('sinh-hoc',  'Sinh học',            6),
('khtn',      'Khoa học tự nhiên',   7),
('lich-su',   'Lịch sử',             8),
('dia-ly',    'Địa lý',              9),
('tin-hoc',   'Tin học',            10)
ON CONFLICT (code) DO NOTHING;
