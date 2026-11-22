"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Database,
  Eye,
  Flame,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Terminal,
  Trophy,
  XCircle,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CODING_TRACKS, CodingLanguage, getTrackById } from "@/lib/codingCurriculum";
import { CODING_ROADMAPS, RoadmapId, TRACK_VISUAL_META } from "@/lib/codingRoadmaps";
import { executeCodingLesson, RunResult } from "@/lib/codeRunner";

const LOCAL_PROGRESS_KEY = "eduk12_coding_progress_v1";
const LOCAL_STACK_KEY = "owlie_coding_stack_pref_v1";

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

function loadSavedStack(): { roadmapId: RoadmapId; customTracks: CodingLanguage[] } {
  if (typeof window === "undefined") {
    return { roadmapId: "frontend", customTracks: ["html", "css", "javascript"] };
  }
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_STACK_KEY) || "null");
    if (raw && raw.roadmapId) {
      return {
        roadmapId: raw.roadmapId as RoadmapId,
        customTracks: Array.isArray(raw.customTracks) && raw.customTracks.length > 0
          ? (raw.customTracks as CodingLanguage[])
          : ["html", "css", "javascript"],
      };
    }
  } catch {
    // ignore
  }
  return { roadmapId: "frontend", customTracks: ["html", "css", "javascript"] };
}

