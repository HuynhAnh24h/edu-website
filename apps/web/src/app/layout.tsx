import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
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
    default: "Owlie Edu — Học Trực Tuyến Lớp 1–12, Luyện Thi 2025+ & Lập Trình Fullstack",
    template: "%s | Owlie Edu",
  },
  description:
    "Nền tảng EdTech chuẩn GDPT 2018: 157+ bài giảng SGK Lớp 1–12 miễn phí, AI Gia sư 24/7, Phòng thi thử phân tích điểm yếu, Học viện Lập trình 6 Cụm Fullstack, Chứng chỉ PDF+QR & gói Owlie Pro.",
  keywords: [
    "Owlie Edu",
    "học trực tuyến lớp 1-12",
    "bài giảng chuẩn GDPT 2018",
    "ôn thi THPT 2025 trắc nghiệm",
    "học lập trình Fullstack React NextJS NestJS",
    "lộ trình học lập trình từ con số 0",
    "AI gia sư giải bài tập",
    "mạng xã hội giáo viên",
    "học bạ số học sinh",
    "chứng chỉ trực tuyến có mã QR",
    "kiếm tiền affiliate giáo dục",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://owlie.eduk12-scale.workers.dev",
    siteName: "Owlie Edu",
    title: "Owlie Edu — Học Phổ thông 1–12, Luyện Thi 2025+ & Lập Trình 6 Cụm Fullstack",
    description:
      "157+ bài giảng chuẩn GDPT 2018 miễn phí, AI Gia sư Socratic 24/7, Phòng thi thử phân tích điểm yếu, Chứng chỉ PDF+QR, Góc Phụ huynh & Học viện Lập trình thực chiến.",
    images: [
      {
        url: "/og-owlie-edu.png",
        width: 1200,
        height: 630,
        alt: "Owlie Edu — Nền tảng Học Phổ thông 1–12 & Lập trình Fullstack Hiện đại",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Owlie Edu — Học Phổ thông 1–12 & Lập Trình Fullstack",
    description:
      "Nền tảng EdTech chuẩn GDPT 2018: kho bài giảng Lớp 1–12, AI Gia sư, phòng thi thử 2025+, chứng chỉ QR và 6 cụm lập trình chấm test tự động.",
    images: ["/og-owlie-edu.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
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

const JSON_LD_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://owlie.eduk12-scale.workers.dev/#organization",
      name: "Owlie Edu",
      url: "https://owlie.eduk12-scale.workers.dev",
      logo: "https://owlie.eduk12-scale.workers.dev/icons/icon-512.png",
      description:
        "Nền tảng giáo dục trực tuyến chuẩn GDPT 2018 cho học sinh Lớp 1–12, Giáo viên, Phụ huynh và Học viện Lập trình 6 Cụm Fullstack tại Việt Nam.",
      sameAs: ["https://github.com/HuynhAnh24h/edu-website"],
    },
    {
      "@type": "WebSite",
      "@id": "https://owlie.eduk12-scale.workers.dev/#website",
      url: "https://owlie.eduk12-scale.workers.dev",
      name: "Owlie Edu",
      inLanguage: "vi-VN",
      publisher: { "@id": "https://owlie.eduk12-scale.workers.dev/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://owlie.eduk12-scale.workers.dev/tai-lieu/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://owlie.eduk12-scale.workers.dev/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Học bài giảng Lớp 1–12 trên Owlie Edu có mất phí không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kho 157+ bài giảng chuẩn chương trình GDPT 2018 (Kết nối tri thức, Chân trời sáng tạo, Cánh diều), Học bạ Số và Góc Phụ huynh Đồng hành đều miễn phí 0đ trọn đời. Bạn chỉ cần nâng cấp Owlie Pro nếu muốn mở khóa AI Gia sư không giới hạn, bộ đề chuyên sâu và dự án Fullstack nâng cao.",
          },
        },
        {
          "@type": "Question",
          name: "Phòng thi trắc nghiệm trên Owlie Edu có theo cấu trúc Bộ GD&ĐT 2025+ không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Có. Hệ thống hỗ trợ đầy đủ 4 định dạng mới gồm Trắc nghiệm 1 đáp án, Nhiều đáp án, Đúng/Sai 4 mệnh đề và Trả lời ngắn. Sau khi nộp bài, hệ thống tự chấm điểm, phân tích điểm yếu theo chuyên đề và gợi ý bài giảng cần ôn lại.",
          },
        },
        {
          "@type": "Question",
          name: "Lộ trình học lập trình trên Owlie Edu gồm những công nghệ nào?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Học viện Lập trình chia theo 6 cụm công nghệ chuẩn F8: HTML & CSS, JavaScript & TypeScript, React & Next.js, Node.js & NestJS, Golang & Python, và MongoDB & PostgreSQL với hệ thống chấm test tự động ngay trên trình duyệt.",
          },
        },
        {
          "@type": "Question",
          name: "Thanh toán nâng cấp Owlie Pro bằng cách nào? Có mã giảm giá không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Bạn có thể thanh toán trực tiếp qua mã VietQR bằng mọi ứng dụng ngân hàng Việt Nam tại trang Bảng giá. Nhập mã OWLIE50 để giảm 50% hoặc KHAIGIANG20 để giảm 20% ngay lập tức.",
          },
        },
        {
          "@type": "Question",
          name: "Làm thế nào để kiếm tiền cùng Owlie Edu?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Có 2 cách kiếm tiền minh bạch: (1) Tham gia Owlie Affiliate chia sẻ link giới thiệu để nhận 20% hoa hồng mỗi đơn nâng cấp Pro, hoặc (2) Đăng ký làm Giáo viên Creator mở khóa học & bán tài liệu và giữ tới 85% doanh thu.",
          },
        },
      ],
    },
  ],
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_GRAPH) }}
        />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
