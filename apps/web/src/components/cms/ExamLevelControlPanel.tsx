"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Lock,
  RefreshCw,
  Sparkles,
  Unlock,
  Zap,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface ExamLevelControl {
  level: "primary" | "middle" | "high";
  label: string;
  min_grade: number;
  max_grade: number;
  is_unlocked: boolean;
  exam_id: string;
  announcement: string;
  updated_by: string;
  updated_at: string;
  question_count: number;
  exam_count: number;
}

const LEVEL_STYLES: Record<string, { badge: string; accent: string; defaultTitle: string; defaultMin: number }> = {
  primary: {
    badge: "bg-sky-100 text-sky-800",
    accent: "border-sky-200",
    defaultTitle: "Kỳ thi Tổng hợp Cấp Tiểu học (Lớp 1–5)",
    defaultMin: 30,
  },
  middle: {
    badge: "bg-emerald-100 text-emerald-800",
    accent: "border-emerald-200",
    defaultTitle: "Kỳ thi Tổng hợp Cấp THCS & Ôn thi vào 10 (Lớp 6–9)",
    defaultMin: 45,
  },
  high: {
    badge: "bg-indigo-100 text-indigo-800",
    accent: "border-indigo-200",
    defaultTitle: "Kỳ thi Tổng hợp Cấp THPT Chuẩn 2025+ (Lớp 10–12)",
    defaultMin: 60,
  },
};

