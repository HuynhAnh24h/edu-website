import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "EduK12 Open — Nền tảng Học tập Phổ thông 1–12 & Lập trình Cộng đồng",
  description:
    "Tài liệu học tập lớp 1–12 chuẩn GDPT 2018, lớp học trực tuyến, thi trắc nghiệm, AI Gia sư và 8 khóa học lập trình thực hành ngay trên trình duyệt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
