"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Lock, ShieldCheck, Trophy, Users } from "lucide-react";
import { CORE_API_URL, ExamSummary, LeaderboardEntry } from "@/lib/api";

export default function ExamsLobbyPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/exams`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.exams || []) as ExamSummary[];
        setExams(list);
        if (list[0]) {
          fetch(`${CORE_API_URL}/api/v1/exams/${list[0].id}/leaderboard`)
            .then((r) => r.json())
            .then((lb) => setLeaderboard(lb.leaderboard || []))
            .catch(() => {});
        }
      })
      .catch(() => setExams([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              KIẾN TRÚC PHÒNG THI CHỊU TẢI 1.000.000 CCU
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Thi Trắc nghiệm Trực tuyến
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Đề thi được tiền mã hóa <strong>AES-256-GCM</strong> (phát qua CDN không chạm Database), giải mã cục bộ bằng Web Crypto API, lưu nháp offline <strong>IndexedDB</strong> và chấm điểm qua <strong>Async Worker Pool</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Danh sách kỳ thi */}
        <div className="space-y-4 lg:col-span-8">
          {exams.map((ex) => (
            <div
              key={ex.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700">
                    Lớp {ex.grade_id} • {ex.subject_name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 ${
                      ex.mode === "mock_live"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {ex.mode === "mock_live" ? "Thi thử đồng loạt" : "Luyện đề tự do"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Lock className="h-3 w-3" /> AES-256-GCM v{ex.bundle_version}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{ex.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {ex.duration_minutes} phút
                  </span>
                  <span>{ex.question_count} câu hỏi ({ex.total_points} điểm)</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {ex.participant_count.toLocaleString()} lượt thi
                  </span>
                </div>
              </div>

              <Link
                href={`/thi/phong-thi?id=${ex.id}`}
                className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
              >
                Vào phòng thi
              </Link>
            </div>
          ))}
        </div>

        {/* Bảng xếp hạng trực tiếp */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Bảng xếp hạng trực tiếp
            </h2>
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
                    <p className="text-xs font-semibold text-slate-800">
                      {item.user_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {Math.floor(item.duration_sec / 60)}p {item.duration_sec % 60}s
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-indigo-700">
                  {item.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
