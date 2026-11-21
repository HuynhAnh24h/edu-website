"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { isImageFileUrl, resolveFileUrl } from "@/components/VerifiedBadge";

export interface StorageStatsPayload {
  backend: "r2_10gb_free" | "kv_1gb_free";
  max_file_mb: number;
  total_files: number;
  used_bytes: number;
  used_mb: number;
  safety_cap_gb: number;
  free_tier_gb: number;
  percent_used: number;
  files: {
    id: string;
    uploader_name: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    purpose: string;
    created_at: string;
    url: string;
  }[];
}

const PURPOSE_LABELS: Record<string, string> = {
  teacher_post: "Bài đăng MXH Giáo viên",
  direct_chat: "Chat Trực tuyến 1–1",
  teacher_verification: "Minh chứng Tích xanh",
  student_showcase: "Sản phẩm Học sinh",
  smoke_test: "Kiểm thử hệ thống",
  general: "Tài liệu chung",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StorageQuotaPanel({
  accessToken,
  onToast,
  onStatsLoaded,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
  onStatsLoaded?: (stats: StorageStatsPayload) => void;
}) {
  const [stats, setStats] = useState<StorageStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/storage/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = (await res.json()) as StorageStatsPayload;
        setStats(d);
        onStatsLoaded?.(d);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, onStatsLoaded]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleDeleteFile = async (id: string, filename: string) => {
    if (!accessToken || !window.confirm(`Xóa vĩnh viễn tệp "${filename}" để giải phóng dung lượng?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/admin/storage/files/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể xóa tệp");
      } else {
        onToast("ok", d.message || "Đã xóa tệp và giải phóng dung lượng!");
        void loadStats();
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
        Đang tải thống kê dung lượng kho Đề thi &amp; Tài liệu...
      </div>
    );
  }

  if (!stats) return null;

  const isR2 = stats.backend === "r2_10gb_free";
  const barColor =
    stats.percent_used >= 90
      ? "bg-rose-500"
      : stats.percent_used >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="space-y-5">
      {/* Thẻ tổng quan dung lượng + khóa trần an toàn */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${
                  isR2
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-indigo-100 text-indigo-800"
                }`}
              >
                <HardDrive className="h-3.5 w-3.5" />
                {isR2
                  ? "Đang dùng Kho 10 GB Miễn phí (R2)"
                  : "Đang dùng Kho 1 GB Miễn phí (Sẵn sàng nâng lên 10 GB R2)"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Khóa trần an toàn {stats.safety_cap_gb} GB (0đ/tháng)
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Quản lý Dung lượng Kho Đề thi &amp; Tài liệu
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống tự động ngừng nhận tệp mới nếu chạm ngưỡng khóa trần <strong>{stats.safety_cap_gb} GB / {stats.free_tier_gb} GB</strong> giúp bạn luôn duy trì mức phí 0đ mỗi tháng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStats()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>

        {/* Thanh đo dung lượng trực quan */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
            <span className="text-slate-800">
              Đã sử dụng: <span className="text-indigo-700">{stats.used_mb} MB</span> / {stats.safety_cap_gb} GB (Giới hạn miễn phí {stats.free_tier_gb} GB)
            </span>
            <span className="text-emerald-700">{stats.percent_used}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.max(stats.used_bytes > 0 ? 1.5 : 0, stats.percent_used)}%` }}
            />
          </div>
          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase text-slate-400">Tổng số tệp đã tải lên</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">{stats.total_files} tệp</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase text-slate-400">Giới hạn mỗi tệp</p>
              <p className="mt-0.5 text-lg font-extrabold text-indigo-700">{stats.max_file_mb} MB / tệp</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase text-slate-400">Dung lượng còn trống (0đ)</p>
              <p className="mt-0.5 text-lg font-extrabold text-emerald-700">
                {Math.max(0, Math.round((stats.safety_cap_gb * 1024 - stats.used_mb) * 10) / 10)} MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng quản lý danh sách tệp đã tải lên */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Database className="h-4 w-4 text-indigo-600" />
            Danh sách Tệp Đề thi, Tài liệu &amp; Ảnh ({stats.files.length} gần nhất)
          </h3>
          <span className="text-[11px] text-slate-500">Xóa tệp cũ bất cứ lúc nào để giải phóng dung lượng</span>
        </div>

        {stats.files.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Kho lưu trữ đang trống — chưa có tệp đề thi hoặc tài liệu nào được tải lên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tên tệp</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Người tải lên</th>
                  <th className="px-4 py-3">Dung lượng</th>
                  <th className="px-4 py-3">Ngày tải</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.files.map((f) => {
                  const isImg = isImageFileUrl(f.url);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {isImg ? (
                            <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
                          )}
                          <span className="max-w-[220px] truncate">{f.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {PURPOSE_LABELS[f.purpose] || f.purpose}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.uploader_name}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                        {formatBytes(f.size_bytes)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{f.created_at}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={resolveFileUrl(f.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Mở <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            type="button"
                            disabled={deletingId === f.id}
                            onClick={() => void handleDeleteFile(f.id, f.filename)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
