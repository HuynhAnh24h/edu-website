"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Code2,
  Home,
  LayoutDashboard,
  MessageCircle,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isTeacher, isAdmin } = useAuth();

  const tabs = isTeacher
    ? [
        { href: "/cong-dong", label: "MXH GV", icon: Users },
        { href: "/tin-nhan", label: "Tin nhắn", icon: MessageCircle },
        { href: "/lop-hoc", label: "Lớp dạy", icon: Radio },
        { href: "/tai-lieu", label: "Lớp 1–12", icon: BookOpen },
        { href: "/quan-tri", label: "Studio", icon: LayoutDashboard },
      ]
    : isAdmin
      ? [
          { href: "/cong-dong", label: "Cộng đồng", icon: Users },
          { href: "/quan-tri", label: "Quản trị", icon: ShieldCheck },
          { href: "/tin-nhan", label: "Tin nhắn", icon: MessageCircle },
          { href: "/lop-hoc", label: "Lớp Live", icon: Radio },
          { href: "/tai-lieu", label: "Lớp 1–12", icon: BookOpen },
        ]
      : [
          { href: "/", label: "Trang chủ", icon: Home },
          { href: "/tai-lieu", label: "Lớp 1–12", icon: BookOpen },
          { href: "/cong-dong", label: "Cộng đồng", icon: Users },
          { href: "/tin-nhan", label: "Chat GV", icon: MessageCircle },
          { href: "/thi", label: "Thi thử", icon: ShieldCheck },
        ];

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 pb-2 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition ${
                active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : "stroke-[1.9]"}`} />
              <span className="truncate">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
