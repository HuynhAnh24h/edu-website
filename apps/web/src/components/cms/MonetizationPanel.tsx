"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Copy,
  Crown,
  Gift,
  Link2,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface RevenueOverview {
  kpis: {
    paid_revenue_vnd: number;
    pending_revenue_vnd: number;
    paid_orders: number;
    pending_orders: number;
    active_pro_users: number;
    total_affiliate_commission_vnd: number;
  };
  settings: Record<string, string>;
  webhook_url: string;
  coupons: {
    code: string;
    discount_pct: number;
    max_uses: number;
    used_count: number;
    description: string;
    is_active: number;
  }[];
  orders: {
    id: string;
    order_code: string;
    user_name: string;
    user_email: string;
    plan_name: string;
    base_amount_vnd: number;
    discount_vnd: number;
    final_amount_vnd: number;
    coupon_code: string;
    referral_code: string;
    commission_vnd: number;
    status: "pending" | "paid" | "cancelled";
    created_at: string;
    paid_at?: string;
    approved_by?: string;
  }[];
}

const VIET_BANKS = [
  { code: "MB", name: "MB Bank (Ngân hàng Quân đội)" },
  { code: "VCB", name: "Vietcombank (VCB)" },
  { code: "TCB", name: "Techcombank (TCB)" },
  { code: "ACB", name: "ACB (Ngân hàng Á Châu)" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB", name: "VietinBank" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "VIB", name: "VIB" },
  { code: "OCB", name: "OCB" },
  { code: "VBA", name: "Agribank" },
];

function fmtVnd(n: number) {
  return `${Math.round(n || 0).toLocaleString("vi-VN")}đ`;
}

export function MonetizationPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", text: string) => void;
}) {
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // Bank settings form
  const [bankCode, setBankCode] = useState("MB");
  const [bankName, setBankName] = useState("MB Bank (Ngân hàng Quân đội)");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("OWLIE EDU");
  const [transferPrefix, setTransferPrefix] = useState("OWLIE");
  const [affiliateRate, setAffiliateRate] = useState("20");
  const [teacherShare, setTeacherShare] = useState("85");
  const [supportZalo, setSupportZalo] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Coupon form
  const [newCode, setNewCode] = useState("");
  const [newPct, setNewPct] = useState(25);
  const [newMaxUses, setNewMaxUses] = useState(200);
  const [newDesc, setNewDesc] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/admin/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = (await res.json()) as RevenueOverview;
        setData(d);
        setBankCode(d.settings.bank_code || "MB");
        setBankName(d.settings.bank_name || "MB Bank (Ngân hàng Quân đội)");
        setAccountNo(d.settings.account_no || "");
        setAccountName(d.settings.account_name || "OWLIE EDU");
        setTransferPrefix(d.settings.transfer_prefix || "OWLIE");
        setAffiliateRate(d.settings.affiliate_rate_pct || "20");
        setTeacherShare(d.settings.teacher_share_pct || "85");
        setSupportZalo(d.settings.support_zalo || "");
      }
    } catch {
      onToast("err", "Không tải được dữ liệu Doanh thu");
    } finally {
      setLoading(false);
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          bank_code: bankCode,
          bank_name: bankName,
          account_no: accountNo,
          account_name: accountName.toUpperCase(),
          transfer_prefix: transferPrefix.toUpperCase(),
          affiliate_rate_pct: affiliateRate,
          teacher_share_pct: teacherShare,
          support_zalo: supportZalo,
        }),
      });
      if (!res.ok) throw new Error("Lưu cấu hình thất bại");
      onToast("ok", "Đã lưu tài khoản ngân hàng VietQR & tỷ lệ hoa hồng thành công!");
      await loadOverview();
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi lưu cấu hình");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setSavingCoupon(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/admin/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: newCode,
          discount_pct: newPct,
          max_uses: newMaxUses,
          description: newDesc || `Mã ưu đãi giảm ${newPct}%`,
          is_active: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Không tạo được mã giảm giá");
      onToast("ok", `Đã tạo/cập nhật mã giảm giá ${d.code} (-${newPct}%)!`);
      setNewCode("");
      setNewDesc("");
      await loadOverview();
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi tạo mã giảm giá");
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (c: RevenueOverview["coupons"][number]) => {
    try {
      await fetch(`${CORE_API_URL}/api/v1/monetization/admin/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: c.code,
          discount_pct: c.discount_pct,
          max_uses: c.max_uses,
          description: c.description,
          is_active: c.is_active !== 1,
        }),
      });
      await loadOverview();
    } catch {
      onToast("err", "Không cập nhật được trạng thái mã");
    }
  };

  const handleOrderAction = async (orderId: string, action: "approve" | "cancel") => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/admin/orders/${encodeURIComponent(orderId)}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Thao tác thất bại");
      onToast(
        "ok",
        action === "approve"
          ? "Đã duyệt đơn & kích hoạt quyền lợi Owlie Pro + cộng hoa hồng giới thiệu!"
          : "Đã hủy đơn chờ thanh toán."
      );
      await loadOverview();
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi xử lý đơn");
    } finally {
      setBusyOrderId(null);
    }
  };

  const previewQr =
    bankCode && accountNo.trim()
      ? `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo.trim())}-compact2.png?amount=99000&addInfo=${encodeURIComponent(`${transferPrefix || "OWLIE"}DEMO99`)}&accountName=${encodeURIComponent(accountName || "OWLIE EDU")}`
      : "";

  return (
    <div className="space-y-6">
      {/* 1. KPI TỔNG QUAN DOANH THU */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
            Trung tâm Doanh thu, VietQR &amp; Tiếp thị Liên kết
          </h2>
          <p className="text-xs text-slate-500">
            Cấu hình tài khoản ngân hàng nhận tiền trực tiếp 0% phí trung gian, duyệt đơn kích hoạt Owlie Pro và quản lý mã giảm giá.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới số liệu
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Doanh thu đã thu</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">{fmtVnd(data?.kpis.paid_revenue_vnd || 0)}</p>
          <p className="mt-1 text-[11px] text-emerald-700">{data?.kpis.paid_orders || 0} đơn đã kích hoạt</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Đơn chờ duyệt</span>
            <Wallet className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">{fmtVnd(data?.kpis.pending_revenue_vnd || 0)}</p>
          <p className="mt-1 text-[11px] text-amber-700">{data?.kpis.pending_orders || 0} đơn đang chờ kiểm tra</p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Hội viên Owlie Pro</span>
            <Crown className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-900">{data?.kpis.active_pro_users || 0}</p>
          <p className="mt-1 text-[11px] text-indigo-700">Đang hoạt động còn hạn</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700">
            <span>Hoa hồng Affiliate ({affiliateRate}%)</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900">
            {fmtVnd(data?.kpis.total_affiliate_commission_vnd || 0)}
          </p>
          <p className="mt-1 text-[11px] text-rose-700">Tổng thưởng cộng tác viên giới thiệu</p>
        </div>
      </div>

      {/* 2. CẤU HÌNH TÀI KHOẢN NGÂN HÀNG VIETQR + XEM TRƯỚC MÃ QR */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <form
          onSubmit={handleSaveSettings}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Cấu hình Ngân hàng Nhận tiền VietQR (Tiền về thẳng TK của bạn)
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                accountNo.trim() ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {accountNo.trim() ? "Đã gắn TK nhận tiền" : "Chưa nhập số TK"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Ngân hàng nhận tiền</label>
              <select
                value={bankCode}
                onChange={(e) => {
                  const found = VIET_BANKS.find((b) => b.code === e.target.value);
                  setBankCode(e.target.value);
                  if (found) setBankName(found.name);
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                {VIET_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Số tài khoản ngân hàng</label>
              <input
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="VD: 0987654321"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Tên chủ tài khoản (Không dấu)</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="NGUYEN VAN A"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Tiền tố nội dung chuyển khoản</label>
              <input
                value={transferPrefix}
                onChange={(e) => setTransferPrefix(e.target.value)}
                placeholder="OWLIE"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs font-bold uppercase"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Hoa hồng Affiliate (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={affiliateRate}
                onChange={(e) => setAffiliateRate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Chia doanh thu Giáo viên (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={teacherShare}
                onChange={(e) => setTeacherShare(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Zalo / Hotline Hỗ trợ</label>
              <input
                value={supportZalo}
                onChange={(e) => setSupportZalo(e.target.value)}
                placeholder="09xx.xxx.xxx"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSettings ? "Đang lưu..." : "Lưu Cấu hình Nhận tiền VietQR"}
          </button>
        </form>

        {/* Xem trước mã VietQR & Webhook tự động SePay / Casso */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <QrCode className="h-4 w-4 text-indigo-600" />
              Xem trước mã VietQR thực tế
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
              Quét bằng mọi app Bank
            </span>
          </div>

          {previewQr ? (
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewQr} alt="Xem trước mã VietQR" className="h-48 w-auto rounded-xl object-contain" />
              <p className="mt-2 text-[11px] font-bold text-slate-700">
                {bankName} • STK: <span className="font-mono text-indigo-700">{accountNo}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
              Nhập <strong>Số tài khoản ngân hàng</strong> bên trái rồi bấm Lưu — mã VietQR động điền sẵn số tiền &amp; mã đơn hàng sẽ hiện ngay tại đây và trên trang <code>/bang-gia</code>!
            </div>
          )}

          {/* Webhook tự động SePay / Casso */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-3.5 space-y-2 text-[11px]">
            <p className="flex items-center gap-1.5 font-extrabold text-indigo-900">
              <Link2 className="h-3.5 w-3.5 text-indigo-600" />
              Tự động duyệt đơn 24/7 qua SePay / Casso Webhook:
            </p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                {data?.webhook_url || "https://owlie.eduk12-scale.workers.dev/api/v1/monetization/webhook/bank"}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    data?.webhook_url || "https://owlie.eduk12-scale.workers.dev/api/v1/monetization/webhook/bank"
                  );
                  onToast("ok", "Đã sao chép URL Webhook Ngân hàng!");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-600"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-slate-500">
              Dán URL này vào <strong>SePay.vn</strong> hoặc <strong>Casso.vn</strong> (kèm Secret <code>BANK_WEBHOOK_SECRET</code> trên Cloudflare nếu cần bảo mật cao). Khi tiền vào tài khoản, hệ thống tự động mở gói Pro trong 3 giây!
            </p>
          </div>
        </div>
      </div>

      {/* 3. QUẢN LÝ MÃ GIẢM GIÁ (COUPONS) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Tag className="h-4 w-4 text-rose-600" />
            Quản lý Mã Giảm giá &amp; Khuyến mãi Khai giảng
          </h3>
          <span className="text-[11px] text-slate-500">
            Gửi kèm trong Chiến dịch Email Marketing để tăng tỷ lệ chuyển đổi
          </span>
        </div>

        <form onSubmit={handleCreateCoupon} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-12">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Mã mới (VD: SALE30)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold uppercase sm:col-span-3"
          />
          <input
            type="number"
            min={5}
            max={100}
            value={newPct}
            onChange={(e) => setNewPct(Number(e.target.value))}
            placeholder="% giảm"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold sm:col-span-2"
          />
          <input
            type="number"
            min={1}
            value={newMaxUses}
            onChange={(e) => setNewMaxUses(Number(e.target.value))}
            placeholder="Số lượt"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Mô tả chương trình ưu đãi..."
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-3"
          />
          <button
            type="submit"
            disabled={savingCoupon}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-500 sm:col-span-2"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm mã
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.coupons || []).map((c) => (
            <div
              key={c.code}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                c.is_active === 1 ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-white">
                    <Gift className="h-3 w-3 text-amber-400" /> {c.code}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                    -{c.discount_pct}%
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-600">{c.description}</p>
                <p className="text-[10px] font-semibold text-slate-400">
                  Đã dùng: {c.used_count}/{c.max_uses} lượt
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggleCoupon(c)}
                className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold ${
                  c.is_active === 1
                    ? "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {c.is_active === 1 ? "Tắt mã" : "Bật lại"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. DANH SÁCH ĐƠN HÀNG THANH TOÁN & DUYỆT 1 CHẠM */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Wallet className="h-4 w-4 text-emerald-600" />
          Danh sách Đơn hàng Nâng cấp Owlie Pro ({data?.orders.length || 0})
        </h3>

        {!data?.orders.length ? (
          <p className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
            Chưa có đơn hàng nào. Khách hàng tạo đơn tại trang <strong>/bang-gia</strong> sẽ hiện ngay tại đây để bạn duyệt!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-500">
                  <th className="py-2.5 pr-3">Mã đơn</th>
                  <th className="py-2.5 pr-3">Khách hàng</th>
                  <th className="py-2.5 pr-3">Gói đăng ký</th>
                  <th className="py-2.5 pr-3">Thực thu</th>
                  <th className="py-2.5 pr-3">Trạng thái</th>
                  <th className="py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3 font-mono font-extrabold text-indigo-700">{o.order_code}</td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-slate-900">{o.user_name}</p>
                      <p className="text-[11px] text-slate-500">{o.user_email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-slate-800">{o.plan_name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {o.coupon_code && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            Mã {o.coupon_code}
                          </span>
                        )}
                        {o.referral_code && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Ref {o.referral_code} (+{fmtVnd(o.commission_vnd)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-extrabold text-slate-900">{fmtVnd(o.final_amount_vnd)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          o.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "cancelled"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.status === "paid" ? "Đã kích hoạt" : o.status === "cancelled" ? "Đã hủy" : "Chờ chuyển khoản"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {o.status === "pending" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyOrderId === o.id}
                            onClick={() => void handleOrderAction(o.id, "approve")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt &amp; Mở PRO
                          </button>
                          <button
                            type="button"
                            disabled={busyOrderId === o.id}
                            onClick={() => void handleOrderAction(o.id, "cancel")}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Hủy
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{o.approved_by || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
