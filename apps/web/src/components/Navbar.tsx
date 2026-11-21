"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Bot,
  CheckSquare,
  ChevronDown,
  Code2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Radio,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CuBongLogoMark } from "@/components/BrandLogo";

const MAIN_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/tai-lieu", label: "Lớp 1–12", icon: BookOpen },
  { href: "/lap-trinh", label: "Lập trình", icon: Code2 },
  { href: "/lop-hoc", label: "Lớp Live", icon: Radio },
];

const MORE_LINKS = [
  { href: "/thi", label: "Thi trắc nghiệm", desc: "Phòng thi AES-256-GCM", icon: ShieldCheck },
  { href: "/bai-tap", label: "Bài tập 1–12", desc: "4 định dạng đề 2025+", icon: CheckSquare },
  { href: "/ai-gia-su", label: "AI Gia sư 24/7", desc: "Hỏi bài chuẩn Socratic", icon: Bot },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isStaff, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMoreActive = MORE_LINKS.some((l) => pathname.startsWith(l.href));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 shadow-[0_1px_12px_rgba(15,23,42,0.04)] backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo Cú Bông Edu tinh tế */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <CuBongLogoMark className="h-10 w-10 shadow-sm transition-transform duration-200 group-hover:scale-105" />
          <div className="leading-none">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              EduK12 <span className="text-indigo-600">Open</span>
            </span>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Học K–12 &amp; Lập trình Cộng đồng
            </p>
          </div>
        </Link>

        {/* Menu chính tinh gọn trên Desktop (5 mục) */}
        <nav className="hidden items-center gap-1 md:flex">
          {MAIN_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Dropdown gọn cho Luyện thi & AI */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isMoreActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Luyện thi &amp; AI</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {MORE_LINKS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link
                        key={m.href}
                        href={m.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-slate-50 transition"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{m.label}</p>
                          <p className="text-[11px] text-slate-500">{m.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Góc phải: Quản trị + Tài khoản / 2FA */}
        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              href="/quan-tri"
              className="hidden items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition sm:inline-flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Quản trị</span>
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setMoreOpen(false);
                }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pr-3 pl-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{user.full_name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-xs font-bold text-slate-900">{user.full_name}</p>
                      <p className="truncate text-[10px] text-slate-500">{user.email}</p>
                    </div>
                    <Link
                      href="/dang-nhap"
                      onClick={() => setUserMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Smartphone className="h-3.5 w-3.5 text-indigo-600" /> Bảo mật 2FA &amp; Tài khoản
                    </Link>
                    {isStaff && (
                      <Link
                        href="/quan-tri"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard Quản trị
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </Link>
          )}

          {/* Nút Menu trên điện thoại */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 md:hidden"
            aria-label="Mở menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu trượt gọn gàng trên điện thoại */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden">
          <div className="grid gap-1">
            {[...MAIN_LINKS, ...MORE_LINKS].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  pathname === item.href
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/quan-tri"
                onClick={() => setMobileOpen(false)}
                className="mt-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-sm font-bold text-white"
              >
                Mở Dashboard Quản trị
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
