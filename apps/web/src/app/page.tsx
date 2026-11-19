"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

interface CoreMetrics {
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

const LEVELS = [
  {
    name: "Tiểu học (Lớp 1–5)",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    btn: "hover:border-amber-400 hover:bg-amber-50",
    grades: [1, 2, 3, 4, 5],
  },
  {
    name: "THCS (Lớp 6–9)",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    btn: "hover:border-emerald-400 hover:bg-emerald-50",
    grades: [6, 7, 8, 9],
  },
  {
    name: "THPT (Lớp 10–12)",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    btn: "hover:border-indigo-400 hover:bg-indigo-50",
    grades: [10, 11, 12],
  },
];

export default function HomePage() {
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/metrics`)
      .then((r) => r.json())
      .then(setCoreMetrics)
      .catch(() => setCoreMetrics(null));

    fetch(`${AI_API_URL}/api/v1/ai/stats`)
      .then((r) => r.json())
      .then(setAiStats)
      .catch(() => setAiStats(null));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg sm:p-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/15">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Next.js + Go Exam Engine + Python FastAPI AI Tutor</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Nền tảng Học tập &amp; Thi trắc nghiệm Lớp 1–12 chuẩn kiến trúc 1 triệu CCU
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Học lý thuyết chuẩn bộ sách GDPT 2018 hiển thị công thức KaTeX siêu nhanh, luyện bài tập 4 định dạng thi 2025+, phòng thi mã hóa AES-256-GCM chống giật lag và AI Gia sư gợi mở Socratic.
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

      {/* 4 Core Pillars */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/tai-lieu",
            title: "Tài liệu Lớp 1–12",
            desc: "Bài giảng MDX + KaTeX, PDF, Video HLS, Flashcard phân theo bộ sách KNTT / CTST / Cánh diều.",
            icon: BookOpen,
            color: "text-blue-600 bg-blue-50",
          },
          {
            href: "/bai-tap",
            title: "Bài tập trực tuyến",
            desc: "Chấm ngay 4 dạng chuẩn 2025 (1 đáp án, nhiều đáp án, Đúng/Sai 4 ý, trả lời ngắn) kèm giải chi tiết.",
            icon: CheckSquare,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            href: "/thi",
            title: "Thi trắc nghiệm 1M CCU",
            desc: "Đề mã hóa AES-256-GCM qua CDN, lưu nháp IndexedDB offline, nộp bài qua hàng đợi bất đồng bộ.",
            icon: ShieldCheck,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            href: "/ai-gia-su",
            title: "AI Gia sư Socratic",
            desc: "RAG khóa đúng kiến thức từng lớp 1–12, Semantic Cache <20ms, hỗ trợ Mock miễn phí & Local Ollama.",
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

      {/* Chọn nhanh Lớp 1-12 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Chọn nhanh Khối lớp (Từ Lớp 1 đến Lớp 12)
            </h2>
            <p className="text-sm text-slate-500">
              Lọc ngay tài liệu học tập, bài tập và đề thi tương ứng theo chương trình GDPT 2018.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {LEVELS.map((lvl) => (
            <div key={lvl.name} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold ${lvl.badge}`}>
                {lvl.name}
              </span>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {lvl.grades.map((g) => (
                  <Link
                    key={g}
                    href={`/tai-lieu?grade=${g}`}
                    className={`rounded-lg border border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-800 transition ${lvl.btn}`}
                  >
                    Lớp {g}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Telemetry Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Trạng thái Microservices thời gian thực
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Cpu className="h-4 w-4 text-indigo-600" />
                Go Core &amp; Exam Engine (:8080)
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
                  <dt className="text-slate-400">PostgreSQL 16 + Redis 7</dt>
                  <dd className="font-bold text-emerald-700">
                    {coreMetrics.postgres_ok ? "PG OK" : "PG ERR"} • {coreMetrics.redis_ok ? "Redis OK" : "Redis ERR"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Redpanda Kafka Queue</dt>
                  <dd className="font-bold text-emerald-700">
                    {coreMetrics.kafka_ok ? `LIVE (${coreMetrics.kafka_topic})` : "OFFLINE"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Grading Workers</dt>
                  <dd className="font-bold text-slate-900">{coreMetrics.worker_goroutines} goroutines</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Bài đã chấm (PostgreSQL)</dt>
                  <dd className="font-bold text-slate-900">{coreMetrics.total_graded} bài</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Chạy Go API tại cổng 8080 để xem thông số thời gian thực.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Bot className="h-4 w-4 text-purple-600" />
                Python FastAPI AI Tutor (:8001)
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
                  <dt className="text-slate-400">Provider đang chạy</dt>
                  <dd className="font-bold text-purple-700">{aiStats.active_provider}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">PostgreSQL pgvector</dt>
                  <dd className="font-bold text-emerald-700">
                    {aiStats.pgvector_ok ? `OK (${aiStats.knowledge_chunks} chunks)` : "OFFLINE"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Redis Semantic Cache</dt>
                  <dd className="font-bold text-slate-900">
                    {aiStats.semantic_cache.hit_rate_pct}% ({aiStats.semantic_cache.hits} hits)
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-400">Mục Cache trên Redis</dt>
                  <dd className="font-bold text-slate-900">{aiStats.semantic_cache.cached_entries}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Chạy Python FastAPI tại cổng 8001 để bật AI Gia sư (Mock / Local Ollama).
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
