"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Check,
  ClipboardCheck,
  Copy,
  GraduationCap,
  Plus,
  School,
  ShieldCheck,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { CORE_API_URL, ExamSummary, Lesson } from "@/lib/api";
import { getSubjectMeta } from "@/lib/subjects";

interface Subject {
  id: number;
  code: string;
  name: string;
}

interface ClassroomItem {
  id: string;
  code: string;
  name: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  description: string;
  allow_self_enroll: boolean;
  student_count: number;
  lesson_count: number;
  exam_count: number;
}

interface StudentMember {
  user_id: string;
  user_name: string;
  user_email: string;
  status: string;
  joined_at: string;
}

interface AssignmentItem {
  id: string;
  item_type: "lesson" | "exam";
  item_id: string;
  item_title: string;
  due_at: string;
  assigned_at: string;
}

interface GradeRow {
  attempt_id: string;
  exam_id: string;
  user_name: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  duration_sec: number;
  graded_at: string;
}

interface ClassroomManagerProps {
  accessToken: string | null;
  subjects: Subject[];
  onNotify: (type: "ok" | "err", msg: string) => void;
}

export function ClassroomManager({
  accessToken,
  subjects,
  onNotify,
}: ClassroomManagerProps) {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    classroom: ClassroomItem;
    students: StudentMember[];
    assignments: AssignmentItem[];
    gradebook: GradeRow[];
  } | null>(null);
  const [subTab, setSubTab] = useState<"students" | "curriculum" | "grades">("curriculum");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  // Form tạo lớp mới
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState(12);
  const [newSubject, setNewSubject] = useState("toan");
  const [newDesc, setNewDesc] = useState("");
  const [newSelfEnroll, setNewSelfEnroll] = useState(true);

  // Form thêm học sinh & giao giáo án/kiểm tra
  const [studentEmail, setStudentEmail] = useState("");
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [availableExams, setAvailableExams] = useState<ExamSummary[]>([]);
  const [pickedLessonId, setPickedLessonId] = useState("");
  const [pickedExamId, setPickedExamId] = useState("");
  const [examDueAt, setExamDueAt] = useState("2026-12-30");

  const loadMyClassrooms = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const list = (data.classrooms || []) as ClassroomItem[];
      setClassrooms(list);
      if (!selectedId && list[0]) {
        setSelectedId(list[0].id);
      }
    }
  }, [accessToken, selectedId]);

  const loadDetail = useCallback(
    async (classId: string) => {
      if (!accessToken) return;
      const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail({
          classroom: data.classroom,
          students: data.students || [],
          assignments: data.assignments || [],
          gradebook: data.gradebook || [],
        });

        // Tải danh sách bài giảng cùng khối lớp & đề thi để giáo viên chọn giao
        const [lesRes, exRes] = await Promise.all([
          fetch(
            `${CORE_API_URL}/api/v1/lessons?grade=${data.classroom.grade_id}&subject=${data.classroom.subject_code}&mode=index`
          ),
          fetch(`${CORE_API_URL}/api/v1/exams`),
        ]);
        if (lesRes.ok) {
          const ld = await lesRes.json();
          const lList = (ld.lessons || []) as Lesson[];
          setAvailableLessons(lList);
          setPickedLessonId(lList[0]?.id || "");
        }
        if (exRes.ok) {
          const ed = await exRes.json();
          const eList = (ed.exams || []) as ExamSummary[];
          setAvailableExams(eList);
          setPickedExamId(eList[0]?.id || "");
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadMyClassrooms();
  }, [loadMyClassrooms]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/cms/classrooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: newName.trim(),
        grade_id: newGrade,
        subject_code: newSubject,
        description: newDesc.trim(),
        allow_self_enroll: newSelfEnroll,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify("err", data.error || "Không thể tạo lớp học");
      return;
    }
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    onNotify("ok", `Đã tạo lớp mới thành công! Mã lớp cho học sinh đăng ký: ${data.classroom.code}`);
    await loadMyClassrooms();
    setSelectedId(data.classroom.id);
  };

  const handleToggleSelfEnroll = async () => {
    if (!accessToken || !detail) return;
    const nextVal = !detail.classroom.allow_self_enroll;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(detail.classroom.id)}/settings`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ allow_self_enroll: nextVal }),
      }
    );
    if (res.ok) {
      onNotify("ok", nextVal ? "Đã MỞ cho học sinh tự đăng ký vào lớp." : "Đã KHÓA tự đăng ký lớp.");
      await loadDetail(detail.classroom.id);
      await loadMyClassrooms();
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !detail || !studentEmail.trim()) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(detail.classroom.id)}/students`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: studentEmail.trim() }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      onNotify("err", data.error || "Không thể thêm học sinh");
      return;
    }
    setStudentEmail("");
    onNotify("ok", `Đã thêm học sinh ${data.student.full_name} vào lớp!`);
    await loadDetail(detail.classroom.id);
    await loadMyClassrooms();
  };

  const handleRemoveStudent = async (userId: string) => {
    if (!accessToken || !detail) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(detail.classroom.id)}/students/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      onNotify("ok", "Đã gỡ học sinh khỏi lớp.");
      await loadDetail(detail.classroom.id);
      await loadMyClassrooms();
    }
  };

  const handleAssignItem = async (type: "lesson" | "exam") => {
    if (!accessToken || !detail) return;
    let itemId = "";
    let itemTitle = "";
    if (type === "lesson") {
      const found = availableLessons.find((l) => l.id === pickedLessonId);
      if (!found) return;
      itemId = found.id;
      itemTitle = `${found.chapter} — ${found.title}`;
    } else {
      const found = availableExams.find((e) => e.id === pickedExamId);
      if (!found) return;
      itemId = found.id;
      itemTitle = found.title;
    }

    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(detail.classroom.id)}/assignments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          item_type: type,
          item_id: itemId,
          item_title: itemTitle,
          due_at: type === "exam" ? examDueAt : "",
        }),
      }
    );
    if (res.ok) {
      onNotify(
        "ok",
        type === "lesson" ? "Đã thêm bài giảng vào giáo án của lớp!" : "Đã giao bài kiểm tra trực tuyến cho lớp!"
      );
      await loadDetail(detail.classroom.id);
      await loadMyClassrooms();
    }
  };

  const handleDeleteAssignment = async (asgId: string) => {
    if (!accessToken || !detail) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(detail.classroom.id)}/assignments/${encodeURIComponent(asgId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      onNotify("ok", "Đã gỡ khỏi giáo án lớp.");
      await loadDetail(detail.classroom.id);
      await loadMyClassrooms();
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const lessonAssignments = detail?.assignments.filter((a) => a.item_type === "lesson") || [];
  const examAssignments = detail?.assignments.filter((a) => a.item_type === "exam") || [];

  return (
    <div className="space-y-6">
      {/* Header + Nút Tạo lớp mới */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Quản lý Lớp học, Học sinh &amp; Giao Giáo án / Kiểm tra
          </h2>
          <p className="text-sm text-slate-500">
            Tạo lớp theo từng khối 1–12, cấp mã lớp để học sinh tự đăng ký học đúng giáo án và làm bài kiểm tra trực tuyến.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" /> Tạo Lớp học mới
        </button>
      </div>

      {/* Form tạo lớp mới */}
      {showCreate && (
        <form
          onSubmit={handleCreateClassroom}
          className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-indigo-900">Thông tin Lớp học mới</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-700">Tên lớp học *</label>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Lớp Hóa học 12A2 — Luyện thi THPT"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Khối lớp</label>
              <select
                value={newGrade}
                onChange={(e) => setNewGrade(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Lớp {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Môn học</label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mô tả lộ trình giáo án</label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Học theo giáo án hàng tuần, làm bài kiểm tra 15 phút và thi thử..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={newSelfEnroll}
                onChange={(e) => setNewSelfEnroll(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Cho phép học sinh tự đăng ký vào lớp bằng Mã lớp hoặc trên trang /lop-hoc
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Lưu &amp; Tạo Mã lớp
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Danh sách lớp đang phụ trách */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((cls) => {
          const meta = getSubjectMeta(cls.subject_code, cls.subject_name);
          const SubIcon = meta.icon;
          const active = selectedId === cls.id;
          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => setSelectedId(cls.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-bold ${meta.badgeBg}`}>
                  <SubIcon className="h-3.5 w-3.5" />
                  Lớp {cls.grade_id} • {cls.subject_name}
                </span>
                <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  {cls.code}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-1 text-sm font-bold text-slate-900">{cls.name}</h3>
              <div className="mt-2.5 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-indigo-500" /> {cls.student_count} HS
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" /> {cls.lesson_count} bài
                </span>
                <span className="inline-flex items-center gap-1">
                  <ClipboardCheck className="h-3.5 w-3.5 text-rose-500" /> {cls.exam_count} bài KT
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chi tiết Lớp đang chọn */}
      {detail && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{detail.classroom.name}</h3>
                <button
                  type="button"
                  onClick={() => copyCode(detail.classroom.code)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white hover:bg-slate-700"
                >
                  {copiedCode === detail.classroom.code ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Mã lớp: {detail.classroom.code}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{detail.classroom.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelfEnroll}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  detail.classroom.allow_self_enroll
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {detail.classroom.allow_self_enroll ? "Đang MỞ đăng ký tự do" : "Đang KHÓA tự đăng ký"}
              </button>
              <Link
                href="/lop-hoc"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xem góc nhìn Học sinh
              </Link>
            </div>
          </div>

          {/* 3 Tab quản lý lớp */}
          <div className="flex border-b border-slate-200 bg-white px-5">
            {[
              { id: "curriculum", label: `Giáo án & Bài kiểm tra (${detail.assignments.length})`, icon: BookOpen },
              { id: "students", label: `Học sinh trong lớp (${detail.students.length})`, icon: Users },
              { id: "grades", label: `Bảng điểm kiểm tra (${detail.gradebook.length})`, icon: Trophy },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as typeof subTab)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition ${
                    subTab === t.id
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {/* SUBTAB 1: GIAO GIÁO ÁN & BÀI KIỂM TRA TRỰC TUYẾN */}
            {subTab === "curriculum" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Cột Giáo án bài giảng */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <School className="h-4 w-4 text-emerald-600" />
                    Lộ trình Giáo án Lớp ({lessonAssignments.length} bài)
                  </h4>

                  <div className="flex gap-2">
                    <select
                      value={pickedLessonId}
                      onChange={(e) => setPickedLessonId(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                    >
                      {availableLessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          [{l.chapter}] {l.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAssignItem("lesson")}
                      className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      + Giao bài
                    </button>
                  </div>

                  <div className="space-y-2">
                    {lessonAssignments.length === 0 ? (
                      <p className="text-xs text-slate-500">Chưa gắn bài giảng nào vào giáo án lớp.</p>
                    ) : (
                      lessonAssignments.map((a, idx) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase text-emerald-700">
                              Bài giáo án #{idx + 1}
                            </span>
                            <p className="truncate text-xs font-semibold text-slate-800">{a.item_title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAssignment(a.id)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cột Bài kiểm tra trực tuyến */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    Bài Kiểm tra trực tuyến đã giao ({examAssignments.length} đề)
                  </h4>

                  <div className="grid gap-2 sm:grid-cols-12">
                    <select
                      value={pickedExamId}
                      onChange={(e) => setPickedExamId(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium sm:col-span-6"
                    >
                      {availableExams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          [Lớp {ex.grade_id}] {ex.title}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={examDueAt}
                      onChange={(e) => setExamDueAt(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs sm:col-span-3"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAssignItem("exam")}
                      className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 sm:col-span-3"
                    >
                      + Giao đề KT
                    </button>
                  </div>

                  <div className="space-y-2">
                    {examAssignments.length === 0 ? (
                      <p className="text-xs text-slate-500">Chưa giao bài kiểm tra nào cho lớp này.</p>
                    ) : (
                      examAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{a.item_title}</p>
                            {a.due_at && (
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                                <Calendar className="h-3 w-3" /> Hạn nộp: {a.due_at}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAssignment(a.id)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: QUẢN LÝ HỌC SINH TRONG LỚP */}
            {subTab === "students" && (
              <div className="space-y-4">
                <form onSubmit={handleAddStudent} className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="Nhập Email học sinh để thêm thẳng vào lớp (VD: hocsinh@eduk12.vn)"
                    className="min-w-[260px] flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    <UserPlus className="h-4 w-4" /> Thêm Học sinh
                  </button>
                </form>

                {detail.students.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                    Chưa có học sinh nào tham gia lớp. Hãy gửi mã lớp <strong>{detail.classroom.code}</strong> cho học sinh!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-4">Học sinh</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Ngày tham gia</th>
                          <th className="py-2 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.students.map((st) => (
                          <tr key={st.user_id}>
                            <td className="py-2.5 pr-4 font-semibold text-slate-900">
                              <span className="inline-flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-indigo-500" />
                                {st.user_name}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{st.user_email}</td>
                            <td className="py-2.5 pr-4 text-xs text-slate-500">
                              {new Date(st.joined_at).toLocaleDateString("vi-VN")}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => void handleRemoveStudent(st.user_id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Xóa khỏi lớp
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: BẢNG ĐIỂM KIỂM TRA TRỰC TUYẾN */}
            {subTab === "grades" && (
              <div>
                {detail.gradebook.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                    Chưa có bài nộp kiểm tra nào từ học sinh cho các đề đã giao trong lớp này.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-4">Học sinh</th>
                          <th className="py-2 pr-4">Đề kiểm tra</th>
                          <th className="py-2 pr-4">Điểm số</th>
                          <th className="py-2 pr-4">Số câu đúng</th>
                          <th className="py-2">Thời gian làm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.gradebook.map((g) => (
                          <tr key={g.attempt_id}>
                            <td className="py-2.5 pr-4 font-semibold text-slate-900">{g.user_name}</td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{g.exam_id}</td>
                            <td className="py-2.5 pr-4 font-bold text-indigo-700">
                              {Number(g.score).toFixed(2)} / {Number(g.max_score).toFixed(2)}
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-slate-700">
                              {g.correct_count}/{g.total_questions} câu
                            </td>
                            <td className="py-2.5 text-xs text-slate-500">{g.duration_sec}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
