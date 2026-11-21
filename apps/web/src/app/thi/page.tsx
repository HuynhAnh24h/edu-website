"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, GraduationCap, Lock, ShieldCheck, Trophy, Unlock, Users } from "lucide-react";
import { CORE_API_URL, ExamSummary, LeaderboardEntry } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { connectRealtimeChannel } from "@/lib/realtime";

interface LevelStatus {
  level: "primary" | "middle" | "high";
  label: string;
  min_grade: number;
  max_grade: number;
  is_unlocked: boolean;
  exam_id: string;
  announcement: string;
  question_count: number;
  exam_count: number;
}

export default function ExamsLobbyPage() {
  const { accessToken, isStaff } = useAuth();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [levels, setLevels] = useState<LevelStatus[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"all" | "primary" | "middle" | "high">("all");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadLobby = useCallback(async () => {
    try {
      const [exRes, lvlRes] = await Promise.all([
        fetch(`${CORE_API_URL}/api/v1/exams`),
        fetch(`${CORE_API_URL}/api/v1/exam-levels`),
      ]);
      if (lvlRes.ok) {
        const ld = await lvlRes.json();
        setLevels(ld.levels || []);
      }
      if (exRes.ok) {
        const data = await exRes.json();
        const list = (data.exams || []) as ExamSummary[];
        setExams(list);
        if (list[0]) {
          fetch(`${CORE_API_URL}/api/v1/exams/${list[0].id}/leaderboard`)
            .then((r) => r.json())
            .then((lb) => setLeaderboard(lb.leaderboard || []))
            .catch(() => {});
        }
      }
    } catch {
      // ignore offline
    }
  }, []);

  useEffect(() => {
    void loadLobby();
  }, [loadLobby]);

  // Real-time WebSocket: tự động mở/khóa phòng thi & hiển thị đề tổng hợp mới ngay khi Admin thao tác!
  useEffect(() => {
    const conn = connectRealtimeChannel("social:feed", accessToken, {
      onEvent: (ev) => {
        if (ev.type === "exam_levels_updated") {
          void loadLobby();
        }
      },
    });
    return () => conn.close();
  }, [accessToken, loadLobby]);

  const filteredExams =
    selectedLevel === "all" ? exams : exams.filter((e) => (e.level || "high") === selectedLevel);

  return (
    <div className="space-y-6">
      {/* Header Phòng thi */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              PHÒNG THI TRỰC TUYẾN &amp; THI TỔNG HỢP THEO CẤP
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              Thi Trắc nghiệm Trực tuyến
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Luyện đề chuẩn cấu trúc mới 2025+, tự động lưu bài làm ngay trên máy khi rớt mạng và cập nhật trạng thái mở/khóa thi theo cấp Real-time từ Quản trị viên.
            </p>
          </div>
          {isStaff && (
            <Link
              href="/quan-tri"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              <GraduationCap className="h-4 w-4" /> Quản lý Mở khóa &amp; Đề thi
            </Link>
          )}
        </div>
      </div>

      {/* 3 Thẻ Cấp học (Tiểu học / THCS / THPT) — Hiển thị Mở/Khóa Real-time */}
      {levels.length > 0 && (
        <div className="grid gap-3 md:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedLevel("all")}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedLevel === "all"
                ? "border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-200"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-xs font-extrabold text-slate-900">Tất cả các cấp</p>
            <p className="mt-1 text-[11px] text-slate-500">{exams.length} đề thi hiện có</p>
          </button>

          {levels.map((l) => {
            const active = selectedLevel === l.level;
            return (
              <button
                key={l.level}
                type="button"
                onClick={() => setSelectedLevel(l.level)}
                className={`rounded-2xl border p-4 text-left transition space-y-1.5 ${
                  active
                    ? "border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900">{l.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      l.is_unlocked ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {l.is_unlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    {l.is_unlocked ? "Đang mở" : "Đang khóa"}
                  </span>
                </div>
                <p className="line-clamp-1 text-[11px] text-slate-500">
                  {l.announcement || `${l.exam_count} đề thi`}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Danh sách kỳ thi */}
        <div data-tour="exam-list" className="space-y-4 lg:col-span-8">
          {filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Chưa có đề thi nào cho cấp học này. Quản trị viên có thể tổng hợp đề theo cấp trong Trung tâm Quản trị!
            </div>
          ) : (
            filteredExams.map((ex) => {
              const unlocked = ex.is_level_unlocked !== false;
              const isComprehensive = ex.mode === "comprehensive_level";
              const canEnter = unlocked || isStaff;

              return (
                <div
                  key={ex.id}
                  className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs sm:flex-row sm:items-center ${
                    isComprehensive
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : !unlocked
                        ? "border-slate-200 bg-slate-50/70"
                        : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      {isComprehensive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-900">
                          <Trophy className="h-3 w-3 text-amber-600" /> Đề Thi Tổng Hợp Cấp
                        </span>
                      )}
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700">
                        Lớp {ex.grade_id} • {ex.subject_name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                          unlocked
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {unlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {unlocked ? "Đang mở thi" : "Chưa mở khóa thi"}
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900">{ex.title}</h2>

                    {!unlocked && ex.level_announcement && (
                      <p className="text-xs font-semibold text-rose-600">{ex.level_announcement}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {ex.duration_minutes} phút
                      </span>
                      <span>
                        {ex.question_count} câu hỏi ({ex.total_points} điểm)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {ex.participant_count.toLocaleString()} lượt thi
                      </span>
                    </div>
                  </div>

                  {canEnter ? (
                    <Link
                      href={`/thi/phong-thi?id=${ex.id}`}
                      className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-xs hover:bg-indigo-500 transition"
                    >
                      {unlocked ? "Vào phòng thi" : "Xem trước (GV/Admin)"}
                    </Link>
                  ) : (
                    <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500">
                      <Lock className="h-3.5 w-3.5" /> Chờ Admin mở khóa
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bảng xếp hạng trực tiếp */}
        <aside
          data-tour="exam-leaderboard"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Bảng xếp hạng trực tiếp</h2>
          </div>
          <div className="space-y-2.5">
            {leaderboard.map((item) => (
              <div
                key={`${item.rank}-${item.user_id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      item.rank === 1
                        ? "bg-amber-400 text-amber-950"
                        : item.rank === 2
                          ? "bg-slate-300 text-slate-800"
                          : item.rank === 3
                            ? "bg-orange-300 text-orange-950"
                            : "bg-white text-slate-600"
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.user_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {Math.floor(item.duration_sec / 60)}p {item.duration_sec % 60}s
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-indigo-700">{item.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
