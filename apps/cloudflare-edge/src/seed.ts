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
  ]);

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
