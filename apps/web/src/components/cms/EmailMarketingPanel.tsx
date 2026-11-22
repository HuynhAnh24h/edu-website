"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Gift,
  Mail,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface MailHostPayload {
  mail_host: {
    active_provider: "brevo" | "resend" | "none";
    brevo_configured: boolean;
    resend_configured: boolean;
    sender_email: string;
  };
  audience_counts: {
    all: number;
    student: number;
    teacher: number;
    parent: number;
    newsletter: number;
  };
  campaigns: {
    id: string;
    title: string;
    subject: string;
    audience_role: string;
    template_type: string;
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    provider_used: string;
    status: string;
    created_by: string;
    created_at: string;
  }[];
  subscribers: {
    email: string;
    full_name: string;
    source: string;
    subscribed_at: string;
  }[];
}

const PRESET_TEMPLATES = [
  {
    id: "course_launch" as const,
    label: "🎓 Khai giảng Khóa học mới",
    accent: "bg-indigo-600",
    light: "bg-indigo-50 border-indigo-300 text-indigo-800",
    defaultTitle: "Khai giảng Khóa học Lập trình Fullstack (React, Next.js & NestJS)",
    defaultSubject: "[Owlie Edu] Khai giảng Khóa học mới — Đăng ký học miễn phí hôm nay!",
    defaultBadge: "Khai giảng tuần này • Hoàn thành cấp Chứng chỉ PDF + Mã QR",
    defaultBody:
      "Chào bạn học viên Owlie Edu,\nChúng tôi vừa chính thức mở khóa học thực chiến mới kèm hệ thống chấm test tự động ngay trên trình duyệt.\nLộ trình chia rõ theo từng cụm: HTML & CSS → JS & TS → React & Next.js → Node.js & NestJS → MongoDB & PostgreSQL.\nHãy đăng nhập sớm để giữ chỗ trong lớp Live cùng thầy cô nhé!",
    defaultCtaLabel: "Vào xem Khóa học ngay",
    defaultCtaUrl: "/khoa-hoc",
  },
  {
    id: "discount_promo" as const,
    label: "🎁 Chương trình Giảm giá / Học bổng",
    accent: "bg-rose-600",
    light: "bg-rose-50 border-rose-300 text-rose-800",
    defaultTitle: "Ưu đãi Học bổng Mùa thi — Giảm 50% Gói Luyện đề Chuyên sâu",
    defaultSubject: "[Owlie Edu] Ưu đãi đặc biệt: Học bổng & Quà tặng Mùa thi 2026!",
    defaultBadge: "MÃ ƯU ĐÃI: OWLIE50 • Áp dụng đến hết Chủ Nhật tuần này",
    defaultBody:
      "Thân gửi Quý Phụ huynh và các em học sinh,\nNhân dịp khai giảng đợt ôn thi mới, Owlie Edu dành tặng chương trình ưu đãi đặc biệt cùng bộ đề thi thử có phân tích điểm yếu tự động.\nNhập mã OWLIE50 hoặc đăng ký ngay hôm nay để nhận trọn bộ tài liệu ôn tập và hỗ trợ 1-1 từ thầy cô Tích xanh!",
    defaultCtaLabel: "Nhận Ưu đãi ngay",
    defaultCtaUrl: "/khoa-hoc",
  },
  {
    id: "exam_event" as const,
    label: "📢 Mở Kỳ thi thử & Sự kiện",
    accent: "bg-emerald-600",
    light: "bg-emerald-50 border-emerald-300 text-emerald-800",
    defaultTitle: "Mở Phòng Thi thử Trắc nghiệm Toàn quốc chuẩn cấu trúc 2025+",
    defaultSubject: "[Owlie Edu] Lịch mở Phòng Thi thử & Phân tích Điểm yếu tự động",
    defaultBadge: "Mở cửa Miễn phí 100% • Chấm điểm & Gợi ý bài ôn lại ngay lập tức",
    defaultBody:
      "Chào các em học sinh Lớp 1–12,\nPhòng thi thử trắc nghiệm chuẩn cấu trúc mới (Trắc nghiệm, Đúng/Sai 2025+, Trả lời ngắn) đã chính thức mở khóa.\nNgay sau khi nộp bài, hệ thống sẽ vẽ biểu đồ điểm yếu theo từng chuyên đề và tự lưu kết quả vào Học bạ Số cho phụ huynh theo dõi!",
    defaultCtaLabel: "Vào Phòng Thi ngay",
    defaultCtaUrl: "/thi",
  },
];

