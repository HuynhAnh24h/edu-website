"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const DEMO_ACCOUNTS = [
  {
    label: "Admin (Toàn quyền CMS + Quản lý User + 2FA)",
    email: "admin@eduk12.vn",
    pass: "Admin@123",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    label: "Giáo viên (Phòng Live, Lớp học, Soạn bài)",
    email: "giaovien@eduk12.vn",
    pass: "Teacher@123",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    label: "Học sinh / Cộng đồng (Học K–12 & Lập trình)",
    email: "hocsinh@eduk12.vn",
    pass: "Student@123",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

interface OAuthProvidersState {
  google_configured: boolean;
  facebook_configured: boolean;
  google_callback: string;
  facebook_callback: string;
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isStaff, login, verify2faLogin, completeOAuthExchange, register, logout } =
    useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@eduk12.vn");
  const [password, setPassword] = useState("Admin@123");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState(12);
  const [school, setSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // 2FA Login Challenge State
  const [twoFaTempToken, setTwoFaTempToken] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  // OAuth Provider Config
  const [providers, setProviders] = useState<OAuthProvidersState | null>(null);

  // User 2FA Setup State (when logged in)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [authProvider, setAuthProvider] = useState("email");
  const [setupData, setSetupData] = useState<{ secret: string; qr_url: string } | null>(null);
  const [otpConfirm, setOtpConfirm] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Kiểm tra trạng thái Google/Facebook OAuth trên server
  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/auth/oauth/providers`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProviders)
      .catch(() => {});
  }, []);

  // Xử lý callback từ Google / Facebook OAuth (?oauth_code=... / ?twofa_token=... / ?oauth_error=...)
  useEffect(() => {
    const oauthCode = searchParams.get("oauth_code");
    const twofaToken = searchParams.get("twofa_token");
    const oauthErr = searchParams.get("oauth_error");

    if (oauthErr) {
      if (oauthErr === "google_not_configured") {
        setError(
          "Đăng nhập Google OAuth chưa được gắn GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trên Cloudflare Worker. Quản trị viên có thể xem hướng dẫn 1 dòng lệnh trong trang Quản trị."
        );
      } else if (oauthErr === "facebook_not_configured") {
        setError(
          "Đăng nhập Facebook OAuth chưa được gắn FACEBOOK_APP_ID / FACEBOOK_APP_SECRET trên Cloudflare Worker."
        );
      } else if (oauthErr === "account_locked") {
        setError("Tài khoản này đang bị tạm khóa bởi Quản trị viên.");
      } else {
        setError(`Đăng nhập mạng xã hội chưa hoàn tất (${oauthErr}). Vui lòng thử lại.`);
      }
      return;
    }

    if (twofaToken) {
      setTwoFaTempToken(twofaToken);
      setInfo("Tài khoản của bạn đã bật Bảo mật 2 lớp (2FA). Vui lòng nhập mã 6 số từ Google Authenticator.");
      return;
    }

    if (oauthCode) {
      void completeOAuthExchange(oauthCode).then((res) => {
        if (res.ok) {
          router.push(res.user && ["teacher", "content_admin", "super_admin"].includes(res.user.role) ? "/quan-tri" : "/");
        } else {
          setError(res.error || "Đăng nhập OAuth thất bại");
        }
      });
    }
  }, [searchParams, completeOAuthExchange, router]);

  const load2faStatus = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/auth/2fa/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      setTwoFaEnabled(Boolean(d.enabled));
      setAuthProvider(d.auth_provider || "email");
    }
  }, [accessToken]);

  useEffect(() => {
    if (user && accessToken) void load2faStatus();
  }, [user, accessToken, load2faStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        const res = await login(email, password);
        if (res.requires_2fa && res.temp_token) {
          setTwoFaTempToken(res.temp_token);
          setInfo("Vui lòng nhập mã 6 chữ số từ ứng dụng Google Authenticator (hoặc mã khôi phục).");
        } else if (!res.ok) {
          setError(res.error || "Đăng nhập thất bại");
        } else {
          router.push(email.includes("admin") || email.includes("giaovien") ? "/quan-tri" : "/");
        }
      } else {
        const res = await register({
          email,
          password,
          full_name: fullName,
          role,
          current_grade: role === "student" ? grade : undefined,
          school_name: school,
        });
        if (!res.ok) {
          setError(res.error || "Đăng ký thất bại");
        } else {
          // Kích hoạt Cú Bông Edu bay ra hào hứng dẫn đường ngay cho người mới đăng ký!
          localStorage.setItem(
            "eduk12_pending_tour",
            role === "teacher" ? "teacher" : "student-classroom"
          );
          router.push(role === "teacher" ? "/quan-tri" : "/lop-hoc");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2faLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await verify2faLogin(twoFaTempToken, twoFaCode);
      if (!res.ok) {
        setError(res.error || "Mã 2FA không chính xác");
      } else {
        setTwoFaTempToken("");
        router.push(res.user && ["teacher", "content_admin", "super_admin"].includes(res.user.role) ? "/quan-tri" : "/");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart2faSetup = async () => {
    if (!accessToken) return;
    setError("");
    setInfo("");
    const res = await fetch(`${CORE_API_URL}/api/v1/auth/2fa/setup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = await res.json();
    if (res.ok) {
      setSetupData({ secret: d.secret, qr_url: d.qr_url });
      setRecoveryCodes([]);
    } else {
      setError(d.error || "Không thể khởi tạo mã QR 2FA");
    }
  };

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setError("");
    const res = await fetch(`${CORE_API_URL}/api/v1/auth/2fa/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code: otpConfirm }),
    });
    const d = await res.json();
    if (res.ok) {
      setTwoFaEnabled(true);
      setSetupData(null);
      setOtpConfirm("");
      setRecoveryCodes(d.recovery_codes || []);
      setInfo("Đã kích hoạt Bảo mật 2 lớp (2FA) thành công! Hãy lưu lại 6 mã khôi phục bên dưới.");
    } else {
      setError(d.error || "Mã xác nhận chưa đúng");
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setError("");
    const res = await fetch(`${CORE_API_URL}/api/v1/auth/2fa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code: otpConfirm }),
    });
    const d = await res.json();
    if (res.ok) {
      setTwoFaEnabled(false);
      setOtpConfirm("");
      setRecoveryCodes([]);
      setInfo("Đã tắt bảo mật 2 lớp (2FA).");
    } else {
      setError(d.error || "Mã 2FA chưa chính xác");
    }
  };

  // === NẾU ĐÃ ĐĂNG NHẬP -> HIỂN THỊ TRANG TÀI KHOẢN & CÀI ĐẶT BẢO MẬT 2FA ===
  if (user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-md">
          <div>
            <span className="rounded-full bg-indigo-500/30 px-3 py-1 text-[11px] font-bold uppercase text-indigo-200">
              Tài khoản &amp; Bảo mật 2FA
            </span>
            <h1 className="mt-2 text-2xl font-extrabold">{user.full_name}</h1>
            <p className="text-xs text-slate-300">
              {user.email} • Phương thức: <strong className="uppercase">{authProvider}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStaff && (
              <Link
                href="/quan-tri"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Mở Dashboard Quản trị
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        </div>

        {info && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {info}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700">
            <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Khối Cài đặt 2FA (Google Authenticator / Authy) */}
        <div data-tour="auth-2fa" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  twoFaEnabled ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Xác thực 2 lớp (2FA — Google Authenticator / Authy)
                </h2>
                <p className="text-xs text-slate-500">
                  Bảo vệ tài khoản bằng mã OTP 6 chữ số thay đổi mỗi 30 giây theo chuẩn RFC-6238.
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                twoFaEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {twoFaEnabled ? "ĐANG BẬT 2FA" : "CHƯA BẬT"}
            </span>
          </div>

          {!twoFaEnabled && !setupData && (
            <button
              type="button"
              onClick={() => void handleStart2faSetup()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
            >
              <QrCode className="h-4 w-4" /> Thiết lập 2FA bằng mã QR ngay
            </button>
          )}

          {setupData && (
            <div className="grid gap-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 sm:grid-cols-12">
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-xs sm:col-span-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qr_url}
                  alt="QR Code 2FA Google Authenticator"
                  className="h-44 w-44 rounded-lg"
                />
                <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                  Mở ứng dụng <strong>Google Authenticator</strong> và quét mã QR này
                </p>
              </div>

              <div className="space-y-4 sm:col-span-7">
                <div>
                  <p className="text-xs font-bold text-slate-700">Hoặc nhập thủ công khóa bí mật:</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs font-bold text-emerald-400">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setupData.secret);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    >
                      {copiedSecret ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleEnable2fa} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nhập mã 6 chữ số hiển thị trên điện thoại để kích hoạt:
                    </label>
                    <input
                      required
                      maxLength={6}
                      value={otpConfirm}
                      onChange={(e) => setOtpConfirm(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-mono text-lg font-extrabold tracking-[0.4em]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Xác nhận &amp; Bật 2FA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupData(null)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {recoveryCodes.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-xs font-extrabold text-amber-900">
                Mã khôi phục dự phòng (Lưu giữ nơi an toàn — dùng nếu mất điện thoại):
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recoveryCodes.map((c) => (
                  <code
                    key={c}
                    className="rounded-lg bg-white px-3 py-1.5 text-center font-mono text-xs font-bold text-slate-800 ring-1 ring-amber-200"
                  >
                    {c}
                  </code>
                ))}
              </div>
            </div>
          )}

          {twoFaEnabled && (
            <form onSubmit={handleDisable2fa} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-600">
                  Muốn tắt 2FA? Nhập mã 6 số hiện tại:
                </label>
                <input
                  required
                  maxLength={6}
                  value={otpConfirm}
                  onChange={(e) => setOtpConfirm(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập mã 6 chữ số"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Tắt bảo mật 2FA
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // === MÀN HÌNH NHẬP MÃ 2FA KHI ĐĂNG NHẬP ===
  if (twoFaTempToken) {
    return (
      <div className="mx-auto max-w-md py-10">
        <form
          onSubmit={handleVerify2faLogin}
          className="rounded-2xl border border-indigo-200 bg-white p-7 shadow-lg space-y-5"
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-lg font-extrabold text-slate-900">
              Xác thực Bảo mật 2 lớp (2FA)
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {info || "Nhập mã 6 chữ số từ Google Authenticator hoặc mã khôi phục dự phòng."}
            </p>
          </div>

          <input
            required
            autoFocus
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
            placeholder="000000"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.35em] focus:border-indigo-500 focus:outline-none"
          />

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Đang xác minh..." : "Xác nhận & Đăng nhập"}
          </button>

          <button
            type="button"
            onClick={() => {
              setTwoFaTempToken("");
              setTwoFaCode("");
              setError("");
            }}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Quay lại đăng nhập tài khoản khác
          </button>
        </form>
      </div>
    );
  }

  // === MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ + GOOGLE & FACEBOOK OAUTH ===
  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-4 md:grid-cols-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:col-span-7 space-y-5">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === "login" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            <LogIn className="mr-1.5 inline h-4 w-4" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === "register" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            <UserPlus className="mr-1.5 inline h-4 w-4" /> Tạo tài khoản
          </button>
        </div>

        {/* Nút Đăng nhập nhanh bằng Google & Facebook OAuth 2.0 */}
        <div data-tour="auth-social" className="grid grid-cols-2 gap-2.5">
          <a
            href={`${CORE_API_URL}/api/v1/auth/oauth/google`}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
              <path fill="#FBBC05" d="M5.2 14.2c-.2-.7-.4-1.5-.4-2.2s.1-1.5.4-2.2V6.7H1.2C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l4-3.1z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l4 3.1c.9-2.9 3.6-5 6.8-5z" />
            </svg>
            Google
            {providers && !providers.google_configured && (
              <span className="rounded bg-slate-100 px-1 text-[9px] font-semibold text-slate-400">
                Setup
              </span>
            )}
          </a>

          <a
            href={`${CORE_API_URL}/api/v1/auth/oauth/facebook`}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#1877F2]/30 bg-[#1877F2] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#166FE5] transition"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z" />
            </svg>
            Facebook
            {providers && !providers.facebook_configured && (
              <span className="rounded bg-white/20 px-1 text-[9px] font-semibold text-white/90">
                Setup
              </span>
            )}
          </a>
        </div>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-[11px] font-semibold text-slate-400">hoặc bằng Email</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Trần Minh Quân"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vai trò</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="student">Học sinh / Thành viên</option>
                    <option value="teacher">Giáo viên (Vào Dashboard)</option>
                  </select>
                </div>

                {role === "student" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Khối lớp</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>
                          Lớp {g}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Trường học / Cộng đồng (tùy chọn)
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="VD: THPT Chu Văn An"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {submitting
              ? "Đang xác thực..."
              : tab === "login"
                ? "Đăng nhập hệ thống"
                : "Hoàn tất đăng ký miễn phí"}
          </button>
        </form>
      </div>

      {/* Tài khoản Demo test nhanh phân quyền + 2FA */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 md:col-span-5">
        <div className="flex items-center gap-2 text-indigo-700">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-sm font-bold">Bảo mật 2FA &amp; Tài khoản Demo</h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Hỗ trợ <strong>2FA (Google Authenticator TOTP)</strong>, đăng nhập <strong>Google &amp; Facebook OAuth 2.0</strong> và lưu tiến độ học lập trình trên Cloudflare D1.
        </p>

        <div className="space-y-2.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setTab("login");
                setEmail(acc.email);
                setPassword(acc.pass);
              }}
              className={`w-full rounded-xl border p-3.5 text-left transition hover:shadow-xs ${acc.badge}`}
            >
              <p className="text-xs font-bold">{acc.label}</p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] opacity-90">
                <KeyRound className="h-3 w-3" /> {acc.email} / {acc.pass}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải...</div>}>
      <AuthPageInner />
    </Suspense>
  );
}
