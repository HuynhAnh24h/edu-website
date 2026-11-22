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
import { CODING_TRACKS, CodingLanguage, CodingLesson, CodingTrack } from "@/lib/codingCurriculum";
import {
  ClusterId,
  CODING_CLUSTERS,
  CODING_ROADMAPS,
  getClusterById,
  RoadmapId,
  TRACK_VISUAL_META,
} from "@/lib/codingRoadmaps";
import { executeCodingLesson, RunResult } from "@/lib/codeRunner";

const LOCAL_PROGRESS_KEY = "eduk12_coding_progress_v1";
const LOCAL_STACK_KEY = "owlie_coding_cluster_stack_v2";

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

function loadSavedClusterPref(): { roadmapId: RoadmapId; customClusters: ClusterId[] } {
  if (typeof window === "undefined") {
    return { roadmapId: "frontend", customClusters: ["html-css", "js-ts", "react-next"] };
  }
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_STACK_KEY) || "null");
    if (raw && raw.roadmapId) {
      return {
        roadmapId: raw.roadmapId as RoadmapId,
        customClusters:
          Array.isArray(raw.customClusters) && raw.customClusters.length > 0
            ? (raw.customClusters as ClusterId[])
            : ["html-css", "js-ts", "react-next"],
      };
    }
  } catch {
    // ignore
  }
  return { roadmapId: "frontend", customClusters: ["html-css", "js-ts", "react-next"] };
}

