"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

/**
 * Tách biệt hoàn toàn giao diện Dashboard Quản trị (/quan-tri)
 * khỏi khung website Học sinh / Cộng đồng (Navbar + Main + Footer + MobileBottomNav).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminDashboard = pathname.startsWith("/quan-tri");
  const isExamRoom = pathname.startsWith("/thi/phong-thi");

  // Đăng ký Service Worker nhẹ để bật cài App Mobile 1 chạm trên Android & iOS
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (isAdminDashboard) {
    return <div className="min-h-screen bg-slate-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <Navbar />
      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 ${
          isExamRoom ? "" : "pb-24 md:pb-8"
        }`}
      >
        {children}
      </main>
      {!isExamRoom && (
        <div className="print:hidden">
          <Footer />
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
}