export function ExamLevelControlPanel({
  accessToken,
  onToast,
  onGenerated,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
  onGenerated?: () => void;
}) {
  const [levels, setLevels] = useState<ExamLevelControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyLevel, setBusyLevel] = useState<string | null>(null);

  const [announcements, setAnnouncements] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, number>>({
    primary: 30,
    middle: 45,
    high: 60,
  });
  const [qLimits, setQLimits] = useState<Record<string, number>>({
    primary: 10,
    middle: 12,
    high: 15,
  });

  const loadLevels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/exam-levels`);
      if (res.ok) {
        const d = await res.json();
        const list = (d.levels || []) as ExamLevelControl[];
        setLevels(list);
        setAnnouncements((prev) => {
          const next = { ...prev };
          for (const l of list) {
            if (next[l.level] === undefined) next[l.level] = l.announcement;
          }
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLevels();
  }, [loadLevels]);

  const handleToggleUnlock = async (lvl: ExamLevelControl, nextUnlocked: boolean) => {
    if (!accessToken) return;
    setBusyLevel(lvl.level);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/exam-levels/${lvl.level}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          is_unlocked: nextUnlocked,
          announcement: announcements[lvl.level] ?? lvl.announcement,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể cập nhật trạng thái mở/khóa thi");
      } else {
        onToast("ok", d.message || "Đã cập nhật trạng thái mở khóa thi!");
        void loadLevels();
      }
    } finally {
      setBusyLevel(null);
    }
  };

  const handleGenerateLevelExam = async (lvl: ExamLevelControl) => {
    if (!accessToken) return;
    setBusyLevel(lvl.level);
    try {
      const style = LEVEL_STYLES[lvl.level];
      const res = await fetch(`${CORE_API_URL}/api/v1/admin/exam-levels/${lvl.level}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: (titles[lvl.level] || "").trim() || style.defaultTitle,
          duration_minutes: durations[lvl.level] || style.defaultMin,
          question_limit: qLimits[lvl.level] || 12,
          auto_unlock: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        onToast("err", d.error || "Không thể tổng hợp đề thi cấp này");
      } else {
        onToast("ok", d.message || "Đã tổng hợp & mở khóa đề thi cấp thành công!");
        void loadLevels();
        onGenerated?.();
      }
    } finally {
      setBusyLevel(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Mở Khóa Thi &amp; Tổng Hợp Đề Thi Theo 3 Cấp Học (Real-time)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Admin toàn quyền đóng/mở phòng thi theo từng cấp (Tiểu học 1–5, THCS 6–9, THPT 10–12) và tự động tổng hợp đề thi chuẩn thang điểm 10 từ ngân hàng câu hỏi — cập nhật Real-time ngay cho học sinh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/thi"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            Xem Phòng thi Học sinh <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void loadLevels()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Đang tải cấu hình kỳ thi theo cấp học...
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {levels.map((lvl) => {
            const st = LEVEL_STYLES[lvl.level] || LEVEL_STYLES.high;
            const busy = busyLevel === lvl.level;

            return (
              <div
                key={lvl.level}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs space-y-4 ${st.accent}`}
              >
                <div className="space-y-3">
                  {/* Tiêu đề cấp + Trạng thái Mở/Khóa */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${st.badge}`}>
                        Khối {lvl.min_grade} → {lvl.max_grade}
                      </span>
                      <h3 className="mt-1.5 text-base font-extrabold text-slate-900">{lvl.label}</h3>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                        lvl.is_unlocked
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {lvl.is_unlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {lvl.is_unlocked ? "ĐANG MỞ THI" : "ĐANG KHÓA"}
                    </span>
                  </div>

                  {/* Số liệu ngân hàng câu hỏi & đề thi */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="text-lg font-extrabold text-indigo-700">{lvl.question_count}</p>
                      <p className="text-[10px] font-semibold text-slate-500">Câu hỏi của cấp</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">{lvl.exam_count}</p>
                      <p className="text-[10px] font-semibold text-slate-500">Đề thi hiện có</p>
                    </div>
                  </div>

                  {/* Thông báo hiển thị trên /thi + Nút Mở/Khóa Real-time */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Thông báo kỳ thi gửi học sinh cấp này:
                    </label>
                    <input
                      value={announcements[lvl.level] ?? lvl.announcement}
                      onChange={(e) =>
                        setAnnouncements((prev) => ({ ...prev, [lvl.level]: e.target.value }))
                      }
                      placeholder="VD: Đã mở khóa kỳ thi tổng hợp cuối kỳ..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleUnlock(lvl, !lvl.is_unlocked)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold text-white shadow-xs transition disabled:opacity-50 ${
                          lvl.is_unlocked
                            ? "bg-rose-600 hover:bg-rose-500"
                            : "bg-emerald-600 hover:bg-emerald-500"
                        }`}
                      >
                        {lvl.is_unlocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Khóa thi cấp này
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" /> Mở khóa thi ngay
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleUnlock(lvl, lvl.is_unlocked)}
                        title="Lưu thông báo"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Khối Tự động Tổng hợp Đề thi Theo Cấp */}
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-800">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Tổng hợp Đề thi Theo Cấp
                  </p>
                  <input
                    value={titles[lvl.level] ?? ""}
                    onChange={(e) => setTitles((prev) => ({ ...prev, [lvl.level]: e.target.value }))}
                    placeholder={st.defaultTitle}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Thời gian (phút)</label>
                      <select
                        value={durations[lvl.level] || st.defaultMin}
                        onChange={(e) =>
                          setDurations((prev) => ({ ...prev, [lvl.level]: Number(e.target.value) }))
                        }
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value={15}>15 phút</option>
                        <option value={30}>30 phút</option>
                        <option value={45}>45 phút</option>
                        <option value={60}>60 phút</option>
                        <option value={90}>90 phút</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Số câu tối đa</label>
                      <select
                        value={qLimits[lvl.level] || 12}
                        onChange={(e) =>
                          setQLimits((prev) => ({ ...prev, [lvl.level]: Number(e.target.value) }))
                        }
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value={5}>5 câu</option>
                        <option value={10}>10 câu</option>
                        <option value={12}>12 câu</option>
                        <option value={15}>15 câu</option>
                        <option value={20}>20 câu</option>
                        <option value={30}>30 câu</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleGenerateLevelExam(lvl)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-600 transition disabled:opacity-50"
                  >
                    {busy ? (
                      "Đang tổng hợp..."
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Tổng hợp &amp; Mở khóa Đề cấp này
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
