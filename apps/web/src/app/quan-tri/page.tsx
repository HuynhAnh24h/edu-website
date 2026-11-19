"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BookPlus,
  CheckCircle2,
  Database,
  FileQuestion,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AI_API_URL, CORE_API_URL, QuestionOption } from "@/lib/api";
import { AuthUser, useAuth } from "@/context/AuthContext";
import { MathContent } from "@/components/MathContent";

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

export default function CMSAdminPage() {
  const { user, accessToken, loading, isStaff, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"lessons" | "questions" | "exams" | "users">("lessons");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<CMSQuestion[]>([]);
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // === Tab 1: Form Tài liệu & Bài giảng ===
  const [lesGrade, setLesGrade] = useState(12);
  const [lesSubject, setLesSubject] = useState("toan");
  const [lesTextbook, setLesTextbook] = useState("kntt");
  const [lesChapter, setLesChapter] = useState("Chương 2: Hàm số mũ và Lôgarit");
  const [lesTitle, setLesTitle] = useState("");
  const [lesSummary, setLesSummary] = useState("");
  const [lesContent, setLesContent] = useState(
    "### 1. Kiến thức trọng tâm\nCho $a > 0, a \\neq 1$ và $b > 0$:\n$$\\log_a(b) = c \\Leftrightarrow a^c = b$$\n\n### 2. Tính chất hay dùng\n- $\\log_a(xy) = \\log_a x + \\log_a y$\n- $\\log_a(x^n) = n \\log_a x$"
  );
  const [lesMaterialTitle, setLesMaterialTitle] = useState("");
  const [lesMaterialURL, setLesMaterialURL] = useState("");
  const [syncToPgVector, setSyncToPgVector] = useState(true);

  // === Tab 2: Form Ngân hàng Câu hỏi ===
  const [qGrade, setQGrade] = useState(12);
  const [qSubject, setQSubject] = useState("toan");
  const [qTopic, setQTopic] = useState("Hàm số Lôgarit");
  const [qType, setQType] = useState<"single_choice" | "multi_choice" | "true_false_group" | "short_answer">("single_choice");
  const [qDifficulty, setQDifficulty] = useState("thong_hieu");
  const [qContent, setQContent] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qAnsSingle, setQAnsSingle] = useState("A");
  const [qAnsMulti, setQAnsMulti] = useState("A,C");
  const [qAnsTF, setQAnsTF] = useState<Record<string, boolean>>({ a: true, b: false, c: true, d: false });
  const [qAnsShort, setQAnsShort] = useState("");
  const [qExplanation, setQExplanation] = useState("");

  // === Tab 3: Form Tạo Đề thi ===
  const [exGrade, setExGrade] = useState(12);
  const [exSubject, setExSubject] = useState("toan");
  const [exTitle, setExTitle] = useState("");
  const [exMode, setExMode] = useState("mock_live");
  const [exDuration, setExDuration] = useState(45);
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
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
    if (isStaff) {
      void loadQuestions();
    }
    if (isAdmin) {
      void loadUsers();
    }
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
          Vui lòng đăng nhập bằng tài khoản Giáo viên hoặc Admin để soạn tài liệu lớp 1–12, tạo câu hỏi và xuất bản đề thi.
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

  // === Submit Handlers ===
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const materials = lesMaterialTitle.trim()
      ? [{ title: lesMaterialTitle.trim(), type: "pdf", url: lesMaterialURL.trim() || "#cdn-r2-pdf", is_free: true }]
      : [];

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
        title: lesTitle,
        summary: lesSummary,
        content_mdx: lesContent,
        duration_min: 25,
        materials,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast("err", data.error || "Không thể lưu bài học");
      return;
    }

    let extraNote = "";
    if (syncToPgVector) {
      try {
        const aiRes = await fetch(`${AI_API_URL}/api/v1/ai/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade_id: lesGrade,
            subject_code: lesSubject,
            textbook: lesTextbook,
            citation: `Bài giảng Lớp ${lesGrade} — ${lesTitle}`,
            content: `${lesSummary}\n${lesContent}`,
          }),
        });
        if (aiRes.ok) extraNote = " + Đã nạp vector vào AI pgvector!";
      } catch {
        // ignore if AI service offline
      }
    }

    setLesTitle("");
    setLesSummary("");
    setLesMaterialTitle("");
    setLesMaterialURL("");
    showToast("ok", `Đã lưu bài giảng vào PostgreSQL${extraNote}`);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    let options: QuestionOption[] = [];
    if (qType === "single_choice" || qType === "multi_choice") {
      options = [
        { key: "A", text: qOptA },
        { key: "B", text: qOptB },
        { key: "C", text: qOptC },
        { key: "D", text: qOptD },
      ].filter((o) => o.text.trim() !== "");
    } else if (qType === "true_false_group") {
      options = [
        { key: "a", text: qOptA },
        { key: "b", text: qOptB },
        { key: "c", text: qOptC },
        { key: "d", text: qOptD },
      ].filter((o) => o.text.trim() !== "");
    }

    const res = await fetch(`${CORE_API_URL}/api/v1/cms/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        grade_id: qGrade,
        subject_code: qSubject,
        topic: qTopic,
        q_type: qType,
        difficulty: qDifficulty,
        content_mdx: qContent,
        options,
        unit_hint: qType === "short_answer" ? "Nhập kết quả" : "",
        answer_single: qType === "single_choice" ? qAnsSingle : "",
        answer_multi:
          qType === "multi_choice"
            ? qAnsMulti.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
            : [],
        answer_true_false: qType === "true_false_group" ? qAnsTF : {},
        answer_short:
          qType === "short_answer"
            ? qAnsShort.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        explanation_mdx: qExplanation,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast("err", data.error || "Không thể thêm câu hỏi");
      return;
    }
    setQContent("");
    setQOptA("");
    setQOptB("");
    setQOptC("");
    setQOptD("");
    setQExplanation("");
    showToast("ok", "Đã lưu câu hỏi mới vào Ngân hàng PostgreSQL!");
    void loadQuestions();
  };

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            CMS Quản trị Học liệu &amp; Đề thi • Lưu trực tiếp PostgreSQL + Redis + pgvector
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Xin chào, {user.full_name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "lessons", label: "Thêm Tài liệu 1–12", icon: BookPlus },
            { id: "questions", label: `Câu hỏi (${questions.length})`, icon: FileQuestion },
            { id: "exams", label: "Xuất bản Đề thi", icon: ShieldCheck },
            ...(isAdmin ? [{ id: "users", label: "Phân quyền User", icon: Users }] : []),
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === t.id
                    ? "bg-emerald-500 text-white"
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

      {/* === TAB 1: THÊM TÀI LIỆU & BÀI GIẢNG === */}
      {activeTab === "lessons" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateLesson}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7"
          >
            <h2 className="text-base font-bold text-slate-900">
              Soạn Bài giảng &amp; Tài liệu mới (Lớp 1–12)
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Khối lớp</label>
                <select
                  value={lesGrade}
                  onChange={(e) => setLesGrade(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Môn học</label>
                <select
                  value={lesSubject}
                  onChange={(e) => setLesSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Bộ sách</label>
                <select
                  value={lesTextbook}
                  onChange={(e) => setLesTextbook(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="kntt">Kết nối tri thức</option>
                  <option value="ctst">Chân trời sáng tạo</option>
                  <option value="canh_dieu">Cánh diều</option>
                  <option value="general">Chung</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Chương</label>
                <input
                  required
                  value={lesChapter}
                  onChange={(e) => setLesChapter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Tiêu đề bài học</label>
                <input
                  required
                  value={lesTitle}
                  onChange={(e) => setLesTitle(e.target.value)}
                  placeholder="VD: Hàm số Lôgarit và Ứng dụng"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Tóm tắt ngắn</label>
              <input
                value={lesSummary}
                onChange={(e) => setLesSummary(e.target.value)}
                placeholder="Mục tiêu cần đạt của bài học..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Nội dung lý thuyết (Hỗ trợ Markdown + Công thức LaTeX $...$ và $$...$$)
              </label>
              <textarea
                rows={7}
                required
                value={lesContent}
                onChange={(e) => setLesContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Tên tài liệu PDF/Video đính kèm</label>
                <input
                  value={lesMaterialTitle}
                  onChange={(e) => setLesMaterialTitle(e.target.value)}
                  placeholder="VD: Chuyên đề bài tập Lôgarit (PDF)"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Đường dẫn R2 / CDN</label>
                <input
                  value={lesMaterialURL}
                  onChange={(e) => setLesMaterialURL(e.target.value)}
                  placeholder="https://cdn.eduk12.vn/..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2.5 text-xs font-semibold text-purple-800">
              <input
                type="checkbox"
                checked={syncToPgVector}
                onChange={(e) => setSyncToPgVector(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              <Database className="h-4 w-4" />
              Tự động vector hóa &amp; nạp vào Kho tri thức AI (PostgreSQL pgvector)
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" /> Xuất bản Bài giảng
            </button>
          </form>

          {/* Live KaTeX Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">
              Xem trước hiển thị KaTeX trực tiếp
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              {lesTitle || "Tiêu đề bài học của bạn"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Lớp {lesGrade} • {lesChapter}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <MathContent content={lesContent} />
            </div>
          </div>
        </div>
      )}

      {/* === TAB 2: NGÂN HÀNG CÂU HỎI === */}
      {activeTab === "questions" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateQuestion}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7"
          >
            <h2 className="text-base font-bold text-slate-900">
              Thêm Câu hỏi mới (Chuẩn 4 định dạng GDPT 2018)
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Lớp</label>
                <select
                  value={qGrade}
                  onChange={(e) => setQGrade(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Môn</label>
                <select
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                >
                  {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Dạng câu hỏi</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as typeof qType)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                >
                  <option value="single_choice">1 đáp án</option>
                  <option value="multi_choice">Nhiều đáp án</option>
                  <option value="true_false_group">Đúng/Sai 4 ý</option>
                  <option value="short_answer">Trả lời ngắn</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mức độ</label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                >
                  <option value="nhan_biet">Nhận biết</option>
                  <option value="thong_hieu">Thông hiểu</option>
                  <option value="van_dung">Vận dụng</option>
                  <option value="van_dung_cao">Vận dụng cao</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Chuyên đề</label>
              <input
                value={qTopic}
                onChange={(e) => setQTopic(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Nội dung đề bài (Hỗ trợ LaTeX $...$)
              </label>
              <textarea
                rows={3}
                required
                value={qContent}
                onChange={(e) => setQContent(e.target.value)}
                placeholder="VD: Tính giá trị biểu thức $P = \log_2 8 + \log_3 9$:"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            {qType !== "short_answer" ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  { key: qType === "true_false_group" ? "a" : "A", val: qOptA, set: setQOptA },
                  { key: qType === "true_false_group" ? "b" : "B", val: qOptB, set: setQOptB },
                  { key: qType === "true_false_group" ? "c" : "C", val: qOptC, set: setQOptC },
                  { key: qType === "true_false_group" ? "d" : "D", val: qOptD, set: setQOptD },
                ].map((o) => (
                  <div key={o.key} className="flex items-center gap-2">
                    <span className="w-7 text-center text-xs font-bold text-slate-600">{o.key})</span>
                    <input
                      required
                      value={o.val}
                      onChange={(e) => o.set(e.target.value)}
                      placeholder={`Phương án ${o.key}`}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    {qType === "true_false_group" && (
                      <button
                        type="button"
                        onClick={() => setQAnsTF((p) => ({ ...p, [o.key]: !p[o.key] }))}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                          qAnsTF[o.key] ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {qAnsTF[o.key] ? "Đúng" : "Sai"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {qType === "single_choice" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">Đáp án đúng</label>
                <select
                  value={qAnsSingle}
                  onChange={(e) => setQAnsSingle(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            )}

            {qType === "multi_choice" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Các đáp án đúng (cách nhau dấu phẩy, VD: A,C)
                </label>
                <input
                  value={qAnsMulti}
                  onChange={(e) => setQAnsMulti(e.target.value)}
                  className="mt-1 w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            {qType === "short_answer" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Các đáp án chấp nhận (cách nhau dấu phẩy, VD: 5, 5.0)
                </label>
                <input
                  required
                  value={qAnsShort}
                  onChange={(e) => setQAnsShort(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Lời giải chi tiết (KaTeX)</label>
              <textarea
                rows={2}
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                placeholder="Giải thích từng bước để học sinh tự học..."
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" /> Lưu vào Ngân hàng Câu hỏi
            </button>
          </form>

          {/* Danh sách câu hỏi hiện có */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 max-h-[650px] overflow-y-auto">
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

      {/* === TAB 3: TẠO ĐỀ THI TRẮC NGHIỆM (AES-256-GCM + REDIS) === */}
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

      {/* === TAB 4: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (SUPER ADMIN) === */}
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
