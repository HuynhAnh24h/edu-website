"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { isImageFileUrl, resolveFileUrl, VerifiedBadge } from "@/components/VerifiedBadge";

interface VerificationTeacher {
  id: string;
  full_name: string;
  email: string;
  role: string;
  school_name: string;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  specialty: string;
  bio: string;
  years_exp: number;
  proof_file_url: string;
  proof_note: string;
  admin_review_note: string;
  verified_at: string | null;
}

export function TeacherVerificationPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
}) {
  const [teachers, setTeachers] = useState<VerificationTeacher[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/teachers/verifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        setTeachers(d.teachers || []);
        setPendingCount(d.pending_count || 0);
        setVerifiedCount(d.verified_count || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleVerifyAction = async (teacherId: string, action: "approve" | "reject" | "revoke") => {
    if (!accessToken) return;
    setBusyId(teacherId);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/admin/teachers/${encodeURIComponent(teacherId)}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action, note: notes[teacherId] || "" }),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể xử lý xác minh");
      } else {
        onToast("ok", d.message || "Đã cập nhật trạng thái Tích xanh!");
        void loadList();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <BadgeCheck className="h-5 w-5 text-sky-500" />
            Xác minh Giáo viên Tích xanh ({verifiedCount} đã xác thực • {pendingCount} chờ duyệt)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Kiểm tra ảnh Thẻ Giáo viên / Giấy xác nhận công tác trước khi cấp Huy hiệu Tích xanh — chặn mạo danh giáo viên ngay từ gốc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Đang tải danh sách hồ sơ giáo viên...
        </div>
      ) : (
        <div className="space-y-4">
          {teachers.map((t) => {
            const busy = busyId === t.id;
            const fileUrl = resolveFileUrl(t.proof_file_url);
            return (
              <div
                key={t.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs space-y-3.5 ${
                  t.verification_status === "pending"
                    ? "border-amber-300 ring-2 ring-amber-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/giao-vien?id=${encodeURIComponent(t.id)}`}
                        className="text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                      >
                        {t.full_name}
                      </Link>
                      {t.is_verified && <VerifiedBadge />}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          t.verification_status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : t.is_verified
                              ? "bg-sky-100 text-sky-800"
                              : t.verification_status === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.verification_status === "pending" ? (
                          <>
                            <Clock className="h-3 w-3" /> Đang chờ duyệt Tích xanh
                          </>
                        ) : t.is_verified ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Đã cấp Tích xanh
                          </>
                        ) : t.verification_status === "rejected" ? (
                          "Đã từ chối"
                        ) : (
                          "Chưa gửi hồ sơ"
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.email} • {t.school_name || "Chưa cập nhật trường"} • {t.specialty || "Chưa rõ chuyên môn"} ({t.years_exp} năm KN)
                    </p>
                  </div>

                  <Link
                    href={`/giao-vien?id=${encodeURIComponent(t.id)}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Xem Hồ sơ <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* Minh chứng thẻ giáo viên */}
                {(t.proof_file_url || t.proof_note) && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5 space-y-2">
                    <p className="text-[11px] font-extrabold text-sky-900">Hồ sơ minh chứng giáo viên gửi lên:</p>
                    {t.proof_note && <p className="text-xs text-slate-700">{t.proof_note}</p>}
                    {t.proof_file_url && (
                      <div className="pt-1">
                        {isImageFileUrl(t.proof_file_url) ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrl}
                              alt="Ảnh thẻ xác minh giáo viên"
                              className="max-h-48 rounded-xl border border-slate-200 shadow-xs"
                            />
                          </a>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
                          >
                            <FileText className="h-4 w-4" /> Mở tệp minh chứng đính kèm <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <input
                    value={notes[t.id] ?? t.admin_review_note ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Ghi chú duyệt / lý do từ chối gửi cho giáo viên..."
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                  {!t.is_verified ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleVerifyAction(t.id, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-sky-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt &amp; Cấp Tích xanh
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleVerifyAction(t.id, "reject")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Từ chối
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleVerifyAction(t.id, "revoke")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <ShieldOff className="h-3.5 w-3.5" /> Thu hồi Tích xanh
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
