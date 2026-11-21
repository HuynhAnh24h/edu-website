"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  Code2,
  Database,
  Eye,
  Lightbulb,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Trophy,
  XCircle,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CODING_TRACKS, CodingLanguage, getTrackById } from "@/lib/codingCurriculum";
import { executeCodingLesson, RunResult } from "@/lib/codeRunner";

const LOCAL_PROGRESS_KEY = "eduk12_coding_progress_v1";

function loadLocalProgress(): Record<string, { code: string; passedAt: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalProgress(map: Record<string, { code: string; passedAt: string }>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota
  }
}

function CodingAcademyInner() {
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();

  const initialTrackParam = (searchParams.get("track") || "html") as CodingLanguage;
  const [activeTrackId, setActiveTrackId] = useState<CodingLanguage>(
    CODING_TRACKS.some((t) => t.id === initialTrackParam) ? initialTrackParam : "html"
  );
  const [lessonIdx, setLessonIdx] = useState(0);
  const [passedMap, setPassedMap] = useState<Record<string, { code: string; passedAt: string }>>({});
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [revealedTier, setRevealedTier] = useState<0 | 1 | 2 | 3>(0);
  const [lockNotice, setLockNotice] = useState("");

  const track = useMemo(() => getTrackById(activeTrackId), [activeTrackId]);
  const lesson = track.lessons[lessonIdx] || track.lessons[0];

  // Đồng bộ tiến độ từ localStorage & Cloudflare D1 khi đăng nhập
  useEffect(() => {
    const local = loadLocalProgress();
    setPassedMap(local);

    if (!accessToken) return;
    fetch(`${CORE_API_URL}/api/v1/coding/progress`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.passed) {
          const merged = { ...local };
          for (const [lid, info] of Object.entries(
            data.passed as Record<string, { code: string; passed_at: string }>
          )) {
            merged[lid] = { code: info.code || "", passedAt: info.passed_at || "" };
          }
          setPassedMap(merged);
          saveLocalProgress(merged);
        }
      })
      .catch(() => {});
  }, [accessToken]);

  // Khi đổi bài hoặc đổi khóa -> nạp code mẫu hoặc code đã làm trước đó
  useEffect(() => {
    const saved = passedMap[lesson.id]?.code;
    setCode(saved && saved.trim() ? saved : lesson.starterCode);
    setRunResult(null);
    setAttempts(0);
    setRevealedTier(0);
    setLockNotice("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // Kiểm tra xem bài idx có được mở khóa hay chưa (Bài 0 luôn mở, Bài i mở khi Bài i-1 đã PASS)
  const isLessonUnlocked = useCallback(
    (idx: number) => {
      if (idx === 0) return true;
      const prevLesson = track.lessons[idx - 1];
      return Boolean(prevLesson && passedMap[prevLesson.id]);
    },
    [track.lessons, passedMap]
  );

  const isCurrentPassed = Boolean(passedMap[lesson.id]);
  const hasNextLesson = lessonIdx < track.lessons.length - 1;
  const totalPassedAllTracks = useMemo(() => {
    let cnt = 0;
    for (const t of CODING_TRACKS) {
      for (const l of t.lessons) {
        if (passedMap[l.id]) cnt++;
      }
    }
    return cnt;
  }, [passedMap]);
  const totalLessonsAllTracks = useMemo(
    () => CODING_TRACKS.reduce((s, t) => s + t.lessons.length, 0),
    []
  );

  const handleSelectTrack = (id: CodingLanguage) => {
    setActiveTrackId(id);
    setLessonIdx(0);
    setLockNotice("");
  };

  const handleSelectLesson = (idx: number) => {
    if (!isLessonUnlocked(idx)) {
      setLockNotice(
        `Bài ${idx + 1} đang bị khóa! Bạn phải chạy code ĐÚNG 100% test case của Bài ${idx} mới được mở khóa bài tiếp theo.`
      );
      return;
    }
    setLockNotice("");
    setLessonIdx(idx);
  };

  const handleRunCode = useCallback(async () => {
    setRunning(true);
    setLockNotice("");
    setAttempts((n) => n + 1);
    try {
      const result = await executeCodingLesson(lesson, code);
      setRunResult(result);

      if (result.allPassed) {
        const nextMap = {
          ...passedMap,
          [lesson.id]: { code, passedAt: new Date().toISOString() },
        };
        setPassedMap(nextMap);
        saveLocalProgress(nextMap);

        if (accessToken) {
          void fetch(`${CORE_API_URL}/api/v1/coding/progress`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              track_id: track.id,
              lesson_id: lesson.id,
              submitted_code: code,
            }),
          }).catch(() => {});
        }
      }
    } finally {
      setRunning(false);
    }
  }, [lesson, code, passedMap, accessToken, track.id]);

  // Phím tắt Ctrl+Enter để chạy & chấm bài nhanh
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) void handleRunCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRunCode, running]);

  const livePreviewDoc = useMemo(() => {
    if (track.id === "html") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif;background:#fff;color:#0f172a;}</style></head><body>${code}</body></html>`;
    }
    if (track.id === "css") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;}${code}</style></head><body>${lesson.previewHtml || ""}</body></html>`;
    }
    return "";
  }, [track.id, code, lesson.previewHtml]);

  return (
    <div className="space-y-6">
      {/* Header Cộng đồng Lập trình */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
            <Code2 className="h-3.5 w-3.5" /> HỌC VIỆN LẬP TRÌNH CỘNG ĐỒNG • 100% MIỄN PHÍ
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Thực hành Code trực tiếp trên Trình duyệt
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            8 lộ trình: <strong>HTML, CSS, JavaScript, TypeScript, Python, Golang, MongoDB, PostgreSQL</strong> — Hệ thống chấm test tự động: <strong>chạy ĐÚNG mới mở khóa bài tiếp theo!</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
          <Trophy className="h-7 w-7 text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold text-slate-300">
              Tiến độ {user ? user.full_name : "Cộng đồng"}
            </p>
            <p className="text-lg font-extrabold text-white">
              {totalPassedAllTracks} / {totalLessonsAllTracks} bài đã vượt qua
            </p>
          </div>
        </div>
      </div>

      {/* Bộ chọn 8 Khóa học Lập trình */}
      <div data-tour="coding-tracks" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {CODING_TRACKS.map((t) => {
          const passedInTrack = t.lessons.filter((l) => passedMap[l.id]).length;
          const active = t.id === activeTrackId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTrack(t.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold">{t.shortName}</span>
                {passedInTrack === t.lessons.length ? (
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${active ? "text-emerald-300" : "text-emerald-600"}`}
                  />
                ) : (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {passedInTrack}/{t.lessons.length}
                  </span>
                )}
              </div>
              <p
                className={`mt-1 truncate text-[10px] ${
                  active ? "text-indigo-100" : "text-slate-500"
                }`}
              >
                {t.category}
              </p>
            </button>
          );
        })}
      </div>

      {/* Thanh Lộ trình Bài học (Hiển thị rõ Khóa / Đã qua) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {track.name} — <span className="text-indigo-600">{track.runtimeLabel}</span>
            </h2>
            <p className="text-xs text-slate-500">{track.tagline}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
            <Lock className="h-3 w-3" /> Luật qua bài: Phải PASS 100% Test Case mới mở bài kế tiếp
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {track.lessons.map((l, idx) => {
            const unlocked = isLessonUnlocked(idx);
            const passed = Boolean(passedMap[l.id]);
            const isCurrent = idx === lessonIdx;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelectLesson(idx)}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                  isCurrent
                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                    : unlocked
                      ? "border-slate-200 bg-white hover:border-indigo-300"
                      : "cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-75"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Bài {idx + 1} • {l.difficulty}
                  </p>
                  <p className="truncate text-xs font-bold text-slate-900">{l.title}</p>
                </div>
                {passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : unlocked ? (
                  <Play className="h-4 w-4 shrink-0 text-indigo-600" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>

        {lockNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{lockNotice}</span>
          </div>
        )}
      </div>

      {/* KHÔNG GIAN IDE CHIA ĐÔI: LÝ THUYẾT & ĐỀ BÀI (TRÁI) | CODE EDITOR & CHẤM TEST (PHẢI) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* CỘT TRÁI: LÝ THUYẾT + YÊU CẦU + DỮ LIỆU MẪU */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${track.accentBg} ${track.accentText}`}>
              {track.shortName} • Bài {lesson.order}/{track.lessons.length}
            </span>
            {isCurrentPassed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> Đã hoàn thành
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{lesson.title}</h3>
            <p className="mt-1 text-xs text-slate-600">{lesson.summary}</p>
          </div>

          {/* Kiến thức nhanh */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Kiến thức trọng tâm
            </h4>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
              {lesson.theory.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Đề bài kiểm tra */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-indigo-800">
              Yêu cầu Bài kiểm tra
            </h4>
            <p className="text-xs leading-relaxed font-medium text-slate-800">
              {lesson.taskPrompt}
            </p>
          </div>

          {/* Hiển thị Bảng / Collection mẫu cho PostgreSQL & MongoDB */}
          {lesson.sqlTables && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Database className="h-3.5 w-3.5 text-indigo-600" /> Bảng dữ liệu mẫu PostgreSQL
              </h4>
              {Object.entries(lesson.sqlTables).map(([tName, rows]) => (
                <div key={tName} className="space-y-1">
                  <p className="font-mono text-[11px] font-bold text-indigo-700">TABLE {tName}</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 font-mono text-slate-600">
                        <tr>
                          {Object.keys(rows[0] || {}).map((col) => (
                            <th key={col} className="px-2 py-1">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {rows.map((r, ri) => (
                          <tr key={ri}>
                            {Object.values(r).map((val, vi) => (
                              <td key={vi} className="px-2 py-1 text-slate-700">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lesson.mongoCollections && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Database className="h-3.5 w-3.5 text-green-600" /> Collection dữ liệu mẫu MongoDB
              </h4>
              {Object.entries(lesson.mongoCollections).map(([cName, docs]) => (
                <div key={cName}>
                  <p className="font-mono text-[11px] font-bold text-green-700">db.{cName}</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-emerald-300">
                    {JSON.stringify(docs, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* HỆ THỐNG GỢI MỞ TƯ DUY 3 TẦNG (CHỐNG COPY ĐÁP ÁN) */}
          <div
            data-tour="coding-hints"
            onCopy={(e) => e.preventDefault()}
            className="select-none rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-900">
                <Brain className="h-4 w-4 text-amber-600" />
                Gợi mở Tư duy 3 Tầng (Không đưa đáp án chép sẵn)
              </h4>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-amber-200">
                Đã tự thử: {attempts} lần
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-600">
              Để thực sự hiểu bài, hệ thống <strong>không hiện lời giải copy-paste</strong>. Hãy tự suy nghĩ và bấm <strong>Chạy &amp; Kiểm tra</strong> trước — mỗi lần tự thử sẽ mở thêm 1 tầng gợi mở tư duy:
            </p>

            <div className="space-y-2">
              {[
                {
                  tier: 1 as const,
                  minAttempts: 1,
                  label: "Tầng 1: Câu hỏi Phân tích Bài toán",
                  badge: "Mở sau 1 lần chạy thử",
                },
                {
                  tier: 2 as const,
                  minAttempts: 2,
                  label: "Tầng 2: Dàn ý Thuật toán từng bước",
                  badge: "Mở sau 2 lần chạy thử",
                },
                {
                  tier: 3 as const,
                  minAttempts: 3,
                  label: "Tầng 3: Khung cú pháp khuyết (___) để tự gõ",
                  badge: "Mở sau 3 lần chạy thử",
                },
              ].map((step) => {
                const isRevealed = revealedTier >= step.tier;
                const canReveal =
                  attempts >= step.minAttempts && revealedTier === step.tier - 1;
                const remaining = Math.max(0, step.minAttempts - attempts);

                return (
                  <div
                    key={step.tier}
                    className={`rounded-xl border p-3 transition ${
                      isRevealed
                        ? "border-amber-300 bg-white"
                        : "border-amber-200/70 bg-white/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        {isRevealed ? (
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {step.label}
                      </span>

                      {!isRevealed &&
                        (canReveal ? (
                          <button
                            type="button"
                            onClick={() => setRevealedTier(step.tier)}
                            className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-400 transition"
                          >
                            Mở gợi mở Tầng {step.tier}
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {remaining > 0
                              ? `Cần tự chạy thử thêm ${remaining} lần`
                              : `Mở Tầng ${step.tier - 1} trước`}
                          </span>
                        ))}
                    </div>

                    {isRevealed && (
                      <div className="mt-2 whitespace-pre-wrap border-t border-amber-100 pt-2 text-xs leading-relaxed text-slate-700 font-medium">
                        {lesson.thinkingHints[step.tier - 1]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/70 pt-2.5">
              <span className="text-[10px] font-semibold text-amber-800">
                Bí ý tưởng? Hỏi AI Gia sư để được gợi mở theo từng bước!
              </span>
              <Link
                href={`/ai-gia-su?grade=12&subject=tin-hoc&q=${encodeURIComponent(
                  `Em đang tự giải bài lập trình ${track.shortName}: "${lesson.title}". Xin đừng viết sẵn lời giải hoàn chỉnh, hãy gợi mở tư duy từng bước giúp em tự làm nhé!`
                )}`}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-500 transition"
              >
                <Bot className="h-3.5 w-3.5" /> Hỏi AI Gia sư Socratic
              </Link>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: TRÌNH SOẠN THẢO CODE + XEM TRƯỚC + CHẤM TEST TỰ ĐỘNG */}
        <div className="space-y-4 lg:col-span-7">
          <div data-tour="coding-editor" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
            {/* Thanh công cụ Editor */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-[11px] font-bold text-slate-300">
                  {lesson.id}.
                  {track.id === "javascript"
                    ? "js"
                    : track.id === "typescript"
                      ? "ts"
                      : track.id === "python"
                        ? "py"
                        : track.id === "golang"
                          ? "go"
                          : track.id === "postgresql"
                            ? "sql"
                            : track.id === "mongodb"
                              ? "mongosh.js"
                              : track.id}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCode(lesson.starterCode);
                  setRunResult(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" /> Khôi phục mẫu
              </button>
            </div>

            {/* Textarea Code Editor hỗ trợ phím Tab */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = code.slice(0, start) + "  " + code.slice(end);
                  setCode(next);
                  requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                  });
                }
              }}
              spellCheck={false}
              rows={12}
              className="w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 focus:outline-none sm:text-sm"
            />

            {/* Thanh Chạy Code & Chuyển Bài (Khóa cứng nếu chưa PASS) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-3">
              <button
                type="button"
                data-tour="coding-run-btn"
                disabled={running}
                onClick={() => void handleRunCode()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {track.id === "python"
                      ? "Đang chạy Python WebAssembly..."
                      : track.id === "golang"
                        ? "Đang biên dịch Go..."
                        : "Đang chấm bài..."}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Chạy &amp; Kiểm tra (Ctrl+Enter)
                  </>
                )}
              </button>

              {hasNextLesson ? (
                <button
                  type="button"
                  disabled={!isCurrentPassed}
                  onClick={() => handleSelectLesson(lessonIdx + 1)}
                  title={
                    isCurrentPassed
                      ? "Chuyển sang bài tiếp theo"
                      : "Phải chạy ĐÚNG 100% test case mới được mở khóa bài tiếp theo!"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                    isCurrentPassed
                      ? "bg-emerald-500 text-white shadow hover:bg-emerald-400"
                      : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCurrentPassed ? (
                    <>
                      Chuyển bài tiếp theo <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Chưa qua bài (Bị khóa)
                    </>
                  )}
                </button>
              ) : isCurrentPassed ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-500/40">
                  <Trophy className="h-4 w-4 text-amber-400" /> Hoàn thành trọn khóa {track.shortName}!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                  <Lock className="h-3.5 w-3.5" /> Đạt 100% test để hoàn thành khóa học
                </span>
              )}
            </div>
          </div>

          {/* Khung Xem trước Live cho HTML & CSS */}
          {(track.id === "html" || track.id === "css") && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700">
                <Eye className="h-3.5 w-3.5 text-indigo-600" /> Xem trước Giao diện Trực tiếp (Live Preview)
              </div>
              <iframe
                title="Live Preview"
                sandbox="allow-same-origin"
                srcDoc={livePreviewDoc}
                className="h-48 w-full border-0 bg-white"
              />
            </div>
          )}

          {/* Bảng Kết quả Chấm Test & Console Output */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Terminal className="h-4 w-4 text-indigo-600" /> Kết quả Chấm Test Tự động
              </h4>
              {runResult && (
                <div className="flex flex-wrap items-center gap-2">
                  {runResult.allPassed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                      <Sparkles className="h-3.5 w-3.5" />
                      {revealedTier === 0
                        ? "Tự lực xuất sắc (0/3 gợi mở)"
                        : `Tư duy tốt (dùng ${revealedTier}/3 gợi mở)`}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${
                      runResult.allPassed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {runResult.allPassed ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> ĐẠT 100% — ĐÃ MỞ KHÓA BÀI TIẾP THEO!
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" /> CHƯA ĐẠT — KHÔNG THỂ QUA BÀI
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            {!runResult ? (
              <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                Bấm <strong>Chạy &amp; Kiểm tra</strong> (hoặc <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px]">Ctrl + Enter</kbd>) để thực thi code của bạn và kiểm tra toàn bộ test case.
              </p>
            ) : (
              <div className="space-y-3">
                {runResult.error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <pre className="whitespace-pre-wrap font-mono">{runResult.error}</pre>
                  </div>
                )}

                <div className="space-y-2">
                  {runResult.tests.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-xs ${
                        t.passed
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                          : "border-rose-200 bg-rose-50/70 text-rose-900"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <div>
                          <p className="font-bold">{t.label}</p>
                          {t.detail && <p className="mt-0.5 text-[11px] opacity-85">{t.detail}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-extrabold uppercase">
                        {t.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>

                {runResult.consoleOutput && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-slate-500">
                      Console / Kết quả trả về
                    </p>
                    <pre className="max-h-44 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
                      {runResult.consoleOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CodingAcademyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-slate-500">
          Đang khởi tạo Trình thực hành Lập trình trên trình duyệt...
        </div>
      }
    >
      <CodingAcademyInner />
    </Suspense>
  );
}
