"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Code2, Download, ExternalLink, Heart, Mail, Radio, ShieldCheck } from "lucide-react";
import { CuBongLogoMark } from "@/components/BrandLogo";
import { CORE_API_URL } from "@/lib/api";

export function Footer() {
  const [subEmail, setSubEmail] = useState("");
  const [subMsg, setSubMsg] = useState("");
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubLoading(true);
    setSubMsg("");
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail, source: "footer" }),
      });
      const d = await res.json();
      if (res.ok) {
        setSubEmail("");
        setSubMsg(d.message || "Đăng ký nhận tin thành công!");
      } else {
        setSubMsg(d.error || "Email chưa hợp lệ");
      }
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Cột 1: Thương hiệu Logo chú cú Owlie & Sứ mệnh Cộng đồng */}
          <div className="space-y-4 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <CuBongLogoMark className="h-11 w-11 shadow-md" />
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white">
                  Owlie <span className="text-indigo-400">Edu</span>
                </span>
                <p className="text-xs font-medium text-slate-400">
                  Học Phổ thông 1–12 &amp; Lập trình Cộng đồng
                </p>
              </div>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Nền tảng giáo dục mở hoàn toàn miễn phí cho học sinh, sinh viên và giáo viên Việt Nam — kết hợp chương trình chuẩn GDPT 2018, Phòng học Livestream 0đ, AI Gia sư Socratic và Học viện Lập trình thực chiến ngay trên trình duyệt.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tai-app"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
              >
                <Download className="h-3.5 w-3.5" /> Tải App Android &amp; iOS tại đây
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Miễn phí 24/7
              </span>
            </div>

            {/* Đăng ký nhận tin Khai giảng & Ưu đãi */}
            <form onSubmit={handleSubscribe} className="max-w-sm space-y-1.5 pt-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <Mail className="h-3.5 w-3.5 text-amber-400" /> Nhận tin Khai giảng Khóa mới &amp; Ưu đãi
              </p>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Nhập Email của bạn..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={subLoading}
                  className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  {subLoading ? "..." : "Đăng ký"}
                </button>
              </div>
              {subMsg && <p className="text-[11px] font-semibold text-emerald-300">{subMsg}</p>}
            </form>
          </div>

          {/* Cột 2: Giáo dục Phổ thông 1-12 */}
          <div className="space-y-3 lg:col-span-2">
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              Phổ thông 1–12
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/khoa-hoc" className="font-semibold text-amber-300 hover:text-white transition">
                  Khóa học Trực tuyến &amp; Đánh giá 5★
                </Link>
              </li>
              <li>
                <Link href="/tai-lieu" className="hover:text-white transition">
                  Kho Tài liệu GDPT 2018
                </Link>
              </li>
              <li>
                <Link href="/bai-tap" className="hover:text-white transition">
                  Bài tập 4 dạng 2025+
                </Link>
              </li>
              <li>
                <Link href="/thi" className="hover:text-white transition">
                  Thi trắc nghiệm Online
                </Link>
              </li>
              <li>
                <Link href="/ai-gia-su" className="hover:text-white transition">
                  AI Gia sư Socratic 24/7
                </Link>
              </li>
              <li>
                <Link href="/lop-hoc" className="hover:text-white transition">
                  Đăng ký Lớp học &amp; Live
                </Link>
              </li>
              <li>
                <Link href="/hoc-ba" className="hover:text-white transition">
                  Học bạ Số &amp; Hồ sơ Năng lực
                </Link>
              </li>
              <li>
                <Link href="/chung-chi" className="hover:text-white transition">
                  Chứng chỉ PDF &amp; Xác thực QR
                </Link>
              </li>
              <li>
                <Link href="/phu-huynh" className="font-semibold text-emerald-300 hover:text-white transition">
                  Chế độ Phụ huynh Đồng hành
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Học viện Lập trình Cộng đồng */}
          <div className="space-y-3 lg:col-span-3">
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
              Lập trình trên Trình duyệt
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400">
              <Link href="/lap-trinh?track=html" className="hover:text-white transition">
                HTML5 Cấu trúc
              </Link>
              <Link href="/lap-trinh?track=css" className="hover:text-white transition">
                CSS3 Hiện đại
              </Link>
              <Link href="/lap-trinh?track=javascript" className="hover:text-white transition">
                JavaScript ES6+
              </Link>
              <Link href="/lap-trinh?track=typescript" className="hover:text-white transition">
                TypeScript
              </Link>
              <Link href="/lap-trinh?track=python" className="hover:text-white transition">
                Lập trình Python
              </Link>
              <Link href="/lap-trinh?track=golang" className="hover:text-white transition">
                Lập trình Golang
              </Link>
              <Link href="/lap-trinh?track=mongodb" className="hover:text-white transition">
                MongoDB NoSQL
              </Link>
              <Link href="/lap-trinh?track=postgresql" className="hover:text-white transition">
                PostgreSQL SQL
              </Link>
            </div>
          </div>

          {/* Cột 4: Giáo viên, Bảo mật & Cộng đồng */}
          <div className="space-y-3 lg:col-span-3">
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Hệ thống &amp; Cộng đồng
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/cong-dong" className="font-semibold text-emerald-300 hover:text-white transition">
                  Mạng Xã Hội Giáo Viên (Chia sẻ giáo án)
                </Link>
              </li>
              <li>
                <Link href="/dang-nhap" className="hover:text-white transition">
                  Đăng nhập (Google / Facebook / Email)
                </Link>
              </li>
              <li>
                <Link href="/dang-nhap" className="hover:text-white transition">
                  Cài đặt Bảo mật 2 lớp (2FA)
                </Link>
              </li>
              <li>
                <Link href="/quan-tri" className="inline-flex items-center gap-1 hover:text-white transition">
                  <Radio className="h-3 w-3 text-rose-400" /> Studio Giáo viên &amp; Quản trị
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/HuynhAnh24h/edu-website"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-300 hover:text-white transition"
                >
                  Mã nguồn Cộng đồng GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Thanh bản quyền dưới cùng */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-6 text-xs text-slate-500 sm:flex-row">
          <p className="flex items-center gap-1.5">
            © {new Date().getFullYear()} <strong className="text-slate-300">Owlie Edu</strong> — Xây dựng với
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> cho cộng đồng học tập Việt Nam.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-400">
            <Link href="/chinh-sach-bao-mat" className="hover:text-white transition">
              Chính sách bảo mật
            </Link>
            <span>•</span>
            <Link href="/dieu-khoan" className="hover:text-white transition">
              Điều khoản sử dụng
            </Link>
            <span>•</span>
            <Link href="/tai-app" className="hover:text-white transition">
              Tải App Mobile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
