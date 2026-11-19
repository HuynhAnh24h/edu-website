import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "EduK12 Scale — Nền tảng Giáo dục Lớp 1–12 & AI Gia sư",
  description:
    "Tài liệu học tập lớp 1–12, làm bài tập trực tuyến, thi trắc nghiệm chịu tải cao và AI Gia sư chuẩn chương trình GDPT 2018.",
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
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
