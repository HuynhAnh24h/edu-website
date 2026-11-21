import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
      <div className="space-y-2 border-b border-slate-100 pb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Chính sách Bảo mật &amp; Quyền riêng tư
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Chính sách Bảo mật — EduK12 Open (Web, Android &amp; iOS)
        </h1>
        <p className="text-xs text-slate-500">Cập nhật lần cuối: 2026</p>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">1. Dữ liệu chúng tôi thu thập</h2>
          <p>
            Khi bạn đăng ký và sử dụng EduK12 Open (trên website hoặc ứng dụng di động Android/iOS), chúng tôi chỉ thu thập thông tin tối thiểu phục vụ học tập: Họ tên, Email, Khối lớp (tùy chọn), kết quả bài kiểm tra, tiến độ học lập trình và lịch sử tham gia lớp học.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">2. Mục đích sử dụng dữ liệu</h2>
          <p>
            Dữ liệu chỉ được dùng để đồng bộ tiến độ học tập giữa Web và Mobile, chấm điểm bài kiểm tra, điểm danh lớp học trực tuyến và bảo vệ tài khoản (xác thực 2 lớp 2FA). Chúng tôi <strong>không bán, không chia sẻ dữ liệu cá nhân</strong> cho bên quảng cáo thứ ba.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">3. Bảo mật tài khoản</h2>
          <p>
            Mật khẩu được mã hóa một chiều an toàn, hỗ trợ xác thực 2 lớp (Google Authenticator) và mọi kết nối giữa ứng dụng và máy chủ đều truyền qua giao thức HTTPS được mã hóa.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">4. Quyền tự Xóa tài khoản &amp; Dữ liệu</h2>
          <p>
            Người dùng có toàn quyền xóa vĩnh viễn tài khoản và toàn bộ dữ liệu học tập bất cứ lúc nào ngay trong mục <strong>Tài khoản → Xóa tài khoản vĩnh viễn</strong> trên ứng dụng EduK12 Open (Android/iOS) hoặc liên hệ quản trị viên qua email hỗ trợ.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-xs font-bold text-indigo-600">
        <Link href="/dieu-khoan" className="hover:underline">
          Xem Điều khoản Sử dụng →
        </Link>
        <Link href="/tai-app" className="hover:underline">
          Quay lại trang Tải App →
        </Link>
      </div>
    </div>
  );
}
