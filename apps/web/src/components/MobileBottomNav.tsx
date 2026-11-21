"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Code2, Home, Radio, ShieldCheck } from "lucide-react";

const TABS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/tai-lieu", label: "Lớp 1–12", icon: BookOpen },
  { href: "/lap-trinh", label: "Lập trình", icon: Code2 },
  { href: "/lop-hoc", label: "Lớp Live", icon: Radio },
  { href: "/thi", label: "Thi thử", icon: ShieldCheck },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 pb-2 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {TABS.map((t) => {
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
