"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Copy,
  GraduationCap,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CuBongLogoMark } from "@/components/BrandLogo";

interface CertificateRecord {
  id: string;
  cert_code: string;
  course_id: string;
  course_title: string;
  subject_name: string;
  teacher_name: string;
  user_id: string;
  user_name: string;
  issued_at: string;
}

const PUBLIC_ORIGIN = "https://owlie.eduk12-scale.workers.dev";

function formatDateVi(iso: string) {
  try {
    const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function CertificatePageInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const { user, accessToken } = useAuth();

  const [codeInput, setCodeInput] = useState(initialCode);
  const [verifiedCert, setVerifiedCert] = useState<CertificateRecord | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [myCerts, setMyCerts] = useState<CertificateRecord[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const verifyCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/certificates/verify?code=${encodeURIComponent(code)}`);
      const d = await res.json();
      if (res.ok && d.valid && d.certificate) {
        setVerifiedCert(d.certificate);
        setCodeInput(d.certificate.cert_code);
      } else {
        setVerifiedCert(null);
        setVerifyError(d.error || "Không tìm thấy chứng chỉ hợp lệ với mã này.");
      }
    } catch {
      setVerifyError("Không thể kết nối máy chủ xác thực lúc này.");
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) {
      void verifyCode(initialCode);
    }
  }, [initialCode, verifyCode]);

  useEffect(() => {
    if (!accessToken) {
      setMyCerts([]);
      return;
    }
    fetch(`${CORE_API_URL}/api/v1/certificates/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.certificates) {
          setMyCerts(d.certificates);
          if (!initialCode && d.certificates.length > 0) {
            setVerifiedCert(d.certificates[0]);
            setCodeInput(d.certificates[0].cert_code);
          }
        }
      })
      .catch(() => {});
  }, [accessToken, initialCode]);

  const verifyUrl = verifiedCert
    ? `${PUBLIC_ORIGIN}/chung-chi/?code=${encodeURIComponent(verifiedCert.cert_code)}`
    : "";
  const qrImgUrl = verifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(verifyUrl)}`
    : "";

  const handleCopyVerifyLink = () => {
    if (!verifyUrl) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner & Thanh tra cứu xác thực mã Chứng chỉ (Ẩn khi in PDF) */}
      <section className="print:hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-amber-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
              <Award className="h-3.5 w-3.5" /> Chứng chỉ Hoàn thành Khóa học • In PDF &amp; Xác thực QR
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Cổng Cấp &amp; Tra cứu Chứng chỉ Owlie Edu
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Mỗi chứng chỉ hoàn thành khóa học đều có mã định danh duy nhất và mã QR xác thực công khai giúp phụ huynh, nhà trường hoặc nhà tuyển dụng kiểm chứng ngay lập tức.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verifyCode(codeInput);
            }}
            className="flex w-full max-w-md flex-col gap-2 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/20 backdrop-blur-xs sm:w-auto sm:min-w-[340px]"
          >
            <label className="text-[11px] font-bold text-amber-200">
              Tra cứu xác thực Chứng chỉ (Thử mã mẫu: OWLIE-CERT-2026-WEB01)
            </label>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Nhập mã OWLIE-CERT-..."
                className="flex-1 rounded-xl border border-white/20 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={verifying}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                {verifying ? "Đang tra..." : "Xác thực"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void verifyCode("OWLIE-CERT-2026-WEB01")}
              className="self-start text-[11px] font-semibold text-amber-300 underline hover:text-amber-200"
            >
              Xem thử Chứng chỉ mẫu (OWLIE-CERT-2026-WEB01)
            </button>
          </form>
        </div>
      </section>

      {verifyError && (
        <div className="print:hidden flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{verifyError}</span>
        </div>
      )}

      {/* BẢN CHỨNG CHỈ CHÍNH THỨC (TỐI ƯU IN PDF A4 NGANG) */}
      {verifiedCert && (
        <div className="space-y-4">
          {/* Thanh trạng thái xác thực + Nút In PDF */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">Chứng chỉ Hợp lệ — Đã xác thực trực tiếp trên Hệ thống Owlie Edu</p>
                <p className="text-[11px] text-emerald-700">
                  Mã xác thực: <strong className="font-mono">{verifiedCert.cert_code}</strong> • Ngày cấp:{" "}
                  {formatDateVi(verifiedCert.issued_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVerifyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedLink ? "Đã copy link xác thực!" : "Copy link xác thực"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" /> In / Lưu Chứng chỉ PDF
              </button>
            </div>
          </div>

          {/* Khung Chứng chỉ Vàng Kim trang trọng */}
          <div className="mx-auto max-w-4xl rounded-[28px] bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-300 p-2.5 shadow-2xl print:shadow-none">
            <div className="relative overflow-hidden rounded-[22px] border-2 border-amber-500/60 bg-white px-6 py-8 sm:px-12 sm:py-10">
              {/* Hoa văn góc trang nhã */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-amber-100/50 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-100/50 blur-2xl" />

              {/* Header Chứng chỉ */}
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-amber-200 pb-6">
                <div className="flex items-center gap-3">
                  <CuBongLogoMark className="h-12 w-12" />
                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-slate-900">
                      Owlie <span className="text-indigo-600">Edu</span>
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                      Nền tảng Giáo dục Mở Lớp 1–12 &amp; Lập trình
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ĐÃ XÁC THỰC ĐIỆN TỬ
                  </span>
                  <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">
                    Số hiệu: {verifiedCert.cert_code}
                  </p>
                </div>
              </div>

              {/* Nội dung chính Chứng chỉ */}
              <div className="relative py-8 text-center space-y-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-amber-700">
                  Certificate of Completion
                </p>
                <h2 className="text-2xl font-black uppercase tracking-wide text-slate-900 sm:text-4xl">
                  Chứng Nhận Hoàn Thành Khóa Học
                </h2>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Trân trọng trao tặng học viên
                </p>

                <p className="mx-auto max-w-2xl border-b-2 border-amber-300 pb-2 text-3xl font-extrabold text-indigo-700 sm:text-4xl">
                  {verifiedCert.user_name}
                </p>

                <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600">
                  Đã xuất sắc hoàn thành <strong>100% chương trình bài giảng</strong> thuộc chuyên đề{" "}
                  <strong className="text-slate-900">{verifiedCert.subject_name}</strong> trong khóa học:
                </p>

                <div className="mx-auto max-w-2xl rounded-2xl border border-indigo-100 bg-indigo-50/50 px-6 py-4">
                  <p className="text-lg font-extrabold text-slate-900 sm:text-xl">{verifiedCert.course_title}</p>
                </div>
              </div>

              {/* Chữ ký & Mã QR Xác thực */}
              <div className="relative mt-4 grid items-end gap-6 border-t border-amber-200 pt-6 sm:grid-cols-3">
                <div className="text-center sm:text-left space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giảng viên Phụ trách</p>
                  <p className="text-base font-extrabold text-slate-900">{verifiedCert.teacher_name}</p>
                  <p className="text-[11px] text-slate-500">Đội ngũ Giáo viên Owlie Edu</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
                    <Award className="h-7 w-7" />
                  </div>
                  <p className="text-[11px] font-extrabold text-amber-800">Ngày cấp: {formatDateVi(verifiedCert.issued_at)}</p>
                  <p className="text-[10px] text-slate-400">Hiệu lực xác thực vĩnh viễn</p>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-1.5">
                  <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrImgUrl} alt={`QR Xác thực ${verifiedCert.cert_code}`} className="h-24 w-24" />
                  </div>
                  <p className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <QrCode className="h-3 w-3 text-indigo-600" /> Quét QR để xác thực bản gốc
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tủ Chứng chỉ của người dùng hiện tại (Ẩn khi in) */}
      <section className="print:hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Tủ Chứng chỉ của bạn ({myCerts.length})
            </h2>
            <p className="text-xs text-slate-500">
              Hoàn thành 100% bài học trong bất kỳ khóa học miễn phí nào tại Cổng Khóa học để nhận chứng chỉ ngay!
            </p>
          </div>
          <Link
            href="/khoa-hoc"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <GraduationCap className="h-4 w-4" /> Khám phá Khóa học
          </Link>
        </div>

        {!user ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-600">
            <Link href="/dang-nhap" className="font-extrabold text-indigo-600 hover:underline">
              Đăng nhập
            </Link>{" "}
            để xem tủ chứng chỉ cá nhân hoặc nhập mã chứng chỉ ở ô phía trên để xác thực công khai.
          </div>
        ) : myCerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">Bạn chưa nhận chứng chỉ khóa học nào.</p>
            <p className="text-xs text-slate-500">
              Hãy vào mục Khóa học, ghi danh miễn phí và hoàn thành đủ 100% bài học để nhận Chứng chỉ PDF kèm mã QR!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCerts.map((c) => {
              const active = verifiedCert?.cert_code === c.cert_code;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setVerifiedCert(c);
                    setCodeInput(c.cert_code);
                    setVerifyError("");
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-amber-400 bg-amber-50/70 ring-1 ring-amber-300"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700">
                      {c.subject_name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400">{formatDateVi(c.issued_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-extrabold text-slate-900">{c.course_title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Giảng viên: {c.teacher_name}</p>
                  <p className="mt-2 font-mono text-[10px] font-bold text-amber-700">{c.cert_code}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải Cổng Chứng chỉ...</div>}>
      <CertificatePageInner />
    </Suspense>
  );
}
