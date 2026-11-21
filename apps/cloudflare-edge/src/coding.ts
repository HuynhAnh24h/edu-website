import { JwtClaims } from "./crypto";

type JsonResFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

export async function handleCodingRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonResFn
): Promise<Response | null> {
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
