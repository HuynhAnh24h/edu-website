"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BookPlus,
  CheckCircle2,
  Database,
  FileQuestion,
  Lock,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { AI_API_URL, CORE_API_URL } from "@/lib/api";
import { AuthUser, useAuth } from "@/context/AuthContext";
import { MathContent } from "@/components/MathContent";
import { BulkImportPanel } from "@/components/cms/BulkImportPanel";
import { RichWordEditor } from "@/components/cms/RichWordEditor";
import {
  createEmptyDraftQuestion,
  DraftQuestion,
  VisualQuestionBuilder,
} from "@/components/cms/VisualQuestionBuilder";

interface Subject {
  id: number;
  code: string;
  name: string;
}

interface CMSQuestion {
  id: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  topic: string;
  q_type: string;
  difficulty: string;
  content_mdx: string;
}

interface MaterialDraft {
  id: string;
  title: string;
  type: "pdf" | "video_hls" | "mindmap" | "flashcard";
  url: string;
}

const DEFAULT_WORD_LESSON = `<!--word-doc--><h2>1. Kiến thức trọng tâm</h2><p>Gõ trực tiếp nội dung bài giảng tại đây giống như trên <strong>Microsoft Word</strong>. Bạn có thể in đậm, tô màu, tạo bảng hoặc bấm nút <strong>Σ Công thức</strong> để chèn Toán/Lý/Hóa:</p><p style="text-align:center;margin:8px 0;">$$\\log_a(b) = c \\Leftrightarrow a^c = b \\quad (a > 0, a \\neq 1, b > 0)$$</p><div style="background:#eef2ff;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:10px;margin:12px 0;"><strong>💡 Ghi nhớ nhanh:</strong> $\\log_a(xy) = \\log_a x + \\log_a y$ và $\\log_a(x^n) = n\\log_a x$.</div><h3>2. Ví dụ vận dụng</h3><ul><li>Tính $\\log_2 8 = \\log_2 2^3 = 3$.</li><li>Tính $\\log_3 9 = 2$.</li></ul>`;

