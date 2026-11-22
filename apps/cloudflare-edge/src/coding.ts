import { JwtClaims } from "./crypto";

type JsonResFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

const VALID_TRACKS = new Set([
  "html",
  "css",
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "nodejs",
  "nestjs",
  "golang",
  "python",
  "mongodb",
  "postgresql",
]);

let codingCmsInitialized = false;

async function ensureCodingCmsTables(db: D1Database) {
  if (codingCmsInitialized) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS coding_lessons (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        order_num INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'Cơ bản',
        summary TEXT NOT NULL DEFAULT '',
        theory_json TEXT NOT NULL DEFAULT '[]',
        task_prompt TEXT NOT NULL DEFAULT '',
        thinking_hints_json TEXT NOT NULL DEFAULT '["","",""]',
        starter_code TEXT NOT NULL DEFAULT '',
        preview_html TEXT DEFAULT '',
        required_ts_patterns_json TEXT DEFAULT '[]',
        sql_tables_json TEXT DEFAULT '',
        mongo_collections_json TEXT DEFAULT '',
        go_test_imports_json TEXT DEFAULT '[]',
        tests_json TEXT NOT NULL DEFAULT '[]',
        is_published INTEGER NOT NULL DEFAULT 1,
        created_by TEXT DEFAULT 'Admin',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS coding_track_settings (
        track_id TEXT PRIMARY KEY,
        source_mode TEXT NOT NULL DEFAULT 'append',
        updated_by TEXT DEFAULT '',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_coding_lessons_track ON coding_lessons(track_id, order_num ASC)`),
  ]);
  codingCmsInitialized = true;
}

interface RawCodingLessonRow {
  id: string;
  track_id: string;
  order_num: number;
  title: string;
  difficulty: string;
  summary: string;
  theory_json: string;
  task_prompt: string;
  thinking_hints_json: string;
  starter_code: string;
  preview_html: string | null;
  required_ts_patterns_json: string | null;
  sql_tables_json: string | null;
  mongo_collections_json: string | null;
  go_test_imports_json: string | null;
  tests_json: string;
  is_published: number;
  created_by: string | null;
  updated_at: string;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapLessonRow(r: RawCodingLessonRow) {
  const hintsRaw = safeParseJson<string[]>(r.thinking_hints_json, ["", "", ""]);
  const thinkingHints: [string, string, string] = [
    hintsRaw[0] || "Hãy đọc kỹ yêu cầu đề bài và xác định đầu vào, đầu ra cần đạt.",
    hintsRaw[1] || "Chia nhỏ yêu cầu thành từng bước tuần tự rồi kiểm tra lại với code mẫu.",
    hintsRaw[2] || "Đối chiếu tên thẻ / tên hàm và chạy thử để xem chi tiết từng Test Case.",
  ];
  const reqTs = safeParseJson<{ regex: string; message: string }[]>(r.required_ts_patterns_json, []);
  const sqlTables = safeParseJson<Record<string, Record<string, unknown>[]> | null>(r.sql_tables_json, null);
  const mongoCols = safeParseJson<Record<string, Record<string, unknown>[]> | null>(r.mongo_collections_json, null);
  const goImports = safeParseJson<string[]>(r.go_test_imports_json, []);

  return {
    id: r.id,
    trackId: r.track_id,
    order: Number(r.order_num || 1),
    title: r.title,
    difficulty: (r.difficulty === "Trung bình" || r.difficulty === "Thực chiến" ? r.difficulty : "Cơ bản") as
      | "Cơ bản"
      | "Trung bình"
      | "Thực chiến",
    summary: r.summary || "",
    theory: safeParseJson<string[]>(r.theory_json, []),
    taskPrompt: r.task_prompt || "",
    thinkingHints,
    starterCode: r.starter_code || "",
    previewHtml: r.preview_html || undefined,
    requiredTsPatterns: reqTs.length ? reqTs : undefined,
    sqlTables: sqlTables || undefined,
    mongoCollections: mongoCols || undefined,
    goTestImports: goImports.length ? goImports : undefined,
    tests: safeParseJson<unknown[]>(r.tests_json, []),
    is_published: r.is_published === 1,
    isAdminAuthored: true,
    createdBy: r.created_by || "Admin",
    updated_at: r.updated_at,
  };
}

export async function handleCodingRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonResFn
): Promise<Response | null> {
  await ensureCodingCmsTables(db);
  const isStaff =
    claims?.role === "super_admin" || claims?.role === "content_admin" || claims?.role === "teacher";
  const url = new URL(request.url);

  // === 0. LẤY BÀI TẬP LẬP TRÌNH DO ADMIN CẤP THEO MÔN (PUBLIC) ===
  if (path === "/api/v1/coding/lessons" && method === "GET") {
    const trackFilter = (url.searchParams.get("track") || "").trim().toLowerCase();
    const lessonsRes = trackFilter && VALID_TRACKS.has(trackFilter)
      ? await db
          .prepare("SELECT * FROM coding_lessons WHERE is_published = 1 AND track_id = ? ORDER BY order_num ASC, created_at ASC")
          .bind(trackFilter)
          .all<RawCodingLessonRow>()
      : await db
          .prepare("SELECT * FROM coding_lessons WHERE is_published = 1 ORDER BY track_id ASC, order_num ASC, created_at ASC")
          .all<RawCodingLessonRow>();

    const settingsRes = await db
      .prepare("SELECT track_id, source_mode FROM coding_track_settings")
      .all<{ track_id: string; source_mode: string }>();

    const trackModes: Record<string, "append" | "admin_only"> = {};
    for (const s of settingsRes.results || []) {
      trackModes[s.track_id] = s.source_mode === "admin_only" ? "admin_only" : "append";
    }

    return jsonRes({
      lessons: (lessonsRes.results || []).map(mapLessonRow),
      track_modes: trackModes,
    });
  }

  // === 0B. ADMIN/TEACHER: DANH SÁCH TOÀN BỘ BÀI LẬP TRÌNH ĐÃ CẤP ===
  if (path === "/api/v1/coding/admin/lessons" && method === "GET") {
    if (!isStaff) return jsonRes({ error: "Chỉ Quản trị viên / Giáo viên mới có quyền quản lý bài lập trình" }, 403);
    const trackFilter = (url.searchParams.get("track") || "").trim().toLowerCase();
    const lessonsRes = trackFilter && VALID_TRACKS.has(trackFilter)
      ? await db
          .prepare("SELECT * FROM coding_lessons WHERE track_id = ? ORDER BY order_num ASC, created_at ASC")
          .bind(trackFilter)
          .all<RawCodingLessonRow>()
      : await db
          .prepare("SELECT * FROM coding_lessons ORDER BY track_id ASC, order_num ASC, created_at ASC")
          .all<RawCodingLessonRow>();

    const settingsRes = await db
      .prepare("SELECT track_id, source_mode FROM coding_track_settings")
      .all<{ track_id: string; source_mode: string }>();

    const trackModes: Record<string, "append" | "admin_only"> = {};
    for (const s of settingsRes.results || []) {
      trackModes[s.track_id] = s.source_mode === "admin_only" ? "admin_only" : "append";
    }

    return jsonRes({
      lessons: (lessonsRes.results || []).map(mapLessonRow),
      track_modes: trackModes,
    });
  }

  // === 0C. ADMIN/TEACHER: TẠO HOẶC CẬP NHẬT BÀI LẬP TRÌNH CHO 1 MÔN TRONG LỘ TRÌNH ===
  if (path === "/api/v1/coding/admin/lessons" && method === "POST") {
    if (!isStaff) return jsonRes({ error: "Chỉ Quản trị viên / Giáo viên mới có quyền thêm/sửa bài" }, 403);
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      trackId?: string;
      order?: number;
      title?: string;
      difficulty?: string;
      summary?: string;
      theory?: string[];
      taskPrompt?: string;
      thinkingHints?: [string, string, string];
      starterCode?: string;
      previewHtml?: string;
      requiredTsPatterns?: { regex: string; message: string }[];
      sqlTables?: Record<string, Record<string, unknown>[]>;
      mongoCollections?: Record<string, Record<string, unknown>[]>;
      goTestImports?: string[];
      tests?: unknown[];
      is_published?: boolean;
    };

    const trackId = String(body.trackId || "").trim().toLowerCase();
    if (!VALID_TRACKS.has(trackId)) {
      return jsonRes({ error: "Môn lập trình (trackId) không hợp lệ" }, 400);
    }
    const title = String(body.title || "").trim();
    if (!title) return jsonRes({ error: "Vui lòng nhập tiêu đề bài học" }, 400);
    const taskPrompt = String(body.taskPrompt || "").trim();
    if (!taskPrompt) return jsonRes({ error: "Vui lòng nhập yêu cầu bài kiểm tra" }, 400);
    const tests = Array.isArray(body.tests) ? body.tests : [];
    if (tests.length === 0) {
      return jsonRes({ error: "Cần ít nhất 1 Test Case kiểm tra tự động" }, 400);
    }

    const id = (body.id || "").trim() || `${trackId}-adm-${Date.now().toString(36)}`;
    const orderNum = Math.max(1, Number(body.order || 1));
    const difficulty =
      body.difficulty === "Trung bình" || body.difficulty === "Thực chiến" ? body.difficulty : "Cơ bản";
    const theory = Array.isArray(body.theory) ? body.theory.filter((x) => String(x).trim()) : [];
    const hints = Array.isArray(body.thinkingHints)
      ? [body.thinkingHints[0] || "", body.thinkingHints[1] || "", body.thinkingHints[2] || ""]
      : ["", "", ""];
    const isPublished = body.is_published === false ? 0 : 1;

    await db
      .prepare(
        `INSERT INTO coding_lessons (
          id, track_id, order_num, title, difficulty, summary, theory_json,
          task_prompt, thinking_hints_json, starter_code, preview_html,
          required_ts_patterns_json, sql_tables_json, mongo_collections_json,
          go_test_imports_json, tests_json, is_published, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          track_id = excluded.track_id,
          order_num = excluded.order_num,
          title = excluded.title,
          difficulty = excluded.difficulty,
          summary = excluded.summary,
          theory_json = excluded.theory_json,
          task_prompt = excluded.task_prompt,
          thinking_hints_json = excluded.thinking_hints_json,
          starter_code = excluded.starter_code,
          preview_html = excluded.preview_html,
          required_ts_patterns_json = excluded.required_ts_patterns_json,
          sql_tables_json = excluded.sql_tables_json,
          mongo_collections_json = excluded.mongo_collections_json,
          go_test_imports_json = excluded.go_test_imports_json,
          tests_json = excluded.tests_json,
          is_published = excluded.is_published,
          created_by = excluded.created_by,
          updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        id,
        trackId,
        orderNum,
        title,
        difficulty,
        String(body.summary || "").trim(),
        JSON.stringify(theory),
        taskPrompt,
        JSON.stringify(hints),
        String(body.starterCode || ""),
        String(body.previewHtml || ""),
        JSON.stringify(body.requiredTsPatterns || []),
        body.sqlTables ? JSON.stringify(body.sqlTables) : "",
        body.mongoCollections ? JSON.stringify(body.mongoCollections) : "",
        JSON.stringify(body.goTestImports || []),
        JSON.stringify(tests),
        isPublished,
        claims?.name || "Admin"
      )
      .run();

    const saved = await db.prepare("SELECT * FROM coding_lessons WHERE id = ?").bind(id).first<RawCodingLessonRow>();
    return jsonRes({ ok: true, lesson: saved ? mapLessonRow(saved) : { id } });
  }

  // === 0D. ADMIN/TEACHER: XÓA BÀI LẬP TRÌNH ===
  const delMatch = path.match(/^\/api\/v1\/coding\/admin\/lessons\/([^/]+)$/);
  if (delMatch && method === "DELETE") {
    if (!isStaff) return jsonRes({ error: "Không có quyền xóa bài lập trình" }, 403);
    const id = decodeURIComponent(delMatch[1]);
    await db.prepare("DELETE FROM coding_lessons WHERE id = ?").bind(id).run();
    return jsonRes({ ok: true, deleted_id: id });
  }

  // === 0E. ADMIN/TEACHER: CHỌN CHẾ ĐỘ NGUỒN BÀI CHO MỖI MÔN (GỘP HAY CHỈ LẤY BÀI ADMIN CẤP) ===
  if (path === "/api/v1/coding/admin/track-mode" && method === "PUT") {
    if (!isStaff) return jsonRes({ error: "Không có quyền cấu hình chế độ bài học" }, 403);
    const body = (await request.json().catch(() => ({}))) as { trackId?: string; source_mode?: string };
    const trackId = String(body.trackId || "").trim().toLowerCase();
    if (!VALID_TRACKS.has(trackId)) return jsonRes({ error: "trackId không hợp lệ" }, 400);
    const mode = body.source_mode === "admin_only" ? "admin_only" : "append";

    await db
      .prepare(
        `INSERT INTO coding_track_settings (track_id, source_mode, updated_by, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(track_id) DO UPDATE SET
           source_mode = excluded.source_mode,
           updated_by = excluded.updated_by,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(trackId, mode, claims?.name || "Admin")
      .run();

    return jsonRes({ ok: true, trackId, source_mode: mode });
  }

  // === 1. LẤY TIẾN ĐỘ HỌC LẬP TRÌNH CỦA NGƯỜI DÙNG ===
  if (path === "/api/v1/coding/progress" && method === "GET") {
    if (!claims) return jsonRes({ passed: {} });
    const { results } = await db
      .prepare(
        "SELECT track_id, lesson_id, submitted_code, passed_at FROM coding_progress WHERE user_id = ?"
      )
      .bind(claims.uid)
      .all<{ track_id: string; lesson_id: string; submitted_code: string; passed_at: string }>();

    const passed: Record<string, { track_id: string; code: string; passed_at: string }> = {};
    for (const r of results) {
      passed[r.lesson_id] = {
        track_id: r.track_id,
        code: r.submitted_code,
        passed_at: r.passed_at,
      };
    }
    return jsonRes({ passed });
  }

  // === 2. LƯU KẾT QUẢ QUA BÀI LẬP TRÌNH ===
  if (path === "/api/v1/coding/progress" && method === "POST") {
    if (!claims) return jsonRes({ status: "guest_saved_locally" });
    const body = (await request.json().catch(() => ({}))) as {
      track_id?: string;
      lesson_id?: string;
      submitted_code?: string;
    };
    if (!body.track_id || !body.lesson_id) {
      return jsonRes({ error: "Thiếu track_id hoặc lesson_id" }, 400);
    }
    await db
      .prepare(
        `INSERT INTO coding_progress (user_id, track_id, lesson_id, submitted_code, passed_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, lesson_id) DO UPDATE SET submitted_code = excluded.submitted_code, passed_at = datetime('now')`
      )
      .bind(claims.uid, body.track_id, body.lesson_id, (body.submitted_code || "").slice(0, 12000))
      .run();
    return jsonRes({ status: "saved", lesson_id: body.lesson_id });
  }

  // === 3. CHẠY CODE GOLANG THẬT QUA GO PLAYGROUND COMPILER (NO-CORS EDGE PROXY) ===
  if (path === "/api/v1/coding/run-go" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || "").trim();
    if (!code) return jsonRes({ error: "Mã nguồn Go không được để trống" }, 400);
    if (code.length > 20000) return jsonRes({ error: "Mã nguồn quá dài (tối đa 20KB)" }, 400);

    try {
      const form = new URLSearchParams({
        version: "2",
        body: code,
        withVet: "true",
      });
      const res = await fetch("https://go.dev/_/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "EduK12-Community-Coding-Lab/1.0",
        },
        body: form.toString(),
      });
      if (!res.ok) {
        return jsonRes({
          ok: false,
          errors: `Máy chủ biên dịch Go tạm thời bận (HTTP ${res.status}). Vui lòng bấm Chạy lại sau vài giây.`,
          output: "",
        });
      }
      const data = (await res.json()) as {
        Errors?: string;
        Events?: Array<{ Message?: string; Kind?: string }>;
      };
      const output = (data.Events || []).map((e) => e.Message || "").join("");
      return jsonRes({
        ok: !data.Errors,
        errors: data.Errors || "",
        output,
      });
    } catch (e) {
      return jsonRes({
        ok: false,
        errors: `Không thể kết nối trình biên dịch Go: ${e instanceof Error ? e.message : "Lỗi mạng"}`,
        output: "",
      });
    }
  }

  return null;
}
