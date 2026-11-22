"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Gift,
  GraduationCap,
  HeartHandshake,
  Percent,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface PlanItem {
  id: string;
  name: string;
  tagline: string;
  price_vnd: number;
  original_price_vnd: number;
  duration_days: number;
  billing_cycle: "free" | "monthly" | "yearly";
  badge: string;
  highlight: boolean;
  features: string[];
}

interface BankInfo {
  configured: boolean;
  bank_code: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  support_zalo: string;
}

interface OrderRecord {
  id: string;
  order_code: string;
  plan_id: string;
  plan_name: string;
  base_amount_vnd: number;
  discount_vnd: number;
  final_amount_vnd: number;
  coupon_code: string;
  status: "pending" | "paid" | "cancelled";
  vietqr_url?: string;
  created_at?: string;
  paid_at?: string;
}

interface AffiliateStats {
  referral_code: string;
  referral_url: string;
  total_referrals: number;
  total_earned_vnd: number;
  paid_out_vnd: number;
  rate_pct: number;
}

function fmtVnd(n: number) {
  return `${Math.round(n || 0).toLocaleString("vi-VN")}đ`;
}

function PricingContent() {
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuth();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [affiliateRate, setAffiliateRate] = useState(20);
  const [teacherShare, setTeacherShare] = useState(85);
  const [mySub, setMySub] = useState<{ plan_id: string; plan_name: string; expires_at: string } | null>(null);
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [myAffiliate, setMyAffiliate] = useState<AffiliateStats | null>(null);

  // Checkout state
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount_pct: number;
    discount_vnd: number;
    final_amount_vnd: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [refCode, setRefCode] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const refFromUrl = (searchParams.get("ref") || "").trim().toUpperCase();
    if (refFromUrl) {
      setRefCode(refFromUrl);
      try {
        localStorage.setItem("owlie_ref_code", refFromUrl);
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        const saved = localStorage.getItem("owlie_ref_code") || "";
        if (saved) setRefCode(saved);
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const loadPlans = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/plans`, { headers });
      if (res.ok) {
        const d = await res.json();
        setPlans(d.plans || []);
        setBankInfo(d.bank_info || null);
        if (d.affiliate_rate_pct) setAffiliateRate(d.affiliate_rate_pct);
        if (d.teacher_share_pct) setTeacherShare(d.teacher_share_pct);
        setMySub(d.my_subscription || null);
        setMyOrders(d.my_orders || []);
        setMyAffiliate(d.my_affiliate || null);
      }
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const handleSelectPlan = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setCouponApplied(null);
    setCouponError("");
    setActiveOrder(null);
    const el = document.getElementById("owlie-checkout-box");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleValidateCoupon = async () => {
    if (!selectedPlan || !couponInput.trim()) return;
    setCouponError("");
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/coupon/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), plan_id: selectedPlan.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setCouponApplied(null);
        setCouponError(d.error || "Mã giảm giá không hợp lệ");
        return;
      }
      setCouponApplied(d);
      notify(`Áp dụng thành công mã ${d.code} — Giảm ${d.discount_pct}%!`);
    } catch {
      setCouponError("Không kiểm tra được mã giảm giá");
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan || !accessToken) return;
    setCreatingOrder(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/monetization/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          coupon_code: couponApplied?.code || couponInput.trim(),
          referral_code: refCode,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        notify(d.error || "Không tạo được đơn hàng");
        return;
      }
      if (d.auto_activated) {
        notify("Chúc mừng! Gói Owlie Pro của bạn đã được kích hoạt ngay lập tức!");
        setActiveOrder(null);
        await loadPlans();
        return;
      }
      setActiveOrder(d.order);
      if (d.bank_info) setBankInfo(d.bank_info);
      notify(`Đã tạo đơn ${d.order.order_code}! Quét mã VietQR bên dưới để kích hoạt ngay.`);
      await loadPlans();
    } catch {
      notify("Lỗi kết nối máy chủ thanh toán");
    } finally {
      setCreatingOrder(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard?.writeText(txt);
    notify(`Đã sao chép ${label}!`);
  };

  return (
    <div className="space-y-12 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* ================= 1. HERO BẢNG GIÁ & KIẾM TIỀN ================= */}
      <section className="relative overflow-hidden rounded-[32px] border border-indigo-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-white/15">
            <Crown className="h-3.5 w-3.5" /> Nâng cấp Owlie Pro • Thanh toán VietQR 24/7 • Kiếm hoa hồng {affiliateRate}%
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl leading-tight">
            Đầu tư nhỏ hôm nay,{" "}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300 bg-clip-text text-transparent">
              bứt phá điểm số &amp; sự nghiệp
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Kho 157+ bài giảng SGK Lớp 1–12 luôn <strong>Miễn phí 0đ mãi mãi</strong>. Nâng cấp <strong>Owlie Pro</strong> để mở khóa AI Gia sư không giới hạn, đề thi chuyên sâu 2025+, 6 Cụm Lập trình Fullstack và Chứng chỉ PDF+QR ưu tiên.
          </p>

          {mySub && (
            <div className="mx-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-extrabold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Tài khoản của bạn đang kích hoạt <strong>{mySub.plan_name}</strong> đến hết{" "}
              {new Date(mySub.expires_at).toLocaleDateString("vi-VN")}!
            </div>
          )}

          {refCode && (
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3.5 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-400/30">
              <Gift className="h-3.5 w-3.5" />
              Đang áp dụng mã giới thiệu: <span className="font-mono font-black">{refCode}</span>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2 pt-1 text-[11px] font-bold text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              <Tag className="h-3.5 w-3.5 text-rose-400" /> Nhập mã <code className="text-amber-300">OWLIE50</code> giảm ngay 50%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              <QrCode className="h-3.5 w-3.5 text-emerald-400" /> Hỗ trợ VietQR mọi ngân hàng VN
            </span>
          </div>
        </div>
      </section>

      {/* ================= 2. 4 GÓI DỊCH VỤ MINH BẠCH ================= */}
      <section className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isSelected = selectedPlan?.id === p.id;
            const isCurrent = mySub?.plan_id === p.id;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 transition ${
                  p.highlight
                    ? "border-indigo-500 bg-gradient-to-b from-indigo-50/80 via-white to-white shadow-xl shadow-indigo-900/10 ring-2 ring-indigo-500/20"
                    : isSelected
                      ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                      : "border-slate-200 bg-white shadow-xs hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${
                        p.highlight
                          ? "bg-indigo-600 text-white"
                          : p.price_vnd === 0
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {p.badge}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đang dùng
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">{p.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
                  </div>

                  <div className="border-y border-slate-100 py-4">
                    {p.original_price_vnd > p.price_vnd && (
                      <p className="text-xs font-bold text-slate-400 line-through">{fmtVnd(p.original_price_vnd)}</p>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {p.price_vnd === 0 ? "0đ" : fmtVnd(p.price_vnd)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {p.billing_cycle === "free" ? "/ mãi mãi" : p.billing_cycle === "yearly" ? "/ năm" : "/ tháng"}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  {p.price_vnd === 0 ? (
                    <Link
                      href="/tai-lieu"
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition"
                    >
                      Vào học Miễn phí ngay <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(p)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-extrabold transition ${
                        p.highlight
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                          : "bg-slate-900 text-white hover:bg-indigo-600"
                      }`}
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Chọn nâng cấp {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 3. KHU VỰC THANH TOÁN VIETQR & MÃ GIẢM GIÁ ================= */}
      {selectedPlan && (
        <section
          id="owlie-checkout-box"
          className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-lg sm:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold text-indigo-700">
                <QrCode className="h-3.5 w-3.5" /> Thanh toán An toàn qua VietQR 24/7
              </span>
              <h2 className="mt-1.5 text-xl font-black text-slate-900">
                Xác nhận Nâng cấp: {selectedPlan.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlan(null);
                setActiveOrder(null);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Đổi gói khác
            </button>
          </div>

          {!user ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
              <p className="text-sm font-extrabold text-amber-900">
                Vui lòng đăng nhập tài khoản Owlie Edu để tạo mã thanh toán VietQR &amp; gắn quyền lợi Pro vào đúng tài khoản của bạn.
              </p>
              <Link
                href="/dang-nhap"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow hover:bg-indigo-500"
              >
                Đăng nhập / Đăng ký trong 30 giây <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : !activeOrder ? (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Nhập Mã Giảm giá (Thử ngay: OWLIE50 giảm 50% hoặc KHAIGIANG20 giảm 20%)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="VD: OWLIE50"
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs font-extrabold uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => void handleValidateCoupon()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-600"
                    >
                      <Percent className="h-3.5 w-3.5" /> Áp dụng
                    </button>
                  </div>
                  {couponError && <p className="text-xs font-bold text-rose-600">{couponError}</p>}
                  {couponApplied && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Đã áp mã {couponApplied.code} (-{couponApplied.discount_pct}% • Tiết kiệm{" "}
                      {fmtVnd(couponApplied.discount_vnd)})
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                  <p className="font-extrabold text-slate-800">Thông tin tài khoản được nâng cấp:</p>
                  <p>
                    Học viên: <strong className="text-slate-900">{user.full_name}</strong> ({user.email})
                  </p>
                  <p>
                    Thời hạn sử dụng: <strong>{selectedPlan.duration_days} ngày</strong> kể từ lúc xác nhận thanh toán.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-3 lg:col-span-5">
                <h3 className="text-sm font-black text-slate-900">Tóm tắt đơn hàng</h3>
                <div className="space-y-2 border-b border-indigo-100 pb-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gói {selectedPlan.name}</span>
                    <span className="font-bold text-slate-900">{fmtVnd(selectedPlan.price_vnd)}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Giảm giá ({couponApplied.code})</span>
                      <span>-{fmtVnd(couponApplied.discount_vnd)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-extrabold text-slate-700">Tổng thanh toán</span>
                  <span className="text-2xl font-black text-indigo-700">
                    {fmtVnd(couponApplied ? couponApplied.final_amount_vnd : selectedPlan.price_vnd)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={creatingOrder}
                  onClick={() => void handleCreateOrder()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  {creatingOrder ? "Đang sinh mã VietQR..." : "Tạo Đơn & Lấy Mã QR Chuyển khoản"}
                </button>
              </div>
            </div>
          ) : (
            /* HIỂN THỊ MÃ VIETQR & THÔNG TIN CHUYỂN KHOẢN THỰC TẾ */
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center lg:col-span-5">
                {activeOrder.vietqr_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeOrder.vietqr_url}
                      alt={`Mã VietQR đơn ${activeOrder.order_code}`}
                      className="h-64 w-auto rounded-2xl bg-white p-2 shadow-sm"
                    />
                    <p className="mt-3 text-xs font-bold text-slate-600">
                      Mở App Ngân hàng bất kỳ và quét mã QR — tự động điền đúng số tiền &amp; nội dung!
                    </p>
                  </>
                ) : (
                  <div className="p-6 text-xs text-slate-600 space-y-2">
                    <Building2 className="mx-auto h-10 w-10 text-amber-500" />
                    <p className="font-extrabold text-slate-900">Đơn hàng {activeOrder.order_code} đã được ghi nhận!</p>
                    <p>
                      Quản trị viên chưa nhập số tài khoản VietQR trong mục <strong>Quản trị → Doanh thu &amp; VietQR</strong>. Hãy cấu hình số TK để khách quét mã QR tự động!
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
                  <Clock className="h-3.5 w-3.5" /> Đang chờ xác nhận chuyển khoản
                </div>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-xs">
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-500">Ngân hàng</span>
                    <span className="font-extrabold text-slate-900">{bankInfo?.bank_name || "MB Bank"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-500">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        {bankInfo?.account_no || "Liên hệ Quản trị viên"}
                      </span>
                      {bankInfo?.account_no && (
                        <button
                          type="button"
                          onClick={() => copyText(bankInfo.account_no, "Số tài khoản")}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-500">Chủ tài khoản</span>
                    <span className="font-extrabold uppercase text-slate-900">{bankInfo?.account_name || "OWLIE EDU"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-500">Số tiền chính xác</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-emerald-700">{fmtVnd(activeOrder.final_amount_vnd)}</span>
                      <button
                        type="button"
                        onClick={() => copyText(String(activeOrder.final_amount_vnd), "Số tiền")}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-indigo-50/70 p-3.5">
                    <span className="font-bold text-indigo-900">Nội dung chuyển khoản (Bắt buộc)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-indigo-700">{activeOrder.order_code}</span>
                      <button
                        type="button"
                        onClick={() => copyText(activeOrder.order_code, "Nội dung chuyển khoản")}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-indigo-500"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Sau khi chuyển khoản thành công, hệ thống tự động kích hoạt quyền lợi <strong>{activeOrder.plan_name}</strong> và gửi thông báo ngay trên thanh chuông của bạn.
                  {bankInfo?.support_zalo && (
                    <>
                      {" "}
                      Cần hỗ trợ nhanh liên hệ Zalo: <strong className="text-slate-800">{bankInfo.support_zalo}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= 4. CHƯƠNG TRÌNH KIẾM TIỀN: CỘNG TÁC VIÊN AFFILIATE & GIÁO VIÊN CREATOR ================= */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Cột 1: Cộng tác viên Affiliate 20% */}
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-xs sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                HOA HỒNG {affiliateRate}% TRỌN ĐỜI
              </span>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Kiếm tiền cùng Owlie Affiliate
              </h2>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Chia sẻ đường dẫn giới thiệu cá nhân lên Facebook, TikTok, nhóm lớp học hoặc blog của bạn. Mỗi khi có học sinh hoặc phụ huynh đăng ký nâng cấp gói <strong>Owlie Pro</strong>, bạn nhận ngay <strong>{affiliateRate}% doanh thu</strong> cộng thẳng vào ví hoa hồng!
          </p>

          {user && myAffiliate ? (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[10px] font-bold text-slate-500">Mã giới thiệu</p>
                  <p className="mt-0.5 font-mono text-xs font-black text-indigo-700">{myAffiliate.referral_code}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[10px] font-bold text-slate-500">Lượt thành công</p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">{myAffiliate.total_referrals}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <p className="text-[10px] font-bold text-emerald-700">Hoa hồng đã nhận</p>
                  <p className="mt-0.5 text-sm font-black text-emerald-700">{fmtVnd(myAffiliate.total_earned_vnd)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={myAffiliate.referral_url}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] font-semibold text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => copyText(myAffiliate.referral_url, "Link giới thiệu kiếm tiền")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-500"
                >
                  <Copy className="h-3.5 w-3.5" /> Sao chép
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white shadow hover:bg-emerald-500"
            >
              <Wallet className="h-4 w-4" /> Đăng nhập để lấy Link kiếm tiền {affiliateRate}%
            </Link>
          )}
        </div>

        {/* Cột 2: Giáo viên Creator (85% doanh thu) */}
        <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50/60 p-6 shadow-xs sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow">
              <BadgeDollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-800">
                GIỮ {teacherShare}% DOANH THU KHÓA HỌC
              </span>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Giáo viên Creator &amp; Đối tác Trung tâm
              </h2>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Bạn là Giáo viên, Mentor Lập trình hay Trung tâm luyện thi? Đăng tải khóa học video, mở lớp Live tương tác và bán bộ đề ôn thi ngay trên Owlie Edu với hạ tầng sẵn có: tự động chấm điểm, cấp Chứng chỉ QR và giữ trọn <strong>{teacherShare}% doanh thu</strong>!
          </p>

          <ul className="space-y-2 text-xs font-semibold text-slate-700">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" /> Xác minh Tích xanh Giáo viên tăng độ tin cậy với phụ huynh
            </li>
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" /> Tự động cấp Chứng chỉ PDF + QR mang tên khóa học của thầy cô
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" /> Tiếp cận hàng nghìn học sinh Lớp 1–12 &amp; lập trình viên trẻ
            </li>
          </ul>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              href="/khoa-hoc"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-extrabold text-white hover:bg-indigo-600 transition"
            >
              <GraduationCap className="h-4 w-4" /> Mở Khóa học đầu tiên
            </Link>
            <Link
              href="/quan-tri"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Vào Studio Giảng dạy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 5. LỊCH SỬ ĐƠN HÀNG CỦA TÔI ================= */}
      {user && myOrders.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <Sparkles className="h-4 w-4 text-indigo-600" /> Lịch sử Nâng cấp của bạn
          </h2>
          <div className="space-y-2.5">
            {myOrders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-mono font-black text-indigo-700">{o.order_code}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="font-bold text-slate-900">{o.plan_name}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="font-extrabold text-emerald-700">{fmtVnd(o.final_amount_vnd)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      o.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : o.status === "cancelled"
                          ? "bg-slate-200 text-slate-500"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {o.status === "paid" ? "Đã kích hoạt" : o.status === "cancelled" ? "Đã hủy" : "Chờ thanh toán"}
                  </span>
                  {o.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = plans.find((x) => x.id === o.plan_id) || plans[1];
                        if (p) setSelectedPlan(p);
                        setActiveOrder(o);
                      }}
                      className="rounded-xl bg-indigo-600 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-indigo-500"
                    >
                      Mở mã QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cam kết học đường */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
          <HeartHandshake className="h-4 w-4 text-emerald-600" /> Kho SGK 1–12 luôn Miễn phí 100%
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
          <ShieldCheck className="h-4 w-4 text-indigo-600" /> Thanh toán minh bạch qua VietQR chính chủ
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
          <Award className="h-4 w-4 text-amber-600" /> Xuất hóa đơn &amp; Chứng chỉ xác thực QR
        </span>
      </section>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">
          Đang tải Bảng giá &amp; Chương trình Owlie Pro...
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