function stripHtmlToPlain(raw: string): string {
  return raw
    .replace("<!--word-doc-->", "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQuestionPayload(q: DraftQuestion, gradeId: number, subjectCode: string) {
  return {
    grade_id: gradeId,
    subject_code: subjectCode,
    topic: q.topic.trim() || "Bài tập luyện tập",
    q_type: q.q_type,
    difficulty: q.difficulty,
    content_mdx: q.content_mdx.trim(),
    options:
      q.q_type === "short_answer"
        ? []
        : q.options.filter((o) => o.text.trim() !== ""),
    unit_hint: q.q_type === "short_answer" ? "Nhập kết quả" : "",
    answer_single: q.q_type === "single_choice" ? q.answer_single : "",
    answer_multi: q.q_type === "multi_choice" ? q.answer_multi : [],
    answer_true_false: q.q_type === "true_false_group" ? q.answer_true_false : {},
    answer_short:
      q.q_type === "short_answer"
        ? q.answer_short
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    explanation_mdx: q.explanation_mdx.trim(),
  };
}

export default function CMSAdminPage() {
  const { user, accessToken, loading, isStaff, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "lessons" | "questions" | "exams" | "import" | "users"
  >("lessons");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<CMSQuestion[]>([]);
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // === Tab 1: Soạn Bài giảng kiểu Word + Câu hỏi đính kèm trực quan ===
  const [lesGrade, setLesGrade] = useState(12);
  const [lesSubject, setLesSubject] = useState("toan");
  const [lesTextbook, setLesTextbook] = useState("kntt");
  const [lesChapter, setLesChapter] = useState("Chương 2: Hàm số mũ và Lôgarit");
  const [lesTitle, setLesTitle] = useState("");
  const [lesSummary, setLesSummary] = useState("");
  const [lesDuration, setLesDuration] = useState(25);
  const [lesContent, setLesContent] = useState(DEFAULT_WORD_LESSON);
  const [lesMaterials, setLesMaterials] = useState<MaterialDraft[]>([
    { id: "m-1", title: "", type: "pdf", url: "" },
  ]);
  const [lessonQuestions, setLessonQuestions] = useState<DraftQuestion[]>([
    createEmptyDraftQuestion("Củng cố bài học"),
  ]);
  const [autoCreateQuiz, setAutoCreateQuiz] = useState(true);
  const [syncToPgVector, setSyncToPgVector] = useState(true);

  // === Tab 2: Ngân hàng Câu hỏi trực quan (Label-based) ===
  const [bankGrade, setBankGrade] = useState(12);
  const [bankSubject, setBankSubject] = useState("toan");
  const [bankDrafts, setBankDrafts] = useState<DraftQuestion[]>([
    createEmptyDraftQuestion("Chuyên đề trọng tâm"),
  ]);

  // === Tab 3: Tạo Đề thi từ Ngân hàng câu hỏi ===
  const [exGrade, setExGrade] = useState(12);
  const [exSubject, setExSubject] = useState("toan");
  const [exTitle, setExTitle] = useState("");
  const [exMode, setExMode] = useState("mock_live");
  const [exDuration, setExDuration] = useState(45);
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 6000);
  };

  const loadQuestions = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/cms/questions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
  }, [accessToken]);

  const loadUsers = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsersList(data.users || []);
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/subjects`)
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isStaff) void loadQuestions();
    if (isAdmin) void loadUsers();
  }, [isStaff, isAdmin, loadQuestions, loadUsers]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!user || !isStaff) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">
          Khu vực dành riêng cho Giáo viên &amp; Quản trị viên
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Vui lòng đăng nhập bằng tài khoản Giáo viên hoặc Admin để soạn bài giảng kiểu Word, tạo câu hỏi và xuất bản đề thi.
        </p>
        <Link
          href="/dang-nhap"
          className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Đến trang Đăng nhập
        </Link>
      </div>
    );
  }

  // === Handler: Xuất bản Bài giảng Word + Bộ câu hỏi đi kèm ===
  const handlePublishLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesTitle.trim()) {
      showToast("err", "Vui lòng nhập Tiêu đề bài giảng!");
      return;
    }

    setSavingLesson(true);
    try {
      const materials = lesMaterials
        .filter((m) => m.title.trim() !== "")
        .map((m) => ({
          title: m.title.trim(),
          type: m.type,
          url: m.url.trim() || "#cdn-r2-material",
          is_free: true,
        }));

      const res = await fetch(`${CORE_API_URL}/api/v1/cms/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          grade_id: lesGrade,
          subject_code: lesSubject,
          textbook: lesTextbook,
          chapter: lesChapter,
          title: lesTitle.trim(),
          summary: lesSummary.trim(),
          content_mdx: lesContent,
          duration_min: lesDuration,
          materials,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("err", data.error || "Không thể lưu bài giảng");
        return;
      }

      // Lưu các câu hỏi đi kèm (chỉ lưu các câu có nhập nội dung đề bài)
      const validQs = lessonQuestions.filter((q) => q.content_mdx.trim() !== "");
      const createdQIds: string[] = [];
      for (const q of validQs) {
        const qRes = await fetch(`${CORE_API_URL}/api/v1/cms/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(buildQuestionPayload(q, lesGrade, lesSubject)),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.question?.id) createdQIds.push(qData.question.id);
        }
      }

      let quizNote = "";
      if (autoCreateQuiz && createdQIds.length > 0) {
        const exRes = await fetch(`${CORE_API_URL}/api/v1/cms/exams`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            grade_id: lesGrade,
            subject_code: lesSubject,
            title: `Kiểm tra nhanh: ${lesTitle.trim()}`,
            mode: "practice",
            duration_minutes: Math.max(10, createdQIds.length * 3),
            total_points: 10.0,
            question_ids: createdQIds,
          }),
        });
        if (exRes.ok) quizNote = " + Đã tạo bài kiểm tra nhanh trên /thi";
      }

      let aiNote = "";
      if (syncToPgVector) {
        try {
          const aiRes = await fetch(`${AI_API_URL}/api/v1/ai/knowledge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grade_id: lesGrade,
              subject_code: lesSubject,
              textbook: lesTextbook,
              citation: `Bài giảng Lớp ${lesGrade} — ${lesTitle.trim()}`,
              content: `${lesSummary}\n${stripHtmlToPlain(lesContent)}`,
            }),
          });
          if (aiRes.ok) aiNote = " + Nạp AI pgvector thành công!";
        } catch {
          // ignore if AI offline
        }
      }

      setLesTitle("");
      setLesSummary("");
      setLesMaterials([{ id: `m-${Date.now()}`, title: "", type: "pdf", url: "" }]);
      setLessonQuestions([createEmptyDraftQuestion("Củng cố bài học")]);
      void loadQuestions();
      showToast(
        "ok",
        `Đã xuất bản bài giảng + ${createdQIds.length} câu hỏi luyện tập${quizNote}${aiNote}`
      );
    } finally {
      setSavingLesson(false);
    }
  };

  // === Handler: Lưu hàng loạt câu hỏi từ Tab Ngân hàng Câu hỏi ===
  const handleSaveBankQuestions = async () => {
    const valid = bankDrafts.filter((q) => q.content_mdx.trim() !== "");
    if (valid.length === 0) {
      showToast("err", "Hãy nhập nội dung cho ít nhất 1 câu hỏi!");
      return;
    }
    setSavingQuestions(true);
    try {
      let saved = 0;
      for (const q of valid) {
        const res = await fetch(`${CORE_API_URL}/api/v1/cms/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(buildQuestionPayload(q, bankGrade, bankSubject)),
        });
        if (res.ok) saved++;
      }
      setBankDrafts([createEmptyDraftQuestion("Chuyên đề trọng tâm")]);
      void loadQuestions();
      showToast("ok", `Đã lưu thành công ${saved}/${valid.length} câu hỏi vào PostgreSQL!`);
    } finally {
      setSavingQuestions(false);
    }
  };

  // === Handler: Xuất bản Đề thi từ Ngân hàng câu hỏi ===
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQIds.length === 0) {
      showToast("err", "Hãy chọn ít nhất 1 câu hỏi cho đề thi!");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/cms/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        grade_id: exGrade,
        subject_code: exSubject,
        title: exTitle,
        mode: exMode,
        duration_minutes: exDuration,
        total_points: 10.0,
        question_ids: selectedQIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast("err", data.error || "Không thể xuất bản đề thi");
      return;
    }
    setExTitle("");
    setSelectedQIds([]);
    showToast("ok", "Đã xuất bản đề thi vào PostgreSQL & mã hóa gói AES-256-GCM lên Redis!");
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      showToast("ok", "Đã cập nhật phân quyền người dùng!");
      void loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header CMS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Studio Soạn Bài giảng kiểu Word • CMS Quản trị Lớp 1–12
          </p>
          <h1 className="mt-1 text-2xl font-bold">Xin chào, {user.full_name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "lessons", label: "Soạn Bài giảng (Kiểu Word)", icon: BookPlus },
            { id: "questions", label: `Soạn Câu hỏi (${questions.length})`, icon: FileQuestion },
            { id: "exams", label: "Tạo Đề thi", icon: ShieldCheck },
            { id: "import", label: "Import JSON / Tách đề", icon: Upload },
            ...(isAdmin ? [{ id: "users", label: "Phân quyền User", icon: Users }] : []),
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === t.id
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
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

      {/* === TAB 1: STUDIO SOẠN BÀI GIẢNG KIỂU WORD + CÂU HỎI TRỰC QUAN === */}
      {activeTab === "lessons" && (
        <form onSubmit={handlePublishLesson} className="space-y-6">
          {/* Bước 1: Thông tin phân loại Bài giảng (Labels rõ ràng) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Thông tin Bài giảng (Lớp 1–12)
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Khối lớp
                </label>
                <select
                  value={lesGrade}
                  onChange={(e) => setLesGrade(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Môn học
                </label>
                <select
                  value={lesSubject}
                  onChange={(e) => setLesSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold"
                >
                  {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Bộ sách GDPT 2018
                </label>
                <select
                  value={lesTextbook}
                  onChange={(e) => setLesTextbook(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold"
                >
                  <option value="kntt">Kết nối tri thức</option>
                  <option value="ctst">Chân trời sáng tạo</option>
                  <option value="canh_dieu">Cánh diều</option>
                  <option value="general">Chương trình chung</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Thời lượng (phút)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={lesDuration}
                  onChange={(e) => setLesDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Chương / Chủ đề
                </label>
                <input
                  required
                  value={lesChapter}
                  onChange={(e) => setLesChapter(e.target.value)}
                  placeholder="VD: Chương 2: Hàm số mũ và Lôgarit"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Tiêu đề bài giảng *
                </label>
                <input
                  required
                  value={lesTitle}
                  onChange={(e) => setLesTitle(e.target.value)}
                  placeholder="VD: Bài 1: Công thức Lôgarit & Bài tập vận dụng"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Mục tiêu / Tóm tắt ngắn cho học sinh
              </label>
              <input
                value={lesSummary}
                onChange={(e) => setLesSummary(e.target.value)}
                placeholder="Học xong bài này, học sinh nắm vững..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          {/* Bước 2: Trình soạn thảo kiểu Microsoft Word */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Trình Soạn thảo Bài giảng (Kiểu Microsoft Word)
              </h2>
            </div>
            <RichWordEditor value={lesContent} onChange={setLesContent} />
          </div>

          {/* Bước 3: Tài liệu đính kèm (PDF / Video / Flashcard) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  3
                </span>
                <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                  <Paperclip className="h-4 w-4 text-indigo-600" />
                  Tài liệu đính kèm (PDF / Video / Mindmap)
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLesMaterials((prev) => [
                    ...prev,
                    { id: `m-${Date.now()}`, title: "", type: "pdf", url: "" },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm học liệu
              </button>
            </div>

            <div className="space-y-2">
              {lesMaterials.map((m, idx) => (
                <div key={m.id} className="grid gap-2 sm:grid-cols-12">
                  <select
                    value={m.type}
                    onChange={(e) =>
                      setLesMaterials((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, type: e.target.value as MaterialDraft["type"] } : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-bold sm:col-span-2"
                  >
                    <option value="pdf">Tài liệu PDF</option>
                    <option value="video_hls">Video bài giảng</option>
                    <option value="mindmap">Sơ đồ tư duy</option>
                    <option value="flashcard">Flashcard</option>
                  </select>
                  <input
                    value={m.title}
                    onChange={(e) =>
                      setLesMaterials((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                      )
                    }
                    placeholder="Tên tài liệu hiển thị (VD: Slide bài giảng PDF)"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:col-span-5"
                  />
                  <input
                    value={m.url}
                    onChange={(e) =>
                      setLesMaterials((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item))
                      )
                    }
                    placeholder="Link file trên Cloudflare R2 / YouTube / Google Drive"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:col-span-4"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLesMaterials((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="flex items-center justify-center rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 sm:col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bước 4: Bộ Câu hỏi & Đáp án đi kèm (Trực quan kiểu Label) */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                4
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                Tùy chọn nhưng rất hữu ích cho học sinh tự luyện
              </span>
            </div>

            <VisualQuestionBuilder
              questions={lessonQuestions}
              onChange={setLessonQuestions}
              defaultTopic={lesTitle || lesChapter}
              title="Câu hỏi luyện tập & Đáp án đi kèm bài giảng"
              subtitle="Điền câu hỏi, bấm chọn nhãn đáp án đúng (A/B/C/D hoặc Đúng/Sai) và bấm '+ Thêm câu hỏi mới' để thêm không giới hạn."
            />
          </div>

          {/* Thanh Xuất bản cuối trang */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoCreateQuiz}
                  onChange={(e) => setAutoCreateQuiz(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Tự động tạo luôn Bài kiểm tra nhanh trên /thi (Mã hóa AES-256-GCM) từ các câu hỏi trên
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-purple-800">
                <input
                  type="checkbox"
                  checked={syncToPgVector}
                  onChange={(e) => setSyncToPgVector(e.target.checked)}
                  className="h-4 w-4 accent-purple-600"
                />
                <Database className="h-4 w-4 text-purple-600" />
                Tự động nạp nội dung bài giảng vào AI Gia sư (PostgreSQL pgvector)
              </label>
            </div>

            <button
              type="submit"
              disabled={savingLesson}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {savingLesson ? "Đang xuất bản..." : "Xuất bản Bài giảng & Lưu Câu hỏi"}
            </button>
          </div>
        </form>
      )}

      {/* === TAB 2: SOẠN CÂU HỎI TRỰC QUAN (LABEL-BASED) === */}
      {activeTab === "questions" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500">Khối lớp</label>
                  <select
                    value={bankGrade}
                    onChange={(e) => setBankGrade(Number(e.target.value))}
                    className="mt-0.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500">Môn học</label>
                  <select
                    value={bankSubject}
                    onChange={(e) => setBankSubject(e.target.value)}
                    className="mt-0.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold"
                  >
                    {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={savingQuestions}
                onClick={handleSaveBankQuestions}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingQuestions ? "Đang lưu..." : `Lưu ${bankDrafts.length} câu vào Ngân hàng`}
              </button>
            </div>

            <VisualQuestionBuilder
              questions={bankDrafts}
              onChange={setBankDrafts}
              defaultTopic="Chuyên đề trọng tâm"
              title="Soạn nhiều câu hỏi cùng lúc"
              subtitle="Điền nhãn đáp án trực quan — bấm 'Lưu vào Ngân hàng' để lưu tất cả xuống PostgreSQL."
            />
          </div>

          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 max-h-[760px] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              Ngân hàng Câu hỏi PostgreSQL ({questions.length} câu)
            </h3>
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <span>Lớp {q.grade_id}</span> • <span>{q.subject_name}</span> •{" "}
                  <span className="text-slate-500">{q.q_type}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-slate-700">
                  <MathContent content={q.content_mdx} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === TAB 3: TẠO ĐỀ THI TRẮC NGHIỆM === */}
      {activeTab === "exams" && (
        <form
          onSubmit={handleCreateExam}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Xuất bản Đề thi mới (Tự động mã hóa AES-256-GCM lên Redis)
              </h2>
              <p className="text-xs text-slate-500">
                Chọn các câu hỏi từ Ngân hàng PostgreSQL bên dưới — đề thi sẽ xuất hiện ngay tại trang /thi.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Lock className="h-3.5 w-3.5" /> Đã chọn {selectedQIds.length} câu hỏi
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Tên kỳ thi</label>
              <input
                required
                value={exTitle}
                onChange={(e) => setExTitle(e.target.value)}
                placeholder="VD: Kiểm tra 15 phút Toán 12 — Hàm số Lôgarit"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Lớp &amp; Môn</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={exGrade}
                  onChange={(e) => setExGrade(Number(e.target.value))}
                  className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
                <select
                  value={exSubject}
                  onChange={(e) => setExSubject(e.target.value)}
                  className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phút</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={exDuration}
                  onChange={(e) => setExDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Chế độ</label>
                <select
                  value={exMode}
                  onChange={(e) => setExMode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="mock_live">Thi thử</option>
                  <option value="practice">Luyện tập</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid max-h-80 gap-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            {questions.map((q) => {
              const checked = selectedQIds.includes(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                    checked ? "border-indigo-600 bg-indigo-50/70" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedQIds((prev) =>
                        prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <div>
                    <p className="font-bold text-indigo-700">
                      Lớp {q.grade_id} • {q.subject_name} • {q.topic} ({q.q_type})
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-slate-600">{q.content_mdx}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-500"
          >
            <ShieldCheck className="h-4 w-4" /> Xuất bản Đề thi &amp; Mã hóa AES-256-GCM
          </button>
        </form>
      )}

      {/* === TAB 4: BULK IMPORT & SMART EXAM PARSER === */}
      {activeTab === "import" && (
        <BulkImportPanel
          accessToken={accessToken}
          subjects={subjects}
          onNotify={showToast}
          onImported={() => void loadQuestions()}
        />
      )}

      {/* === TAB 5: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (SUPER ADMIN) === */}
      {activeTab === "users" && isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Quản lý Tài khoản &amp; Phân quyền RBAC ({usersList.length} tài khoản trên PostgreSQL)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Họ tên</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Lớp / Trường</th>
                  <th className="py-2.5">Phân quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{u.email}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {u.current_grade ? `Lớp ${u.current_grade}` : "—"} {u.school_name ? `• ${u.school_name}` : ""}
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="student">Học sinh</option>
                        <option value="teacher">Giáo viên (CMS)</option>
                        <option value="content_admin">Biên tập viên (CMS)</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
