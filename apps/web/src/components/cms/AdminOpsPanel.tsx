"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock,
  DatabaseBackup,
  Download,
  Globe,
  History,
  Mail,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface AuditLogRow {
  id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  summary: string;
  ip_address: string;
  created_at: string;
}

interface BackupRow {
  id: string;
  backup_code: string;
  trigger_type: "manual" | "cron_daily";
  actor_name: string;
  tables_summary: Record<string, number>;
  size_bytes: number;
  created_at: string;
}

interface DomainEmailConfig {
  custom_domain: string;
  sender_email: string;
  seo_title: string;
  seo_description: string;
  current_worker_url: string;
  resend_configured: boolean;
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export function AdminOpsPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<"audit" | "backup" | "domain" | "push">("audit");
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [cronSchedule, setCronSchedule] = useState("02:00 sáng hàng ngày");
  const [config, setConfig] = useState<DomainEmailConfig | null>(null);
  const [pushDevices, setPushDevices] = useState(0);

  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Form Domain/Email/SEO
  const [customDomain, setCustomDomain] = useState("owlie.vn");
  const [senderEmail, setSenderEmail] = useState("Owlie Edu <noreply@owlie.vn>");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  // Form Push Broadcast
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcLink, setBcLink] = useState("/khoa-hoc");
  const [sendingBc, setSendingBc] = useState(false);

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [lRes, bRes, cRes, pRes] = await Promise.all([
        fetch(`${CORE_API_URL}/api/v1/admin/audit-logs`, { headers }),
        fetch(`${CORE_API_URL}/api/v1/admin/backups`, { headers }),
        fetch(`${CORE_API_URL}/api/v1/admin/domain-email-config`, { headers }),
        fetch(`${CORE_API_URL}/api/v1/push/status`, { headers }),
      ]);
      if (lRes.ok) {
        const d = await lRes.json();
        setLogs(d.logs || []);
      }
      if (bRes.ok) {
        const d = await bRes.json();
        setBackups(d.backups || []);
        if (d.cron_schedule) setCronSchedule(d.cron_schedule);
      }
      if (cRes.ok) {
        const d = (await cRes.json()) as DomainEmailConfig;
        setConfig(d);
        setCustomDomain(d.custom_domain || "owlie.vn");
        setSenderEmail(d.sender_email || "Owlie Edu <noreply@owlie.vn>");
        setSeoTitle(d.seo_title || "");
        setSeoDesc(d.seo_description || "");
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPushDevices(Number(d.total_subscribed_devices || 0));
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleRunBackup = async () => {
    if (!accessToken) return;
    setRunningBackup(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/backups/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (!res.ok) onToast("err", d.error || "Không thể sao lưu dữ liệu");
      else {
        onToast("ok", d.message || "Đã tạo bản sao lưu hệ thống!");
        void loadAll();
      }
    } finally {
      setRunningBackup(false);
    }
  };

  const handleDownloadBackup = async (bkp: BackupRow) => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/backups/${encodeURIComponent(bkp.id)}/download`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      onToast("err", d.error || "Không thể tải tệp sao lưu");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bkp.backup_code}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/domain-email-config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          custom_domain: customDomain,
          sender_email: senderEmail,
          seo_title: seoTitle,
          seo_description: seoDesc,
        }),
      });
      const d = await res.json();
      if (!res.ok) onToast("err", d.error || "Không thể lưu cấu hình");
      else {
        onToast("ok", d.message || "Đã lưu cấu hình thành công!");
        void loadAll();
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSendingBc(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/push/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: bcTitle, message: bcMessage, link: bcLink }),
      });
      const d = await res.json();
      if (!res.ok) onToast("err", d.error || "Không thể phát sóng thông báo");
      else {
        setBcTitle("");
        setBcMessage("");
        onToast("ok", d.message || "Đã phát sóng Thông báo Đẩy toàn hệ thống!");
        void loadAll();
      }
    } finally {
      setSendingBc(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return true;
    return `${l.actor_name} ${l.action} ${l.summary} ${l.target_id} ${l.ip_address}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Thanh chuyển 4 phân hệ Vận hành */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "audit", label: `Nhật ký Quản trị (${logs.length})`, icon: History },
            { id: "backup", label: `Sao lưu Tự động (${backups.length})`, icon: DatabaseBackup },
            { id: "domain", label: "Tên miền Riêng & Email", icon: Globe },
            { id: "push", label: `Phát sóng Push (${pushDevices} thiết bị)`, icon: BellRing },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as typeof subTab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  active ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      {/* 1. NHẬT KÝ QUẢN TRỊ (AUDIT LOG) */}
      {subTab === "audit" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Nhật ký Quản trị (Audit Log)</h3>
              <p className="text-xs text-slate-500">
                Ghi nhận tự động mọi thao tác nhạy cảm: phân quyền, mở khóa kỳ thi, duyệt tích xanh, xóa tệp, sao lưu và phát sóng thông báo.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Lọc theo người thực hiện, hành động..."
                className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-8 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              Chưa có nhật ký nào khớp điều kiện tìm kiếm.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">Thời gian</th>
                    <th className="py-2 pr-3">Người thực hiện</th>
                    <th className="py-2 pr-3">Hành động</th>
                    <th className="py-2 pr-3">Nội dung chi tiết</th>
                    <th className="py-2">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-[11px] text-slate-500">
                        {fmtDateTime(l.created_at)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-bold text-slate-900">{l.actor_name}</p>
                        <p className="text-[10px] text-slate-400">{l.actor_role}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">{l.summary}</td>
                      <td className="py-2.5 font-mono text-[10px] text-slate-400">{l.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. SAO LƯU DỮ LIỆU TỰ ĐỘNG (CRON + SNAPSHOT JSON) */}
      {subTab === "backup" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-extrabold text-white">
                <Clock className="h-3 w-3" /> LỊCH CHẠY TỰ ĐỘNG ĐANG BẬT
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Sao lưu Dữ liệu Tự động (D1 → KV Snapshot 30 ngày)
              </h3>
              <p className="text-xs text-slate-600">
                Lịch tự động: <strong>{cronSchedule}</strong>. Toàn bộ bảng người dùng, bài giảng, đề thi, lớp học, chứng chỉ và nhật ký đều có thể tải về máy tính dạng JSON bất kỳ lúc nào.
              </p>
            </div>
            <button
              type="button"
              disabled={runningBackup}
              onClick={() => void handleRunBackup()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              <DatabaseBackup className="h-4 w-4" />
              {runningBackup ? "Đang chụp Snapshot..." : "Sao lưu Dữ liệu ngay"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Các bản sao lưu gần nhất ({backups.length})
            </h4>
            {backups.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                Chưa có bản sao lưu nào. Hãy bấm <strong>&quot;Sao lưu Dữ liệu ngay&quot;</strong> để tạo Snapshot đầu tiên!
              </p>
            ) : (
              <div className="space-y-2.5">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-slate-900">{b.backup_code}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            b.trigger_type === "cron_daily"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {b.trigger_type === "cron_daily" ? "Tự động 02:00 sáng" : "Admin thủ công"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {(b.size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {fmtDateTime(b.created_at)} • Thực hiện: {b.actor_name} •{" "}
                        {Object.entries(b.tables_summary || {})
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDownloadBackup(b)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" /> Tải .JSON
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. GẮN TÊN MIỀN RIÊNG & EMAIL QUÊN MẬT KHẨU (#12) */}
      {subTab === "domain" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleSaveConfig}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 lg:col-span-7"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Globe className="h-4 w-4 text-indigo-600" /> Cấu hình Tên miền Riêng, Email &amp; SEO
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                  config?.resend_configured
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {config?.resend_configured ? "Email Resend: ĐÃ KẾT NỐI" : "Email: Chế độ Thử nghiệm"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Tên miền riêng dự kiến (VD: owlie.vn hoặc eduk12.vn)</label>
              <input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="owlie.vn"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Địa chỉ Email gửi mã Quên mật khẩu (Resend From)</label>
              <input
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="Owlie Edu <noreply@owlie.vn>"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Tiêu đề SEO mặc định</label>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Mô tả OpenGraph khi chia sẻ Facebook / Zalo</label>
              <textarea
                rows={2}
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {savingConfig ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </form>

          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-extrabold text-indigo-900">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                3 bước gắn Tên miền riêng {customDomain || "owlie.vn"} (SSL miễn phí)
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-slate-700 leading-relaxed">
                <li>
                  Thêm tên miền <strong>{customDomain || "owlie.vn"}</strong> vào Cloudflare Dashboard (Gói Free 0đ) và trỏ Nameserver tại nhà đăng ký tên miền.
                </li>
                <li>
                  Vào <strong>Workers &amp; Pages → owlie → Settings → Domains &amp; Routes → Add Custom Domain</strong> → nhập <code>{customDomain || "owlie.vn"}</code>.
                </li>
                <li>
                  Cloudflare tự cấp chứng chỉ HTTPS SSL trong 30 giây và chạy song song với <code>owlie.eduk12-scale.workers.dev</code>.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                <Mail className="h-4 w-4 text-emerald-600" />
                Kích hoạt Email Quên mật khẩu thật (Resend Free 3.000 thư/tháng)
              </p>
              <p className="text-slate-700 leading-relaxed">
                Hệ thống đã lập trình sẵn API <code>/api/v1/auth/forgot-password</code> và nút <strong>Quên mật khẩu?</strong> trên trang Đăng nhập. Khi muốn gửi thẳng tới hộp thư Gmail/Outlook thật, bạn chỉ cần lấy khóa tại <strong>resend.com</strong> và nạp biến môi trường <code>RESEND_API_KEY</code> vào Cloudflare Worker!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. PHÁT SÓNG THÔNG BÁO ĐẨY ĐIỆN THOẠI & TRÌNH DUYỆT (#13) */}
      {subTab === "push" && (
        <form
          onSubmit={handleSendBroadcast}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 max-w-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <BellRing className="h-4 w-4 text-amber-500" /> Phát sóng Thông báo Đẩy (Push Notification Broadcast)
              </h3>
              <p className="text-xs text-slate-500">
                Gửi thông báo nổi tức thì xuống điện thoại Android/iOS (PWA) và trình duyệt của toàn bộ học sinh, giáo viên, phụ huynh.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> {pushDevices} thiết bị đã bật Push
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Tiêu đề Thông báo Đẩy</label>
            <input
              required
              value={bcTitle}
              onChange={(e) => setBcTitle(e.target.value)}
              placeholder="VD: Mở phòng thi thử Toán 12 toàn quốc lúc 20:00 tối nay!"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Nội dung ngắn gọn</label>
            <textarea
              required
              rows={3}
              value={bcMessage}
              onChange={(e) => setBcMessage(e.target.value)}
              placeholder="Các em chuẩn bị vào phòng thi để nhận phân tích điểm yếu và chứng chỉ xếp hạng ngay sau khi nộp bài nhé!"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Trang đích khi bấm vào thông báo</label>
            <select
              value={bcLink}
              onChange={(e) => setBcLink(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
            >
              <option value="/thi">Phòng Thi Trắc nghiệm (/thi)</option>
              <option value="/khoa-hoc">Cổng Khóa học (/khoa-hoc)</option>
              <option value="/cong-dong">Mạng Xã Hội Giáo Viên (/cong-dong)</option>
              <option value="/lop-hoc">Lớp học &amp; Phòng Live (/lop-hoc)</option>
              <option value="/chung-chi">Cổng Chứng chỉ QR (/chung-chi)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={sendingBc}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sendingBc ? "Đang phát sóng..." : "Gửi Thông báo Đẩy toàn hệ thống"}
          </button>
        </form>
      )}
    </div>
  );
}
