"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  FileWarning,
  Lock,
  RefreshCw,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { connectRealtimeChannel } from "@/lib/realtime";

interface SafetyIncident {
  id: string;
  incident_code: string;
  category: "sexual_harassment" | "violence" | "impersonation" | "low_quality_lesson";
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  source_type: string;
  source_id: string;
  suspect_user_id: string;
  suspect_name: string;
  suspect_email: string;
  suspect_role: string;
  suspect_is_active: boolean;
  reporter_name: string;
  matched_keywords: string;
  content_snapshot: string;
  admin_note: string;
  penalty_action: string;
  created_at: string;
}

interface SafetySummary {
  total: number;
  open_count: number;
  critical_count: number;
  locked_count: number;
  escalated_count: number;
}

const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  sexual_harassment: {
    label: "Quấy rối tình dục / Xâm hại (KHẨN)",
    cls: "bg-rose-600 text-white",
  },
  violence: {
    label: "Bạo lực / Đe dọa (KHẨN)",
    cls: "bg-red-600 text-white",
  },
  impersonation: {
    label: "Mạo danh Giáo viên / Lừa đảo",
    cls: "bg-amber-600 text-white",
  },
  low_quality_lesson: {
    label: "Giáo án cũ / Kém chất lượng",
    cls: "bg-slate-700 text-white",
  },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: "Chờ Admin xử lý", cls: "bg-rose-100 text-rose-700" },
  warned: { label: "Đã gửi cảnh cáo", cls: "bg-amber-100 text-amber-800" },
  locked: { label: "Đã thông báo & Khóa Acc", cls: "bg-slate-900 text-white" },
  escalated_police: { label: "Đã khóa Acc & Xuất hồ sơ Công an", cls: "bg-indigo-700 text-white" },
  resolved: { label: "Đã gỡ nội dung", cls: "bg-emerald-100 text-emerald-800" },
  dismissed: { label: "Đã đóng", cls: "bg-slate-100 text-slate-600" },
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SafetyCenterPanel({
  accessToken,
  onToast,
  onSummaryChange,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
  onSummaryChange?: (openCount: number) => void;
}) {
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [summary, setSummary] = useState<SafetySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidencePreview, setEvidencePreview] = useState<{ filename: string; text: string } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const loadIncidents = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/safety/incidents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        setIncidents(d.incidents || []);
        setSummary(d.summary || null);
        onSummaryChange?.(d.summary?.open_count || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, onSummaryChange]);

  useEffect(() => {
    void loadIncidents();
    if (!accessToken) return;
    const conn = connectRealtimeChannel("admin:safety", accessToken, {
      onStatus: setLiveConnected,
      onEvent: (ev) => {
        if (ev.type === "safety_alert") {
          onToast("err", `🚨 CẢNH BÁO REAL-TIME: ${String(ev.title || "Phát hiện vi phạm mới!")}`);
          void loadIncidents();
        } else if (ev.type === "incident_updated") {
          void loadIncidents();
        }
      },
    });
    return () => conn.close();
  }, [accessToken, loadIncidents, onToast]);

  const handleAction = async (
    inc: SafetyIncident,
    action: "warn" | "remove_lesson" | "revoke_impersonator" | "notify_and_lock" | "escalate_police" | "dismiss"
  ) => {
    if (!accessToken) return;
    if (
      (action === "notify_and_lock" || action === "revoke_impersonator" || action === "escalate_police") &&
      !window.confirm(
        `Xác nhận áp dụng biện pháp xử lý nghiêm với tài khoản "${inc.suspect_name}" (${inc.incident_code})? Hệ thống sẽ gửi thông báo khóa tài khoản và khóa quyền truy cập ngay lập tức.`
      )
    ) {
      return;
    }

    setActingId(inc.id);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/safety/incidents/${encodeURIComponent(inc.id)}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, admin_note: notes[inc.id] || "" }),
      });
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể xử lý hồ sơ");
      } else {
        onToast("ok", d.message || "Đã áp dụng biện pháp xử lý!");
        if (d.evidence_text && d.evidence_filename) {
          setEvidencePreview({ filename: d.evidence_filename, text: d.evidence_text });
          downloadTextFile(d.evidence_filename, d.evidence_text);
        }
        void loadIncidents();
      }
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Thống kê BOT Quét An toàn */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-[11px] font-bold uppercase text-rose-700">Cảnh báo chờ xử lý</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{summary?.open_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase text-red-600">Khẩn cấp (Bạo lực / Quấy rối)</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{summary?.critical_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase text-slate-500">Tài khoản đã khóa</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{summary?.locked_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <p className="text-[11px] font-bold uppercase text-indigo-700">Hồ sơ đã xuất gửi Công an</p>
          <p className="mt-1 text-2xl font-extrabold text-indigo-700">{summary?.escalated_count ?? 0}</p>
        </div>
      </div>

      {/* Quy trình chuẩn bảo vệ học sinh */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            BOT Quét AI 2 Tầng (Chống Teencode + Hiểu Ngữ Cảnh) &amp; Xử lý Hình phạt
          </h2>
          <p className="text-xs text-slate-500">
            Tầng 1: Chuẩn hóa tiếng Việt + Giải mã teencode/viết lái (0→o, 3→e, l0n, ch3t...). Tầng 2: AI hiểu ngữ cảnh phát hiện quấy rối, bắt nạt, gạ gẫm tinh vi → Niêm phong bằng chứng &amp; Xuất Hồ sơ chuyển Công an.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
              liveConnected ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {liveConnected ? "Real-time trực tiếp" : "Đang kết nối..."}
          </span>
          <button
            type="button"
            onClick={() => void loadIncidents()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Quét lại
          </button>
        </div>
      </div>

      {/* Xem trước Biên bản Hồ sơ Bằng chứng gửi Công an */}
      {evidencePreview && (
        <div className="rounded-2xl border-2 border-indigo-500 bg-slate-950 p-5 text-slate-100 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-emerald-400">
              ✅ Đã xuất Hồ sơ Bằng chứng: {evidencePreview.filename}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadTextFile(evidencePreview.filename, evidencePreview.text)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <Download className="h-3.5 w-3.5" /> Tải lại file (.TXT)
              </button>
              <button
                type="button"
                onClick={() => setEvidencePreview(null)}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
              >
                Đóng
              </button>
            </div>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
            {evidencePreview.text}
          </pre>
        </div>
      )}

      {/* Danh sách hồ sơ vi phạm */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Đang tải danh sách cảnh báo từ BOT An toàn...
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-10 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="text-sm font-extrabold text-emerald-900">
            Hệ thống an toàn — Chưa có cảnh báo vi phạm nào!
          </p>
          <p className="text-xs text-emerald-700">
            BOT Quét tự động vẫn đang giám sát 24/7 toàn bộ phòng Chat, Bài viết cộng đồng, Bình luận và Giáo án.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => {
            const cat = CATEGORY_META[inc.category] || CATEGORY_META.impersonation;
            const st = STATUS_META[inc.status] || STATUS_META.open;
            const busy = actingId === inc.id;

            return (
              <div
                key={inc.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 ${
                  inc.severity === "critical" && inc.status === "open"
                    ? "border-rose-400 ring-2 ring-rose-100"
                    : "border-slate-200"
                }`}
              >
                {/* Header vụ việc */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono font-extrabold text-slate-900">{inc.incident_code}</span>
                      <span className={`rounded-full px-2.5 py-0.5 font-bold ${cat.cls}`}>{cat.label}</span>
                      <span className={`rounded-full px-2.5 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                      {!inc.suspect_is_active && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 font-bold text-rose-300">
                          🔒 TÀI KHOẢN ĐÃ KHÓA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Đối tượng: <strong className="text-slate-900">{inc.suspect_name}</strong> ({inc.suspect_email || inc.suspect_user_id}) • Nguồn:{" "}
                      <strong>{inc.source_type}</strong> • Phát hiện bởi: <strong>{inc.reporter_name}</strong>
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400">{inc.created_at}</span>
                </div>

                {/* Bằng chứng nguyên văn */}
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 space-y-1.5">
                  <p className="text-[11px] font-extrabold text-rose-800">
                    Nội dung bằng chứng lưu giữ (Từ khóa BOT bắt: {inc.matched_keywords || "Báo cáo người dùng"}):
                  </p>
                  <p className="whitespace-pre-line text-xs text-slate-800">{inc.content_snapshot}</p>
                </div>

                {inc.penalty_action && (
                  <p className="text-xs font-bold text-indigo-700">
                    Biện pháp đã xử lý: {inc.penalty_action}
                  </p>
                )}

                {/* Ghi chú Admin + Các nút hình phạt */}
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <input
                    value={notes[inc.id] ?? inc.admin_note ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [inc.id]: e.target.value }))}
                    placeholder="Ghi chú lý do gửi thông báo cho tài khoản vi phạm / ghi chú biên bản bàn giao Công an..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAction(inc, "warn")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Gửi cảnh cáo
                    </button>

                    {inc.category === "low_quality_lesson" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAction(inc, "remove_lesson")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <FileWarning className="h-3.5 w-3.5" /> Gỡ giáo án kém/cũ
                      </button>
                    )}

                    {inc.category === "impersonation" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAction(inc, "revoke_impersonator")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                      >
                        <UserX className="h-3.5 w-3.5" /> Phạt Mạo danh (Tước quyền + Khóa Acc)
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAction(inc, "notify_and_lock")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" /> Gửi thông báo &amp; Khóa Acc ngay
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAction(inc, "escalate_police")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-extrabold text-emerald-300 shadow hover:bg-slate-800 disabled:opacity-50"
                    >
                      <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
                      Khóa Acc &amp; Xuất Hồ sơ Bằng chứng gửi Công an
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAction(inc, "dismiss")}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" /> Đóng hồ sơ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
