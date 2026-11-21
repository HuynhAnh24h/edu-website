"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

/**
 * Tách biệt hoàn toàn giao diện Dashboard Quản trị (/quan-tri)
 * khỏi khung website Học sinh / Cộng đồng.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminDashboard = pathname.startsWith("/quan-tri");

  if (isAdminDashboard) {
    return <div className="min-h-screen bg-slate-100">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </>
  );
}
