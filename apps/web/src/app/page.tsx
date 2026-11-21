"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CheckSquare,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { AI_API_URL, CORE_API_URL } from "@/lib/api";
import { getSubjectMeta, SUBJECT_ORDER } from "@/lib/subjects";

interface CoreMetrics {
  engine?: string;
  postgres_ok: boolean;
  redis_ok: boolean;
  kafka_ok: boolean;
  kafka_topic: string;
  worker_goroutines: number;
  queue_capacity: number;
  queue_depth: number;
  total_starts: number;
  total_submissions: number;
  total_graded: number;
  encryption: string;
}

interface AIStats {
  active_provider: string;
  pgvector_ok: boolean;
  knowledge_chunks: number;
  semantic_cache: {
    redis_ok: boolean;
    hits: number;
    misses: number;
    hit_rate_pct: number;
    cached_entries: number;
  };
}

interface SummaryRow {
  grade_id: number;
  subject_code: string;
  subject_name: string;
  lesson_count: number;
}

const GRADE_GROUPS = [
  { label: "Tiểu học", badge: "bg-amber-100 text-amber-800", grades: [1, 2, 3, 4, 5] },
  { label: "THCS", badge: "bg-emerald-100 text-emerald-800", grades: [6, 7, 8, 9] },
  { label: "THPT", badge: "bg-indigo-100 text-indigo-800", grades: [10, 11, 12] },
];

