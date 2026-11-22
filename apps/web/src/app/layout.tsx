import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://owlie.eduk12-scale.workers.dev"),
  title: {
    default: "Owlie Edu — Học Phổ thông 1–12, Khóa học & Lập trình Miễn phí",
    template: "%s | Owlie Edu",
  },
  description:
    "Nền tảng giáo dục mở miễn phí cùng chú cú Owlie: 157+ bài giảng chuẩn Lớp 1–12, Mạng Xã Hội Giáo Viên, Chứng chỉ PDF + QR, Học bạ Số, Phụ huynh Đồng hành, AI Gia sư và 8 ngôn ngữ lập trình.",
  keywords: [
    "Owlie Edu",
    "EduK12 Open",
    "học trực tuyến miễn phí lớp 1-12",
    "ôn thi THPT 2025",
    "học lập trình miễn phí",
    "mạng xã hội giáo viên",
    "học bạ số học sinh",
    "chứng chỉ khóa học QR",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://owlie.eduk12-scale.workers.dev",
    siteName: "Owlie Edu",
    title: "Owlie Edu — Học Phổ thông 1–12, Khóa học 5 Sao & Lập trình Miễn phí",
    description:
      "157+ bài giảng chuẩn GDPT 2018, Phòng thi trắc nghiệm có phân tích điểm yếu, Học bạ Số, Phụ huynh Đồng hành & 8 ngôn ngữ lập trình chạy trực tiếp trên trình duyệt.",
    images: [
      {
        url: "/og-owlie-edu.png",
        width: 1200,
        height: 630,
        alt: "Owlie Edu — Nền tảng Học Phổ thông 1–12 & Lập trình Cộng đồng Miễn phí",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Owlie Edu — Học Phổ thông 1–12 & Lập trình Miễn phí",
    description:
      "Nền tảng giáo dục mở miễn phí cùng chú cú Owlie: tài liệu lớp 1–12, khóa học có chứng chỉ QR, học bạ số và 8 ngôn ngữ lập trình.",
    images: ["/og-owlie-edu.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Owlie Edu",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const JSON_LD_ORG = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Owlie Edu",
  url: "https://owlie.eduk12-scale.workers.dev",
  logo: "https://owlie.eduk12-scale.workers.dev/icons/icon-512.png",
  description:
    "Nền tảng giáo dục mở miễn phí cho học sinh phổ thông Lớp 1–12, Giáo viên, Phụ huynh và cộng đồng học lập trình Việt Nam.",
  sameAs: ["https://github.com/HuynhAnh24h/edu-website"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORG) }}
        />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
