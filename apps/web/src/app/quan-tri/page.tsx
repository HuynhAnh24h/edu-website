"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookPlus,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  Paperclip,
  Plus,
  Radio,
  Save,
  School,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AI_API_URL, CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MathContent } from "@/components/MathContent";
import { BulkImportPanel } from "@/components/cms/BulkImportPanel";
import { ClassroomManager } from "@/components/cms/ClassroomManager";
import { RichWordEditor } from "@/components/cms/RichWordEditor";
import { UserManagementPanel } from "@/components/cms/UserManagementPanel";
import { CommunityModerationPanel } from "@/components/cms/CommunityModerationPanel";
import { SafetyCenterPanel } from "@/components/cms/SafetyCenterPanel";
import { ExamLevelControlPanel } from "@/components/cms/ExamLevelControlPanel";
import { TeacherVerificationPanel } from "@/components/cms/TeacherVerificationPanel";
import { StorageQuotaPanel, StorageStatsPayload } from "@/components/cms/StorageQuotaPanel";
import { AdminOpsPanel } from "@/components/cms/AdminOpsPanel";
import { EmailMarketingPanel } from "@/components/cms/EmailMarketingPanel";
import { MonetizationPanel } from "@/components/cms/MonetizationPanel";
import { CuBongLogoMark } from "@/components/BrandLogo";
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

interface DashboardClassroom {
  id: string;
  code: string;
  name: string;
  grade_id: number;
  subject_name: string;
  student_count: number;
  lesson_count: number;
  exam_count: number;
}

type DashboardTab =
  | "overview"
  | "classrooms"
  | "live"
  | "lessons"
  | "questions"
  | "exams"
  | "import"
  | "exam_levels"
  | "verifications"
  | "safety"
  | "storage"
  | "revenue"
  | "mail"
  | "ops"
  | "community"
  | "users";

const TAB_META: Record<DashboardTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Bảng điều khiển Tổng quan",
    subtitle: "Theo dõi nhanh số liệu bài giảng Lớp 1–12, lớp học, ngân hàng câu hỏi và bài kiểm tra.",
  },
  classrooms: {
    title: "Quản lý Lớp học & Học sinh",
    subtitle: "Tạo lớp học, chia sẻ mã đăng ký, xếp giáo án từng buổi và chấm điểm bài kiểm tra trực tuyến.",
  },
  live: {
    title: "Phòng học Trực tuyến & Livestream",
    subtitle: "Mở lớp Video tương tác 2 chiều hoặc phát Livestream kèm Live Chat & Điểm danh tự động.",
  },
  lessons: {
    title: "Soạn Bài giảng (Kiểu Word)",
    subtitle: "Trình soạn thảo trực quan hỗ trợ công thức Toán/Lý/Hóa, tài liệu đính kèm và câu hỏi củng cố.",
  },
  questions: {
    title: "Ngân hàng Câu hỏi Trực quan",
    subtitle: "Soạn 4 định dạng câu hỏi chuẩn GDPT 2018 (Trắc nghiệm, Nhiều đáp án, Đúng/Sai, Trả lời ngắn).",
  },
  exams: {
    title: "Tạo & Xuất bản Đề kiểm tra",
    subtitle: "Chọn câu hỏi từ ngân hàng và xuất bản đề thi trực tuyến ngay cho học sinh.",
  },
  import: {
    title: "Nhập nhanh & Tách đề Thông minh",
    subtitle: "Nhập hàng loạt bài giảng/câu hỏi hoặc dán văn bản đề thi để hệ thống tự tách thành 3 phần.",
  },
  exam_levels: {
    title: "Mở khóa Thi & Tổng hợp Đề theo Cấp",
    subtitle: "Đóng/mở kỳ thi theo thời gian thực cho Tiểu học (1–5), THCS (6–9), THPT (10–12) và tổng hợp đề thi tổng hợp cấp.",
  },
  verifications: {
    title: "Duyệt Giáo viên Tích xanh",
    subtitle: "Xác minh thẻ giáo viên / giấy xác nhận công tác để cấp Tích xanh và chặn mạo danh từ gốc.",
  },
  safety: {
    title: "Trung tâm An toàn & BOT Quét Vi phạm",
    subtitle: "Xử lý cảnh báo bạo lực, quấy rối tình dục, kẻ mạo danh giáo viên, giáo án kém chất lượng — khóa acc & xuất hồ sơ bằng chứng cho Công an.",
  },
  storage: {
    title: "Kho Lưu trữ & Dung lượng Tài liệu",
    subtitle: "Theo dõi dung lượng thực tế (khóa trần an toàn 0đ), kiểm soát tệp đề thi PDF/Word/Ảnh và xóa giải phóng bộ nhớ.",
  },
  revenue: {
    title: "Doanh thu, VietQR & Kiếm tiền",
    subtitle: "Cấu hình tài khoản ngân hàng nhận tiền VietQR, duyệt đơn Owlie Pro, quản lý mã giảm giá & hoa hồng Affiliate.",
  },
  mail: {
    title: "Host Mail & Chiến dịch Email (Khai giảng / Ưu đãi)",
    subtitle: "Gửi email thông báo khai giảng khóa học mới, chương trình giảm giá học bổng và quản lý danh sách người đăng ký nhận tin.",
  },
  ops: {
    title: "Nhật ký Quản trị, Sao lưu & Tên miền",
    subtitle: "Tra cứu Audit Log, chạy & tải bản sao lưu tự động 02:00 sáng hàng ngày, cấu hình Tên miền riêng / Email Quên mật khẩu và phát sóng Thông báo Đẩy.",
  },
  community: {
    title: "Kiểm duyệt Mạng Xã Hội Giáo Viên",
    subtitle: "Ghim giáo án/đề thi xuất sắc lên đầu bảng tin, tạm ẩn hoặc xóa bài viết không phù hợp.",
  },
  users: {
    title: "Quản lý & Phân quyền Tài khoản",
    subtitle: "Quản lý quyền Học sinh, Giáo viên, Biên tập viên và Quản trị viên hệ thống.",
  },
};

