"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  LogIn,
  Play,
  School,
  Users,
} from "lucide-react";
import { CORE_API_URL, Lesson } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getSubjectMeta } from "@/lib/subjects";
import { MathContent } from "@/components/MathContent";

interface ClassroomSummary {
  id: string;
  code: string;
  name: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  description: string;
  allow_self_enroll: boolean;
  is_enrolled: boolean;
  student_count: number;
  lesson_count: number;
  exam_count: number;
}

interface AssignmentItem {
  id: string;
  item_type: "lesson" | "exam";
  item_id: string;
  item_title: string;
  due_at: string;
}

interface GradeRow {
  attempt_id: string;
  exam_id: string;
  score: number;
  max_score: number;
  graded_at: string;
}

export default function ClassroomsPage() {
  const { user, accessToken } = useAuth();
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const [gradeFilter, setGradeFilter] = useState<number>(0);
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Chi tiết lớp học đang mở
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<{
    classroom: ClassroomSummary;
    assignments: AssignmentItem[];
    gradebook: GradeRow[];
    student_count: number;
  } | null>(null);
  const [readingLesson, setReadingLesson] = useState<Lesson | null>(null);

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadList = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    if (tab === "mine" && accessToken) {
      const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/my`, { headers });
      if (res.ok) {
        const d = await res.json();
        setClassrooms(d.classrooms || []);
      }
      return;
    }

    const q = gradeFilter > 0 ? `?grade=${gradeFilter}` : "";
    const res = await fetch(`${CORE_API_URL}/api/v1/classrooms${q}`, { headers });
    if (res.ok) {
      const d = await res.json();
      setClassrooms(d.classrooms || []);
    }
  }, [tab, gradeFilter, accessToken]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openClassroom = async (classId: string) => {
    setActiveClassId(classId);
    setReadingLesson(null);
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/${encodeURIComponent(classId)}`, { headers });
    if (res.ok) {
      const d = await res.json();
      setClassDetail({
        classroom: d.classroom,
        assignments: d.assignments || [],
        gradebook: d.gradebook || [],
        student_count: d.student_count || 0,
      });
    }
  };

  const handleJoin = async (opts: { classroom_id?: string; code?: string }) => {
    if (!accessToken) {
      notify("err", "Vui lòng đăng nhập tài khoản học sinh để đăng ký lớp học!");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    if (!res.ok) {
      notify("err", data.error || "Không thể đăng ký lớp học");
      return;
    }
    setJoinCode("");
    notify("ok", `Đăng ký thành công vào lớp "${data.classroom.name}"! Bạn có thể học theo giáo án ngay.`);
    await loadList();
    void openClassroom(data.classroom.id);
  };

  const openLessonContent = async (lessonId: string) => {
    const res = await fetch(`${CORE_API_URL}/api/v1/lessons/${encodeURIComponent(lessonId)}`);
    if (res.ok) {
      const d = await res.json();
      setReadingLesson(d.lesson || null);
    }
  };

  // === MÀN HÌNH CHI TIẾT LỚP HỌC (GIÁO ÁN + BÀI KIỂM TRA TRỰC TUYẾN) ===
  if (activeClassId && classDetail) {
    const lessons = classDetail.assignments.filter((a) => a.item_type === "lesson");
    const exams = classDetail.assignments.filter((a) => a.item_type === "exam");
    const meta = getSubjectMeta(classDetail.classroom.subject_code, classDetail.classroom.subject_name);
    const SubIcon = meta.icon;

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setActiveClassId(null);
            setClassDetail(null);
            setReadingLesson(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách Lớp học
        </button>

        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-0.5 text-indigo-200">
                  <SubIcon className="h-3.5 w-3.5" />
                  Lớp {classDetail.classroom.grade_id} • {classDetail.classroom.subject_name}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-emerald-300">
                  Mã lớp: {classDetail.classroom.code}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{classDetail.classroom.name}</h1>
              <p className="text-sm text-slate-300">
                Giáo viên phụ trách: <strong>{classDetail.classroom.teacher_name}</strong> •{" "}
                {classDetail.student_count} học sinh đang học
              </p>
            </div>

            {!classDetail.classroom.is_enrolled && classDetail.classroom.allow_self_enroll && (
              <button
                type="button"
                onClick={() => void handleJoin({ classroom_id: classDetail.classroom.id })}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-400"
              >
                Đăng ký vào lớp ngay
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI: LỘ TRÌNH GIÁO ÁN + BÀI KIỂM TRA */}
          <div className="space-y-5 lg:col-span-5">
            {/* Giáo án của lớp */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                Giáo án học tập của lớp ({lessons.length} bài)
              </h2>
              {lessons.length === 0 ? (
                <p className="text-xs text-slate-500">Giáo viên chưa gắn bài giảng nào.</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map((l, idx) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => void openLessonContent(l.item_id)}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${
                        readingLesson?.id === l.item_id
                          ? "border-indigo-600 bg-indigo-50/70"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase text-emerald-700">
                        Buổi / Bài #{idx + 1}
                      </span>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{l.item_title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bài kiểm tra trực tuyến */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                Bài kiểm tra trực tuyến ({exams.length} bài)
              </h2>
              {exams.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có bài kiểm tra nào được giao.</p>
              ) : (
                <div className="space-y-2.5">
                  {exams.map((ex) => {
                    const myAttempt = classDetail.gradebook.find((g) => g.exam_id === ex.item_id);
                    return (
                      <div
                        key={ex.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
                      >
                        <p className="text-sm font-bold text-slate-900">{ex.item_title}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {ex.due_at && (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                <Calendar className="h-3.5 w-3.5" /> Hạn: {ex.due_at}
                              </span>
                            )}
                            {myAttempt && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                                Đã làm: {Number(myAttempt.score).toFixed(2)}/{Number(myAttempt.max_score).toFixed(2)}đ
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/thi/phong-thi?id=${encodeURIComponent(ex.item_id)}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                          >
                            <Play className="h-3.5 w-3.5" />
                            {myAttempt ? "Làm lại" : "Làm bài ngay"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: NỘI DUNG BÀI HỌC ĐANG XEM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7 h-fit">
            {readingLesson ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-indigo-600">
                      {readingLesson.chapter}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{readingLesson.title}</h2>
                  </div>
                  <Link
                    href={`/ai-gia-su?grade=${readingLesson.grade_id}&subject=${readingLesson.subject_code}&q=${encodeURIComponent(
                      `Em đang học bài "${readingLesson.title}" trong lớp, thầy giải thích trọng tâm giúp em nhé!`
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                  >
                    <Bot className="h-4 w-4" /> Hỏi AI Gia sư
                  </Link>
                </div>
                <div className="mt-4">
                  <MathContent content={readingLesson.content_mdx} />
                </div>
              </>
            ) : (
              <div className="py-16 text-center space-y-2">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Bấm vào bất kỳ bài giảng nào trong <strong>Giáo án học tập</strong> bên trái để bắt đầu học!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === MÀN HÌNH DANH SÁCH & ĐĂNG KÝ LỚP HỌC ===
  return (
    <div className="space-y-6">
      {/* Banner + Nhập mã lớp tham gia nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
            <School className="h-4 w-4" /> LỚP HỌC TRỰC TUYẾN THEO GIÁO ÁN GIÁO VIÊN
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Đăng ký Lớp học &amp; Làm Bài kiểm tra
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Đăng ký trực tiếp vào lớp của giáo viên hoặc nhập <strong>Mã lớp</strong> (VD: <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">TOAN12-A1</code>) để học đúng giáo án và làm bài kiểm tra định kỳ.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) void handleJoin({ code: joinCode.trim() });
          }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <div className="relative flex-1 sm:w-52">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã lớp (TOAN12-A1)"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 font-mono text-xs font-bold uppercase focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500"
          >
            Tham gia
          </button>
        </form>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            toast.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Bộ lọc & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("explore")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === "explore"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Khám phá &amp; Đăng ký lớp học
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === "mine"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Lớp học của tôi
          </button>
        </div>

        {tab === "explore" && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700"
          >
            <option value={0}>Tất cả Lớp 1–12</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Lớp {g}</option>
            ))}
          </select>
        )}
      </div>

      {tab === "mine" && !user ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Hãy đăng nhập tài khoản học sinh để xem danh sách lớp bạn đã đăng ký.
          </p>
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"
          >
            <LogIn className="h-4 w-4" /> Đăng nhập ngay
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((cls) => {
            const meta = getSubjectMeta(cls.subject_code, cls.subject_name);
            const SubIcon = meta.icon;
            return (
              <div
                key={cls.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${meta.badgeBg}`}>
                      <SubIcon className="h-3.5 w-3.5" />
                      Lớp {cls.grade_id} • {cls.subject_name}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      {cls.code}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-slate-900">{cls.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">GV: {cls.teacher_name}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {cls.description}
                  </p>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-indigo-500" /> {cls.student_count} học sinh
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-600" /> {cls.lesson_count} bài giáo án
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClipboardCheck className="h-3.5 w-3.5 text-rose-500" /> {cls.exam_count} bài KT
                    </span>
                  </div>

                  {cls.is_enrolled ? (
                    <button
                      type="button"
                      onClick={() => void openClassroom(cls.id)}
                      className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                    >
                      Vào lớp học ngay
                    </button>
                  ) : cls.allow_self_enroll ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleJoin({ classroom_id: cls.id })}
                        className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                      >
                        Đăng ký học
                      </button>
                      <button
                        type="button"
                        onClick={() => void openClassroom(cls.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Xem trước
                      </button>
                    </div>
                  ) : (
                    <span className="block rounded-xl bg-slate-100 py-2 text-center text-xs font-semibold text-slate-500">
                      Lớp chỉ nhận thêm trực tiếp từ Giáo viên
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