export default function HomePage() {
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [totalLessons, setTotalLessons] = useState<number>(0);
  const [selectedGrade, setSelectedGrade] = useState<number>(12);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/metrics`)
      .then((r) => r.json())
      .then(setCoreMetrics)
      .catch(() => setCoreMetrics(null));

    fetch(`${AI_API_URL}/api/v1/ai/stats`)
      .then((r) => r.json())
      .then(setAiStats)
      .catch(() => setAiStats(null));

    fetch(`${CORE_API_URL}/api/v1/curriculum/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSummaryRows(data.summary || []);
          setTotalLessons(data.total_lessons || 0);
        }
      })
      .catch(() => {});
  }, []);

  const subjectsInSelectedGrade = useMemo(() => {
    const rows = summaryRows.filter((r) => r.grade_id === selectedGrade);
    return rows.sort(
      (a, b) =>
        (SUBJECT_ORDER.indexOf(a.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(a.subject_code)) -
        (SUBJECT_ORDER.indexOf(b.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(b.subject_code))
    );
  }, [summaryRows, selectedGrade]);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg sm:p-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/15">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Chương trình GDPT 2018 • {totalLessons > 0 ? `${totalLessons} bài giảng` : "Lớp 1–12"} trên Cloudflare Edge
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Nền tảng Học tập &amp; Thi trắc nghiệm Lớp 1–12 chuẩn kiến trúc 1 triệu CCU
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Học đầy đủ các môn Toán, Ngữ văn, Tiếng Anh, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Tin học theo từng khối lớp — kèm thi trắc nghiệm mã hóa AES-256-GCM và AI Gia sư gợi mở Socratic.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/thi"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              Vào phòng thi thử ngay
            </Link>
            <Link
              href="/ai-gia-su"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
            >
              <Bot className="h-4 w-4" />
              Học cùng AI Gia sư
            </Link>
          </div>
        </div>
      </section>

      {/* CHỌN LỚP -> XEM TRỰC QUAN TỪNG MÔN HỌC TRONG LỚP */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Khám phá Chương trình học theo Lớp &amp; Môn học (Lớp 1–12)
            </h2>
            <p className="text-sm text-slate-500">
              Bấm chọn Khối lớp bên dưới để xem ngay các môn học như Toán, Vật lý, Hóa học, Lịch sử, Địa lý...
            </p>
          </div>
          <Link
            href={`/tai-lieu?grade=${selectedGrade}`}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            Xem tất cả bài Lớp {selectedGrade} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Thanh chọn 12 khối lớp phân 3 cấp học */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
          {GRADE_GROUPS.map((grp) => (
            <div key={grp.label} className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${grp.badge}`}>
                {grp.label}
              </span>
              {grp.grades.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGrade(g)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    selectedGrade === g
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Lưới Thẻ Các Môn Học Trong Khối Lớp Đang Chọn */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Các môn học trong Lớp {selectedGrade} ({subjectsInSelectedGrade.length} môn chuẩn GDPT 2018)
          </p>
          {subjectsInSelectedGrade.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Đang tải danh sách môn học Lớp {selectedGrade}...
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {subjectsInSelectedGrade.map((row) => {
                const meta = getSubjectMeta(row.subject_code, row.subject_name);
                const SubjectIcon = meta.icon;
                return (
                  <Link
                    key={row.subject_code}
                    href={`/tai-lieu?grade=${selectedGrade}&subject=${row.subject_code}`}
                    className={`group flex flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardBg}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs ${meta.iconBoxBg.split(" ")[1]}`}>
                          <SubjectIcon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {row.subject_name} {selectedGrade}
                          </h3>
                          <p className="text-xs text-slate-600">{meta.tagline}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeBg}`}>
                        {row.lesson_count} bài giảng
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                        Vào học ngay <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/tai-lieu",
            title: "Tài liệu Lớp 1–12",
            desc: "Cây Chương → Bài học theo từng môn, công thức KaTeX, PDF/Video/Flashcard chuẩn GDPT 2018.",
            icon: BookOpen,
            color: "text-blue-600 bg-blue-50",
          },
          {
            href: "/bai-tap",
            title: "Bài tập trực tuyến",
            desc: "Chấm ngay 4 dạng chuẩn 2025 (1 đáp án, nhiều đáp án, Đúng/Sai 4 ý, trả lời ngắn) kèm lời giải.",
            icon: CheckSquare,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            href: "/thi",
            title: "Thi trắc nghiệm 1M CCU",
            desc: "Đề mã hóa AES-256-GCM qua Edge, lưu nháp IndexedDB offline, bảng xếp hạng thời gian thực.",
            icon: ShieldCheck,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            href: "/ai-gia-su",
            title: "AI Gia sư Socratic",
            desc: "RAG khóa đúng kiến thức từng lớp 1–12, Semantic Cache <20ms, chạy trực tiếp Cloudflare Workers AI.",
            icon: Bot,
            color: "text-purple-600 bg-purple-50",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div>
                <div className={`mb-3 inline-flex rounded-xl p-2.5 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{card.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{card.desc}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                Khám phá ngay <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Live Telemetry Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Trạng thái Hạ tầng Cloud thời gian thực
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Cpu className="h-4 w-4 text-indigo-600" />
                {coreMetrics?.engine?.includes("Cloudflare")
                  ? "Cloudflare Edge Worker (D1 + KV)"
                  : "Go Core & Exam Engine (:8080)"}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  coreMetrics
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {coreMetrics ? "ONLINE" : "CHƯA KẾT NỐI"}
              </span>
            </div>
            {coreMetrics ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Database &amp; Cache</dt>
                  <dd className="font-bold text-emerald-700">
                    {coreMetrics.postgres_ok ? "DB OK" : "DB ERR"} • {coreMetrics.redis_ok ? "KV/Cache OK" : "ERR"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Bảo mật đề thi</dt>
                  <dd className="font-bold text-slate-900">{coreMetrics.encryption}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Bài giảng đang LIVE</dt>
                  <dd className="font-bold text-indigo-700">{totalLessons} bài (Lớp 1–12)</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Lượt thi đã chấm</dt>
                  <dd className="font-bold text-slate-900">{coreMetrics.total_graded} bài</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Đang kết nối máy chủ...</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Bot className="h-4 w-4 text-purple-600" />
                {aiStats?.active_provider?.includes("cloudflare")
                  ? "Cloudflare Workers AI Tutor (Edge)"
                  : "Python FastAPI AI Tutor (:8001)"}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  aiStats
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {aiStats ? "ONLINE" : "CHƯA KẾT NỐI"}
              </span>
            </div>
            {aiStats ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Mô hình AI</dt>
                  <dd className="truncate font-bold text-purple-700">{aiStats.active_provider}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Kho tri thức SGK RAG</dt>
                  <dd className="font-bold text-emerald-700">
                    OK ({aiStats.knowledge_chunks} chunks)
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Semantic Cache Hit</dt>
                  <dd className="font-bold text-slate-900">
                    {aiStats.semantic_cache.hit_rate_pct}% ({aiStats.semantic_cache.hits} hits)
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Mục Cache Edge</dt>
                  <dd className="font-bold text-slate-900">{aiStats.semantic_cache.cached_entries}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Đang kết nối AI Tutor...</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
