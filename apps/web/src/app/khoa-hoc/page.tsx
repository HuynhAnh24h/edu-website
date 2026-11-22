"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  GraduationCap,
  MessageCircle,
  PlayCircle,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { connectRealtimeChannel } from "@/lib/realtime";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface CourseModule {
  id: string;
  title: string;
  duration: string;
  video_url: string;
  content: string;
}

interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface CourseItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_school: string;
  teacher_verified?: boolean;
  title: string;
  subject_name: string;
  grade_label: string;
  level: string;
  cover_theme: string;
  summary: string;
  modules: CourseModule[];
  created_at: string;
  student_count: number;
  enrolled_by_me: boolean;
  completed_lessons: string[];
  my_certificate_code?: string;
  avg_rating: number;
  review_count: number;
  rating_breakdown: Record<number, number>;
  my_review: CourseReview | null;
  reviews: CourseReview[];
}

const COVER_THEMES: Record<string, string> = {
  indigo: "from-indigo-600 via-blue-700 to-slate-900",
  emerald: "from-emerald-600 via-teal-700 to-slate-900",
  rose: "from-rose-600 via-pink-700 to-slate-900",
  amber: "from-amber-500 via-orange-600 to-slate-900",
  sky: "from-sky-500 via-cyan-700 to-slate-900",
};

const STAR_LABELS: Record<number, string> = {
  1: "1 sao — Chưa phù hợp, cần cải thiện nhiều",
  2: "2 sao — Còn sơ sài",
  3: "3 sao — Ổn, đủ dùng cơ bản",
  4: "4 sao — Rất hay và dễ hiểu",
  5: "5 sao — Xuất sắc! Kiến thức cực kỳ chất lượng",
};

function toYoutubeEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${
            s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

export default function CoursesPage() {
  const { user, accessToken, isStaff, isAdmin } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Selected course detail / player
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>("m1");

  // Rating & Review state
  const [pickStar, setPickStar] = useState<number>(5);
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [sendingReview, setSendingReview] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);

  // Create Course modal/panel state (Teacher / Admin)
  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cSubject, setCSubject] = useState("Toán học");
  const [cGrade, setCGrade] = useState("Lớp 12");
  const [cLevel, setCLevel] = useState("Cơ bản → Nâng cao");
  const [cTheme, setCTheme] = useState("indigo");
  const [cSummary, setCSummary] = useState("");
  const [cModules, setCModules] = useState<{ title: string; duration: string; video_url: string; content: string }[]>([
    { title: "Bài 1: Khởi động & Kiến thức trọng tâm", duration: "20 phút", video_url: "", content: "" },
  ]);
  const [creating, setCreating] = useState(false);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  const loadCourses = useCallback(async () => {
    try {
      const qs = searchQ.trim() ? `?q=${encodeURIComponent(searchQ.trim())}` : "";
      const res = await fetch(`${CORE_API_URL}/api/v1/courses${qs}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setCourses(d.courses || []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQ]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  // Real-time WebSocket: tự động cập nhật khi có khóa học mới hoặc học sinh vừa đánh giá 5 sao!
  useEffect(() => {
    const conn = connectRealtimeChannel("social:feed", accessToken, {
      onEvent: (ev) => {
        if (ev.type === "course_update") {
          void loadCourses();
        }
      },
    });
    return () => conn.close();
  }, [accessToken, loadCourses]);

  const selectedCourse = courses.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    if (selectedCourse) {
      if (selectedCourse.modules.length > 0 && !selectedCourse.modules.some((m) => m.id === activeLessonId)) {
        setActiveLessonId(selectedCourse.modules[0].id);
      }
      if (selectedCourse.my_review) {
        setPickStar(Number(selectedCourse.my_review.rating || 5));
        setReviewComment(selectedCourse.my_review.comment || "");
      } else {
        setPickStar(5);
        setReviewComment("");
      }
    }
  }, [selectedCourse?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnroll = async (courseId: string) => {
    if (!accessToken) {
      showNotice("err", "Vui lòng đăng nhập để tham gia học và lưu tiến độ miễn phí.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/courses/${encodeURIComponent(courseId)}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      showNotice("ok", "Đã tham gia khóa học miễn phí! Bắt đầu học bài đầu tiên ngay nhé.");
      void loadCourses();
    }
  };

  const handleToggleLessonDone = async (courseId: string, lessonId: string) => {
    if (!accessToken) {
      showNotice("err", "Đăng nhập để lưu dấu hoàn thành bài học.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/courses/${encodeURIComponent(courseId)}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ lesson_id: lessonId }),
    });
    if (res.ok) {
      void loadCourses();
    }
  };

  const handleIssueCertificate = async (courseId: string) => {
    if (!accessToken) {
      showNotice("err", "Vui lòng đăng nhập để nhận Chứng chỉ hoàn thành khóa học.");
      return;
    }
    setIssuingCert(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/courses/${encodeURIComponent(courseId)}/certificate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Chưa đủ điều kiện cấp chứng chỉ");
      } else {
        showNotice("ok", d.message || "Đã cấp Chứng chỉ Hoàn thành thành công!");
        void loadCourses();
      }
    } finally {
      setIssuingCert(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedCourse) {
      showNotice("err", "Vui lòng đăng nhập để đánh giá 5 sao và bình luận khóa học.");
      return;
    }
    setSendingReview(true);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/courses/${encodeURIComponent(selectedCourse.id)}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ rating: pickStar, comment: reviewComment }),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể gửi đánh giá");
      } else {
        showNotice("ok", d.message || "Đã gửi đánh giá khóa học thành công!");
        void loadCourses();
      }
    } finally {
      setSendingReview(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setCreating(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: cTitle,
          subject_name: cSubject,
          grade_label: cGrade,
          level: cLevel,
          cover_theme: cTheme,
          summary: cSummary,
          modules: cModules,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể đăng khóa học");
      } else {
        setCTitle("");
        setCSummary("");
        setCModules([
          { title: "Bài 1: Khởi động & Kiến thức trọng tâm", duration: "20 phút", video_url: "", content: "" },
        ]);
        setCreateOpen(false);
        showNotice("ok", d.message || "Đã xuất bản khóa học mới!");
        void loadCourses();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!accessToken || !window.confirm("Bạn chắc chắn muốn xóa khóa học này?")) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/courses/${encodeURIComponent(courseId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      if (selectedId === courseId) setSelectedId(null);
      showNotice("ok", "Đã xóa khóa học.");
      void loadCourses();
    }
  };

  const handleReportCourse = async (course: CourseItem) => {
    if (!accessToken) {
      showNotice("err", "Vui lòng đăng nhập để gửi báo cáo.");
      return;
    }
    const reason = window.prompt(
      `Nhập lý do báo cáo khóa học "${course.title}" (VD: Giáo án cũ / kém chất lượng / mạo danh giáo viên):`
    );
    if (!reason || !reason.trim()) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/safety/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: "low_quality_lesson",
        source_type: "course",
        source_id: course.id,
        suspect_user_id: course.teacher_id,
        suspect_name: course.teacher_name,
        reason: reason.trim(),
        content_snapshot: `${course.title}\n\n${course.summary}`,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      showNotice("ok", d.message || "Đã gửi báo cáo tới Quản trị viên!");
    }
  };

  // =========================================================================
  // MÀN HÌNH HỌC & ĐÁNH GIÁ CHI TIẾT 1 KHÓA HỌC
  // =========================================================================
  if (selectedCourse) {
    const activeLesson =
      selectedCourse.modules.find((m) => m.id === activeLessonId) || selectedCourse.modules[0];
    const embedUrl = activeLesson ? toYoutubeEmbed(activeLesson.video_url) : null;
    const doneSet = new Set(selectedCourse.completed_lessons);
    const totalLessons = Math.max(1, selectedCourse.modules.length);
    const pct = Math.round((doneSet.size / totalLessons) * 100);
    const displayStar = hoverStar || pickStar;

    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách Khóa học
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {user && user.id !== selectedCourse.teacher_id && (
              <>
                <Link
                  href={`/tin-nhan?peer=${encodeURIComponent(selectedCourse.teacher_id)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Nhắn tin hỏi Thầy/Cô
                </Link>
                <button
                  type="button"
                  onClick={() => void handleReportCourse(selectedCourse)}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <Flag className="h-3.5 w-3.5" /> Báo cáo khóa học
                </button>
              </>
            )}
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
              notice.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.msg}
          </div>
        )}

        {/* Header Khóa học */}
        <section
          className={`rounded-3xl bg-gradient-to-br ${
            COVER_THEMES[selectedCourse.cover_theme] || COVER_THEMES.indigo
          } p-6 text-white shadow-lg sm:p-8`}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-white/15 px-3 py-1">{selectedCourse.subject_name}</span>
                <span className="rounded-full bg-white/15 px-3 py-1">{selectedCourse.grade_label}</span>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                  Miễn phí 100%
                </span>
              </div>
              <h1 className="text-2xl font-extrabold sm:text-3xl leading-snug">{selectedCourse.title}</h1>
              <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">{selectedCourse.summary}</p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <Link
                  href={`/giao-vien?id=${encodeURIComponent(selectedCourse.teacher_id)}`}
                  className="inline-flex items-center gap-1 font-bold hover:underline"
                >
                  Giảng viên: {selectedCourse.teacher_name}
                  {selectedCourse.teacher_verified && <VerifiedBadge />}
                </Link>
                <span className="inline-flex items-center gap-1 font-extrabold text-amber-300">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  {selectedCourse.avg_rating > 0 ? selectedCourse.avg_rating.toFixed(1) : "Mới"} ({selectedCourse.review_count} đánh giá)
                </span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <Users className="h-4 w-4" /> {selectedCourse.student_count} học viên
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-xs min-w-[210px] space-y-2.5 ring-1 ring-white/20">
              {selectedCourse.enrolled_by_me ? (
                <>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Tiến độ của bạn</span>
                    <span className="text-emerald-300">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-200">
                    Đã xong {doneSet.size} / {selectedCourse.modules.length} bài học
                  </p>
                  {selectedCourse.my_certificate_code ? (
                    <Link
                      href={`/chung-chi?code=${encodeURIComponent(selectedCourse.my_certificate_code)}`}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-300 transition"
                    >
                      <Award className="h-4 w-4" /> Xem &amp; In Chứng chỉ (PDF + QR)
                    </Link>
                  ) : pct >= 100 ? (
                    <button
                      type="button"
                      disabled={issuingCert}
                      onClick={() => void handleIssueCertificate(selectedCourse.id)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-300 disabled:opacity-50 transition"
                    >
                      <Award className="h-4 w-4" />
                      {issuingCert ? "Đang cấp chứng chỉ..." : "Cấp Chứng chỉ Hoàn thành ngay"}
                    </button>
                  ) : (
                    <p className="text-[10px] text-amber-200/90">
                      Hoàn thành 100% bài học để nhận Chứng chỉ PDF kèm mã QR xác thực.
                    </p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleEnroll(selectedCourse.id)}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-extrabold text-slate-950 shadow hover:bg-emerald-400 transition"
                >
                  Tham gia học miễn phí ngay
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Nội dung Học bài (2 cột: Danh sách bài học + Màn hình bài học) */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Danh sách bài học */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 lg:col-span-4">
            <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Lộ trình Khóa học ({selectedCourse.modules.length} bài)
            </h2>
            <div className="space-y-1.5">
              {selectedCourse.modules.map((m, idx) => {
                const active = activeLesson?.id === m.id;
                const done = doneSet.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveLessonId(m.id)}
                    className={`flex w-full items-start gap-2.5 rounded-xl p-3 text-left transition ${
                      active
                        ? "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-snug">
                        {idx + 1}. {m.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" /> {m.duration}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Màn hình học bài chi tiết */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 lg:col-span-8">
            {activeLesson && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600">{selectedCourse.subject_name}</span>
                    <h2 className="text-lg font-extrabold text-slate-900">{activeLesson.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleLessonDone(selectedCourse.id, activeLesson.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      doneSet.has(activeLesson.id)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {doneSet.has(activeLesson.id) ? "Đã hoàn thành bài này" : "Đánh dấu đã học xong"}
                  </button>
                </div>

                {embedUrl ? (
                  <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                    <iframe
                      src={embedUrl}
                      title={activeLesson.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : activeLesson.video_url ? (
                  <a
                    href={activeLesson.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <PlayCircle className="h-4 w-4" /> Mở video bài giảng đính kèm
                  </a>
                ) : null}

                <div className="rounded-2xl bg-slate-50/80 p-5 text-sm leading-relaxed text-slate-800 whitespace-pre-line">
                  {activeLesson.content}
                </div>
              </>
            )}
          </section>
        </div>

        {/* =============================================================== */}
        {/* KHU VỰC ĐÁNH GIÁ 5 SAO & BÌNH LUẬN KHÓA HỌC (REAL-TIME!)       */}
        {/* =============================================================== */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="grid gap-6 md:grid-cols-12 items-center border-b border-slate-100 pb-6">
            {/* Điểm sao tổng */}
            <div className="text-center md:col-span-4 space-y-1.5">
              <p className="text-4xl font-extrabold text-slate-900">
                {selectedCourse.avg_rating > 0 ? selectedCourse.avg_rating.toFixed(1) : "5.0"}
              </p>
              <div className="flex justify-center">
                <StarRow rating={selectedCourse.avg_rating || 5} size="md" />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {selectedCourse.review_count} đánh giá từ học viên (Cập nhật Real-time)
              </p>
            </div>

            {/* Biểu đồ thanh ngang 5 sao -> 1 sao */}
            <div className="space-y-2 md:col-span-8">
              {[5, 4, 3, 2, 1].map((s) => {
                const cnt = selectedCourse.rating_breakdown?.[s] || 0;
                const barPct =
                  selectedCourse.review_count > 0 ? Math.round((cnt / selectedCourse.review_count) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-bold text-slate-700">{s} sao</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold text-slate-500">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Học sinh chọn 1–5 sao & viết bình luận đánh giá */}
          {user ? (
            <form onSubmit={handleSubmitReview} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {selectedCourse.my_review ? "Cập nhật đánh giá của bạn cho khóa học này" : "Đánh giá & Bình luận Khóa học"}
                </h3>
                <span className="text-xs font-bold text-amber-800">{STAR_LABELS[displayStar]}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverStar(s)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => setPickStar(s)}
                    className="rounded-lg p-1 transition hover:scale-110"
                    aria-label={`Đánh giá ${s} sao`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        s <= displayStar ? "fill-amber-400 text-amber-400" : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của em về bài giảng, cách thầy cô truyền đạt và điều em thích nhất trong khóa học..."
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={sendingReview}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingReview ? "Đang gửi..." : `Gửi đánh giá ${pickStar} sao`}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-600">
              <Link href="/dang-nhap" className="font-extrabold text-indigo-600 hover:underline">
                Đăng nhập
              </Link>{" "}
              để đánh giá 5 sao và bình luận cảm nhận về khóa học này!
            </div>
          )}

          {/* Danh sách bình luận đánh giá */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              Nhận xét từ Học viên ({selectedCourse.reviews.length})
            </h3>
            {selectedCourse.reviews.length === 0 ? (
              <p className="text-xs italic text-slate-400">Hãy là người đầu tiên đánh giá 5 sao cho khóa học này!</p>
            ) : (
              selectedCourse.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
                        {r.user_name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">{r.user_name}</p>
                        <StarRow rating={r.rating} />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700">{r.rating}.0 / 5.0</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH DANH SÁCH KHÓA HỌC + FORM GIÁO VIÊN ĐĂNG KHÓA HỌC MỚI
  // =========================================================================
  return (
    <div className="space-y-6 pb-10">
      {/* Banner Cổng Khóa học */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
              <GraduationCap className="h-3.5 w-3.5" /> Cổng Khóa học Cộng đồng • Đánh giá 5 Sao Real-time
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Khóa học Trực tuyến từ Đội ngũ Giáo viên
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Học theo lộ trình bài bản từ Lớp 1–12 đến Lập trình thực chiến, lưu tiến độ từng bài, chấm điểm 5 sao và viết bình luận đánh giá chất lượng trực tiếp cho thầy cô!
            </p>
          </div>

          {isStaff ? (
            <button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 transition"
            >
              <Plus className="h-4 w-4" /> Đăng Khóa học mới
            </button>
          ) : null}
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Form Giáo viên / Admin đăng Khóa học mới */}
      {createOpen && isStaff && (
        <form
          onSubmit={handleCreateCourse}
          className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Tạo &amp; Xuất bản Khóa học mới</h2>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              required
              value={cSubject}
              onChange={(e) => setCSubject(e.target.value)}
              placeholder="Môn học (VD: Toán học, Python)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
            />
            <input
              required
              value={cGrade}
              onChange={(e) => setCGrade(e.target.value)}
              placeholder="Đối tượng (VD: Lớp 12, THCS)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
            />
            <input
              required
              value={cLevel}
              onChange={(e) => setCLevel(e.target.value)}
              placeholder="Trình độ (VD: Cơ bản → Nâng cao)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
            />
            <select
              value={cTheme}
              onChange={(e) => setCTheme(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
            >
              <option value="indigo">Màu bìa: Xanh Indigo</option>
              <option value="emerald">Màu bìa: Xanh Ngọc</option>
              <option value="rose">Màu bìa: Đỏ Hồng</option>
              <option value="amber">Màu bìa: Cam Vàng</option>
              <option value="sky">Màu bìa: Xanh Da trời</option>
            </select>
          </div>

          <input
            required
            value={cTitle}
            onChange={(e) => setCTitle(e.target.value)}
            placeholder="Tên khóa học (VD: Chuyên đề Hình học Không gian Oxyz đạt 9+)"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:outline-none"
          />

          <textarea
            required
            rows={2}
            value={cSummary}
            onChange={(e) => setCSummary(e.target.value)}
            placeholder="Mô tả ngắn mục tiêu & lợi ích khi học sinh học xong khóa học này..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
          />

          {/* Danh sách bài học trong khóa */}
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-slate-800">
                Danh sách Bài học trong khóa ({cModules.length} bài)
              </p>
              <button
                type="button"
                onClick={() =>
                  setCModules((prev) => [
                    ...prev,
                    { title: `Bài ${prev.length + 1}: `, duration: "20 phút", video_url: "", content: "" },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm bài học
              </button>
            </div>

            {cModules.map((mod, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                <div className="grid gap-2 sm:grid-cols-12">
                  <input
                    required
                    value={mod.title}
                    onChange={(e) =>
                      setCModules((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, title: e.target.value } : m))
                      )
                    }
                    placeholder="Tiêu đề bài học..."
                    className="sm:col-span-6 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold"
                  />
                  <input
                    value={mod.duration}
                    onChange={(e) =>
                      setCModules((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, duration: e.target.value } : m))
                      )
                    }
                    placeholder="Thời lượng (VD: 25 phút)"
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                  />
                  <input
                    value={mod.video_url}
                    onChange={(e) =>
                      setCModules((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, video_url: e.target.value } : m))
                      )
                    }
                    placeholder="Link YouTube (tùy chọn)"
                    className="sm:col-span-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                  />
                  {cModules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCModules((prev) => prev.filter((_, i) => i !== idx))}
                      className="sm:col-span-1 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={3}
                  value={mod.content}
                  onChange={(e) =>
                    setCModules((prev) =>
                      prev.map((m, i) => (i === idx ? { ...m, content: e.target.value } : m))
                    )
                  }
                  placeholder="Nội dung chi tiết bài học, ví dụ minh họa, bài tập tự luyện..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              <BookOpen className="h-4 w-4" />
              {creating ? "Đang xuất bản..." : "Xuất bản Khóa học ngay"}
            </button>
          </div>
        </form>
      )}

      {/* Thanh tìm kiếm khóa học */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Tìm khóa học theo môn, khối lớp hoặc tên thầy cô..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-xs shadow-xs focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Lưới Khóa học */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Đang tải danh sách khóa học...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Không tìm thấy khóa học nào phù hợp.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const canDelete = user?.id === c.teacher_id || isAdmin;
            return (
              <article
                key={c.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Bìa khóa học */}
                <div
                  className={`relative bg-gradient-to-br ${
                    COVER_THEMES[c.cover_theme] || COVER_THEMES.indigo
                  } p-5 text-white`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5">{c.subject_name}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5">{c.grade_label}</span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-base font-extrabold leading-snug">{c.title}</h2>
                  <Link
                    href={`/giao-vien?id=${encodeURIComponent(c.teacher_id)}`}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/90 hover:underline"
                  >
                    <span>{c.teacher_name}</span>
                    {c.teacher_verified && <VerifiedBadge />}
                  </Link>
                </div>

                {/* Thông tin & Điểm 5 sao */}
                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{c.summary}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <StarRow rating={c.avg_rating || 5} />
                        <span className="font-extrabold text-slate-900">
                          {c.avg_rating > 0 ? c.avg_rating.toFixed(1) : "5.0"}
                        </span>
                        <span className="text-[11px] text-slate-400">({c.review_count})</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {c.modules.length} bài • {c.student_count} học viên
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-indigo-500 transition"
                    >
                      {c.enrolled_by_me ? "Tiếp tục học & Đánh giá →" : "Vào học & Đánh giá 5★ →"}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteCourse(c.id)}
                        title="Xóa khóa học"
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
