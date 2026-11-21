import { hashPassword, JwtClaims, signJwt } from "./crypto";

export interface AuthSecurityEnv {
  DB: D1Database;
  EDU_KV: KVNamespace;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
}

type JsonResFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(byteLen = 20): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32ToBytes(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function computeTotpAtCounter(secret: string, counter: number): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean) || !secret) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (const drift of [-1, 0, 1]) {
    const expected = await computeTotpAtCounter(secret, step + drift);
    if (expected === clean) return true;
  }
  return false;
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 6; i++) {
    const raw = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8);
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export async function issueSessionTokens(
  env: AuthSecurityEnv,
  jwtSecret: string,
  userRow: Record<string, unknown>
) {
  const safeUser = {
    id: String(userRow.id),
    email: String(userRow.email),
    full_name: String(userRow.full_name),
    role: String(userRow.role),
    tier: String(userRow.tier || "free"),
    current_grade: userRow.current_grade ? Number(userRow.current_grade) : undefined,
    school_name: String(userRow.school_name || ""),
  };
  const accessToken = await signJwt(
    {
      uid: safeUser.id,
      email: safeUser.email,
      name: safeUser.full_name,
      role: safeUser.role,
      grade: safeUser.current_grade,
    },
    jwtSecret
  );
  const refreshToken = crypto.randomUUID();
  await env.EDU_KV.put(`auth:refresh:${refreshToken}`, safeUser.id, { expirationTtl: 30 * 86400 });
  return { access_token: accessToken, refresh_token: refreshToken, user: safeUser };
}

async function upsertOAuthUser(
  env: AuthSecurityEnv,
  provider: "google" | "facebook",
  providerId: string,
  email: string,
  fullName: string
): Promise<Record<string, unknown>> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
    .bind(normalizedEmail)
    .first<Record<string, unknown>>();

  if (existing) {
    await env.DB.prepare(
      `INSERT INTO user_security (user_id, auth_provider, provider_id, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET auth_provider = excluded.auth_provider, provider_id = excluded.provider_id, updated_at = datetime('now')`
    )
      .bind(String(existing.id), provider, providerId)
      .run();
    return existing;
  }

  const uid = crypto.randomUUID();
  const randomPassHash = await hashPassword(crypto.randomUUID() + crypto.randomUUID());
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, full_name, role, tier, school_name, is_active) VALUES (?, ?, ?, ?, 'student', 'free', '', 1)"
    ).bind(uid, normalizedEmail, randomPassHash, fullName.trim() || normalizedEmail.split("@")[0]),
    env.DB.prepare(
      "INSERT INTO user_security (user_id, auth_provider, provider_id) VALUES (?, ?, ?)"
    ).bind(uid, provider, providerId),
  ]);

  const created = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(uid)
    .first<Record<string, unknown>>();
  return created!;
}

