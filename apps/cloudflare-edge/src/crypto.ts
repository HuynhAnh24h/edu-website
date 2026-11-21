// Web Crypto API helpers cho Cloudflare Workers (Zero Node deps, chuẩn bảo mật Edge)

const te = new TextEncoder();
const td = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  return fromBase64(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `pbkdf2$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = fromBase64(parts[1]);
  const expected = fromBase64(parts[2]);
  const keyMaterial = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

export interface JwtClaims {
  uid: string;
  email: string;
  name: string;
  role: string;
  grade?: number;
  exp: number;
}

export async function signJwt(claims: Omit<JwtClaims, "exp">, secret: string, ttlSec = 86400): Promise<string> {
  const header = toBase64Url(te.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    te.encode(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSec }))
  );
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, te.encode(data)));
  return `${data}.${toBase64Url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sig = fromBase64Url(parts[2]);
  const ok = await crypto.subtle.verify("HMAC", key, sig.buffer as ArrayBuffer, te.encode(data));
  if (!ok) return null;
  const claims = JSON.parse(td.decode(fromBase64Url(parts[1]))) as JwtClaims;
  if (claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

// Mã hóa gói đề thi AES-256-GCM tương thích 100% với decryptExamBundle() trên trình duyệt
export async function encryptExamBundle(plainObj: unknown): Promise<{
  iv_b64: string;
  ciphertext_b64: string;
  key_b64: string;
}> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    te.encode(JSON.stringify(plainObj))
  );
  return {
    iv_b64: toBase64(iv),
    ciphertext_b64: toBase64(new Uint8Array(cipherBuf)),
    key_b64: toBase64(rawKey),
  };
}