function CodingAcademyInner() {
  const searchParams = useSearchParams();
  const { accessToken, user, isStaff } = useAuth();

  const [adminLessons, setAdminLessons] = useState<CodingLesson[]>([]);
  const [trackModes, setTrackModes] = useState<Record<string, "append" | "admin_only">>({});
  const [showAllClustersInIde, setShowAllClustersInIde] = useState(false);

  // Tải bài lập trình do Admin cấp theo từng môn từ Cloudflare D1
  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/coding/lessons`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.lessons) setAdminLessons(d.lessons as CodingLesson[]);
        if (d?.track_modes) setTrackModes(d.track_modes as Record<string, "append" | "admin_only">);
      })
      .catch(() => {});
  }, []);

  const dynamicTracks: CodingTrack[] = useMemo(() => {
    return CODING_TRACKS.map((base) => {
      const adm = adminLessons
        .filter((l) => l.trackId === base.id)
        .sort((a, b) => a.order - b.order);
      if (adm.length === 0) return base;
      const mode = trackModes[base.id] || "append";
      const merged =
        mode === "admin_only"
          ? adm.map((l, i) => ({ ...l, order: i + 1 }))
          : [...base.lessons, ...adm].map((l, i) => ({ ...l, order: i + 1 }));
      return { ...base, lessons: merged };
    });
  }, [adminLessons, trackModes]);

  const getTrackById = useCallback(
    (id: CodingLanguage): CodingTrack => dynamicTracks.find((t) => t.id === id) || dynamicTracks[0],
    [dynamicTracks]
  );

  const trackParam = searchParams.get("track") as CodingLanguage | null;
  const pathParam = searchParams.get("path") as RoadmapId | null;
  const hasExplicitTrack = Boolean(trackParam && CODING_TRACKS.some((t) => t.id === trackParam));

  // Mode 1: "hub" (Lộ trình phân cấp theo Cụm kiểu F8) | Mode 2: "ide" (Phòng Thực hành Code)
  const [viewMode, setViewMode] = useState<"hub" | "ide">(hasExplicitTrack ? "ide" : "hub");
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<RoadmapId>(() => {
    if (pathParam && ["frontend", "backend-node", "fullstack", "go-python-ai", "custom"].includes(pathParam)) {
      return pathParam;
    }
    return "frontend";
  });
  const [customClusters, setCustomClusters] = useState<ClusterId[]>(["html-css", "js-ts", "react-next"]);
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

  useEffect(() => {
    const saved = loadSavedClusterPref();
    setCustomClusters(saved.customClusters);
    if (!pathParam) {
      setSelectedRoadmapId(saved.roadmapId);
    }
  }, [pathParam]);

  const persistStackPref = useCallback((rid: RoadmapId, cClusters: ClusterId[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STACK_KEY, JSON.stringify({ roadmapId: rid, customClusters: cClusters }));
    } catch {
      // ignore
    }
  }, []);

  const handleChooseRoadmap = (rid: RoadmapId) => {
    setSelectedRoadmapId(rid);
    persistStackPref(rid, customClusters);
  };

  const handleToggleCustomCluster = (cid: ClusterId) => {
    setCustomClusters((prev) => {
      const exists = prev.includes(cid);
      const next = exists
        ? prev.length > 1
          ? prev.filter((x) => x !== cid)
          : prev
        : [...prev, cid];
      // Giữ thứ tự phân cấp chuẩn (Cấp 1 -> Cấp 2 -> Cấp 3 -> Cấp 4)
      const ordered = CODING_CLUSTERS.map((c) => c.id).filter((id) => next.includes(id));
      setSelectedRoadmapId("custom");
      persistStackPref("custom", ordered);
      return ordered;
    });
  };

  const activeRoadmapObj = useMemo(
    () => CODING_ROADMAPS.find((r) => r.id === selectedRoadmapId) || null,
    [selectedRoadmapId]
  );

  const activeClusterIds: ClusterId[] = useMemo(() => {
    if (selectedRoadmapId === "custom") return customClusters;
    return activeRoadmapObj ? activeRoadmapObj.clusters : CODING_ROADMAPS[0].clusters;
  }, [selectedRoadmapId, customClusters, activeRoadmapObj]);

  const roadmapTracks: CodingLanguage[] = useMemo(() => {
    const list: CodingLanguage[] = [];
    for (const cid of activeClusterIds) {
      for (const tid of getClusterById(cid).tracks) {
        if (!list.includes(tid)) list.push(tid);
      }
    }
    return list;
  }, [activeClusterIds]);

  const track = useMemo(() => getTrackById(activeTrackId), [activeTrackId, getTrackById]);
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

  useEffect(() => {
    const saved = passedMap[lesson.id]?.code;
    setCode(saved && saved.trim() ? saved : lesson.starterCode);
    setRunResult(null);
    setAttempts(0);
    setRevealedTier(0);
    setLockNotice("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

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
    for (const t of dynamicTracks) {
      for (const l of t.lessons) {
        if (passedMap[l.id]) cnt++;
      }
    }
    return cnt;
  }, [dynamicTracks, passedMap]);

  const totalLessonsAllTracks = useMemo(
    () => dynamicTracks.reduce((s, t) => s + t.lessons.length, 0),
    [dynamicTracks]
  );

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
  }, [roadmapTracks, passedMap, getTrackById]);

  const openTrackInIde = useCallback(
    (id: CodingLanguage) => {
      const tr = getTrackById(id);
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
    [passedMap, getTrackById]
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

  const activeClusterForIde = useMemo(
    () => CODING_CLUSTERS.find((c) => c.tracks.includes(activeTrackId)) || CODING_CLUSTERS[0],
    [activeTrackId]
  );

  // =========================================================================
  // CHẾ ĐỘ 1: LỘ TRÌNH PHÂN CẤP THEO CỤM CÔNG NGHỆ KIỂU F8
  // =========================================================================
  if (viewMode === "hub") {
    const visibleCatalogClusters =
      catalogFilter === "all"
        ? CODING_CLUSTERS
        : CODING_CLUSTERS.filter((c) => c.category === catalogFilter);

    return (
      <div className="space-y-8 pb-12">
        {/* Banner F8 Style */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 p-6 text-white shadow-xl sm:p-9">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
                <Flame className="h-3.5 w-3.5 text-amber-200" /> 6 Cụm Công nghệ • 12 Khóa Thực chiến • Chấm Test Tự động
              </span>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl leading-tight">
                Lộ trình Học Lập trình Phân cấp theo Cụm Stack chuẩn Doanh nghiệp
              </h1>
              <p className="text-xs leading-relaxed text-white/90 sm:text-sm">
                Học theo từng cụm bài bản: <strong>HTML &amp; CSS</strong> → <strong>JS &amp; TS</strong> →{" "}
                <strong>React &amp; Next.js</strong> → <strong>Node.js &amp; NestJS</strong> →{" "}
                <strong>Golang &amp; Python</strong> → <strong>MongoDB &amp; PostgreSQL</strong> — chọn lộ trình sẵn hoặc tự ghép cụm bạn muốn!
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => openTrackInIde(roadmapProgress.nextTrackToLearn)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-extrabold text-slate-900 shadow-lg hover:bg-amber-50 transition"
                >
                  <Play className="h-4 w-4 text-rose-600" />
                  {roadmapProgress.passed > 0
                    ? `Học tiếp (${getTrackById(roadmapProgress.nextTrackToLearn).shortName})`
                    : `Bắt đầu ngay (${getTrackById(roadmapProgress.nextTrackToLearn).shortName})`}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#all-clusters-catalog"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950/25 px-5 py-3 text-xs font-bold text-white ring-1 ring-white/30 hover:bg-slate-950/40 transition"
                >
                  <Layers className="h-4 w-4" /> Xem tất cả 6 Cụm (12 Khóa)
                </a>
              </div>
            </div>

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
                Tự động lưu tiến độ vào{" "}
                <Link href="/hoc-ba" className="font-extrabold underline">
                  Học bạ Số
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* PHẦN 1: CHỌN LỘ TRÌNH MỤC TIÊU HOẶC TỰ LẮP GHÉP CỤM STACK */}
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
              <Compass className="h-6 w-6 text-rose-500" />
              Bước 1: Chọn Lộ trình Nghề nghiệp hoặc Tự ghép Cụm Stack
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Mỗi lộ trình tự động sắp xếp đúng thứ tự từ Nền tảng → Ngôn ngữ cốt lõi → Framework → Cơ sở dữ liệu.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {CODING_ROADMAPS.map((rm) => {
              const active = selectedRoadmapId === rm.id;
              const rmTracks = rm.clusters.flatMap((cid) => getClusterById(cid).tracks);
              const rmTotal = rmTracks.reduce((s, tid) => s + getTrackById(tid).lessons.length, 0);
              const rmDone = rmTracks.reduce(
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
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {rm.clusters.map((cid) => (
                        <span
                          key={cid}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700"
                        >
                          {getClusterById(cid).shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] font-bold text-slate-500">
                    <span>{rm.clusters.length} cụm ({rmTracks.length} khóa)</span>
                    <span className={rmDone > 0 ? "text-emerald-700" : "text-slate-400"}>
                      {rmDone}/{rmTotal} bài
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Thẻ #5: TỰ LẮP GHÉP CỤM STACK RIÊNG */}
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
                    <Sliders className="h-3 w-3" /> Tự chọn Cụm
                  </span>
                  {selectedRoadmapId === "custom" && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />}
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Tự lắp ghép Cụm Stack riêng</h3>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Tích chọn đúng các cụm bạn muốn (VD: React &amp; Next.js + Node &amp; NestJS + Postgres).
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-indigo-200/70 pt-2.5 text-[10px] font-extrabold text-indigo-700">
                <span>Đang chọn: {customClusters.length} cụm</span>
                <span>Tùy chỉnh →</span>
              </div>
            </button>
          </div>
        </section>

        {/* BỘ TỰ CHỌN CỤM STACK (HIỆN KHI CHỌN CUSTOM) */}
        {selectedRoadmapId === "custom" && (
          <section className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Tích chọn các Cụm Công nghệ cho Lộ trình riêng của bạn
                </h3>
                <p className="text-xs text-slate-600">
                  Hệ thống sẽ tự động sắp xếp các cụm bạn chọn theo đúng thứ tự phân cấp từ Nền tảng → Framework → Database!
                </p>
              </div>
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                {customClusters.length} cụm ({roadmapTracks.length} khóa học)
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {CODING_CLUSTERS.map((c) => {
                const picked = customClusters.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleCustomCluster(c.id)}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                      picked
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div>
                      <p className={`text-[10px] font-bold ${picked ? "text-indigo-200" : "text-slate-400"}`}>
                        {c.stageLevel}
                      </p>
                      <p className="text-xs font-extrabold">{c.title}</p>
                    </div>
                    {picked ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PHẦN 2: CÂY LỘ TRÌNH PHÂN CẤP THEO TỪNG CỤM (GIAI ĐOẠN 1 -> 2 -> 3 -> 4) */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="max-w-2xl space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-extrabold text-rose-700">
                <Sparkles className="h-3.5 w-3.5" />
                {activeRoadmapObj ? activeRoadmapObj.badge : "Lộ trình Cá nhân hóa theo Cụm Stack"}
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                {activeRoadmapObj ? activeRoadmapObj.title : "Lộ trình Cụm Stack Cá nhân của bạn"}
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                {activeRoadmapObj
                  ? activeRoadmapObj.description
                  : `Lộ trình phân cấp gồm ${activeClusterIds.length} cụm: ${activeClusterIds
                      .map((cid) => getClusterById(cid).shortLabel)
                      .join(" → ")}.`}
              </p>
              {activeRoadmapObj && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Kết quả đạt được: {activeRoadmapObj.outcome}
                </p>
              )}
            </div>

            <div className="min-w-[230px] rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
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
                <Play className="h-3.5 w-3.5" /> Học ngay bài tiếp theo
              </button>
            </div>
          </div>

          {/* TIMELINE PHÂN CẤP CÁC CỤM CÔNG NGHỆ */}
          <div className="relative space-y-6">
            {activeClusterIds.map((cid, stageIdx) => {
              const cluster = getClusterById(cid);
              const cTracks = cluster.tracks.map((tid) => getTrackById(tid));
              const cTotal = cTracks.reduce((s, tr) => s + tr.lessons.length, 0);
              const cDone = cTracks.reduce(
                (s, tr) => s + tr.lessons.filter((l) => Boolean(passedMap[l.id])).length,
                0
              );
              const cPct = cTotal > 0 ? Math.round((cDone / cTotal) * 100) : 0;
              const clusterDone = cDone === cTotal;

              return (
                <div key={cid} className="relative pl-10 sm:pl-12">
                  {/* Đường nối phân cấp giữa các Cụm */}
                  {stageIdx < activeClusterIds.length - 1 && (
                    <div className="absolute top-10 bottom-[-24px] left-4 w-0.5 bg-slate-200 sm:left-5" />
                  )}

                  {/* Số thứ tự Giai đoạn */}
                  <div
                    className={`absolute top-1 left-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-sm sm:h-10 sm:w-10 sm:text-sm ${
                      clusterDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {clusterDone ? <Check className="h-4 w-4" /> : stageIdx + 1}
                  </div>

                  {/* Khối Cụm Công nghệ (Gồm 2 công nghệ đi cặp bên trong) */}
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 ring-1 ring-slate-200">
                          Giai đoạn {stageIdx + 1} • {cluster.stageLevel}
                        </span>
                        <h3 className="mt-1 text-lg font-black text-slate-900">{cluster.title}</h3>
                        <p className="text-xs text-slate-600">{cluster.tagline}</p>
                      </div>

                      <div className="min-w-[150px] text-right space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${
                            clusterDone
                              ? "bg-emerald-100 text-emerald-800"
                              : cDone > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-white text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {clusterDone ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành cụm
                            </>
                          ) : (
                            `${cDone}/${cTotal} bài (${cPct}%)`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 2 Thẻ công nghệ con nằm cạnh nhau gọn gàng trong Cụm */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {cTracks.map((tr, subIdx) => {
                        const vis = TRACK_VISUAL_META[tr.id];
                        const doneCnt = tr.lessons.filter((l) => Boolean(passedMap[l.id])).length;
                        const isDone = doneCnt === tr.lessons.length;

                        return (
                          <div
                            key={tr.id}
                            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition hover:border-indigo-300 hover:shadow-md"
                          >
                            <div className={`bg-gradient-to-br ${vis.coverGradient} p-4 text-white`}>
                              <div className="flex items-center justify-between text-[10px] font-extrabold">
                                <span className="rounded-full bg-black/25 px-2.5 py-0.5">
                                  Phần {stageIdx + 1}.{subIdx + 1} • {vis.levelLabel}
                                </span>
                                <span className="rounded-full bg-white/20 px-2 py-0.5">
                                  {doneCnt}/{tr.lessons.length} bài
                                </span>
                              </div>
                              <p className="mt-2.5 text-xl font-black">{tr.name}</p>
                              <p className="mt-0.5 text-[11px] text-white/90">{vis.subtitle}</p>
                            </div>

                            <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                              <p className="text-xs leading-relaxed text-slate-600">{vis.whatYouBuild}</p>

                              {/* Danh sách 3 bài học nhỏ trong khóa */}
                              <div className="space-y-1">
                                {tr.lessons.map((ls) => {
                                  const ok = Boolean(passedMap[ls.id]);
                                  return (
                                    <div
                                      key={ls.id}
                                      className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]"
                                    >
                                      <span className="truncate font-semibold text-slate-700">{ls.title}</span>
                                      {ok ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                      ) : (
                                        <span className="shrink-0 text-[10px] font-bold text-slate-400">
                                          {ls.difficulty}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() => openTrackInIde(tr.id)}
                                className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition ${
                                  isDone
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-slate-900 text-white hover:bg-indigo-600"
                                }`}
                              >
                                <Terminal className="h-3.5 w-3.5" />
                                {isDone ? "Ôn lại & Code" : doneCnt > 0 ? "Tiếp tục học & Code" : `Bắt đầu học ${tr.shortName}`}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PHẦN 3: TOÀN BỘ 6 CỤM CÔNG NGHỆ (LỌC NHANH FRONTEND / BACKEND / DATABASE) */}
        <section id="all-clusters-catalog" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Toàn bộ 6 Cụm Khóa học Lập trình Miễn phí (12 Công nghệ)
              </h2>
              <p className="text-xs text-slate-500">
                Chọn học lẻ bất kỳ công nghệ nào trong 6 cụm — tất cả đều chạy &amp; chấm test tự động ngay trên trình duyệt.
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
                  {cat === "all" ? "Tất cả (6 Cụm)" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCatalogClusters.map((c) => {
              const cTracks = c.tracks.map((tid) => getTrackById(tid));
              return (
                <div
                  key={c.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className={`bg-gradient-to-br ${c.gradient} p-5 text-white`}>
                    <span className="inline-block rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-bold">
                      {c.stageLevel}
                    </span>
                    <h3 className="mt-2 text-xl font-black">{c.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-white/90">{c.tagline}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 p-4">
                    {cTracks.map((tr) => {
                      const doneCnt = tr.lessons.filter((l) => Boolean(passedMap[l.id])).length;
                      return (
                        <button
                          key={tr.id}
                          type="button"
                          onClick={() => openTrackInIde(tr.id)}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:border-indigo-400 hover:bg-white transition"
                        >
                          <p className="text-xs font-extrabold text-slate-900">{tr.shortName}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                            {doneCnt}/{tr.lessons.length} bài xong
                          </p>
                          <span className="mt-2 inline-block text-[11px] font-extrabold text-indigo-600">
                            Code ngay →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
      {/* Thanh đầu trang IDE + Chuyển nhanh giữa 2 công nghệ trong cùng Cụm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 text-white shadow-md sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode("hub")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-extrabold text-white ring-1 ring-white/20 hover:bg-white/25 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Về Lộ trình Cụm Stack
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {activeClusterForIde.title} • {activeClusterForIde.stageLevel}
            </p>
            <h1 className="text-base font-extrabold sm:text-lg">
              {track.name} — <span className="text-indigo-300">{track.runtimeLabel}</span>
            </h1>
          </div>
        </div>

        {/* Chuyển nhanh sang công nghệ cặp đôi trong cùng Cụm (VD: HTML <-> CSS, React <-> Next.js) */}
        <div className="flex flex-wrap items-center gap-2">
          {activeClusterForIde.tracks.map((tid) => {
            const tr = getTrackById(tid);
            const active = tid === activeTrackId;
            return (
              <button
                key={tid}
                type="button"
                onClick={() => openTrackInIde(tid)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  active
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {tr.shortName}
              </button>
            );
          })}
          <div className="hidden items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 sm:flex">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-extrabold">
              {totalPassedAllTracks}/{totalLessonsAllTracks}
            </span>
          </div>
          {isStaff && (
            <Link
              href="/quan-tri?tab=coding"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow hover:bg-emerald-400 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Cấp bài môn này
            </Link>
          )}
        </div>
      </div>

      {/* Thanh chọn nhanh các Cụm thuộc Lộ trình đang học (có thể mở rộng xem cả 6 Cụm) */}
      <div className="flex flex-wrap items-center gap-2">
        {(showAllClustersInIde
          ? CODING_CLUSTERS
          : CODING_CLUSTERS.filter(
              (c) => activeClusterIds.includes(c.id) || c.id === activeClusterForIde.id
            )
        ).map((c) => {
          const isActiveCluster = c.id === activeClusterForIde.id;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-1 rounded-2xl border px-2.5 py-1.5 text-xs ${
                isActiveCluster
                  ? "border-indigo-400 bg-indigo-50/70"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="px-1 text-[10px] font-extrabold text-slate-500">{c.shortLabel}:</span>
              {c.tracks.map((tid) => {
                const tr = getTrackById(tid);
                const active = tid === activeTrackId;
                const done = tr.lessons.filter((l) => passedMap[l.id]).length;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => openTrackInIde(tid)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-extrabold transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {tr.shortName} ({done}/{tr.lessons.length})
                  </button>
                );
              })}
            </div>
          );
        })}
        {activeClusterIds.length < CODING_CLUSTERS.length && (
          <button
            type="button"
            onClick={() => setShowAllClustersInIde((v) => !v)}
            className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition"
          >
            {showAllClustersInIde ? "Thu gọn theo Lộ trình đang học" : "Xem thêm tất cả 6 Cụm"}
          </button>
        )}
      </div>

      {/* Thanh Lộ trình Bài học */}
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
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                    <span>
                      Bài {idx + 1} • {l.difficulty}
                    </span>
                    {l.isAdminAuthored && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-800 normal-case">
                        Admin cấp
                      </span>
                    )}
                  </div>
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

      {/* KHÔNG GIAN IDE CHIA ĐÔI */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* CỘT TRÁI: LÝ THUYẾT + YÊU CẦU + GỢI MỞ 3 TẦNG */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${track.accentBg} ${track.accentText}`}>
                {track.shortName} • Bài {lesson.order}/{track.lessons.length}
              </span>
              {lesson.isAdminAuthored && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-800">
                  <Sparkles className="h-3 w-3" /> Bài do {lesson.createdBy || "Admin"} cấp
                </span>
              )}
            </div>
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

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-indigo-800">
              Yêu cầu Bài kiểm tra
            </h4>
            <p className="text-xs leading-relaxed font-medium text-slate-800">
              {lesson.taskPrompt}
            </p>
          </div>

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

          {/* GỢI MỞ TƯ DUY 3 TẦNG */}
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
                    : track.id === "typescript" || track.id === "nestjs" || track.id === "nodejs"
                      ? "ts"
                      : track.id === "react" || track.id === "nextjs"
                        ? "tsx"
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
          Đang khởi tạo Lộ trình Học Lập trình theo Cụm Stack...
        </div>
      }
    >
      <CodingAcademyInner />
    </Suspense>
  );
}
