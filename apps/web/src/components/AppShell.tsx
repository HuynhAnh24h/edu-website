"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { MascotGuide } from "@/components/MascotGuide";

/**
 * Tách biệt giao diện Dashboard Quản trị (/quan-tri) khỏi khung Navbar Học sinh,
 * nhưng vẫn cho phép Linh thú Cú Bông Edu bay hướng dẫn giáo viên mới đăng ký!
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminDashboard = pathname.startsWith("/quan-tri");

  if (isAdminDashboard) {
    return (
      <div className="min-h-screen bg-slate-100">
        {children}
        <MascotGuide />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <MascotGuide />
    </>
  );
}
