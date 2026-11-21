"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bot,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  School,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: GraduationCap },
  { href: "/tai-lieu", label: "Tài liệu 1–12", icon: BookOpen },
  { href: "/lop-hoc", label: "Lớp học", icon: School },
  { href: "/bai-tap", label: "Bài tập", icon: CheckSquare },
  { href: "/thi", label: "Thi trắc nghiệm", icon: ShieldCheck },
  { href: "/ai-gia-su", label: "AI Gia sư", icon: Bot },
];

const ROLE_LABEL: Record<string, { text: string; cls: string }> = {
  super_admin: { text: "Admin", cls: "bg-rose-100 text-rose-700" },
  content_admin: { text: "Biên tập", cls: "bg-amber-100 text-amber-700" },
  teacher: { text: "Giáo viên", cls: "bg-emerald-100 text-emerald-700" },
  student: { text: "Học sinh", cls: "bg-indigo-100 text-indigo-700" },
  parent: { text: "Phụ huynh", cls: "bg-slate-100 text-slate-700" },
};

export function Navbar() {
  const pathname = usePathname();
  const { user, isStaff, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight text-slate-900">
              EduK12 <span className="text-indigo-600">Scale</span>
            </span>
            <p className="text-[11px] font-medium text-slate-500 leading-none">
              PGVector • Redis • Kafka
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isStaff && (
            <Link
              href="/quan-tri"
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                pathname.startsWith("/quan-tri")
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Quản trị CMS</span>
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user.full_name}
                </p>
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    ROLE_LABEL[user.role]?.cls || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ROLE_LABEL[user.role]?.text || user.role}
                  {user.current_grade ? ` • Lớp ${user.current_grade}` : ""}
                </span>
              </div>
              <button
                onClick={() => void logout()}
                title="Đăng xuất"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          ) : (
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
