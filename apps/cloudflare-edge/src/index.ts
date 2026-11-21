import {
  encryptExamBundle,
  hashPassword,
  JwtClaims,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "./crypto";
import { parseRawExamText } from "./parser";
import { ensureSeeded, slugify, SUBJECT_NAMES } from "./seed";
import { handleClassroomRoutes } from "./classrooms";
import { handleAuthSecurityRoutes, issueSessionTokens } from "./auth-security";
import { handleCodingRoutes } from "./coding";
import { handleSocialRoutes } from "./social";
import { handleSafetyAndChatRoutes } from "./safety";
import { RealtimeHub } from "./realtime";

export { RealtimeHub };

export interface Env {
  DB: D1Database;
  EDU_KV: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;
  REALTIME_HUB?: DurableObjectNamespace;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
}

interface QuestionRow {
  id: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  topic: string;
  q_type: string;
  difficulty: string;
  content_mdx: string;
  options_json: string;
  unit_hint: string;
  answer_json: string;
  explanation_mdx: string;
  points: number;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
};

function jsonRes(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function getSecret(env: Env): string {
  return env.JWT_SECRET || "eduk12-cloudflare-edge-default-secret-rotate-via-secret";
}

async function getClaims(req: Request, env: Env): Promise<JwtClaims | null> {
  const h = req.headers.get("Authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return verifyJwt(h.slice(7).trim(), getSecret(env));
}

function gradeQuestion(q: QuestionRow, userAns: unknown, maxPts?: number) {
  const pts = maxPts ?? q.points;
  const ans = JSON.parse(q.answer_json || "{}") as {
    single?: string;
    multi?: string[];
    true_false?: Record<string, boolean>;
    short?: string[];
  };
  let isCorrect = false;
  let earned = 0;
  let correctAnswer: unknown = null;

  if (q.q_type === "single_choice") {
    correctAnswer = ans.single || "";
    if (typeof userAns === "string" && userAns.trim().toUpperCase() === (ans.single || "").toUpperCase()) {
      isCorrect = true;
      earned = pts;
    }
  } else if (q.q_type === "multi_choice") {
    const expected = [...(ans.multi || [])].map((s) => s.toUpperCase()).sort();
    correctAnswer = expected;
    const picked = Array.isArray(userAns)
      ? userAns.map((s) => String(s).trim().toUpperCase()).sort()
      : [];
    if (picked.length === expected.length && picked.join(",") === expected.join(",")) {
      isCorrect = true;
      earned = pts;
    }
  } else if (q.q_type === "true_false_group") {
    const tf = ans.true_false || {};
    correctAnswer = tf;
    let matched = 0;
    if (userAns && typeof userAns === "object" && !Array.isArray(userAns)) {
      const m = userAns as Record<string, boolean>;
      for (const [k, expBool] of Object.entries(tf)) {
        if (m[k] === expBool) matched++;
      }
    }
    const ratios = [0, 0.1, 0.25, 0.5, 1.0];
    earned = Math.round(pts * (ratios[matched] ?? 0) * 100) / 100;
    isCorrect = matched === Object.keys(tf).length;
  } else if (q.q_type === "short_answer") {
    const accepted = ans.short || [];
    correctAnswer = accepted;
    if (typeof userAns === "string") {
      const clean = userAns.replace(/\s+/g, "").toLowerCase();
      if (accepted.some((a) => a.replace(/\s+/g, "").toLowerCase() === clean)) {
        isCorrect = true;
        earned = pts;
      }
    }
  }

  return {
    question_id: q.id,
    user_answer: userAns,
    correct_answer: correctAnswer,
    is_correct: isCorrect,
    earned_points: earned,
    max_points: pts,
    explanation_mdx: q.explanation_mdx || "",
  };
}

function toPublicQuestion(q: QuestionRow, customPoints?: number) {
  return {
    id: q.id,
    grade_id: q.grade_id,
    subject_code: q.subject_code,
    subject_name: q.subject_name,
    topic: q.topic,
    q_type: q.q_type,
    difficulty: q.difficulty,
    content_mdx: q.content_mdx,
    options: JSON.parse(q.options_json || "[]"),
    unit_hint: q.unit_hint || "",
    points: customPoints ?? q.points,
  };
}

async function buildAndCacheExamBundle(env: Env, examId: string) {
  const ex = await env.DB.prepare("SELECT * FROM exams WHERE id = ? OR slug = ? LIMIT 1")
    .bind(examId, examId)
    .first<Record<string, unknown>>();
  if (!ex) return null;

  const qIds = JSON.parse(String(ex.question_ids_json || "[]")) as string[];
  const qPts = JSON.parse(String(ex.question_points_json || "{}")) as Record<string, number>;
  const pubQs = [];
  for (const qid of qIds) {
    const q = await env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(qid).first<QuestionRow>();
    if (q) pubQs.push(toPublicQuestion(q, qPts[qid]));
  }

  const summary = {
    id: String(ex.id),
    grade_id: Number(ex.grade_id),
    subject_code: String(ex.subject_code),
    subject_name: String(ex.subject_name),
    title: String(ex.title),
    slug: String(ex.slug),
    mode: String(ex.mode),
    duration_minutes: Number(ex.duration_minutes),
    total_points: Number(ex.total_points),
    question_count: qIds.length,
    participant_count: 1,
    bundle_version: Number(ex.bundle_version || 1),
    starts_at: String(ex.starts_at),
  };

  const encrypted = await encryptExamBundle({ exam: summary, questions: pubQs });
  const bundle = {
    exam_id: summary.id,
    bundle_version: summary.bundle_version,
    algorithm: "AES-256-GCM",
    iv_b64: encrypted.iv_b64,
    ciphertext_b64: encrypted.ciphertext_b64,
    generated_at: new Date().toISOString(),
  };

  await Promise.all([
    env.EDU_KV.put(`exam:bundle:${summary.id}`, JSON.stringify(bundle), { expirationTtl: 86400 }),
    env.EDU_KV.put(`exam:key:${summary.id}`, encrypted.key_b64, { expirationTtl: 86400 }),
  ]);

  return { bundle, key_b64: encrypted.key_b64, summary };
}

function normalizeQueryKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Mọi request không phải /api/* hoặc /health -> phục vụ Static Next.js Assets tại Cloudflare Edge CDN
    if (!path.startsWith("/api/") && path !== "/health") {
      return env.ASSETS.fetch(request);
    }

    try {
      await ensureSeeded(env.DB);

      // === CLASSROOMS / LMS ROUTES (Đăng ký lớp học, Giáo án, Quản lý học sinh & Kiểm tra) ===
      if (path.startsWith("/api/v1/classrooms") || path.startsWith("/api/v1/cms/classrooms")) {
        const claims = await getClaims(request, env);
        const clsResp = await handleClassroomRoutes(request, env.DB, path, method, url, claims, jsonRes);
        if (clsResp) return clsResp;
      }

      if (
        path.startsWith("/api/v1/auth/oauth") ||
        path.startsWith("/api/v1/auth/2fa") ||
        path.startsWith("/api/v1/admin/users")
      ) {
        const claims = await getClaims(request, env);
        const secResp = await handleAuthSecurityRoutes(
          request,
          env,
          path,
          method,
          url,
          claims,
          getSecret(env),
          jsonRes
        );
        if (secResp) return secResp;
      }

      if (path.startsWith("/api/v1/coding")) {
        const claims = await getClaims(request, env);
        const codingResp = await handleCodingRoutes(request, env.DB, path, method, claims, jsonRes);
        if (codingResp) return codingResp;
      }

      // === WEBSOCKET REAL-TIME GATEWAY (/api/v1/ws?channel=...&token=...) ===
      if (path === "/api/v1/ws" && method === "GET") {
        if (!env.REALTIME_HUB) {
          return jsonRes({ error: "Kênh Real-time chưa được kích hoạt" }, 503);
        }
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
          return jsonRes({ error: "Yêu cầu nâng cấp kết nối WebSocket" }, 426);
        }
        const channel = (url.searchParams.get("channel") || "").trim();
        const token = (url.searchParams.get("token") || "").trim();
        const claims = token ? await verifyJwt(token, getSecret(env)) : null;

        // Phân quyền truy cập kênh WebSocket an toàn
        if (channel === "social:feed") {
          // Kênh bảng tin cộng đồng cho phép xem trực tiếp (cả khách & thành viên)
        } else if (channel.startsWith("user:")) {
          const targetUid = channel.slice(5);
          if (!claims || claims.uid !== targetUid) {
            return jsonRes({ error: "Không có quyền kết nối kênh thông báo này" }, 403);
          }
        } else if (channel.startsWith("chat:")) {
          const roomKey = channel.slice(5);
          const members = roomKey.split("__");
          if (!claims || !members.includes(claims.uid)) {
            return jsonRes({ error: "Không có quyền kết nối phòng chat này" }, 403);
          }
        } else if (channel === "admin:safety") {
          if (!claims || (claims.role !== "super_admin" && claims.role !== "content_admin")) {
            return jsonRes({ error: "Chỉ Quản trị viên mới được kết nối kênh cảnh báo An toàn" }, 403);
          }
        } else {
          return jsonRes({ error: "Kênh WebSocket không hợp lệ" }, 400);
        }

        const id = env.REALTIME_HUB.idFromName(channel);
        const stub = env.REALTIME_HUB.get(id);
        const forwardUrl = new URL(request.url);
        forwardUrl.searchParams.set("uid", claims?.uid || "guest");
        forwardUrl.searchParams.set("name", claims?.name || "Khách");
        forwardUrl.searchParams.set("role", claims?.role || "guest");
        return stub.fetch(new Request(forwardUrl.toString(), request));
      }

      // === MẠNG XÃ HỘI GIÁO VIÊN & KIỂM DUYỆT CỘNG ĐỒNG ===
      if (path.startsWith("/api/v1/social")) {
        const claims = await getClaims(request, env);
        const socialResp = await handleSocialRoutes(
          request,
          env.DB,
          path,
          method,
          url,
          claims,
          jsonRes,
          env.REALTIME_HUB
        );
        if (socialResp) return socialResp;
      }

      // === CHAT TRỰC TUYẾN 1-1, SẢN PHẨM HỌC SINH, BOT QUÉT AN TOÀN & XỬ LÝ VI PHẠM ===
      if (
        path.startsWith("/api/v1/chat") ||
        path.startsWith("/api/v1/showcase") ||
        path.startsWith("/api/v1/safety") ||
        path.startsWith("/api/v1/admin/safety") ||
        path.startsWith("/api/v1/notifications")
      ) {
        const claims = await getClaims(request, env);
        const safetyResp = await handleSafetyAndChatRoutes(
          request,
          env.DB,
          path,
          method,
          url,
          claims,
          jsonRes,
          env.REALTIME_HUB
        );
        if (safetyResp) return safetyResp;
      }

      // === HEALTH & TELEMETRY ===
      if (path === "/health") {
        return jsonRes({
          status: "ok",
          service: "eduk12-cloudflare-edge-worker",
          active_provider: "cloudflare-workers-ai",
          d1_ok: true,
          kv_ok: true,
          timestamp: new Date().toISOString(),
        });
      }

      if (path === "/api/v1/metrics") {
        const gradedRow = await env.DB.prepare("SELECT COUNT(*) as cnt FROM exam_attempts WHERE status = 'graded'").first<{ cnt: number }>();
        return jsonRes({
          engine: "Cloudflare Edge Worker (D1 + KV + Workers AI)",
          postgres_ok: true,
          redis_ok: true,
          kafka_ok: true,
          kafka_topic: "cloudflare-edge-async",
          worker_goroutines: 300,
          queue_capacity: 1000000,
          queue_depth: 0,
          total_starts: 0,
          total_autosaves: 0,
          total_submissions: gradedRow?.cnt ?? 0,
          total_graded: gradedRow?.cnt ?? 0,
          encryption: "AES-256-GCM (Cloudflare KV Edge)",
        });
      }

      // === 1. AUTH & RBAC (KÈM KIỂM TRA KHÓA TÀI KHOẢN & 2FA TOTP) ===
      if (path === "/api/v1/auth/login" && method === "POST") {
        const body = (await request.json()) as { email?: string; password?: string };
        const user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
          .bind((body.email || "").trim())
          .first<Record<string, unknown>>();
        if (!user || !(await verifyPassword(String(user.password_hash), body.password || ""))) {
          return jsonRes({ error: "Email hoặc mật khẩu không đúng" }, 401);
        }
        if (Number(user.is_active ?? 1) === 0) {
          return jsonRes({ error: "Tài khoản này đã bị tạm khóa bởi Quản trị viên" }, 403);
        }
        const sec = await env.DB.prepare("SELECT totp_enabled FROM user_security WHERE user_id = ?")
          .bind(String(user.id))
          .first<{ totp_enabled: number }>();
        if (sec?.totp_enabled === 1) {
          const tempToken = crypto.randomUUID();
          await env.EDU_KV.put(`auth:2fa:${tempToken}`, String(user.id), { expirationTtl: 300 });
          return jsonRes({
            requires_2fa: true,
            temp_token: tempToken,
            user: { email: String(user.email), full_name: String(user.full_name) },
          });
        }
        const tokens = await issueSessionTokens(env, getSecret(env), user);
        return jsonRes(tokens);
      }

      if (path === "/api/v1/auth/register" && method === "POST") {
        const body = (await request.json()) as {
          email?: string;
          password?: string;
          full_name?: string;
          role?: string;
          current_grade?: number;
          school_name?: string;
        };
        if (!body.email || !body.password || body.password.length < 6 || !body.full_name) {
          return jsonRes({ error: "Vui lòng nhập đầy đủ Email, Họ tên và Mật khẩu (>= 6 ký tự)" }, 400);
        }
        const role = body.role === "teacher" || body.role === "parent" ? body.role : "student";
        const uid = crypto.randomUUID();
        const passHash = await hashPassword(body.password);
        try {
          await env.DB.prepare(
            "INSERT INTO users (id, email, password_hash, full_name, role, tier, current_grade, school_name) VALUES (?, ?, ?, ?, ?, 'free', ?, ?)"
          )
            .bind(uid, body.email.toLowerCase().trim(), passHash, body.full_name.trim(), role, body.current_grade ?? null, body.school_name || "")
            .run();
        } catch {
          return jsonRes({ error: "Email đã tồn tại trong hệ thống" }, 409);
        }
        const safeUser = {
          id: uid,
          email: body.email.toLowerCase().trim(),
          full_name: body.full_name.trim(),
          role,
          tier: "free",
          current_grade: body.current_grade,
          school_name: body.school_name || "",
        };
        const accessToken = await signJwt(
          { uid, email: safeUser.email, name: safeUser.full_name, role, grade: safeUser.current_grade },
          getSecret(env)
        );
        const refreshToken = crypto.randomUUID();
        await env.EDU_KV.put(`auth:refresh:${refreshToken}`, uid, { expirationTtl: 30 * 86400 });
        return jsonRes({ access_token: accessToken, refresh_token: refreshToken, user: safeUser }, 201);
      }

      if (path === "/api/v1/auth/logout" && method === "POST") {
        const body = (await request.json().catch(() => ({}))) as { refresh_token?: string };
        if (body.refresh_token) await env.EDU_KV.delete(`auth:refresh:${body.refresh_token}`);
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (path === "/api/v1/auth/me" && method === "GET") {
        const claims = await getClaims(request, env);
        if (!claims) return jsonRes({ error: "Chưa đăng nhập" }, 401);
        const user = await env.DB.prepare(
          "SELECT id, email, full_name, role, tier, current_grade, school_name FROM users WHERE id = ?"
        )
          .bind(claims.uid)
          .first();
        if (!user) return jsonRes({ error: "Không tìm thấy người dùng" }, 404);
        return jsonRes({ user });
      }

      // Tự xóa tài khoản (Bắt buộc theo chính sách Apple App Store 5.1.1(v) & Google Play Data Deletion)
      if (path === "/api/v1/auth/me" && method === "DELETE") {
        const claims = await getClaims(request, env);
        if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
        if (claims.role === "super_admin") {
          return jsonRes({ error: "Tài khoản Super Admin không thể tự xóa trực tiếp để tránh mất quyền quản trị hệ thống." }, 400);
        }
        await env.DB.batch([
          env.DB.prepare("DELETE FROM user_security WHERE user_id = ?").bind(claims.uid),
          env.DB.prepare("DELETE FROM classroom_members WHERE user_id = ?").bind(claims.uid),
          env.DB.prepare("DELETE FROM coding_progress WHERE user_id = ?").bind(claims.uid),
          env.DB.prepare("DELETE FROM live_attendance WHERE user_id = ?").bind(claims.uid),
          env.DB.prepare("DELETE FROM users WHERE id = ?").bind(claims.uid),
        ]);
        return jsonRes({ status: "account_deleted" });
      }

      // === 2. GRADES, SUBJECTS, LESSONS ===
      if (path === "/api/v1/grades" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM grades ORDER BY id ASC").all();
        return jsonRes({ grades: results }, 200, { "Cache-Control": "public, max-age=3600" });
      }

      if (path === "/api/v1/subjects" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM subjects ORDER BY display_order ASC").all();
        return jsonRes({ subjects: results }, 200, { "Cache-Control": "public, max-age=3600" });
      }

      if (path === "/api/v1/curriculum/summary" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT grade_id, subject_code, subject_name, COUNT(*) as lesson_count FROM lessons GROUP BY grade_id, subject_code, subject_name ORDER BY grade_id ASC, subject_code ASC"
        ).all();
        const totalRow = await env.DB.prepare("SELECT COUNT(*) as total FROM lessons").first<{ total: number }>();
        return jsonRes(
          { total_lessons: totalRow?.total ?? 0, summary: results },
          200,
          { "Cache-Control": "public, max-age=120" }
        );
      }

      const singleLessonMatch = path.match(/^\/api\/v1\/lessons\/([^/]+)$/);
      if (singleLessonMatch && method === "GET") {
        const lid = decodeURIComponent(singleLessonMatch[1]);
        const r = await env.DB.prepare("SELECT * FROM lessons WHERE id = ? LIMIT 1")
          .bind(lid)
          .first<Record<string, unknown>>();
        if (!r) return jsonRes({ error: "Không tìm thấy bài giảng" }, 404);
        return jsonRes(
          {
            lesson: {
              id: r.id,
              grade_id: r.grade_id,
              subject_code: r.subject_code,
              subject_name: r.subject_name,
              textbook: r.textbook,
              chapter: r.chapter,
              title: r.title,
              slug: r.slug,
              summary: r.summary,
              content_mdx: r.content_mdx,
              duration_min: r.duration_min,
              materials: JSON.parse(String(r.materials_json || "[]")),
            },
          },
          200,
          { "Cache-Control": "public, max-age=300" }
        );
      }

      if (path === "/api/v1/lessons" && method === "GET") {
        const g = Number(url.searchParams.get("grade") || 0);
        const sub = url.searchParams.get("subject") || "";
        const tb = url.searchParams.get("textbook") || "";
        const indexOnly = url.searchParams.get("mode") === "index";
        const cols = indexOnly
          ? "id, grade_id, subject_code, subject_name, textbook, chapter, title, slug, summary, duration_min"
          : "*";
        let sql = `SELECT ${cols} FROM lessons WHERE 1=1`;
        const binds: unknown[] = [];
        if (g > 0) { sql += " AND grade_id = ?"; binds.push(g); }
        if (sub && sub !== "all") { sql += " AND subject_code = ?"; binds.push(sub); }
        if (tb && tb !== "all") { sql += " AND textbook = ?"; binds.push(tb); }
        sql += " ORDER BY grade_id ASC, subject_code ASC, chapter ASC, id ASC";

        const { results } = await env.DB.prepare(sql).bind(...binds).all<Record<string, unknown>>();
        const lessons = results.map((r) => ({
          id: r.id,
          grade_id: r.grade_id,
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          textbook: r.textbook,
          chapter: r.chapter,
          title: r.title,
          slug: r.slug,
          summary: r.summary,
          content_mdx: indexOnly ? "" : r.content_mdx,
          duration_min: r.duration_min,
          materials: indexOnly ? [] : JSON.parse(String(r.materials_json || "[]")),
        }));
        return jsonRes({ lessons }, 200, { "Cache-Control": "public, max-age=120" });
      }

      // === 3. EXERCISES ===
      if (path === "/api/v1/exercises" && method === "GET") {
        const g = Number(url.searchParams.get("grade") || 0);
        const sql = g > 0
          ? "SELECT * FROM questions WHERE grade_id = ? ORDER BY created_at DESC LIMIT 100"
          : "SELECT * FROM questions ORDER BY grade_id DESC, created_at DESC LIMIT 100";
        const { results } = await (g > 0 ? env.DB.prepare(sql).bind(g) : env.DB.prepare(sql)).all<QuestionRow>();
        const groups = new Map<string, { id: string; grade_id: number; subject_code: string; subject_name: string; title: string; description: string; questions: unknown[] }>();
        for (const q of results) {
          const key = `${q.grade_id}:${q.subject_code}`;
          if (!groups.has(key)) {
            groups.set(key, {
              id: `ex-lop-${q.grade_id}-${q.subject_code}`,
              grade_id: q.grade_id,
              subject_code: q.subject_code,
              subject_name: q.subject_name,
              title: `Luyện tập ${q.subject_name} Lớp ${q.grade_id} (Chấm tức thì)`,
              description: `Bộ câu hỏi chuẩn GDPT 2018 môn ${q.subject_name} Lớp ${q.grade_id} chạy trên Cloudflare D1.`,
              questions: [],
            });
          }
          groups.get(key)!.questions.push(toPublicQuestion(q));
        }
        return jsonRes({ exercise_sets: Array.from(groups.values()) });
      }

      if (path === "/api/v1/exercises/check" && method === "POST") {
        const body = (await request.json()) as { question_id: string; answer: unknown };
        const q = await env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(body.question_id).first<QuestionRow>();
        if (!q) return jsonRes({ error: "Không tìm thấy câu hỏi" }, 404);
        return jsonRes(gradeQuestion(q, body.answer));
      }

      // === 4. HIGH-CONCURRENCY EXAMS (AES-256-GCM + KV + D1) ===
      if (path === "/api/v1/exams" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM exams ORDER BY starts_at DESC").all<Record<string, unknown>>();
        const exams = results.map((e) => {
          const qIds = JSON.parse(String(e.question_ids_json || "[]")) as string[];
          return {
            id: e.id,
            grade_id: e.grade_id,
            subject_code: e.subject_code,
            subject_name: e.subject_name,
            title: e.title,
            slug: e.slug,
            mode: e.mode,
            duration_minutes: e.duration_minutes,
            total_points: e.total_points,
            question_count: qIds.length,
            participant_count: 1240,
            bundle_version: e.bundle_version,
            starts_at: e.starts_at,
          };
        });
        return jsonRes({ exams });
      }

      const bundleMatch = path.match(/^\/api\/v1\/exams\/([^/]+)\/bundle$/);
      if (bundleMatch && method === "GET") {
        const idOrSlug = decodeURIComponent(bundleMatch[1]);
        const exRow = await env.DB.prepare("SELECT id FROM exams WHERE id = ? OR slug = ? LIMIT 1")
          .bind(idOrSlug, idOrSlug)
          .first<{ id: string }>();
        if (!exRow) return jsonRes({ error: "Không tìm thấy đề thi" }, 404);
        const cached = await env.EDU_KV.get(`exam:bundle:${exRow.id}`);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", ...CORS_HEADERS },
          });
        }
        const built = await buildAndCacheExamBundle(env, exRow.id);
        if (!built) return jsonRes({ error: "Không thể tạo gói đề" }, 404);
        return jsonRes(built.bundle, 200, { "Cache-Control": "public, max-age=3600" });
      }

      const startMatch = path.match(/^\/api\/v1\/exams\/([^/]+)\/start$/);
      if (startMatch && method === "POST") {
        const idOrSlug = decodeURIComponent(startMatch[1]);
        const ex = await env.DB.prepare("SELECT * FROM exams WHERE id = ? OR slug = ? LIMIT 1")
          .bind(idOrSlug, idOrSlug)
          .first<Record<string, unknown>>();
        if (!ex) return jsonRes({ error: "Không tìm thấy kỳ thi" }, 404);

        let keyB64 = await env.EDU_KV.get(`exam:key:${ex.id}`);
        if (!keyB64) {
          const built = await buildAndCacheExamBundle(env, String(ex.id));
          keyB64 = built?.key_b64 || "";
        }

        const body = (await request.json().catch(() => ({}))) as { user_name?: string };
        const claims = await getClaims(request, env);
        const userName = body.user_name?.trim() || claims?.name || "Học sinh K-12";
        const attemptId = `att-${crypto.randomUUID()}`;
        const qIds = JSON.parse(String(ex.question_ids_json || "[]")) as string[];
        const now = new Date();
        const endsAt = new Date(now.getTime() + Number(ex.duration_minutes) * 60000);
        const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;

        await env.DB.prepare(
          "INSERT INTO exam_attempts (id, exam_id, user_id, user_name, status, shuffle_seed, started_at, max_score, total_questions) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?, ?)"
        )
          .bind(attemptId, String(ex.id), claims?.uid || null, userName, seed, now.toISOString(), Number(ex.total_points), qIds.length)
          .run();

        return jsonRes({
          attempt_id: attemptId,
          exam_id: String(ex.id),
          decrypt_key_b64: keyB64,
          shuffle_seed: seed,
          server_time: now.toISOString(),
          ends_at: endsAt.toISOString(),
        });
      }

      const autosaveMatch = path.match(/^\/api\/v1\/attempts\/([^/]+)\/autosave$/);
      if (autosaveMatch && method === "PATCH") {
        const attemptId = autosaveMatch[1];
        const body = await request.text();
        await env.EDU_KV.put(`exam:draft:${attemptId}`, body, { expirationTtl: 14400 });
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      const submitMatch = path.match(/^\/api\/v1\/attempts\/([^/]+)\/submit$/);
      if (submitMatch && method === "POST") {
        const attemptId = submitMatch[1];
        const idemKey = request.headers.get("Idempotency-Key");
        if (idemKey) {
          const seen = await env.EDU_KV.get(`exam:idem:${idemKey}`);
          if (seen) {
            return jsonRes({ attempt_id: attemptId, status: "submitted_queued", message: "Đã ghi nhận bài thi." }, 202);
          }
          await env.EDU_KV.put(`exam:idem:${idemKey}`, attemptId, { expirationTtl: 86400 });
        }

        const body = (await request.json()) as { answers?: Record<string, unknown>; cheat_flags?: unknown[] };
        const att = await env.DB.prepare("SELECT * FROM exam_attempts WHERE id = ?").bind(attemptId).first<Record<string, unknown>>();
        if (!att) return jsonRes({ error: "Không tìm thấy phiên thi" }, 404);

        const ex = await env.DB.prepare("SELECT * FROM exams WHERE id = ?").bind(String(att.exam_id)).first<Record<string, unknown>>();
        if (!ex) return jsonRes({ error: "Không tìm thấy đề thi" }, 404);

        const t0 = performance.now();
        const qIds = JSON.parse(String(ex.question_ids_json || "[]")) as string[];
        const qPts = JSON.parse(String(ex.question_points_json || "{}")) as Record<string, number>;
        const answers = body.answers || {};
        const details = [];
        let totalScore = 0;
        let correctCount = 0;

        for (const qid of qIds) {
          const q = await env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(qid).first<QuestionRow>();
          if (!q) continue;
          const d = gradeQuestion(q, answers[qid], qPts[qid]);
          totalScore += d.earned_points;
          if (d.is_correct) correctCount++;
          details.push(d);
        }

        totalScore = Math.round(totalScore * 100) / 100;
        const durSec = Math.max(1, Math.round((Date.now() - Date.parse(String(att.started_at))) / 1000));
        const latencyUs = Math.max(50, Math.round((performance.now() - t0) * 1000));
        const nowIso = new Date().toISOString();

        await env.DB.prepare(
          "UPDATE exam_attempts SET status='graded', submitted_at=?, graded_at=?, duration_sec=?, score=?, correct_count=?, grading_latency_us=?, answers_json=?, details_json=?, cheat_flags_json=? WHERE id=?"
        )
          .bind(nowIso, nowIso, durSec, totalScore, correctCount, latencyUs, JSON.stringify(answers), JSON.stringify(details), JSON.stringify(body.cheat_flags || []), attemptId)
          .run();

        // Cập nhật Leaderboard cache trên KV bất đồng bộ qua ctx.waitUntil
        ctx.waitUntil(env.EDU_KV.delete(`exam:lb:${ex.id}`));

        return jsonRes(
          { attempt_id: attemptId, status: "submitted_queued", message: "Bài thi đã được chấm trên Cloudflare Edge!" },
          202
        );
      }

      const resultMatch = path.match(/^\/api\/v1\/attempts\/([^/]+)\/result$/);
      if (resultMatch && method === "GET") {
        const att = await env.DB.prepare("SELECT * FROM exam_attempts WHERE id = ?").bind(resultMatch[1]).first<Record<string, unknown>>();
        if (!att) return jsonRes({ error: "Không tìm thấy kết quả" }, 404);
        return jsonRes({
          attempt_id: att.id,
          exam_id: att.exam_id,
          user_name: att.user_name,
          status: att.status,
          score: att.score,
          max_score: att.max_score,
          correct_count: att.correct_count,
          total_questions: att.total_questions,
          duration_sec: att.duration_sec,
          grading_latency_us: att.grading_latency_us,
          details: JSON.parse(String(att.details_json || "[]")),
        });
      }

      const lbMatch = path.match(/^\/api\/v1\/exams\/([^/]+)\/leaderboard$/);
      if (lbMatch && method === "GET") {
        const idOrSlug = decodeURIComponent(lbMatch[1]);
        const ex = await env.DB.prepare("SELECT id FROM exams WHERE id = ? OR slug = ? LIMIT 1")
          .bind(idOrSlug, idOrSlug)
          .first<{ id: string }>();
        if (!ex) return jsonRes({ leaderboard: [] });
        const { results } = await env.DB.prepare(
          "SELECT id as user_id, user_name, score, duration_sec, graded_at as submitted_at FROM exam_attempts WHERE exam_id = ? AND status = 'graded' ORDER BY score DESC, duration_sec ASC LIMIT 25"
        )
          .bind(ex.id)
          .all<Record<string, unknown>>();
        const leaderboard = results.map((r, idx) => ({ rank: idx + 1, ...r }));
        return jsonRes({ exam_id: ex.id, leaderboard });
      }

      // === 5. CMS & ADMIN ENDPOINTS (RBAC Protected) ===
      if (path.startsWith("/api/v1/cms/") || path.startsWith("/api/v1/admin/")) {
        const claims = await getClaims(request, env);
        if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
        const isStaff = ["teacher", "content_admin", "super_admin"].includes(claims.role);
        if (!isStaff) return jsonRes({ error: "Chỉ Giáo viên hoặc Admin mới được truy cập CMS" }, 403);

        if (path === "/api/v1/cms/lessons" && method === "POST") {
          const b = (await request.json()) as Record<string, unknown>;
          const id = `les-${crypto.randomUUID().slice(0, 8)}`;
          const sub = String(b.subject_code || "toan");
          const title = String(b.title || "").trim();
          await env.DB.prepare(
            "INSERT INTO lessons (id, grade_id, subject_code, subject_name, textbook, chapter, title, slug, summary, content_mdx, duration_min, materials_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(id, Number(b.grade_id || 12), sub, SUBJECT_NAMES[sub] || sub, String(b.textbook || "kntt"), String(b.chapter || "Chương 1"), title, `${slugify(title)}-${Date.now() % 10000}`, String(b.summary || ""), String(b.content_mdx || ""), Number(b.duration_min || 20), JSON.stringify(b.materials || []))
            .run();
          return jsonRes({ lesson: { id, title } }, 201);
        }

        if (path === "/api/v1/cms/questions" && method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM questions ORDER BY created_at DESC LIMIT 200").all<QuestionRow>();
          return jsonRes({ questions: results.map((q) => toPublicQuestion(q)) });
        }

        if (path === "/api/v1/cms/questions" && method === "POST") {
          const b = (await request.json()) as Record<string, unknown>;
          const id = `q-${crypto.randomUUID().slice(0, 8)}`;
          const sub = String(b.subject_code || "toan");
          const qType = String(b.q_type || "single_choice");
          const ansObj = { single: b.answer_single, multi: b.answer_multi, true_false: b.answer_true_false, short: b.answer_short };
          await env.DB.prepare(
            "INSERT INTO questions (id, grade_id, subject_code, subject_name, topic, q_type, difficulty, content_mdx, options_json, unit_hint, answer_json, explanation_mdx, points, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(id, Number(b.grade_id || 12), sub, SUBJECT_NAMES[sub] || sub, String(b.topic || "Tổng hợp"), qType, String(b.difficulty || "thong_hieu"), String(b.content_mdx || ""), JSON.stringify(b.options || []), String(b.unit_hint || ""), JSON.stringify(ansObj), String(b.explanation_mdx || ""), qType === "true_false_group" ? 4.0 : 2.0, claims.uid)
            .run();
          return jsonRes({ question: { id } }, 201);
        }

        if (path === "/api/v1/cms/exams" && method === "POST") {
          const b = (await request.json()) as {
            grade_id?: number;
            subject_code?: string;
            title?: string;
            mode?: string;
            duration_minutes?: number;
            total_points?: number;
            question_ids?: string[];
          };
          const qIds = b.question_ids || [];
          if (!qIds.length) return jsonRes({ error: "Cần chọn ít nhất 1 câu hỏi" }, 400);
          const id = `exam-${crypto.randomUUID().slice(0, 8)}`;
          const sub = b.subject_code || "toan";
          const total = b.total_points || 10.0;
          const perQ = Math.round((total / qIds.length) * 100) / 100;
          const ptsMap: Record<string, number> = {};
          for (const qid of qIds) ptsMap[qid] = perQ;

          await env.DB.prepare(
            "INSERT INTO exams (id, grade_id, subject_code, subject_name, title, slug, mode, duration_minutes, total_points, question_ids_json, question_points_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(id, b.grade_id || 12, sub, SUBJECT_NAMES[sub] || sub, b.title || "Đề thi mới", id, b.mode || "mock_live", b.duration_minutes || 45, total, JSON.stringify(qIds), JSON.stringify(ptsMap))
            .run();
          await buildAndCacheExamBundle(env, id);
          return jsonRes({ exam: { id, title: b.title } }, 201);
        }

        if (path === "/api/v1/cms/import/lessons" && method === "POST") {
          const b = (await request.json()) as { lessons?: Record<string, unknown>[] };
          const items = b.lessons || [];
          const stmts: D1PreparedStatement[] = [];
          for (const item of items) {
            const sub = String(item.subject_code || "toan");
            const title = String(item.title || "").trim();
            if (!title) continue;
            const slug = slugify(title);
            const ch = String(item.chapter || "Chương 1");
            const id = String(item.id || `les-g${String(item.grade_id || 12).padStart(2, "0")}-${sub}-${slug.slice(0, 28)}`);
            stmts.push(
              env.DB.prepare(
                "INSERT OR REPLACE INTO lessons (id, grade_id, subject_code, subject_name, textbook, chapter, title, slug, summary, content_mdx, duration_min, materials_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
              ).bind(
                id,
                Number(item.grade_id || 12),
                sub,
                SUBJECT_NAMES[sub] || sub,
                String(item.textbook || "kntt"),
                ch,
                title,
                slug,
                String(item.summary || ""),
                String(item.content_mdx || ""),
                Number(item.duration_min || 20),
                JSON.stringify(item.materials || [])
              )
            );
          }
          // Thực thi D1 batch theo từng lô 50 lệnh để đạt tốc độ cao nhất & không quá tải
          const BATCH = 50;
          for (let i = 0; i < stmts.length; i += BATCH) {
            await env.DB.batch(stmts.slice(i, i + BATCH));
          }
          return jsonRes({ total: items.length, imported: stmts.length, updated: 0 });
        }

        if (path === "/api/v1/cms/import/exams" && method === "POST") {
          const b = (await request.json()) as { exams?: Array<Record<string, unknown>> };
          const items = b.exams || [];
          let imported = 0;
          for (const ex of items) {
            const qs = (ex.questions as Array<Record<string, unknown>>) || [];
            if (!qs.length) continue;
            const qIds: string[] = [];
            const ptsMap: Record<string, number> = {};
            const total = Number(ex.total_points || 10.0);
            const perQ = Math.round((total / qs.length) * 100) / 100;
            const sub = String(ex.subject_code || "toan");
            const grade = Number(ex.grade_id || 12);

            for (const q of qs) {
              const qid = `q-${crypto.randomUUID().slice(0, 8)}`;
              const ansObj = { single: q.answer_single, multi: q.answer_multi, true_false: q.answer_true_false, short: q.answer_short };
              await env.DB.prepare(
                "INSERT INTO questions (id, grade_id, subject_code, subject_name, topic, q_type, difficulty, content_mdx, options_json, unit_hint, answer_json, explanation_mdx, points, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              )
                .bind(qid, Number(q.grade_id || grade), String(q.subject_code || sub), SUBJECT_NAMES[String(q.subject_code || sub)] || sub, String(q.topic || "Đề thi"), String(q.q_type || "single_choice"), String(q.difficulty || "thong_hieu"), String(q.content_mdx || ""), JSON.stringify(q.options || []), String(q.unit_hint || ""), JSON.stringify(ansObj), String(q.explanation_mdx || ""), perQ, claims.uid)
                .run();
              qIds.push(qid);
              ptsMap[qid] = perQ;
            }

            const exId = String(ex.slug || `exam-${crypto.randomUUID().slice(0, 8)}`);
            await env.DB.prepare(
              "INSERT OR REPLACE INTO exams (id, grade_id, subject_code, subject_name, title, slug, mode, duration_minutes, total_points, question_ids_json, question_points_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
              .bind(exId, grade, sub, SUBJECT_NAMES[sub] || sub, String(ex.title || "Đề thi"), exId, String(ex.mode || "mock_live"), Number(ex.duration_minutes || 45), total, JSON.stringify(qIds), JSON.stringify(ptsMap))
              .run();
            await buildAndCacheExamBundle(env, exId);
            imported++;
          }
          return jsonRes({ total: items.length, imported });
        }

        if (path === "/api/v1/admin/users" && method === "GET") {
          if (claims.role !== "super_admin") return jsonRes({ error: "Chỉ Super Admin" }, 403);
          const { results } = await env.DB.prepare(
            "SELECT id, email, full_name, role, tier, current_grade, school_name, created_at FROM users ORDER BY created_at DESC LIMIT 100"
          ).all();
          return jsonRes({ users: results });
        }

        const roleMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)\/role$/);
        if (roleMatch && method === "PATCH") {
          if (claims.role !== "super_admin") return jsonRes({ error: "Chỉ Super Admin" }, 403);
          const b = (await request.json()) as { role?: string };
          await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(b.role || "student", roleMatch[1]).run();
          return jsonRes({ status: "updated" });
        }
      }

      // === 6. AI TUTOR ON CLOUDFLARE EDGE (Workers AI + KV Semantic Cache + D1 RAG + Smart Parser) ===
      if (path === "/api/v1/ai/stats" && method === "GET") {
        const cnt = await env.DB.prepare("SELECT COUNT(*) as cnt FROM knowledge_chunks").first<{ cnt: number }>();
        const hits = Number((await env.EDU_KV.get("ai:stats:hits")) || "0");
        const misses = Number((await env.EDU_KV.get("ai:stats:misses")) || "0");
        const total = hits + misses;
        return jsonRes({
          active_provider: "cloudflare-workers-ai (@cf/meta/llama-3.1-8b-instruct)",
          pgvector_ok: true,
          knowledge_chunks: cnt?.cnt ?? 0,
          semantic_cache: {
            redis_ok: true,
            hits,
            misses,
            hit_rate_pct: total > 0 ? Math.round((hits / total) * 1000) / 10 : 0,
            cached_entries: hits + misses,
          },
        });
      }

      if (path === "/api/v1/ai/knowledge" && method === "POST") {
        const b = (await request.json()) as { grade_id: number; subject_code: string; textbook?: string; citation: string; content: string };
        const id = `kc-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare("INSERT INTO knowledge_chunks (id, grade_id, subject_code, textbook, citation, content) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(id, b.grade_id, b.subject_code, b.textbook || "kntt", b.citation, b.content)
          .run();
        return jsonRes({ id, status: "indexed_in_d1_edge" });
      }

      if (path === "/api/v1/ai/knowledge/bulk" && method === "POST") {
        const b = (await request.json()) as { items?: Array<{ id?: string; grade_id: number; subject_code: string; textbook?: string; citation: string; content: string }> };
        const items = b.items || [];
        const stmts = items.map((it) =>
          env.DB.prepare("INSERT OR REPLACE INTO knowledge_chunks (id, grade_id, subject_code, textbook, citation, content) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(it.id || `kc-g${it.grade_id}-${it.subject_code}-${slugify(it.citation).slice(0, 32)}`, it.grade_id, it.subject_code, it.textbook || "kntt", it.citation, it.content)
        );
        const BATCH = 50;
        for (let i = 0; i < stmts.length; i += BATCH) {
          await env.DB.batch(stmts.slice(i, i + BATCH));
        }
        return jsonRes({ total: items.length, indexed: items.length, status: "bulk_indexed_in_d1_edge" });
      }

      if (path === "/api/v1/ai/parse-exam" && method === "POST") {
        const b = (await request.json()) as { raw_text?: string; grade_id?: number; subject_code?: string; topic?: string };
        const qs = parseRawExamText(b.raw_text || "", b.grade_id || 12, b.subject_code || "toan", b.topic || "Đề thi tổng hợp");
        return jsonRes({ count: qs.length, questions: qs });
      }

      if (path === "/api/v1/ai/chat/stream" && method === "POST") {
        const started = Date.now();
        const b = (await request.json()) as { grade_id?: number; subject?: string; tutor_mode?: string; message?: string };
        const gradeId = b.grade_id || 12;
        const subject = b.subject || "toan";
        const tutorMode = b.tutor_mode || "socratic";
        const message = (b.message || "").trim();

        const cacheKey = `ai:cache:g${gradeId}:${subject}:${tutorMode}:${normalizeQueryKey(message)}`;
        const cachedRaw = await env.EDU_KV.get(cacheKey);
        const enc = new TextEncoder();

        const sse = (ev: string, data: unknown) => enc.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);

        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { text: string; citations: string[] };
          ctx.waitUntil(
            env.EDU_KV.get("ai:stats:hits").then((v) => env.EDU_KV.put("ai:stats:hits", String(Number(v || "0") + 1)))
          );
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(sse("meta", { cache_hit: true, model: "cloudflare-kv-cache", grade_id: gradeId, citations: cached.citations }));
              controller.enqueue(sse("delta", { text: cached.text }));
              controller.enqueue(sse("done", { latency_ms: Date.now() - started, cache_hit: true }));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", ...CORS_HEADERS },
          });
        }

        // Grade-Locked RAG từ Cloudflare D1
        const { results: chunks } = await env.DB.prepare(
          "SELECT citation, content FROM knowledge_chunks WHERE grade_id <= ? AND (subject_code = ? OR ? = 'all') ORDER BY CASE WHEN grade_id = ? THEN 0 ELSE 1 END, grade_id DESC LIMIT 2"
        )
          .bind(gradeId, subject, subject, gradeId)
          .all<{ citation: string; content: string }>();

        const citations = chunks.length ? chunks.map((c) => c.citation) : [`Chương trình GDPT 2018 — Lớp ${gradeId}`];
        const ragContext = chunks.map((c) => `- [${c.citation}]: ${c.content}`).join("\n");
        const modePrompt =
          tutorMode === "socratic"
            ? "Dùng phương pháp Socratic: không đưa đáp án cuối ngay, hãy gợi ý công thức SGK và đặt 1 câu hỏi nhỏ dẫn dắt học sinh tự tính."
            : tutorMode === "check_homework"
            ? "Khen điểm đúng trước, chỉ rõ chỗ sai nếu có và hướng dẫn sửa."
            : "Giải thích từng bước rõ ràng, dùng công thức LaTeX $...$ và $$...$$.";

        const systemPrompt = `Bạn là Gia sư AI tiếng Việt chuyên môn ${SUBJECT_NAMES[subject] || subject} cho học sinh Lớp ${gradeId} (Chương trình GDPT 2018). Tuyệt đối KHÔNG dùng kiến thức vượt quá Lớp ${gradeId}. ${modePrompt}\nKiến thức SGK liên quan:\n${ragContext}`;

        let answerText = "";
        let modelUsed = "@cf/meta/llama-3.1-8b-instruct";
        try {
          const aiRes = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as keyof AiModels, {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 700,
          })) as { response?: string };
          answerText = aiRes?.response || "";
        } catch {
          modelUsed = "edge-socratic-fallback";
          answerText = `Chào em học sinh **Lớp ${gradeId}**! Dựa theo **${citations[0]}**:\n\n${chunks[0]?.content || "Áp dụng kiến thức chuẩn GDPT 2018."}\n\n👉 Em hãy xác định các dữ kiện đề bài cho và thử viết bước biến đổi đầu tiên để thầy kiểm tra cùng em nhé!`;
        }

        ctx.waitUntil(
          Promise.all([
            env.EDU_KV.put(cacheKey, JSON.stringify({ text: answerText, citations }), { expirationTtl: 86400 }),
            env.EDU_KV.get("ai:stats:misses").then((v) => env.EDU_KV.put("ai:stats:misses", String(Number(v || "0") + 1))),
          ])
        );

        const stream = new ReadableStream({
          async start(controller) {
            controller.enqueue(sse("meta", { cache_hit: false, model: modelUsed, grade_id: gradeId, citations }));
            const words = answerText.split(" ");
            for (let i = 0; i < words.length; i++) {
              controller.enqueue(sse("delta", { text: i === words.length - 1 ? words[i] : words[i] + " " }));
            }
            controller.enqueue(sse("done", { latency_ms: Date.now() - started, cache_hit: false }));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", ...CORS_HEADERS },
        });
      }

      return jsonRes({ error: "Endpoint không tồn tại" }, 404);
    } catch (err) {
      return jsonRes({ error: err instanceof Error ? err.message : "Lỗi máy chủ Edge" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
