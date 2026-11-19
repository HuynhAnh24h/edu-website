"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const DEMO_ACCOUNTS = [
  {
    label: "Admin (Toàn quyền CMS + User)",
    email: "admin@eduk12.vn",
    pass: "Admin@123",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    label: "Giáo viên (Soạn tài liệu, câu hỏi, đề thi)",
    email: "giaovien@eduk12.vn",
    pass: "Teacher@123",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    label: "Học sinh Lớp 12 (Học & Thi thử)",
    email: "hocsinh@eduk12.vn",
    pass: "Student@123",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@eduk12.vn");
  const [password, setPassword] = useState("Admin@123");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState(12);
  const [school, setSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        const res = await login(email, password);
        if (!res.ok) {
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
          router.push(role === "teacher" ? "/quan-tri" : "/");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-4 md:grid-cols-12">
      {/* Form Đăng nhập / Đăng ký */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:col-span-7">
        <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1">
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
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên (Được vào CMS)</option>
                  </select>
                </div>

                {role === "student" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Đang học</label>
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
                  Trường học (tùy chọn)
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
              : "Hoàn tất đăng ký"}
          </button>
        </form>
      </div>

      {/* Tài khoản Demo test nhanh phân quyền */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 md:col-span-5">
        <div className="flex items-center gap-2 text-indigo-700">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-sm font-bold">Tài khoản Demo (Click để điền nhanh)</h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Xác thực bằng <strong>Stateless JWT</strong> (Access Token) + <strong>Redis Refresh Token</strong>, mật khẩu mã hóa <strong>bcrypt</strong> lưu trực tiếp trên PostgreSQL.
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