const DEFAULT_WORD_LESSON = `<!--word-doc--><h2>1. Kiến thức trọng tâm</h2><p>Gõ trực tiếp nội dung bài giảng tại đây giống như trên <strong>Microsoft Word</strong>. Bạn có thể in đậm, tô màu, tạo bảng hoặc bấm nút <strong>Σ Công thức</strong> để chèn Toán/Lý/Hóa:</p><p style="text-align:center;margin:8px 0;">$$\\log_a(b) = c \\Leftrightarrow a^c = b \\quad (a > 0, a \\neq 1, b > 0)$$</p><div style="background:#eef2ff;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:10px;margin:12px 0;"><strong>Ghi nhớ nhanh:</strong> $\\log_a(xy) = \\log_a x + \\log_a y$ và $\\log_a(x^n) = n\\log_a x$.</div><h3>2. Ví dụ vận dụng</h3><ul><li>Tính $\\log_2 8 = \\log_2 2^3 = 3$.</li><li>Tính $\\log_3 9 = 2$.</li></ul>`;

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
  const { user, accessToken, loading, isStaff, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<CMSQuestion[]>([]);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // === Dashboard Overview Stats ===
  const [totalLessons, setTotalLessons] = useState<number>(0);
  const [totalExams, setTotalExams] = useState<number>(0);
  const [totalGraded, setTotalGraded] = useState<number>(0);
  const [openSafetyCount, setOpenSafetyCount] = useState<number>(0);
  const [storageSummary, setStorageSummary] = useState<StorageStatsPayload | null>(null);
  const [myClassrooms, setMyClassrooms] = useState<DashboardClassroom[]>([]);

  // === Tab: Soạn Bài giảng kiểu Word + Câu hỏi đính kèm trực quan ===
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

  // === Tab: Ngân hàng Câu hỏi trực quan (Label-based) ===
  const [bankGrade, setBankGrade] = useState(12);
  const [bankSubject, setBankSubject] = useState("toan");
  const [bankDrafts, setBankDrafts] = useState<DraftQuestion[]>([
    createEmptyDraftQuestion("Chuyên đề trọng tâm"),
  ]);

  // === Tab: Tạo Đề thi từ Ngân hàng câu hỏi ===
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

  const loadDashboardOverview = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [curRes, clsRes, exRes, metRes] = await Promise.all([
        fetch(`${CORE_API_URL}/api/v1/curriculum/summary`),
        fetch(`${CORE_API_URL}/api/v1/classrooms/my`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${CORE_API_URL}/api/v1/exams`),
        fetch(`${CORE_API_URL}/api/v1/metrics`),
      ]);
      if (curRes.ok) {
        const d = await curRes.json();
        setTotalLessons(Number(d.total_lessons || 0));
      }
      if (clsRes.ok) {
        const d = await clsRes.json();
        setMyClassrooms(d.classrooms || []);
      }
      if (exRes.ok) {
        const d = await exRes.json();
        setTotalExams((d.exams || []).length);
      }
      if (metRes.ok) {
        const d = await metRes.json();
        setTotalGraded(Number(d.total_graded || 0));
      }
      if (isAdmin) {
        const [safRes, stoRes] = await Promise.all([
          fetch(`${CORE_API_URL}/api/v1/admin/safety/incidents`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${CORE_API_URL}/api/v1/admin/storage/stats`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        if (safRes.ok) {
          const sd = await safRes.json();
          setOpenSafetyCount(Number(sd.summary?.open_count || 0));
        }
        if (stoRes.ok) {
          setStorageSummary((await stoRes.json()) as StorageStatsPayload);
        }
      }
    } catch {
      // ignore offline transient
    }
  }, [accessToken]);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/subjects`)
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isStaff) {
      void loadQuestions();
      void loadDashboardOverview();
    }
  }, [isStaff, loadQuestions, loadDashboardOverview]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-sm font-medium shadow-xl">
          <GraduationCap className="h-5 w-5 animate-pulse text-indigo-400" />
          Đang khởi tạo Dashboard Quản trị EduK12...
        </div>
      </div>
    );
  }

  if (!user || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Dashboard Quản trị Giáo viên &amp; Admin
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Khu vực này tách biệt hoàn toàn với trang Học sinh. Vui lòng đăng nhập tài khoản Giáo viên hoặc Quản trị viên để tiếp tục.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/dang-nhap"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500 transition"
            >
              Đăng nhập Quản trị
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Về trang Học sinh
            </Link>
          </div>
        </div>
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
          if (aiRes.ok) aiNote = " + Nạp tri thức AI Gia sư thành công!";
        } catch {
          // ignore if AI offline
        }
      }

      setLesTitle("");
      setLesSummary("");
      setLesMaterials([{ id: `m-${Date.now()}`, title: "", type: "pdf", url: "" }]);
      setLessonQuestions([createEmptyDraftQuestion("Củng cố bài học")]);
      void loadQuestions();
      void loadDashboardOverview();
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
      showToast("ok", `Đã lưu thành công ${saved}/${valid.length} câu hỏi vào Ngân hàng!`);
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
    void loadDashboardOverview();
    showToast("ok", "Đã xuất bản đề thi trực tuyến sẵn sàng trên phòng thi!");
  };

  const totalStudentsInClasses = myClassrooms.reduce(
    (sum, c) => sum + Number(c.student_count || 0),
    0
  );

  const sidebarGroups: {
    groupLabel: string;
    items: { id: DashboardTab; label: string; desc: string; icon: typeof LayoutDashboard }[];
  }[] = [
    {
      groupLabel: "Tổng quan",
      items: [
        {
          id: "overview",
          label: "Bảng điều khiển",
          desc: "Thống kê & lối tắt nhanh",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupLabel: "Lớp học & Học sinh (LMS)",
      items: [
        {
          id: "classrooms",
          label: `Quản lý Lớp học (${myClassrooms.length})`,
          desc: "Học sinh, Giáo án, Kiểm tra",
          icon: School,
        },
        {
          id: "live",
          label: "Phòng học Live / Stream",
          desc: "Video 2 chiều, OBS, Điểm danh",
          icon: Radio,
        },
      ],
    },
    {
      groupLabel: "Soạn thảo & Học liệu",
      items: [
        {
          id: "lessons",
          label: "Soạn Bài giảng (Word)",
          desc: "Trình soạn thảo kiểu Word",
          icon: BookPlus,
        },
        {
          id: "questions",
          label: `Soạn Câu hỏi (${questions.length})`,
          desc: "Điền nhãn đáp án trực quan",
          icon: FileQuestion,
        },
        {
          id: "exams",
          label: "Tạo Đề kiểm tra",
          desc: "Xuất bản đề thi trực tuyến",
          icon: ShieldCheck,
        },
        {
          id: "import",
          label: "Import JSON / Tách đề",
          desc: "Tách đề 3 phần tự động",
          icon: Upload,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            groupLabel: "Quản trị Hệ thống (Admin)",
            items: [
              {
                id: "exam_levels" as DashboardTab,
                label: "Mở khóa & Tổng hợp Đề cấp",
                desc: "Tiểu học • THCS • THPT",
                icon: GraduationCap,
              },
              {
                id: "verifications" as DashboardTab,
                label: "Duyệt Giáo viên Tích xanh",
                desc: "Xác minh thẻ GV chống mạo danh",
                icon: CheckCircle2,
              },
              {
                id: "safety" as DashboardTab,
                label: `BOT An toàn & Xử phạt${openSafetyCount > 0 ? ` (${openSafetyCount})` : ""}`,
                desc: "Quấy rối, Mạo danh, Hồ sơ CA",
                icon: ShieldAlert,
              },
              {
                id: "storage" as DashboardTab,
                label: "Kho Lưu trữ & Dung lượng",
                desc: storageSummary
                  ? `${storageSummary.used_mb} MB / ${storageSummary.safety_cap_gb} GB`
                  : "Theo dõi hạn mức 0đ & tệp",
                icon: Database,
              },
              {
                id: "revenue" as DashboardTab,
                label: "Doanh thu & VietQR",
                desc: "Gói Pro • Mã giảm giá • Affiliate",
                icon: Wallet,
              },
              {
                id: "mail" as DashboardTab,
                label: "Host Mail & Gửi Email",
                desc: "Khai giảng • Giảm giá • Tin tức",
                icon: Mail,
              },
              {
                id: "ops" as DashboardTab,
                label: "Nhật ký, Sao lưu & Tên miền",
                desc: "Audit Log • Backup • Push • Email",
                icon: ClipboardCheck,
              },
              {
                id: "community" as DashboardTab,
                label: "Kiểm duyệt MXH Giáo viên",
                desc: "Ghim bài hay & duyệt nội dung",
                icon: Sparkles,
              },
              {
                id: "users" as DashboardTab,
                label: "Quản lý & Phân quyền",
                desc: "Học sinh / Giáo viên / Admin",
                icon: Users,
              },
            ],
          },
        ]
      : []),
  ];

  const currentMeta = TAB_META[activeTab];

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Backdrop di động khi mở Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* === SIDEBAR ĐỘC LẬP TOÀN MÀN HÌNH (DARK STUDIO THEME) === */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-slate-200 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <CuBongLogoMark className="h-9 w-9 shadow-md" />
            <div>
              <p className="text-sm font-extrabold tracking-tight text-white">
                Owlie <span className={isAdmin ? "text-rose-400" : "text-emerald-400"}>{isAdmin ? "Admin" : "Teacher"}</span>
              </p>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${isAdmin ? "text-rose-300" : "text-emerald-400"}`}>
                {isAdmin ? "Quản trị Hệ thống" : "Studio Giảng dạy"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nút chuyển nhanh sang Mạng Xã Hội Giáo Viên */}
        <div className="px-3 pt-3">
          <Link
            href="/cong-dong"
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-emerald-600/20 px-3 py-2.5 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-600/30 hover:text-white transition"
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> Mạng Xã Hội Giáo Viên
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sidebarGroups.map((grp) => (
            <div key={grp.groupLabel}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {grp.groupLabel}
              </p>
              <div className="space-y-1">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-tour={`sidebar-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-white" : "text-slate-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{item.label}</p>
                        <p
                          className={`truncate text-[10px] ${
                            active ? "text-indigo-100" : "text-slate-500"
                          }`}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Footer Controls */}
        <div className="border-t border-slate-800/80 bg-slate-900/70 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/40">
              {user.full_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{user.full_name}</p>
              <p className="truncate text-[10px] text-slate-400">
                {isAdmin ? "Super Admin" : "Giáo viên"} • {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/"
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trang Học sinh
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center justify-center gap-1 rounded-xl border border-rose-900/50 bg-rose-950/50 px-2.5 py-2 text-[11px] font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* === KHÔNG GIAN LÀM VIỆC BÊN PHẢI === */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Admin Header Bar */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Mở menu quản trị"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span>EduK12 Dashboard</span>
                <span>/</span>
                <span className="text-indigo-600">{currentMeta.title}</span>
              </div>
              <h1 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
                {currentMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Hệ thống đang hoạt động
            </span>
            <button
              type="button"
              data-tour="header-live-btn"
              onClick={() => setActiveTab("live")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-500 transition"
            >
              <Radio className="h-3.5 w-3.5" /> Phát Live
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lessons")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Soạn Bài giảng
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {toast && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xs ${
                toast.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{toast.msg}</span>
            </div>
          )}

          {/* === TAB 0: BẢNG ĐIỀU KHIỂN TỔNG QUAN (DASHBOARD HOME) === */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg sm:p-8">
                <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" /> Không gian Quản trị Độc lập • GDPT 2018
                    </span>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                      Xin chào, {user.full_name}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-300">
                      {currentMeta.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("classrooms")}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-400 transition"
                    >
                      <School className="h-4 w-4" /> Mở Quản lý Lớp học
                    </button>
                    <Link
                      href="/lop-hoc"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
                    >
                      Xem góc nhìn Học sinh <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Thanh theo dõi Dung lượng Kho Tài liệu trực tiếp cho Admin */}
              {isAdmin && storageSummary && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs">
                  <div className="flex-1 min-w-[240px] space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-slate-900">
                        Kho Lưu trữ Đề thi &amp; Tài liệu ({storageSummary.backend === "r2_10gb_free" ? "R2 10 GB Free" : "KV 1 GB Free"})
                      </span>
                      <span className="font-bold text-emerald-700">
                        {storageSummary.used_mb} MB / {storageSummary.safety_cap_gb} GB ({storageSummary.percent_used}%) • {storageSummary.total_files} tệp
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(storageSummary.used_bytes > 0 ? 2 : 0, storageSummary.percent_used)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("storage")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600 transition"
                  >
                    <Database className="h-3.5 w-3.5" /> Quản lý Kho tệp →
                  </button>
                </div>
              )}

              {/* 4 KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Bài giảng GDPT 2018
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalLessons}</p>
                  <p className="mt-1 text-xs text-slate-500">Đầy đủ 12 khối lớp (Lớp 1–12)</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Lớp học đang quản lý
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <School className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-extrabold text-slate-900">
                    {myClassrooms.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {totalStudentsInClasses} lượt học sinh đã đăng ký
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Ngân hàng Câu hỏi
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <FileQuestion className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-extrabold text-slate-900">{questions.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Hỗ trợ 4 định dạng đề mới 2025+</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Đề thi &amp; Bài đã chấm
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalExams}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {totalGraded} bài thi đã chấm tự động
                  </p>
                </div>
              </div>

              {/* 2 Cột: Lớp học đang hoạt động + Lối tắt Nghiệp vụ */}
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Lớp học đang phụ trách
                      </h3>
                      <p className="text-xs text-slate-500">
                        Học sinh có thể nhập Mã lớp tại trang /lop-hoc để vào học ngay.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("classrooms")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Quản lý tất cả <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {myClassrooms.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                      Chưa có lớp học nào. Bấm{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("classrooms")}
                        className="font-bold text-indigo-600 underline"
                      >
                        Quản lý Lớp học
                      </button>{" "}
                      để tạo lớp học đầu tiên!
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {myClassrooms.slice(0, 5).map((cls) => (
                        <div
                          key={cls.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-indigo-200 transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                                {cls.code}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{cls.name}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Lớp {cls.grade_id} • {cls.subject_name} • {cls.student_count} học sinh •{" "}
                              {cls.lesson_count} bài giảng • {cls.exam_count} bài kiểm tra
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab("classrooms")}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                          >
                            Vào quản lý
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5">
                  <h3 className="text-sm font-bold text-slate-900">Lối tắt Nghiệp vụ Giáo viên</h3>
                  <p className="text-xs text-slate-500">Chọn tác vụ để bắt đầu làm việc ngay.</p>

                  <div className="mt-4 grid gap-2.5">
                    {[
                      {
                        tab: "classrooms" as DashboardTab,
                        icon: School,
                        color: "bg-indigo-50 text-indigo-600",
                        title: "Tạo lớp học & Quản lý học sinh",
                        desc: "Xếp giáo án, giao bài kiểm tra & xem bảng điểm",
                      },
                      {
                        tab: "lessons" as DashboardTab,
                        icon: BookPlus,
                        color: "bg-emerald-50 text-emerald-600",
                        title: "Soạn Bài giảng kiểu Microsoft Word",
                        desc: "Gõ công thức KaTeX, đính kèm PDF & câu hỏi",
                      },
                      {
                        tab: "questions" as DashboardTab,
                        icon: FileQuestion,
                        color: "bg-amber-50 text-amber-600",
                        title: "Soạn Câu hỏi theo nhãn đáp án",
                        desc: "Trắc nghiệm, Đúng/Sai 4 ý, Trả lời ngắn",
                      },
                      {
                        tab: "import" as DashboardTab,
                        icon: Upload,
                        color: "bg-purple-50 text-purple-600",
                        title: "Import JSON / Tách đề thi tự động",
                        desc: "Nạp nhanh hàng loạt dữ liệu vào hệ thống",
                      },
                    ].map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.tab}
                          type="button"
                          onClick={() => setActiveTab(action.tab)}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/40 transition"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900">{action.title}</p>
                            <p className="truncate text-[11px] text-slate-500">{action.desc}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === TAB 1 & 1B: QUẢN LÝ LỚP HỌC, PHÒNG LIVE, HỌC SINH & GIAO BÀI KIỂM TRA === */}
          {(activeTab === "classrooms" || activeTab === "live") && (
            <ClassroomManager
              accessToken={accessToken}
              teacherName={user.full_name}
              initialSubTab={activeTab === "live" ? "live" : "curriculum"}
              subjects={subjects}
              onNotify={(type, msg) => {
                showToast(type, msg);
                if (type === "ok") void loadDashboardOverview();
              }}
            />
          )}

          {/* === TAB 2: STUDIO SOẠN BÀI GIẢNG KIỂU WORD + CÂU HỎI TRỰC QUAN === */}
          {activeTab === "lessons" && (
            <form onSubmit={handlePublishLesson} className="space-y-6">
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
                        <option key={g} value={g}>
                          Lớp {g}
                        </option>
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
                      {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map(
                        (s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        )
                      )}
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
                              i === idx
                                ? { ...item, type: e.target.value as MaterialDraft["type"] }
                                : item
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
                            prev.map((item, i) =>
                              i === idx ? { ...item, title: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Tên tài liệu hiển thị (VD: Slide bài giảng PDF)"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:col-span-5"
                      />
                      <input
                        value={m.url}
                        onChange={(e) =>
                          setLesMaterials((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, url: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Link file PDF / YouTube / Google Drive"
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
                    Tự động tạo luôn Bài kiểm tra nhanh trên /thi từ các câu hỏi trên
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-800">
                    <input
                      type="checkbox"
                      checked={syncToPgVector}
                      onChange={(e) => setSyncToPgVector(e.target.checked)}
                      className="h-4 w-4 accent-purple-600"
                    />
                    <Database className="h-4 w-4 text-purple-600" />
                    Tự động cập nhật nội dung bài giảng vào AI Gia sư
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

          {/* === TAB 3: SOẠN CÂU HỎI TRỰC QUAN (LABEL-BASED) === */}
          {activeTab === "questions" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500">
                        Khối lớp
                      </label>
                      <select
                        value={bankGrade}
                        onChange={(e) => setBankGrade(Number(e.target.value))}
                        className="mt-0.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                          <option key={g} value={g}>
                            Lớp {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500">
                        Môn học
                      </label>
                      <select
                        value={bankSubject}
                        onChange={(e) => setBankSubject(e.target.value)}
                        className="mt-0.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold"
                      >
                        {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map(
                          (s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          )
                        )}
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
                  subtitle="Điền nhãn đáp án trực quan — bấm 'Lưu vào Ngân hàng' để lưu toàn bộ câu hỏi."
                />
              </div>

              <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 max-h-[760px] overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-900">
                  Ngân hàng Câu hỏi ({questions.length} câu)
                </h3>
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
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

          {/* === TAB 4: TẠO ĐỀ THI TRẮC NGHIỆM === */}
          {activeTab === "exams" && (
            <form
              onSubmit={handleCreateExam}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Xuất bản Đề thi mới
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chọn các câu hỏi từ Ngân hàng bên dưới — đề thi sẽ xuất hiện ngay tại trang /thi và có thể giao cho lớp học.
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
                  <label className="block text-xs font-semibold text-slate-700">
                    Lớp &amp; Môn
                  </label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={exGrade}
                      onChange={(e) => setExGrade(Number(e.target.value))}
                      className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>
                          Lớp {g}
                        </option>
                      ))}
                    </select>
                    <select
                      value={exSubject}
                      onChange={(e) => setExSubject(e.target.value)}
                      className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
                    >
                      {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map(
                        (s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        )
                      )}
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
                            prev.includes(q.id)
                              ? prev.filter((id) => id !== q.id)
                              : [...prev, q.id]
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
                <ShieldCheck className="h-4 w-4" /> Xuất bản Đề thi trực tuyến
              </button>
            </form>
          )}

          {/* === TAB 5: BULK IMPORT & SMART EXAM PARSER === */}
          {activeTab === "import" && (
            <BulkImportPanel
              accessToken={accessToken}
              subjects={subjects}
              onNotify={showToast}
              onImported={() => {
                void loadQuestions();
                void loadDashboardOverview();
              }}
            />
          )}

          {/* === TAB 6-0: MỞ KHÓA THI & TỔNG HỢP ĐỀ THEO CẤP (ADMIN) === */}
          {activeTab === "exam_levels" && isAdmin && (
            <ExamLevelControlPanel
              accessToken={accessToken}
              onToast={showToast}
              onGenerated={() => void loadDashboardOverview()}
            />
          )}

          {/* === TAB 6-1: DUYỆT GIÁO VIÊN TÍCH XANH (ADMIN) === */}
          {activeTab === "verifications" && isAdmin && (
            <TeacherVerificationPanel accessToken={accessToken} onToast={showToast} />
          )}

          {/* === TAB 6A: TRUNG TÂM AN TOÀN & BOT QUÉT VI PHẠM (ADMIN) === */}
          {activeTab === "safety" && isAdmin && (
            <SafetyCenterPanel
              accessToken={accessToken}
              onToast={showToast}
              onSummaryChange={setOpenSafetyCount}
            />
          )}

          {/* === TAB 6A2: KHO LƯU TRỮ & DUNG LƯỢNG TÀI LIỆU (ADMIN) === */}
          {activeTab === "storage" && isAdmin && (
            <StorageQuotaPanel
              accessToken={accessToken}
              onToast={showToast}
              onStatsLoaded={setStorageSummary}
            />
          )}

          {/* === TAB 6A2A: DOANH THU, VIETQR, MÃ GIẢM GIÁ & AFFILIATE === */}
          {activeTab === "revenue" && isAdmin && (
            <MonetizationPanel accessToken={accessToken} onToast={showToast} />
          )}

          {/* === TAB 6A2B: HOST MAIL & GỬI EMAIL CHIẾN DỊCH (KHAI GIẢNG / GIẢM GIÁ) === */}
          {activeTab === "mail" && isAdmin && (
            <EmailMarketingPanel accessToken={accessToken} onToast={showToast} />
          )}

          {/* === TAB 6A3: NHẬT KÝ QUẢN TRỊ, SAO LƯU TỰ ĐỘNG, TÊN MIỀN & PUSH === */}
          {activeTab === "ops" && isAdmin && (
            <AdminOpsPanel accessToken={accessToken} onToast={showToast} />
          )}

          {/* === TAB 6B: KIỂM DUYỆT MẠNG XÃ HỘI GIÁO VIÊN (ADMIN) === */}
          {activeTab === "community" && isAdmin && (
            <CommunityModerationPanel accessToken={accessToken} onToast={showToast} />
          )}

          {/* === TAB 7: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (ADMIN) === */}
          {activeTab === "users" && isAdmin && (
            <UserManagementPanel
              accessToken={accessToken}
              currentUserId={user.id}
              onNotify={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
