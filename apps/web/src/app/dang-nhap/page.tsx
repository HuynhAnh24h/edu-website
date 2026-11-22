"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  QrCode,
  School,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CuBongLogoMark } from "@/components/BrandLogo";

const DEMO_ACCOUNTS = [
  {
    role: "Học sinh",
    desc: "Lớp 1–12, Luyện Code & Học bạ Số",
    email: "hocsinh@eduk12.vn",
    pass: "Student@123",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70",
  },
  {
    role: "Giáo viên",
    desc: "MXH Giáo viên, Lớp Live & Soạn đề",
    email: "giaovien@eduk12.vn",
    pass: "Teacher@123",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70",
  },
  {
    role: "Phụ huynh",
    desc: "Theo dõi Điểm số & An toàn của Con",
    email: "phuhuynh@eduk12.vn",
    pass: "Parent@123",
    badge: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70",
  },
  {
    role: "Admin",
    desc: "Quản trị Hệ thống, Duyệt Tích xanh & An toàn",
    email: "admin@eduk12.vn",
    pass: "Admin@123",
    badge: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70",
  },
];

function getLandingRouteByRole(role?: string): string {
  if (role === "super_admin" || role === "content_admin") return "/quan-tri";
  if (role === "teacher") return "/cong-dong";
  if (role === "parent") return "/phu-huynh";
  return "/";
}

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState(12);
  const [school, setSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  // 2FA Login Challenge State
  const [twoFaTempToken, setTwoFaTempToken] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  // Quên mật khẩu qua Email
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // OAuth Provider Config
  const [providers, setProviders] = useState<OAuthProvidersState | null>(null);

  // User 2FA Setup State (when logged in)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [authProvider, setAuthProvider] = useState("email");
  const [setupData, setSetupData] = useState<{ secret: string; qr_url: string } | null>(null);
  const [otpConfirm, setOtpConfirm] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/auth/oauth/providers`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProviders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const oauthCode = searchParams.get("oauth_code");
    const twofaToken = searchParams.get("twofa_token");
    const oauthErr = searchParams.get("oauth_error");

    if (oauthErr) {
      if (oauthErr === "google_not_configured") {
        setError("Đăng nhập Google chưa được kích hoạt trên máy chủ.");
      } else if (oauthErr === "facebook_not_configured") {
        setError("Đăng nhập Facebook chưa được kích hoạt trên máy chủ.");
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
          router.push(getLandingRouteByRole(res.user?.role));
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
          setError(res.error || "Email hoặc mật khẩu chưa chính xác");
        } else {
          router.push(getLandingRouteByRole(res.user?.role));
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
          setError(res.error || "Đăng ký chưa thành công");
        } else {
          router.push(getLandingRouteByRole(res.user?.role || role));
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
        router.push(getLandingRouteByRole(res.user?.role));
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

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr("");
    setForgotMsg("");
    setForgotBusy(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const d = await res.json();
      if (!res.ok) {
        setForgotErr(d.error || "Không thể gửi mã khôi phục");
      } else {
        setForgotMsg(d.message || "Đã gửi mã xác nhận 6 chữ số tới Email của bạn!");
        if (d.demo_code) setResetCode(String(d.demo_code));
        setForgotStep("reset");
      }
    } finally {
      setForgotBusy(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr("");
    setForgotMsg("");
    setForgotBusy(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, new_password: newPassword }),
      });
      const d = await res.json();
      if (!res.ok) {
        setForgotErr(d.error || "Đặt lại mật khẩu chưa thành công");
      } else {
        setEmail(forgotEmail);
        setPassword(newPassword);
        setForgotOpen(false);
        setForgotStep("email");
        setResetCode("");
        setNewPassword("");
        setInfo(d.message || "Đã đổi mật khẩu thành công! Bạn có thể bấm Đăng nhập ngay.");
      }
    } finally {
      setForgotBusy(false);
    }
  };

  // =========================================================================
  // 1. NẾU ĐÃ ĐĂNG NHẬP -> TRANG TÀI KHOẢN & CÀI ĐẶT BẢO MẬT 2FA
  // =========================================================================
  if (user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black ring-1 ring-white/30">
              {user.full_name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                Tài khoản &amp; Bảo mật 2FA
              </span>
              <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{user.full_name}</h1>
              <p className="text-xs text-indigo-100">
                {user.email} • Đăng nhập qua <strong className="uppercase">{authProvider}</strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ho-so"
              className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-indigo-700 shadow-xs hover:bg-indigo-50"
            >
              Hồ sơ cá nhân
            </Link>
            {isStaff && (
              <Link
                href="/quan-tri"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-300"
              >
                Mở Studio / Quản trị
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/25 hover:bg-white/25"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        </div>

        {info && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {info}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700">
            <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div data-tour="auth-2fa" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
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
                  Bảo vệ tài khoản bằng mã OTP 6 chữ số thay đổi mỗi 30 giây trên điện thoại của bạn.
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

  // =========================================================================
  // 2. MÀN HÌNH NHẬP MÃ 2FA KHI ĐĂNG NHẬP
  // =========================================================================
  if (twoFaTempToken) {
    return (
      <div className="mx-auto max-w-md py-10">
        <form
          onSubmit={handleVerify2faLogin}
          className="rounded-3xl border border-indigo-200 bg-white p-7 shadow-xl space-y-5"
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

  // =========================================================================
  // 3. MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ HIỆN ĐẠI CHUẨN WEBSITE GIÁO DỤC OWLIE EDU
  // =========================================================================
  return (
    <div className="mx-auto max-w-5xl py-2 sm:py-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200/90 bg-white shadow-xl shadow-indigo-950/5 grid md:grid-cols-12">
        {/* CỘT TRÁI: THƯƠNG HIỆU GIÁO DỤC OWLIE EDU SÁNG & ẤM ÁP */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50/80 to-emerald-50/70 p-8 md:col-span-5 md:flex border-r border-slate-100">
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-emerald-200/35 blur-3xl" />

          <div className="relative z-10 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <CuBongLogoMark className="h-11 w-11 shadow-sm" />
              <div>
                <p className="text-lg font-black tracking-tight text-slate-900">
                  Owlie <span className="text-indigo-600">Edu</span>
                </p>
                <p className="text-[11px] font-semibold text-slate-500">Nền tảng Giáo dục Mở 1–12</p>
              </div>
            </Link>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                <Sparkles className="h-3 w-3 text-amber-500" /> 100% Miễn phí • Không quảng cáo
              </span>
              <h2 className="text-2xl font-black leading-snug text-slate-900">
                Đồng hành học tập thông minh cùng chú cú Owlie
              </h2>
              <p className="text-xs leading-relaxed text-slate-600">
                Một tài khoản duy nhất kết nối trọn vẹn Học sinh, Giáo viên và Phụ huynh trên Web &amp; Điện thoại.
              </p>
            </div>

            {/* Tranh minh họa học đường Owlie Edu */}
            <div className="overflow-hidden rounded-2xl border border-white bg-white p-1.5 shadow-md shadow-indigo-900/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-owlie-edu.jpg"
                alt="Học tập cùng Owlie Edu"
                className="aspect-[16/10] w-full rounded-xl object-cover"
              />
            </div>

            <ul className="space-y-2.5 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span>157+ Bài giảng GDPT 2018 &amp; 6 Cụm Lập trình</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Award className="h-3.5 w-3.5" />
                </span>
                <span>Cấp Chứng chỉ PDF + Mã QR &amp; Học bạ Số</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <span>Bảo mật 2FA &amp; Chế độ Phụ huynh miễn phí</span>
              </li>
            </ul>
          </div>

          <p className="relative z-10 pt-6 text-[11px] font-medium text-slate-500">
            Cần hỗ trợ? Chọn <strong>Quên mật khẩu</strong> hoặc đăng nhập nhanh chỉ 1 chạm bằng Google &amp; Facebook.
          </p>
        </div>

        {/* CỘT PHẢI: KHUNG FORM ĐĂNG NHẬP / ĐĂNG KÝ SẠCH SẼ */}
        <div className="p-6 sm:p-9 md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Tiêu đề gọn gàng */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 md:hidden">
                  <CuBongLogoMark className="h-9 w-9" />
                  <span className="text-base font-black text-slate-900">
                    Owlie <span className="text-indigo-600">Edu</span>
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {tab === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản miễn phí"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  {tab === "login"
                    ? "Đăng nhập để tiếp tục học tập, lưu điểm thi và nhận chứng chỉ."
                    : "Bắt đầu hành trình học Lớp 1–12, Lập trình hoặc theo dõi con ngay."}
                </p>
              </div>
            </div>

            {/* Thanh chuyển Đăng nhập / Đăng ký */}
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition ${
                  tab === "login" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" /> Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError("");
                  setForgotOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition ${
                  tab === "register" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" /> Tạo tài khoản
              </button>
            </div>

            {/* Đăng nhập nhanh 1 chạm bằng Google & Facebook */}
            <div data-tour="auth-social" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <a
                href={`${CORE_API_URL}/api/v1/auth/oauth/google`}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
                  <path fill="#FBBC05" d="M5.2 14.2c-.2-.7-.4-1.5-.4-2.2s.1-1.5.4-2.2V6.7H1.2C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l4-3.1z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l4 3.1c.9-2.9 3.6-5 6.8-5z" />
                </svg>
                <span>Tiếp tục với Google</span>
                {providers && !providers.google_configured && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-400">Setup</span>
                )}
              </a>

              <a
                href={`${CORE_API_URL}/api/v1/auth/oauth/facebook`}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#1877F2] px-4 py-3 text-xs font-extrabold text-white shadow-2xs hover:bg-[#166FE5] transition"
              >
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z" />
                </svg>
                <span>Tiếp tục với Facebook</span>
                {providers && !providers.facebook_configured && (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] text-white/90">Setup</span>
                )}
              </a>
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[11px] font-semibold text-slate-400">hoặc dùng Email</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Form Email / Mật khẩu */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "register" && (
                <>
                  {/* Chọn Vai trò trực quan dạng 3 thẻ nhỏ */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">Bạn là ai?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "student", label: "Học sinh", icon: GraduationCap },
                        { id: "teacher", label: "Giáo viên", icon: School },
                        { id: "parent", label: "Phụ huynh", icon: HeartHandshake },
                      ].map((r) => {
                        const Icon = r.icon;
                        const active = role === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.id)}
                            className={`flex flex-col items-center gap-1 rounded-2xl border py-2.5 px-2 text-xs font-extrabold transition ${
                              active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Họ và tên</label>
                      <div className="relative mt-1">
                        <UserIcon className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="VD: Trần Minh Quân"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-3.5 pl-10 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {role === "student" ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Khối lớp</label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                            <option key={g} value={g}>
                              Lớp {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Trường học (tùy chọn)</label>
                        <input
                          type="text"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          placeholder="VD: THPT Chu Văn An"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">Địa chỉ Email</label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@gmail.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-3.5 pl-10 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen((v) => !v);
                        setForgotEmail(email);
                        setForgotErr("");
                        setForgotMsg("");
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-10 pl-10 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute top-2.5 right-3 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {info && (
                <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  {info}
                </p>
              )}

              {error && (
                <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {submitting
                  ? "Đang xác thực..."
                  : tab === "login"
                    ? "Đăng nhập vào Owlie Edu"
                    : "Hoàn tất đăng ký miễn phí"}
              </button>
            </form>

            {/* Khối Quên mật khẩu qua Email */}
            {forgotOpen && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-indigo-900">Khôi phục Mật khẩu qua Email (OTP 6 số)</p>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-700"
                  >
                    Đóng
                  </button>
                </div>

                {forgotMsg && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                    {forgotMsg}
                  </p>
                )}
                {forgotErr && (
                  <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                    {forgotErr}
                  </p>
                )}

                {forgotStep === "email" ? (
                  <form onSubmit={handleRequestPasswordReset} className="space-y-2.5">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Nhập Email tài khoản của bạn..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={forgotBusy}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {forgotBusy ? "Đang gửi mã..." : "Gửi mã xác nhận 6 số"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmPasswordReset} className="space-y-2.5">
                    <input
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Nhập mã xác nhận 6 chữ số"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (>= 6 ký tự)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={forgotBusy}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {forgotBusy ? "Đang cập nhật..." : "Đặt lại Mật khẩu mới"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotStep("email")}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        Gửi lại mã
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Mục Tài khoản Demo gập gọn ở đáy để không làm rối màn hình đăng nhập thật */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setDemoOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                Dùng thử nhanh Tài khoản Demo (Học sinh / Giáo viên / Phụ huynh / Admin)
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition ${demoOpen ? "rotate-180" : ""}`} />
            </button>

            {demoOpen && (
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setTab("login");
                      setEmail(acc.email);
                      setPassword(acc.pass);
                      setError("");
                    }}
                    className={`rounded-xl border p-2.5 text-left transition ${acc.badge}`}
                  >
                    <p className="text-xs font-extrabold">{acc.role}</p>
                    <p className="text-[10px] opacity-85">{acc.desc}</p>
                    <p className="mt-1 font-mono text-[10px] font-bold opacity-90">
                      {acc.email} / {acc.pass}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải màn hình đăng nhập...</div>}>
      <AuthPageInner />
    </Suspense>
  );
}
