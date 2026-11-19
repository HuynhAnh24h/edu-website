"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Bot, Clock, FileText, Layers, PlayCircle } from "lucide-react";
import { CORE_API_URL, Lesson } from "@/lib/api";
import { MathContent } from "@/components/MathContent";

const TEXTBOOK_LABELS: Record<string, string> = {
  kntt: "Kết nối tri thức",
  ctst: "Chân trời sáng tạo",
  canh_dieu: "Cánh diều",
  general: "Chương trình chuẩn",
};

function MaterialsContent() {
  const searchParams = useSearchParams();
  const initialGrade = Number(searchParams.get("grade")) || 0;

  const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedGrade > 0) params.set("grade", String(selectedGrade));
    if (selectedSubject !== "all") params.set("subject", selectedSubject);

    fetch(`${CORE_API_URL}/api/v1/lessons?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.lessons || []) as Lesson[];
        setLessons(list);
        setActiveLesson(list[0] || null);
      })
      .catch(() => {
        setLessons([]);
        setActiveLesson(null);
      })
      .finally(() => setLoading(false));
  }, [selectedGrade, selectedSubject]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Kho Tài liệu Học tập Lớp 1–12
          </h1>
          <p className="text-sm text-slate-500">
            Chuẩn chương trình GDPT 2018 • Hiển thị công thức KaTeX • Tối ưu CDN Cache đa tầng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-xs"
          >
            <option value={0}>Tất cả Lớp 1–12</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-xs"
          >
            <option value="all">Tất cả môn học</option>
            <option value="toan">Toán học</option>
            <option value="vat-ly">Vật lý</option>
            <option value="tieng-anh">Tiếng Anh</option>
          </select>
        </div>
      </div>

      {/* Thanh chọn nhanh lớp 1-12 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedGrade(0)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            selectedGrade === 0
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Tất cả
        </button>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedGrade === g
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Lớp {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Đang tải tài liệu từ Go Core API...
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có bài học phù hợp bộ lọc này. Hãy thử chọn môn &quot;Tất cả môn học&quot;.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Danh sách bài học */}
          <div className="space-y-2.5 lg:col-span-4">
            {lessons.map((les) => {
              const isSelected = activeLesson?.id === les.id;
              return (
                <button
                  key={les.id}
                  onClick={() => setActiveLesson(les)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-700">
                      Lớp {les.grade_id}
                    </span>
                    <span className="text-slate-500">{les.subject_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">
                      {TEXTBOOK_LABELS[les.textbook] || les.textbook}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                    {les.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {les.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Nội dung chi tiết bài học */}
          {activeLesson && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-600">
                    Lớp {activeLesson.grade_id} • {activeLesson.subject_name} • {activeLesson.chapter}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {activeLesson.title}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {activeLesson.duration_min} phút học
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> {TEXTBOOK_LABELS[activeLesson.textbook]}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/ai-gia-su?grade=${activeLesson.grade_id}&subject=${activeLesson.subject_code}&q=${encodeURIComponent(
                    `Em chưa hiểu bài "${activeLesson.title}", thầy gợi ý giúp em nhé!`
                  )}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-500 transition"
                >
                  <Bot className="h-4 w-4" />
                  Hỏi AI về bài này
                </Link>
              </div>

              <div className="mt-4">
                <MathContent content={activeLesson.content_mdx} />
              </div>

              {/* Học liệu đính kèm */}
              {activeLesson.materials.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">
                    Tài liệu &amp; Học liệu số đính kèm (CDN R2)
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {activeLesson.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          {m.type === "video_hls" ? (
                            <PlayCircle className="h-5 w-5 text-rose-500 shrink-0" />
                          ) : m.type === "flashcard" ? (
                            <Layers className="h-5 w-5 text-amber-500 shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{m.title}</p>
                            <p className="text-[11px] text-slate-500">{m.size_label}</p>
                          </div>
                        </div>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Miễn phí
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải...</div>}>
      <MaterialsContent />
    </Suspense>
  );
}
