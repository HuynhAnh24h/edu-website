import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng giá Owlie Pro, VietQR & Kiếm tiền Affiliate 20%",
  description:
    "Nâng cấp gói Owlie Pro từ 99.000đ/tháng qua VietQR 24/7: mở khóa AI Gia sư không giới hạn, đề thi THPT 2025+, 6 Cụm Lập trình Fullstack, Chứng chỉ QR & nhận hoa hồng Affiliate 20%.",
  alternates: {
    canonical: "/bang-gia/",
  },
  openGraph: {
    title: "Bảng giá Owlie Pro & Chương trình Kiếm tiền Affiliate 20% | Owlie Edu",
    description:
      "Học bài giảng SGK 1–12 miễn phí 0đ mãi mãi. Nâng cấp Owlie Pro thanh toán VietQR tự động, hỗ trợ mã giảm giá OWLIE50 giảm 50%.",
    url: "https://owlie.eduk12-scale.workers.dev/bang-gia/",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