export async function handleAuthSecurityRoutes(
  request: Request,
  env: AuthSecurityEnv,
  path: string,
  method: string,
  url: URL,
  claims: JwtClaims | null,
  jwtSecret: string,
  jsonRes: JsonResFn
): Promise<Response | null> {
  // === 1. TRẠNG THÁI OAUTH PROVIDERS (GOOGLE / FACEBOOK) ===
  if (path === "/api/v1/auth/oauth/providers" && method === "GET") {
    const origin = url.origin;
    return jsonRes({
      google_configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      facebook_configured: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
      google_callback: `${origin}/api/v1/auth/oauth/google/callback`,
      facebook_callback: `${origin}/api/v1/auth/oauth/facebook/callback`,
    });
  }

  // === 2. GOOGLE OAUTH 2.0 REDIRECT & CALLBACK ===
  if (path === "/api/v1/auth/oauth/google" && method === "GET") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=google_not_configured`, 302);
    }
    const state = crypto.randomUUID();
    await env.EDU_KV.put(`oauth:state:${state}`, "google", { expirationTtl: 600 });
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${url.origin}/api/v1/auth/oauth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
  }

  if (path === "/api/v1/auth/oauth/google/callback" && method === "GET") {
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    if (!code || !state || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=google_failed`, 302);
    }
    const stored = await env.EDU_KV.get(`oauth:state:${state}`);
    if (stored !== "google") {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=invalid_state`, 302);
    }
    await env.EDU_KV.delete(`oauth:state:${state}`);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/api/v1/auth/oauth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
    if (!tokenJson.access_token) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=google_token_failed`, 302);
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileRes.json().catch(() => ({}))) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!profile.email) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=no_email`, 302);
    }

    const userRow = await upsertOAuthUser(
      env,
      "google",
      profile.sub || profile.email,
      profile.email,
      profile.name || profile.email
    );
    if (Number(userRow.is_active) === 0) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=account_locked`, 302);
    }

    const sec = await env.DB.prepare("SELECT totp_enabled FROM user_security WHERE user_id = ?")
      .bind(String(userRow.id))
      .first<{ totp_enabled: number }>();
    if (sec?.totp_enabled === 1) {
      const tempToken = crypto.randomUUID();
      await env.EDU_KV.put(`auth:2fa:${tempToken}`, String(userRow.id), { expirationTtl: 300 });
      return Response.redirect(`${url.origin}/dang-nhap?twofa_token=${tempToken}`, 302);
    }

    const oneTimeCode = crypto.randomUUID();
    await env.EDU_KV.put(`oauth:exchange:${oneTimeCode}`, String(userRow.id), { expirationTtl: 120 });
    return Response.redirect(`${url.origin}/dang-nhap?oauth_code=${oneTimeCode}`, 302);
  }

  // === 3. FACEBOOK OAUTH 2.0 REDIRECT & CALLBACK ===
  if (path === "/api/v1/auth/oauth/facebook" && method === "GET") {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=facebook_not_configured`, 302);
    }
    const state = crypto.randomUUID();
    await env.EDU_KV.put(`oauth:state:${state}`, "facebook", { expirationTtl: 600 });
    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: `${url.origin}/api/v1/auth/oauth/facebook/callback`,
      scope: "email,public_profile",
      response_type: "code",
      state,
    });
    return Response.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`, 302);
  }

  if (path === "/api/v1/auth/oauth/facebook/callback" && method === "GET") {
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    if (!code || !state || !env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=facebook_failed`, 302);
    }
    const stored = await env.EDU_KV.get(`oauth:state:${state}`);
    if (stored !== "facebook") {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=invalid_state`, 302);
    }
    await env.EDU_KV.delete(`oauth:state:${state}`);

    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", env.FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", `${url.origin}/api/v1/auth/oauth/facebook/callback`);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
    if (!tokenJson.access_token) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=facebook_token_failed`, 302);
    }

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenJson.access_token)}`
    );
    const profile = (await profileRes.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      email?: string;
    };
    const email = profile.email || (profile.id ? `fb_${profile.id}@facebook.eduk12.vn` : "");
    if (!email) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=no_email`, 302);
    }

    const userRow = await upsertOAuthUser(
      env,
      "facebook",
      profile.id || email,
      email,
      profile.name || "Thành viên Facebook"
    );
    if (Number(userRow.is_active) === 0) {
      return Response.redirect(`${url.origin}/dang-nhap?oauth_error=account_locked`, 302);
    }

    const sec = await env.DB.prepare("SELECT totp_enabled FROM user_security WHERE user_id = ?")
      .bind(String(userRow.id))
      .first<{ totp_enabled: number }>();
    if (sec?.totp_enabled === 1) {
      const tempToken = crypto.randomUUID();
      await env.EDU_KV.put(`auth:2fa:${tempToken}`, String(userRow.id), { expirationTtl: 300 });
      return Response.redirect(`${url.origin}/dang-nhap?twofa_token=${tempToken}`, 302);
    }

    const oneTimeCode = crypto.randomUUID();
    await env.EDU_KV.put(`oauth:exchange:${oneTimeCode}`, String(userRow.id), { expirationTtl: 120 });
    return Response.redirect(`${url.origin}/dang-nhap?oauth_code=${oneTimeCode}`, 302);
  }

  // Đổi one-time OAuth code lấy JWT
  if (path === "/api/v1/auth/oauth/exchange" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    if (!body.code) return jsonRes({ error: "Thiếu mã xác thực OAuth" }, 400);
    const uid = await env.EDU_KV.get(`oauth:exchange:${body.code}`);
    if (!uid) return jsonRes({ error: "Mã xác thực đã hết hạn, vui lòng đăng nhập lại" }, 401);
    await env.EDU_KV.delete(`oauth:exchange:${body.code}`);

    const userRow = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(uid)
      .first<Record<string, unknown>>();
    if (!userRow) return jsonRes({ error: "Không tìm thấy người dùng" }, 404);
    const tokens = await issueSessionTokens(env, jwtSecret, userRow);
    return jsonRes(tokens);
  }

  // === 4. XÁC THỰC BẢO MẬT 2 LỚP (2FA TOTP — GOOGLE AUTHENTICATOR) ===
  if (path === "/api/v1/auth/2fa/verify-login" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { temp_token?: string; code?: string };
    if (!body.temp_token || !body.code) {
      return jsonRes({ error: "Vui lòng nhập mã 2FA 6 chữ số hoặc mã khôi phục" }, 400);
    }
    const uid = await env.EDU_KV.get(`auth:2fa:${body.temp_token}`);
    if (!uid) return jsonRes({ error: "Phiên xác thực 2FA đã hết hạn, vui lòng đăng nhập lại" }, 401);

    const sec = await env.DB.prepare("SELECT * FROM user_security WHERE user_id = ?")
      .bind(uid)
      .first<{ totp_secret: string; totp_enabled: number; recovery_codes_json: string }>();
    if (!sec || !sec.totp_enabled) {
      return jsonRes({ error: "Tài khoản chưa bật 2FA" }, 400);
    }

    const inputCode = body.code.trim().toUpperCase();
    let valid = await verifyTotpCode(sec.totp_secret, inputCode);
    if (!valid) {
      // Kiểm tra mã khôi phục dự phòng (one-time recovery code)
      const codes = JSON.parse(sec.recovery_codes_json || "[]") as string[];
      const idx = codes.indexOf(inputCode);
      if (idx >= 0) {
        valid = true;
        codes.splice(idx, 1);
        await env.DB.prepare("UPDATE user_security SET recovery_codes_json = ? WHERE user_id = ?")
          .bind(JSON.stringify(codes), uid)
          .run();
      }
    }
    if (!valid) {
      return jsonRes({ error: "Mã 2FA không chính xác hoặc đã hết hạn (mỗi mã chỉ hiệu lực 30 giây)" }, 401);
    }

    await env.EDU_KV.delete(`auth:2fa:${body.temp_token}`);
    const userRow = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(uid)
      .first<Record<string, unknown>>();
    if (!userRow) return jsonRes({ error: "Không tìm thấy người dùng" }, 404);
    const tokens = await issueSessionTokens(env, jwtSecret, userRow);
    return jsonRes(tokens);
  }

  if (path === "/api/v1/auth/2fa/status" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const sec = await env.DB.prepare(
      "SELECT auth_provider, totp_enabled, updated_at FROM user_security WHERE user_id = ?"
    )
      .bind(claims.uid)
      .first<{ auth_provider: string; totp_enabled: number; updated_at: string }>();
    return jsonRes({
      enabled: sec?.totp_enabled === 1,
      auth_provider: sec?.auth_provider || "email",
      updated_at: sec?.updated_at || null,
    });
  }

  if (path === "/api/v1/auth/2fa/setup" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const secret = generateBase32Secret(20);
    await env.DB.prepare(
      `INSERT INTO user_security (user_id, totp_secret, totp_enabled, updated_at)
       VALUES (?, ?, 0, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET totp_secret = excluded.totp_secret, updated_at = datetime('now')`
    )
      .bind(claims.uid, secret)
      .run();

    const issuer = "EduK12";
    const label = encodeURIComponent(`${issuer}:${claims.email}`);
    const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    return jsonRes({
      secret,
      otpauth_uri: otpauthUri,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`,
    });
  }

  if (path === "/api/v1/auth/2fa/enable" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const sec = await env.DB.prepare("SELECT totp_secret FROM user_security WHERE user_id = ?")
      .bind(claims.uid)
      .first<{ totp_secret: string }>();
    if (!sec?.totp_secret) {
      return jsonRes({ error: "Hãy bấm 'Tạo mã QR 2FA' trước khi xác nhận" }, 400);
    }
    const ok = await verifyTotpCode(sec.totp_secret, body.code || "");
    if (!ok) {
      return jsonRes({ error: "Mã 6 số từ Google Authenticator chưa đúng, vui lòng thử lại!" }, 400);
    }
    const recoveryCodes = generateRecoveryCodes();
    await env.DB.prepare(
      "UPDATE user_security SET totp_enabled = 1, recovery_codes_json = ?, updated_at = datetime('now') WHERE user_id = ?"
    )
      .bind(JSON.stringify(recoveryCodes), claims.uid)
      .run();
    return jsonRes({ enabled: true, recovery_codes: recoveryCodes });
  }

  if (path === "/api/v1/auth/2fa/disable" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const sec = await env.DB.prepare("SELECT totp_secret, totp_enabled FROM user_security WHERE user_id = ?")
      .bind(claims.uid)
      .first<{ totp_secret: string; totp_enabled: number }>();
    if (!sec?.totp_enabled) return jsonRes({ enabled: false });
    const ok = await verifyTotpCode(sec.totp_secret, body.code || "");
    if (!ok) return jsonRes({ error: "Cần nhập đúng mã 2FA 6 số hiện tại để tắt bảo mật 2 lớp" }, 400);
    await env.DB.prepare(
      "UPDATE user_security SET totp_enabled = 0, totp_secret = '', recovery_codes_json = '[]', updated_at = datetime('now') WHERE user_id = ?"
    )
      .bind(claims.uid)
      .run();
    return jsonRes({ enabled: false });
  }

  // === 5. QUẢN LÝ NGƯỜI DÙNG NÂNG CAO (SUPER ADMIN) ===
  if (path.startsWith("/api/v1/admin/users")) {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (claims.role !== "super_admin") return jsonRes({ error: "Chỉ Super Admin mới có quyền này" }, 403);

    if (path === "/api/v1/admin/users" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT u.id, u.email, u.full_name, u.role, u.tier, u.current_grade, u.school_name, u.is_active, u.created_at,
                COALESCE(s.auth_provider, 'email') as auth_provider,
                COALESCE(s.totp_enabled, 0) as totp_enabled,
                (SELECT COUNT(*) FROM coding_progress cp WHERE cp.user_id = u.id) as coding_passed_count
         FROM users u
         LEFT JOIN user_security s ON s.user_id = u.id
         ORDER BY u.created_at DESC LIMIT 200`
      ).all<Record<string, unknown>>();
      return jsonRes({
        users: results.map((u) => ({
          ...u,
          is_active: Number(u.is_active ?? 1) === 1,
          totp_enabled: Number(u.totp_enabled ?? 0) === 1,
        })),
      });
    }

    if (path === "/api/v1/admin/users" && method === "POST") {
      const b = (await request.json()) as {
        email?: string;
        password?: string;
        full_name?: string;
        role?: string;
        current_grade?: number;
        school_name?: string;
      };
      if (!b.email || !b.password || b.password.length < 6 || !b.full_name) {
        return jsonRes({ error: "Vui lòng nhập đầy đủ Email, Họ tên và Mật khẩu (>= 6 ký tự)" }, 400);
      }
      const uid = crypto.randomUUID();
      const passHash = await hashPassword(b.password);
      const role = ["student", "teacher", "content_admin", "super_admin", "parent"].includes(b.role || "")
        ? b.role!
        : "student";
      try {
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO users (id, email, password_hash, full_name, role, tier, current_grade, school_name, is_active) VALUES (?, ?, ?, ?, ?, 'free', ?, ?, 1)"
          ).bind(uid, b.email.toLowerCase().trim(), passHash, b.full_name.trim(), role, b.current_grade ?? null, b.school_name || ""),
          env.DB.prepare("INSERT OR IGNORE INTO user_security (user_id, auth_provider) VALUES (?, 'email')").bind(uid),
        ]);
      } catch {
        return jsonRes({ error: "Email này đã tồn tại trong hệ thống" }, 409);
      }
      return jsonRes({ status: "created", id: uid }, 201);
    }

    const roleMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)\/role$/);
    if (roleMatch && method === "PATCH") {
      const b = (await request.json()) as { role?: string };
      await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?")
        .bind(b.role || "student", decodeURIComponent(roleMatch[1]))
        .run();
      return jsonRes({ status: "updated" });
    }

    const statusMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const targetId = decodeURIComponent(statusMatch[1]);
      if (targetId === claims.uid) {
        return jsonRes({ error: "Không thể tự khóa tài khoản Admin đang đăng nhập" }, 400);
      }
      const b = (await request.json()) as { is_active?: boolean };
      await env.DB.prepare("UPDATE users SET is_active = ? WHERE id = ?")
        .bind(b.is_active ? 1 : 0, targetId)
        .run();
      return jsonRes({ status: "updated" });
    }

    const reset2faMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)\/reset-2fa$/);
    if (reset2faMatch && method === "POST") {
      const targetId = decodeURIComponent(reset2faMatch[1]);
      await env.DB.prepare(
        "UPDATE user_security SET totp_enabled = 0, totp_secret = '', recovery_codes_json = '[]', updated_at = datetime('now') WHERE user_id = ?"
      )
        .bind(targetId)
        .run();
      return jsonRes({ status: "2fa_reset" });
    }

    const delMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
    if (delMatch && method === "DELETE") {
      const targetId = decodeURIComponent(delMatch[1]);
      if (targetId === claims.uid) {
        return jsonRes({ error: "Không thể tự xóa tài khoản Admin đang đăng nhập" }, 400);
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM user_security WHERE user_id = ?").bind(targetId),
        env.DB.prepare("DELETE FROM classroom_members WHERE user_id = ?").bind(targetId),
        env.DB.prepare("DELETE FROM coding_progress WHERE user_id = ?").bind(targetId),
        env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId),
      ]);
      return jsonRes({ status: "deleted" });
    }
  }

  return null;
}
