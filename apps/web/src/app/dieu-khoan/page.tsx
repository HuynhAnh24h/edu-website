import Link from "next/link";
import { FileText } from "lucide-react";

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
      <div className="space-y-2 border-b border-slate-100 pb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          <FileText className="h-3.5 w-3.5" /> Điều khoản Cộng đồng
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Điều khoản Sử dụng — EduK12 Open
        </h1>
        <p className="text-xs text-slate-500">Cập nhật lần cuối: 2026</p>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">1. Nền tảng giáo dục cộng đồng miễn phí</h2>
          <p>
            EduK12 Open cung cấp tài liệu học tập Phổ thông Lớp 1–12, lớp học trực tuyến, thi trắc nghiệm và thực hành lập trình phục vụ mục đích học tập và giảng dạy phi lợi nhuận cho cộng đồng.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">2. Quy tắc ứng xử trong Lớp học &amp; Live Chat</h2>
          <p>
            Người dùng cam kết tôn trọng giáo viên và học viên khác, không gửi nội dung phản cảm, spam hoặc cố tình phá hoại hệ thống thi trực tuyến. Tài khoản vi phạm có thể bị khóa bởi Quản trị viên.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">3. Trách nhiệm bảo mật tài khoản</h2>
          <p>
            Người dùng chịu trách nhiệm bảo vệ mật khẩu và mã bảo mật 2 lớp (2FA) của mình. Không chia sẻ tài khoản giáo viên hoặc quản trị cho người khác.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-xs font-bold text-indigo-600">
        <Link href="/chinh-sach-bao-mat" className="hover:underline">
          Xem Chính sách Bảo mật →
        </Link>
        <Link href="/" className="hover:underline">
          Về Trang chủ →
        </Link>
      </div>
    </div>
  );
}
