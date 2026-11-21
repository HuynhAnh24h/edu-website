"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Layers,
  LayoutGrid,
  PlayCircle,
  Search,
} from "lucide-react";
import { CORE_API_URL, Lesson } from "@/lib/api";
import { MathContent } from "@/components/MathContent";
import { getSubjectMeta, SUBJECT_ORDER } from "@/lib/subjects";

interface SummaryRow {
  grade_id: number;
  subject_code: string;
  subject_name: string;
  lesson_count: number;
}

const TEXTBOOK_LABELS: Record<string, string> = {
  kntt: "Kết nối tri thức",
  ctst: "Chân trời sáng tạo",
  canh_dieu: "Cánh diều",
  general: "Chương trình chuẩn GDPT 2018",
};

function MaterialsTreeContent() {
  const searchParams = useSearchParams();
  const initialGrade = Number(searchParams.get("grade")) || 12;
  const initialSubject = searchParams.get("subject") || "all";

  const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [totalLessonsAll, setTotalLessonsAll] = useState<number>(0);

  const [lessonIndex, setLessonIndex] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 1. Tải tổng quan cây chương trình Lớp 1-12 (rất nhẹ, có Edge cache)
  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/curriculum/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSummaryRows(data.summary || []);
          setTotalLessonsAll(data.total_lessons || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Các môn học hiện có của khối lớp đang chọn (sắp xếp theo thứ tự chuẩn)
  const subjectsForGrade = useMemo(() => {
    const rows = summaryRows.filter((r) => r.grade_id === selectedGrade);
    return rows.sort(
      (a, b) =>
        (SUBJECT_ORDER.indexOf(a.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(a.subject_code)) -
        (SUBJECT_ORDER.indexOf(b.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(b.subject_code))
    );
  }, [summaryRows, selectedGrade]);

  // 2. Tải mục lục gọn nhẹ (mode=index) cho Lớp + Môn đang chọn
  useEffect(() => {
    setLoadingList(true);
    const params = new URLSearchParams();
    params.set("grade", String(selectedGrade));
    params.set("mode", "index");
    if (selectedSubject !== "all") params.set("subject", selectedSubject);

    fetch(`${CORE_API_URL}/api/v1/lessons?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.lessons || []) as Lesson[];
        setLessonIndex(list);
        setCollapsedChapters({});
        if (list.length > 0) {
          setActiveLessonId(list[0].id);
        } else {
          setActiveLessonId(null);
          setActiveLesson(null);
        }
      })
      .catch(() => {
        setLessonIndex([]);
        setActiveLessonId(null);
        setActiveLesson(null);
      })
      .finally(() => setLoadingList(false));
  }, [selectedGrade, selectedSubject]);

  // 3. Lazy-load nội dung chi tiết bài học khi học sinh bấm vào 1 bài
  useEffect(() => {
    if (!activeLessonId) return;
    setLoadingDetail(true);
    fetch(`${CORE_API_URL}/api/v1/lessons/${encodeURIComponent(activeLessonId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.lesson) {
          setActiveLesson(data.lesson as Lesson);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [activeLessonId]);

  // Lọc theo từ khóa tìm kiếm & nhóm thành cây Chương -> Bài học
  const filteredLessons = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return lessonIndex;
    return lessonIndex.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.chapter.toLowerCase().includes(q) ||
        l.subject_name.toLowerCase().includes(q)
    );
  }, [lessonIndex, searchTerm]);

  const chapterGroups = useMemo(() => {
    const map = new Map<string, { key: string; subjectName: string; chapter: string; lessons: Lesson[] }>();
    for (const les of filteredLessons) {
      const key = `${les.subject_code}::${les.chapter}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectName: les.subject_name,
          chapter: les.chapter,
          lessons: [],
        });
      }
      map.get(key)!.lessons.push(les);
    }
    return Array.from(map.values());
  }, [filteredLessons]);

  const currentIdx = filteredLessons.findIndex((l) => l.id === activeLessonId);
  const prevLesson = currentIdx > 0 ? filteredLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < filteredLessons.length - 1
      ? filteredLessons[currentIdx + 1]
      : null;

  const gradeLevelColor = (g: number) =>
    g <= 5
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : g <= 9
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-indigo-200 bg-indigo-50 text-indigo-800";

  return (
    <div className="space-y-5">
      {/* Header + Tổng số bài giảng GDPT 2018 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700">
            <BookOpen className="h-3.5 w-3.5" />
            Chương trình GDPT 2018 (Thông tư 32/2018/TT-BGDĐT) • {totalLessonsAll || lessonIndex.length} bài giảng chuẩn
          </div>
          <h1 className="mt-1.5 text-2xl font-bold text-slate-900">
            Cây Chương trình &amp; Tài liệu Lớp 1–12
          </h1>
          <p className="text-sm text-slate-500">
            Chọn Khối lớp → Môn học → Chương → Bài giảng chuẩn chương trình GDPT 2018.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Tìm bài học trong Lớp ${selectedGrade}...`}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm shadow-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Thanh chọn Khối Lớp 1 -> 12 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-3">
        <div data-tour="docs-grades" className="flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
            const active = selectedGrade === g;
            return (
              <button
                key={g}
                onClick={() => {
                  setSelectedGrade(g);
                  setSelectedSubject("all");
                }}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Lớp {g}
              </button>
            );
          })}
        </div>

        {/* Lưới Thẻ Các Môn Học Trực Quan thuộc khối lớp đang chọn */}
        <div data-tour="docs-subjects" className="space-y-2.5 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${gradeLevelColor(selectedGrade)}`}>
              {selectedGrade <= 5 ? "Tiểu học" : selectedGrade <= 9 ? "THCS" : "THPT"} • Lớp {selectedGrade} ({subjectsForGrade.length} môn)
            </span>
            <button
              onClick={() => setSelectedSubject("all")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                selectedSubject === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tất cả các môn ({subjectsForGrade.reduce((a, b) => a + b.lesson_count, 0) || lessonIndex.length} bài)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {subjectsForGrade.map((sub) => {
              const meta = getSubjectMeta(sub.subject_code, sub.subject_name);
              const SubjectIcon = meta.icon;
              const isSelected = selectedSubject === sub.subject_code;
              return (
                <button
                  key={sub.subject_code}
                  type="button"
                  onClick={() => setSelectedSubject(sub.subject_code)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    isSelected ? meta.activeRing : meta.cardBg
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-white/20 text-white" : `bg-white shadow-2xs ${meta.iconBoxBg.split(" ")[1]}`
                    }`}
                  >
                    <SubjectIcon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {sub.subject_name}
                    </p>
                    <p className={`text-[11px] font-medium ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                      {sub.lesson_count} bài giảng
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bố cục 2 cột: Cây Chương -> Bài học (Trái) & Bài giảng chi tiết (Phải) */}
      {loadingList ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Đang tải cây chương trình Lớp {selectedGrade}...
        </div>
      ) : chapterGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Không tìm thấy bài giảng khớp từ khóa. Hãy thử xóa bộ lọc tìm kiếm.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI: Cây Mục lục Chương -> Bài học (Accordion) */}
          <aside className="space-y-2.5 lg:col-span-4 max-h-[780px] overflow-y-auto pr-1">
            {chapterGroups.map((grp) => {
              const isCollapsed = !!collapsedChapters[grp.key];
              return (
                <div
                  key={grp.key}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedChapters((prev) => ({
                        ...prev,
                        [grp.key]: !prev[grp.key],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-2 bg-slate-50/90 px-4 py-3 text-left hover:bg-slate-100 transition"
                  >
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                        {grp.subjectName}
                      </span>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span className="truncate">{grp.chapter}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <span>{grp.lessons.length}</span>
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {grp.lessons.map((les) => {
                        const isSelected = activeLessonId === les.id;
                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => setActiveLessonId(les.id)}
                            className={`w-full px-4 py-3 text-left transition ${
                              isSelected
                                ? "bg-indigo-50/80 border-l-4 border-indigo-600"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <p
                              className={`text-xs font-semibold leading-snug ${
                                isSelected ? "text-indigo-800" : "text-slate-800"
                              }`}
                            >
                              {les.title}
                            </p>
                            {les.summary && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                                {les.summary}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>

          {/* CỘT PHẢI: Nội dung chi tiết bài giảng */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8 h-fit">
            {loadingDetail || !activeLesson ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải nội dung bài giảng...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-indigo-600">
                      Lớp {activeLesson.grade_id} › {activeLesson.subject_name} › {activeLesson.chapter}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {activeLesson.title}
                    </h2>
                    {activeLesson.summary && (
                      <p className="mt-1 text-xs text-slate-600">{activeLesson.summary}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {activeLesson.duration_min} phút học
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />{" "}
                        {TEXTBOOK_LABELS[activeLesson.textbook] || activeLesson.textbook}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/ai-gia-su?grade=${activeLesson.grade_id}&subject=${activeLesson.subject_code}&q=${encodeURIComponent(
                      `Em đang học bài "${activeLesson.title}" (${activeLesson.subject_name} Lớp ${activeLesson.grade_id}), thầy tóm tắt nhanh và cho em 1 ví dụ luyện tập nhé!`
                    )}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-500 transition"
                  >
                    <Bot className="h-4 w-4" />
                    Hỏi AI về bài này
                  </Link>
                </div>

                <div className="mt-5">
                  <MathContent content={activeLesson.content_mdx} />
                </div>

                {/* Học liệu đính kèm */}
                {activeLesson.materials && activeLesson.materials.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="mb-3 text-sm font-bold text-slate-900">
                      Tài liệu &amp; Học liệu số đính kèm
                    </h3>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {activeLesson.materials.map((m) => (
                        <div
                          key={m.id || m.title}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            {m.type === "video_hls" ? (
                              <PlayCircle className="h-5 w-5 shrink-0 text-rose-500" />
                            ) : m.type === "flashcard" ? (
                              <Layers className="h-5 w-5 shrink-0 text-amber-500" />
                            ) : (
                              <FileText className="h-5 w-5 shrink-0 text-indigo-600" />
                            )}
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{m.title}</p>
                              <p className="text-[11px] text-slate-500">{m.size_label || "Học liệu chuẩn"}</p>
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

                {/* Điều hướng Bài trước / Bài tiếp theo */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  {prevLesson ? (
                    <button
                      type="button"
                      onClick={() => setActiveLessonId(prevLesson.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="max-w-[180px] truncate">{prevLesson.title}</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  {nextLesson && (
                    <button
                      type="button"
                      onClick={() => setActiveLessonId(nextLesson.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <span className="max-w-[180px] truncate">{nextLesson.title}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải cây chương trình...</div>}>
      <MaterialsTreeContent />
    </Suspense>
  );
}