function CodingAcademyInner() {
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();

  const trackParam = searchParams.get("track") as CodingLanguage | null;
  const pathParam = searchParams.get("path") as RoadmapId | null;
  const hasExplicitTrack = Boolean(trackParam && CODING_TRACKS.some((t) => t.id === trackParam));

  // F8-style View Mode: "hub" (Lộ trình & Chọn Stack kiểu F8) | "ide" (Phòng Thực hành Code)
  const [viewMode, setViewMode] = useState<"hub" | "ide">(hasExplicitTrack ? "ide" : "hub");
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<RoadmapId>(() => {
    if (pathParam && ["frontend", "backend", "fullstack", "python-ai", "custom"].includes(pathParam)) {
      return pathParam;
    }
    return "frontend";
  });
  const [customTracks, setCustomTracks] = useState<CodingLanguage[]>(["html", "css", "javascript"]);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "Frontend" | "Backend" | "Database">("all");

  const [activeTrackId, setActiveTrackId] = useState<CodingLanguage>(
    hasExplicitTrack && trackParam ? trackParam : "html"
  );
  const [lessonIdx, setLessonIdx] = useState(0);
  const [passedMap, setPassedMap] = useState<Record<string, { code: string; passedAt: string }>>({});
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [revealedTier, setRevealedTier] = useState<0 | 1 | 2 | 3>(0);
  const [lockNotice, setLockNotice] = useState("");

  // Khôi phục Stack đã chọn từ localStorage (nếu không có ?path= trên URL)
  useEffect(() => {
    const saved = loadSavedStack();
    setCustomTracks(saved.customTracks);
    if (!pathParam) {
      setSelectedRoadmapId(saved.roadmapId);
    }
  }, [pathParam]);

  // Lưu lựa chọn Stack/Lộ trình của người dùng
  const persistStackPref = useCallback((rid: RoadmapId, cTracks: CodingLanguage[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STACK_KEY, JSON.stringify({ roadmapId: rid, customTracks: cTracks }));
    } catch {
      // ignore
    }
  }, []);

  const handleChooseRoadmap = (rid: RoadmapId) => {
    setSelectedRoadmapId(rid);
    persistStackPref(rid, customTracks);
  };

  const handleToggleCustomTrack = (tid: CodingLanguage) => {
    setCustomTracks((prev) => {
      const exists = prev.includes(tid);
      const next = exists
        ? prev.length > 1
          ? prev.filter((x) => x !== tid)
          : prev
        : [...prev, tid];
      setSelectedRoadmapId("custom");
      persistStackPref("custom", next);
      return next;
    });
  };

  const activeRoadmapObj = useMemo(
    () => CODING_ROADMAPS.find((r) => r.id === selectedRoadmapId) || null,
    [selectedRoadmapId]
  );

  const roadmapTracks: CodingLanguage[] = useMemo(() => {
    if (selectedRoadmapId === "custom") return customTracks;
    return activeRoadmapObj ? activeRoadmapObj.tracks : CODING_ROADMAPS[0].tracks;
  }, [selectedRoadmapId, customTracks, activeRoadmapObj]);

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

  // Kiểm tra xem bài idx có được mở khóa hay chưa
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

  // Thống kê tiến độ của riêng Lộ trình / Stack người dùng đang chọn
  const roadmapProgress = useMemo(() => {
    let passed = 0;
    let total = 0;
    let nextTrackToLearn: CodingLanguage = roadmapTracks[0] || "html";
    let foundNext = false;

    for (const tid of roadmapTracks) {
      const tr = getTrackById(tid);
      total += tr.lessons.length;
      const doneInTr = tr.lessons.filter((l) => Boolean(passedMap[l.id])).length;
      passed += doneInTr;
      if (!foundNext && doneInTr < tr.lessons.length) {
        nextTrackToLearn = tid;
        foundNext = true;
      }
    }
    const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { passed, total, percent, nextTrackToLearn };
  }, [roadmapTracks, passedMap]);

  const openTrackInIde = useCallback(
    (id: CodingLanguage) => {
      const tr = getTrackById(id);
      // Tự động nhảy đúng vào bài học đầu tiên chưa hoàn thành (giống F8!)
      let startIdx = 0;
      for (let i = 0; i < tr.lessons.length; i++) {
        if (!passedMap[tr.lessons[i].id]) {
          startIdx = i;
          break;
        }
        startIdx = i;
      }
      setActiveTrackId(id);
      setLessonIdx(startIdx);
      setLockNotice("");
      setViewMode("ide");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [passedMap]
  );

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

  // Phím tắt Ctrl+Enter để chạy & chấm bài nhanh trong chế độ IDE
  useEffect(() => {
    if (viewMode !== "ide") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) void handleRunCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRunCode, running, viewMode]);

  const livePreviewDoc = useMemo(() => {
    if (track.id === "html") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif;background:#fff;color:#0f172a;}</style></head><body>${code}</body></html>`;
    }
    if (track.id === "css") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;}${code}</style></head><body>${lesson.previewHtml || ""}</body></html>`;
    }
    return "";
  }, [track.id, code, lesson.previewHtml]);

  const currentIdxInRoadmap = roadmapTracks.indexOf(activeTrackId);
  const nextTrackInRoadmap =
    currentIdxInRoadmap >= 0 && currentIdxInRoadmap < roadmapTracks.length - 1
      ? roadmapTracks[currentIdxInRoadmap + 1]
      : null;

  // =========================================================================
  // CHẾ ĐỘ 1: TRUNG TÂM LỘ TRÌNH & CHỌN STACK KIỂU F8 (MẶC ĐỊNH)
  // =========================================================================
  if (viewMode === "hub") {
    const visibleCatalogTracks =
      catalogFilter === "all"
        ? CODING_TRACKS
        : CODING_TRACKS.filter((t) => t.category === catalogFilter);

    return (
      <div className="space-y-8 pb-12">
        {/* Banner F8 Style: Sáng rõ, truyền cảm hứng chọn Lộ trình & Stack */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 p-6 text-white shadow-xl sm:p-9">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
                <Flame className="h-3.5 w-3.5 text-amber-200" /> Học Lập trình Thực chiến theo Lộ trình • Miễn phí 100%
              </span>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl leading-tight">
                Chọn Stack &amp; Lộ trình Học Lập trình theo đúng mục tiêu của bạn
              </h1>
              <p className="text-xs leading-relaxed text-white/90 sm:text-sm">
                Không còn loay hoay không biết bắt đầu từ đâu — chọn sẵn lộ trình <strong>Front-end, Back-end, Fullstack, Python AI</strong> hoặc <strong>tự lắp ghép Stack riêng</strong> rồi thực hành code chấm test tự động ngay trên trình duyệt!
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => openTrackInIde(roadmapProgress.nextTrackToLearn)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-extrabold text-slate-900 shadow-lg hover:bg-amber-50 transition"
                >
                  <Play className="h-4 w-4 text-rose-600" />
                  {roadmapProgress.passed > 0
                    ? `Học tiếp lộ trình (${getTrackById(roadmapProgress.nextTrackToLearn).shortName})`
                    : `Bắt đầu ngay (${getTrackById(roadmapProgress.nextTrackToLearn).shortName})`}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#free-courses-grid"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950/25 px-5 py-3 text-xs font-bold text-white ring-1 ring-white/30 hover:bg-slate-950/40 transition"
                >
                  <Layers className="h-4 w-4" /> Xem tất cả 8 Khóa học
                </a>
              </div>
            </div>

            {/* Thẻ tiến độ cá nhân */}
            <div className="min-w-[230px] rounded-2xl bg-white/15 p-5 ring-1 ring-white/25 backdrop-blur-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-7 w-7 text-amber-300" />
                <div>
                  <p className="text-[11px] font-bold text-white/80">
                    Tiến độ {user ? user.full_name : "của bạn"}
                  </p>
                  <p className="text-xl font-black text-white">
                    {totalPassedAllTracks} / {totalLessonsAllTracks} bài
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-amber-300 transition-all"
                  style={{ width: `${Math.round((totalPassedAllTracks / totalLessonsAllTracks) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-white/85">
                Tự động đồng bộ vào{" "}
                <Link href="/hoc-ba" className="font-extrabold underline">
                  Học bạ Số
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* PHẦN 1: CHỌN LỘ TRÌNH MỤC TIÊU HOẶC TỰ LẮP GHÉP STACK (ĐÚNG CHẤT F8!) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                <Compass className="h-6 w-6 text-rose-500" />
                Bước 1: Bạn muốn theo đuổi Lộ trình / Stack nào?
              </h2>
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                Bấm chọn 1 trong 4 lộ trình nghề nghiệp chuẩn bên dưới — hoặc chọn <strong>&quot;Tự thiết kế Stack riêng&quot;</strong> để tự tích chọn các công nghệ bạn muốn học!
              </p>
            </div>
          </div>

          {/* 5 Thẻ chọn Lộ trình / Stack */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {CODING_ROADMAPS.map((rm) => {
              const active = selectedRoadmapId === rm.id;
              const rmTotal = rm.tracks.reduce((s, tid) => s + getTrackById(tid).lessons.length, 0);
              const rmDone = rm.tracks.reduce(
                (s, tid) => s + getTrackById(tid).lessons.filter((l) => Boolean(passedMap[l.id])).length,
                0
              );
              return (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => handleChooseRoadmap(rm.id)}
                  className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-rose-500 bg-rose-50/60 shadow-md ring-2 ring-rose-300"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-lg bg-gradient-to-r ${rm.gradient} px-2.5 py-1 text-[10px] font-extrabold text-white`}
                      >
                        {rm.shortTitle}
                      </span>
                      {active && <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0" />}
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">{rm.title}</h3>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{rm.audience}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] font-bold text-slate-500">
                    <span>{rm.tracks.length} khóa học</span>
                    <span className={rmDone > 0 ? "text-emerald-700" : "text-slate-400"}>
                      {rmDone}/{rmTotal} bài xong
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Thẻ #5: TỰ CHỌN STACK THEO MONG MUỐN */}
            <button
              type="button"
              onClick={() => handleChooseRoadmap("custom")}
              className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                selectedRoadmapId === "custom"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-300"
                  : "border-dashed border-indigo-300 bg-indigo-50/30 hover:border-indigo-500 hover:bg-indigo-50/60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold text-white">
                    <Sliders className="h-3 w-3" /> Tùy biến 100%
                  </span>
                  {selectedRoadmapId === "custom" && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />}
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Tự chọn Stack theo mong muốn</h3>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Tự tích chọn đúng các ngôn ngữ bạn cần (VD: Python + SQL, hay JS + MongoDB) để tạo lộ trình cá nhân.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-indigo-200/70 pt-2.5 text-[10px] font-extrabold text-indigo-700">
                <span>Đang chọn: {customTracks.length} công nghệ</span>
                <span>Tùy chỉnh →</span>
              </div>
            </button>
          </div>
        </section>

        {/* BỘ LẮP GHÉP STACK TỰ DO (HIỂN THỊ KHI CHỌN "TỰ CHỌN STACK") */}
        {selectedRoadmapId === "custom" && (
          <section className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Tự lắp ghép Stack học tập của riêng bạn
                </h3>
                <p className="text-xs text-slate-600">
                  Bấm chọn hoặc bỏ chọn các công nghệ bên dưới — lộ trình từng bước của bạn sẽ tự động cập nhật và lưu lại trên trình duyệt!
                </p>
              </div>
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                Đã chọn {customTracks.length} khóa học
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {CODING_TRACKS.map((t) => {
                const picked = customTracks.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleCustomTrack(t.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-extrabold transition ${
                      picked
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    {picked ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
                    <span>{t.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${picked ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {t.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PHẦN 2: CHI TIẾT LỘ TRÌNH TỪNG BƯỚC (BƯỚC 1 -> BƯỚC 2 -> ... CHUẨN F8) */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="max-w-2xl space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-extrabold text-rose-700">
                <Sparkles className="h-3.5 w-3.5" />
                {activeRoadmapObj ? activeRoadmapObj.badge : "Lộ trình Cá nhân hóa theo Stack bạn chọn"}
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                {activeRoadmapObj ? activeRoadmapObj.title : "Lộ trình Stack Cá nhân của bạn"}
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                {activeRoadmapObj
                  ? activeRoadmapObj.description
                  : `Lộ trình gồm ${customTracks.length} công nghệ bạn tự chọn: ${customTracks
                      .map((id) => getTrackById(id).shortName)
                      .join(" → ")}.`}
              </p>
              {activeRoadmapObj && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Kết quả đạt được: {activeRoadmapObj.outcome}
                </p>
              )}
            </div>

            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <span>Tiến độ Lộ trình này</span>
                <span className="text-indigo-700">{roadmapProgress.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all"
                  style={{ width: `${roadmapProgress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Đã vượt qua {roadmapProgress.passed} / {roadmapProgress.total} bài tập thực hành
              </p>
              <button
                type="button"
                onClick={() => openTrackInIde(roadmapProgress.nextTrackToLearn)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-rose-500 transition"
              >
                <Play className="h-3.5 w-3.5" /> Học ngay Bước tiếp theo
              </button>
            </div>
          </div>

          {/* Danh sách từng Bước trong Lộ trình */}
          <div className="space-y-4">
            {roadmapTracks.map((tid, stepIdx) => {
              const tr = getTrackById(tid);
              const vis = TRACK_VISUAL_META[tid];
              const doneCnt = tr.lessons.filter((l) => Boolean(passedMap[l.id])).length;
              const isDone = doneCnt === tr.lessons.length;
              const pct = Math.round((doneCnt / tr.lessons.length) * 100);

              return (
                <div
                  key={tid}
                  className="grid items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-indigo-300 hover:bg-white hover:shadow-sm md:grid-cols-12"
                >
                  {/* Bìa Khóa học rực rỡ kiểu F8 */}
                  <div
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${vis.coverGradient} p-5 text-white shadow-xs md:col-span-4`}
                  >
                    <span className="inline-block rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-extrabold">
                      Bước {stepIdx + 1} / {roadmapTracks.length}
                    </span>
                    <p className="mt-3 text-2xl font-black tracking-tight">{tr.shortName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/90">{vis.subtitle}</p>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/85">
                      <span>{tr.runtimeLabel}</span>
                      <span>Miễn phí</span>
                    </div>
                  </div>

                  {/* Nội dung & Tiến độ bước học */}
                  <div className="space-y-2.5 md:col-span-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                          {tr.category} • {vis.levelLabel}
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-900">{tr.name}</h3>
                      </div>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Đã hoàn thành 100%
                        </span>
                      ) : doneCnt > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                          Đang học ({doneCnt}/{tr.lessons.length} bài)
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-600">
                          {tr.lessons.length} bài chấm test tự động
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-slate-600">{vis.whatYouBuild}</p>

                    {/* Tiến độ + Nút Vào học */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                      <div className="flex-1 min-w-[160px] space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-indigo-600"}`}
                            style={{ width: `${Math.max(doneCnt > 0 ? 12 : 0, pct)}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
                          {tr.lessons.map((ls) => (
                            <span
                              key={ls.id}
                              className={`rounded px-1.5 py-0.5 ${
                                passedMap[ls.id]
                                  ? "bg-emerald-50 text-emerald-700 font-bold"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {passedMap[ls.id] ? "✓ " : ""}Bài {ls.order}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openTrackInIde(tid)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-indigo-600 transition"
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        {isDone ? "Ôn lại & Code" : doneCnt > 0 ? "Tiếp tục học" : "Vào học ngay"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 3: KHO TẤT CẢ 8 KHÓA HỌC LẬP TRÌNH MIỄN PHÍ (CARD GRID CHUẨN F8) */}
        <section id="free-courses-grid" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Khóa học Lập trình Miễn phí (8 Công nghệ cốt lõi)
              </h2>
              <p className="text-xs text-slate-500">
                Chọn học lẻ từng ngôn ngữ bất kỳ — chạy code &amp; chấm test ngay trên trình duyệt không cần cài đặt.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
              {(["all", "Frontend", "Backend", "Database"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogFilter(cat)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    catalogFilter === cat
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat === "all" ? "Tất cả (8)" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleCatalogTracks.map((t) => {
              const vis = TRACK_VISUAL_META[t.id];
              const doneCnt = t.lessons.filter((l) => Boolean(passedMap[l.id])).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTrackInIde(t.id)}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-xs transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                >
                  <div className={`bg-gradient-to-br ${vis.coverGradient} p-5 text-white`}>
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span className="rounded-full bg-black/20 px-2.5 py-0.5">{t.category}</span>
                      <span className="rounded-full bg-white/25 px-2 py-0.5">Miễn phí</span>
                    </div>
                    <p className="mt-4 text-2xl font-black tracking-tight">{t.shortName}</p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-white/90">{vis.subtitle}</p>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                        {t.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.tagline}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-bold">
                      <span className={doneCnt === t.lessons.length ? "text-emerald-600" : "text-slate-500"}>
                        {doneCnt}/{t.lessons.length} bài hoàn thành
                      </span>
                      <span className="text-indigo-600 group-hover:underline">Học ngay →</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // CHẾ ĐỘ 2: PHÒNG THỰC HÀNH CODE IDE CHẤM TEST TỰ ĐỘNG
  // =========================================================================
  return (
    <div className="space-y-5 pb-8">
      {/* Thanh điều hướng quay về Lộ trình F8 & chuyển nhanh các khóa trong Stack */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 text-white shadow-md sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode("hub")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-extrabold text-white ring-1 ring-white/20 hover:bg-white/25 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Về Lộ trình &amp; Chọn Stack
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {activeRoadmapObj ? activeRoadmapObj.shortTitle : "Stack Cá nhân"}
              {currentIdxInRoadmap >= 0 ? ` • Bước ${currentIdxInRoadmap + 1}/${roadmapTracks.length}` : ""}
            </p>
            <h1 className="text-base font-extrabold sm:text-lg">
              {track.name} — <span className="text-indigo-300">{track.runtimeLabel}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs ring-1 ring-white/15">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="font-extrabold">
            {totalPassedAllTracks}/{totalLessonsAllTracks} bài toàn hệ thống
          </span>
        </div>
      </div>

      {/* Bộ chọn nhanh 8 Khóa học (đánh dấu các khóa thuộc Stack đang theo học) */}
      <div data-tour="coding-tracks" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {CODING_TRACKS.map((t) => {
          const passedInTrack = t.lessons.filter((l) => passedMap[l.id]).length;
          const active = t.id === activeTrackId;
          const inStack = roadmapTracks.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => openTrackInIde(t.id)}
              className={`rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                  : inStack
                    ? "border-rose-200 bg-rose-50/40 text-slate-800 hover:border-rose-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold">{t.shortName}</span>
                {passedInTrack === t.lessons.length ? (
                  <CheckCircle2 className={`h-3.5 w-3.5 ${active ? "text-emerald-300" : "text-emerald-600"}`} />
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
              <p className={`mt-0.5 truncate text-[10px] ${active ? "text-indigo-100" : inStack ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                {inStack ? "★ Trong Stack" : t.category}
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
              Danh sách bài thực hành — <span className="text-indigo-600">{track.name}</span>
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
        {/* CỘT TRÁI: LÝ THUYẾT + YÊU CẦU + DỮ LIỆU MẪU + GỢI MỞ 3 TẦNG */}
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

          {/* Bảng / Collection mẫu cho PostgreSQL & MongoDB */}
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

          {/* HỆ THỐNG GỢI MỞ TƯ DUY 3 TẦNG */}
          <div
            data-tour="coding-hints"
            onCopy={(e) => e.preventDefault()}
            className="select-none rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-900">
                <Brain className="h-4 w-4 text-amber-600" />
                Gợi mở Tư duy 3 Tầng (Chống chép đáp án)
              </h4>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-amber-200">
                Đã tự thử: {attempts} lần
              </span>
            </div>

            <div className="space-y-2">
              {[
                { tier: 1 as const, minAttempts: 1, label: "Tầng 1: Câu hỏi Phân tích Bài toán" },
                { tier: 2 as const, minAttempts: 2, label: "Tầng 2: Dàn ý Thuật toán từng bước" },
                { tier: 3 as const, minAttempts: 3, label: "Tầng 3: Khung cú pháp khuyết (___) để tự gõ" },
              ].map((step) => {
                const isRevealed = revealedTier >= step.tier;
                const canReveal = attempts >= step.minAttempts && revealedTier === step.tier - 1;
                const remaining = Math.max(0, step.minAttempts - attempts);

                return (
                  <div
                    key={step.tier}
                    className={`rounded-xl border p-3 transition ${
                      isRevealed ? "border-amber-300 bg-white" : "border-amber-200/70 bg-white/60"
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
                            {remaining > 0 ? `Cần tự chạy thử thêm ${remaining} lần` : `Mở Tầng ${step.tier - 1} trước`}
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
                Bí ý tưởng? Hỏi AI Gia sư để được gợi mở từng bước!
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
              ) : isCurrentPassed && nextTrackInRoadmap ? (
                <button
                  type="button"
                  onClick={() => openTrackInIde(nextTrackInRoadmap)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-300 transition"
                >
                  Sang khóa kế tiếp ({getTrackById(nextTrackInRoadmap).shortName}) <ArrowRight className="h-4 w-4" />
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
          Đang khởi tạo Học viện Lập trình &amp; Lộ trình Stack...
        </div>
      }
    >
      <CodingAcademyInner />
    </Suspense>
  );
}