function fmtDate(iso: string) {
  try {
    return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export function EmailMarketingPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
}) {
  const [data, setData] = useState<MailHostPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Test mail state
  const [testEmail, setTestEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("Owlie Edu <huynhanh4096it@gmail.com>");
  const [sendingTest, setSendingTest] = useState(false);

  // Campaign composer state
  const [templateType, setTemplateType] = useState<"course_launch" | "discount_promo" | "exam_event">("course_launch");
  const [audienceRole, setAudienceRole] = useState<"all" | "student" | "teacher" | "parent" | "newsletter" | "custom">("all");
  const [customEmails, setCustomEmails] = useState("");
  const [title, setTitle] = useState(PRESET_TEMPLATES[0].defaultTitle);
  const [subject, setSubject] = useState(PRESET_TEMPLATES[0].defaultSubject);
  const [highlightBadge, setHighlightBadge] = useState(PRESET_TEMPLATES[0].defaultBadge);
  const [bodyText, setBodyText] = useState(PRESET_TEMPLATES[0].defaultBody);
  const [ctaLabel, setCtaLabel] = useState(PRESET_TEMPLATES[0].defaultCtaLabel);
  const [ctaUrl, setCtaUrl] = useState(PRESET_TEMPLATES[0].defaultCtaUrl);
  const [sendingCamp, setSendingCamp] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/mail/campaigns`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = (await res.json()) as MailHostPayload;
        setData(d);
        if (d.mail_host?.sender_email) setSenderEmail(d.mail_host.sender_email);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const applyPreset = (presetId: "course_launch" | "discount_promo" | "exam_event") => {
    const p = PRESET_TEMPLATES.find((x) => x.id === presetId) || PRESET_TEMPLATES[0];
    setTemplateType(p.id);
    setTitle(p.defaultTitle);
    setSubject(p.defaultSubject);
    setHighlightBadge(p.defaultBadge);
    setBodyText(p.defaultBody);
    setCtaLabel(p.defaultCtaLabel);
    setCtaUrl(p.defaultCtaUrl);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !testEmail.trim()) return;
    setSendingTest(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/mail/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ to_email: testEmail, sender_email: senderEmail }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        onToast("err", d.error || "Chưa gửi được email thử nghiệm");
      } else {
        onToast("ok", d.message || "Đã gửi email thử nghiệm thành công!");
      }
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSendingCamp(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/mail/campaigns/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          subject,
          audience_role: audienceRole,
          custom_emails: customEmails,
          template_type: templateType,
          highlight_badge: highlightBadge,
          body_text: bodyText,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          sender_email: senderEmail,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể gửi chiến dịch Email");
      } else {
        onToast(d.ok ? "ok" : "err", d.message || "Đã xử lý chiến dịch Email!");
        void loadData();
      }
    } finally {
      setSendingCamp(false);
    }
  };

  const currentPreset = PRESET_TEMPLATES.find((p) => p.id === templateType) || PRESET_TEMPLATES[0];
  const hostConnected = Boolean(data?.mail_host?.brevo_configured || data?.mail_host?.resend_configured);

  return (
    <div className="space-y-6">
      {/* 1. TRẠNG THÁI HOST MAIL MIỄN PHÍ + HƯỚNG DẪN KẾT NỐI 2 PHÚT */}
      <div
        className={`rounded-2xl border p-5 shadow-xs space-y-4 ${
          hostConnected
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-amber-200 bg-amber-50/50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                hostConnected ? "bg-emerald-600 text-white" : "bg-amber-500 text-slate-950"
              }`}
            >
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Trung tâm Host Mail Owlie Edu (Khai giảng • Giảm giá • Quên mật khẩu)
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                    hostConnected
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {data?.mail_host?.brevo_configured
                    ? "ĐANG CHẠY: BREVO (300 thư/ngày FREE)"
                    : data?.mail_host?.resend_configured
                      ? "ĐANG CHẠY: RESEND (3.000 thư/tháng FREE)"
                      : "CHƯA GẮN KHÓA HOST MAIL"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Hỗ trợ sẵn 2 Host Mail miễn phí 0đ tốt nhất: <strong>Brevo</strong> (9.000 thư/tháng — gửi trực tiếp từ Gmail cá nhân mà <strong>chưa cần mua tên miền</strong>) và <strong>Resend</strong> (3.000 thư/tháng).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Kiểm tra trạng thái
          </button>
        </div>

        {/* Form gửi thử 1 Email + Địa chỉ From */}
        <form onSubmit={handleSendTest} className="grid gap-3 rounded-xl border border-white bg-white/90 p-3.5 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600">Email người gửi (From — khớp Email đăng ký Brevo/Resend)</label>
            <input
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="Owlie Edu <huynhanh4096it@gmail.com>"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600">Gửi thư test kiểm tra Host Mail tới:</label>
            <input
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="nhap-gmail-cua-ban@gmail.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex items-end md:col-span-3">
            <button
              type="submit"
              disabled={sendingTest}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-extrabold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sendingTest ? "Đang gửi..." : "Gửi Email Test"}
            </button>
          </div>
        </form>

        {!hostConnected && (
          <div className="rounded-xl border border-amber-200 bg-white p-4 text-xs text-slate-700 space-y-1.5">
            <p className="font-extrabold text-amber-900">
              Cách bật Host Mail miễn phí trong 2 phút (Khuyên dùng Brevo — 300 thư/ngày 0đ, dùng ngay bằng Gmail!):
            </p>
            <ol className="list-decimal space-y-1 pl-4 leading-relaxed">
              <li>
                Đăng ký miễn phí tại <strong>brevo.com</strong> bằng Gmail của bạn → vào <strong>SMTP &amp; API → API Keys → Generate a new API key</strong> (lấy mã bắt đầu bằng <code>xkeysib-...</code>).
              </li>
              <li>
                Vào <strong>Cloudflare Dashboard → Workers &amp; Pages → owlie → Settings → Runtime variables and secrets → + Add</strong> → chọn <strong>Type: Secret</strong>:
                <span className="ml-1 font-mono font-bold text-indigo-700">BREVO_API_KEY</span> = dán mã vừa tạo → bấm <strong>Deploy</strong>.
              </li>
              <li>Quay lại đây bấm <strong>Gửi Email Test</strong> là thư Khai giảng / Giảm giá / Quên mật khẩu bay thẳng vào hộp thư thật!</li>
            </ol>
          </div>
        )}
      </div>

      {/* 2. TRÌNH SOẠN CHIẾN DỊCH EMAIL + XEM TRƯỚC GIAO DIỆN GMAIL THẬT */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <form
          onSubmit={handleSendCampaign}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Megaphone className="h-4 w-4 text-indigo-600" />
              Soạn &amp; Gửi Chiến dịch Email Marketing
            </h3>
            <span className="text-[11px] font-bold text-slate-500">Chọn mẫu có sẵn hoặc tự soạn</span>
          </div>

          {/* 3 Mẫu chiến dịch 1 chạm */}
          <div className="grid gap-2 sm:grid-cols-3">
            {PRESET_TEMPLATES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-extrabold transition ${
                  templateType === p.id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Nhóm người nhận */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">Gửi tới nhóm đối tượng</label>
              <select
                value={audienceRole}
                onChange={(e) => setAudienceRole(e.target.value as typeof audienceRole)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold"
              >
                <option value="all">
                  Tất cả Thành viên &amp; Người đăng ký tin ({(data?.audience_counts.all || 0) + (data?.audience_counts.newsletter || 0)} email)
                </option>
                <option value="student">Chỉ Học sinh ({data?.audience_counts.student || 0} email)</option>
                <option value="teacher">Chỉ Giáo viên ({data?.audience_counts.teacher || 0} email)</option>
                <option value="parent">Chỉ Phụ huynh ({data?.audience_counts.parent || 0} email)</option>
                <option value="newsletter">Danh sách đăng ký nhận tin Footer ({data?.audience_counts.newsletter || 0} email)</option>
                <option value="custom">Nhập danh sách Email tùy chỉnh...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Khung nổi bật (Mã giảm giá / Lịch khai giảng)</label>
              <input
                value={highlightBadge}
                onChange={(e) => setHighlightBadge(e.target.value)}
                placeholder="VD: MÃ GIẢM GIÁ OWLIE50 • Khai giảng 20:00 tối nay"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold"
              />
            </div>
          </div>

          {audienceRole === "custom" && (
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Danh sách Email nhận (cách nhau bằng dấu phẩy hoặc xuống dòng)
              </label>
              <textarea
                required
                rows={2}
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="email1@gmail.com, email2@gmail.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700">Tiêu đề hộp thư (Subject hiển thị trong Gmail)</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Tiêu đề lớn trên Banner Email</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-extrabold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Nội dung thư (mỗi dòng là 1 đoạn văn đẹp mắt)</label>
            <textarea
              required
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs leading-relaxed"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">Chữ trên nút bấm (CTA)</label>
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="VD: Đăng ký khóa học ngay"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Đường dẫn đích khi bấm nút</label>
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/khoa-hoc hoặc /lap-trinh"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sendingCamp}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
            {sendingCamp ? "Đang gửi hàng loạt..." : "Gửi Chiến dịch Email ngay"}
          </button>
        </form>

        {/* XEM TRƯỚC EMAIL TRỰC TIẾP (LIVE GMAIL PREVIEW) */}
        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 space-y-3 lg:col-span-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Xem trước hiển thị trong Gmail
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
              Responsive Mobile
            </span>
          </div>

          <div className="rounded-xl bg-white px-3.5 py-2 text-[11px] text-slate-600 shadow-2xs">
            <p>
              <strong>Từ:</strong> {senderEmail}
            </p>
            <p className="truncate">
              <strong>Tiêu đề:</strong> {subject || title}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
            <div className={`${currentPreset.accent} p-5 text-white`}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">
                🦉 OWLIE EDU • {templateType === "discount_promo" ? "ƯU ĐÃI & HỌC BỔNG" : templateType === "exam_event" ? "KỲ THI & SỰ KIỆN" : "KHAI GIẢNG KHÓA HỌC"}
              </p>
              <h4 className="mt-1.5 text-base font-black leading-snug">{title || "Tiêu đề Email"}</h4>
            </div>

            <div className="p-5 space-y-3.5">
              {highlightBadge && (
                <div className={`rounded-xl border border-dashed p-3 text-center text-xs font-extrabold ${currentPreset.light}`}>
                  ✨ {highlightBadge}
                </div>
              )}

              <div className="space-y-2 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {bodyText}
              </div>

              {ctaLabel && (
                <div className="pt-2 text-center">
                  <span className={`inline-block rounded-xl px-5 py-2.5 text-xs font-extrabold text-white ${currentPreset.accent}`}>
                    {ctaLabel} →
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-[10px] text-slate-500">
              <strong>Owlie Edu</strong> — owlie.eduk12-scale.workers.dev
            </div>
          </div>
        </div>
      </div>

      {/* 3. LỊCH SỬ CHIẾN DỊCH & DANH SÁCH NGƯỜI ĐĂNG KÝ NHẬN TIN */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 lg:col-span-8">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Gift className="h-4 w-4 text-rose-500" /> Lịch sử Chiến dịch Email đã tạo ({data?.campaigns.length || 0})
          </h3>
          {!data?.campaigns.length ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">
              Chưa có chiến dịch nào. Hãy soạn thư khai giảng khóa học hoặc ưu đãi đầu tiên ở trên!
            </p>
          ) : (
            <div className="space-y-2">
              {data.campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900">{c.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Nhóm: <strong>{c.audience_role}</strong> • {fmtDate(c.created_at)} • Bởi {c.created_by}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        c.status === "sent"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "saved_draft_no_key"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {c.status === "sent"
                        ? `Đã gửi ${c.sent_count}/${c.recipient_count} (${c.provider_used})`
                        : c.status === "saved_draft_no_key"
                          ? `Bản nháp (${c.recipient_count} người • Chưa gắn Key)`
                          : `Lỗi gửi (${c.failed_count})`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 lg:col-span-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users className="h-4 w-4 text-emerald-600" /> Khách đăng ký Nhận tin ({data?.subscribers.length || 0})
          </h3>
          {!data?.subscribers.length ? (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
              Khách ghé thăm đăng ký email ở chân trang sẽ tự động xuất hiện tại đây!
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {data.subscribers.map((s) => (
                <div key={s.email} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                  <span className="truncate font-bold text-slate-800">{s.email}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
