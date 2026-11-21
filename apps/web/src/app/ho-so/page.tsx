"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  Save,
  School,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function roleDisplay(role: string) {
  if (role === "super_admin" || role === "content_admin") {
    return { label: "Quản trị viên", cls: "bg-rose-100 text-rose-700" };
  }
  if (role === "teacher") {
    return { label: "Giáo viên", cls: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Học sinh", cls: "bg-indigo-100 text-indigo-700" };
}

export default function UserProfilePage() {
  const { user, accessToken, loading, isStaff, isStudent, refreshUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState<number>(12);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setSchoolName(user.school_name || "");
      if (user.current_grade) setGrade(user.current_grade);
    }
  }, [user]);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          school_name: schoolName.trim(),
          current_grade: isStudent ? grade : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể lưu thông tin hồ sơ.");
      } else {
        await refreshUser();
        showNotice("ok", d.message || "Đã cập nhật hồ sơ cá nhân thành công!");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSavingPass(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể đổi mật khẩu.");
      } else {
        setCurrentPassword("");
        setNewPassword("");
        showNotice("ok", "Đã đổi mật khẩu thành công!");
      }
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
        Đang tải hồ sơ cá nhân...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <UserIcon className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">Hồ sơ Cá nhân</h1>
        <p className="text-xs text-slate-600">
          Vui lòng đăng nhập để xem và chỉnh sửa thông tin cá nhân của bạn.
        </p>
        <Link
          href="/dang-nhap"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500"
        >
          Đăng nhập ngay →
        </Link>
      </div>
    );
  }

  const badge = roleDisplay(user.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Banner thông tin & Trạng thái Avatar */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Avatar chữ cái tự động + biểu tượng khóa nâng cấp */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-2xl font-extrabold text-white shadow-md">
                {user.full_name.slice(0, 1).toUpperCase()}
              </div>
              <span
                title="Tính năng tải ảnh đại diện sẽ mở khi nâng cấp hệ thống"
                className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-amber-300 shadow"
              >
                <Lock className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{user.full_name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">{user.email}</p>
              {user.school_name && (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                  <School className="h-3.5 w-3.5 text-indigo-500" /> {user.school_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isStaff && (
              <Link
                href={`/giao-vien?id=${encodeURIComponent(user.id)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-extrabold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
              >
                <BadgeCheck className="h-4 w-4" /> Tường Giáo viên &amp; Tích xanh
              </Link>
            )}
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Smartphone className="h-3.5 w-3.5 text-indigo-600" /> Bảo mật 2FA
            </Link>
          </div>
        </div>

        {/* Ghi chú rõ ràng, minh bạch về tính năng đổi Avatar */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-extrabold">Ảnh đại diện (Avatar) — Đang chờ đợt nâng cấp hệ thống</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
              Hiện tại nền tảng đang chạy phiên bản cộng đồng miễn phí 100% và ưu tiên toàn bộ dung lượng cho đề thi &amp; tài liệu học tập nên tạm khóa tính năng đổi ảnh đại diện riêng. Khi nâng cấp kho lưu trữ ở phiên bản tiếp theo, bạn sẽ có thể tải ảnh Avatar cá nhân ngay tại đây!
            </p>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Form Chỉnh sửa Thông tin Cá nhân */}
      <form onSubmit={handleSaveInfo} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <UserIcon className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-extrabold text-slate-900">Thông tin Cá nhân</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700">Họ và tên hiển thị</label>
            <input
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên của bạn"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Email tài khoản (Cố định)</label>
            <input
              disabled
              value={user.email}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Trường học / Đơn vị</label>
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="VD: THPT Chu Văn An"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {isStudent && (
            <div>
              <label className="block text-xs font-bold text-slate-700">Khối lớp đang học</label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
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

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}
          </button>
        </div>
      </form>

      {/* Form Đổi Mật khẩu */}
      <form onSubmit={handleChangePassword} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <KeyRound className="h-4 w-4 text-emerald-600" /> Đổi Mật khẩu đăng nhập
          </h2>
          <Link href="/dang-nhap" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
            <ShieldCheck className="h-3.5 w-3.5" /> Cài đặt 2FA →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu cũ"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPass}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {savingPass ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}
