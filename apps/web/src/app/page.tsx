"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  Crown,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  QrCode,
  Quote,
  Radio,
  School,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { getSubjectMeta, SUBJECT_ORDER } from "@/lib/subjects";
import { CODING_CLUSTERS, CODING_ROADMAPS, getClusterById } from "@/lib/codingRoadmaps";
import { useAuth } from "@/context/AuthContext";
import { CuBongLogoMark } from "@/components/BrandLogo";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface SummaryRow {
  grade_id: number;
  subject_code: string;
  subject_name: string;
  lesson_count: number;
}

interface HomeCourse {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_verified?: boolean;
  title: string;
  subject_name: string;
  grade_label: string;
  cover_theme: string;
  summary: string;
  student_count: number;
  avg_rating: number;
  review_count: number;
  modules: { id: string }[];
}

interface HomeTeacher {
  id: string;
  full_name: string;
  school_name: string;
  specialty?: string;
  is_verified?: boolean;
  post_count: number;
  follower_count: number;
  reputation_score?: number;
  reputation_label?: string;
}

const COVER_THEMES: Record<string, string> = {
  indigo: "from-indigo-600 via-blue-600 to-sky-600",
  emerald: "from-emerald-600 via-teal-600 to-cyan-600",
  rose: "from-rose-500 via-pink-600 to-indigo-600",
  amber: "from-amber-500 via-orange-500 to-rose-500",
  sky: "from-sky-500 via-blue-600 to-indigo-600",
};

const LEVEL_TABS = [
  { id: "primary", label: "Tiểu học (Lớp 1–5)", grades: [1, 2, 3, 4, 5], badge: "Nền tảng tư duy vững chắc" },
  { id: "middle", label: "THCS (Lớp 6–9)", grades: [6, 7, 8, 9], badge: "Bứt phá & Luyện thi vào Lớp 10" },
  { id: "high", label: "THPT (Lớp 10–12)", grades: [10, 11, 12], badge: "Chinh phục Kỳ thi THPT 2025+" },
] as const;

const TESTIMONIALS = [
  {
    name: "Nguyễn Minh Anh",
    role: "Học sinh Lớp 12 • THPT Chuyên",
    quote:
      "Phòng thi thử phân tích điểm yếu cực kỳ rõ ràng: sau mỗi đề Toán 2025+, Owlie chỉ thẳng chương mình sai nhiều và mở đúng bài giảng để ôn lại. Mình tăng từ 7.4 lên 9.0 chỉ trong 6 tuần!",
    tag: "Tăng +1.6 điểm Toán THPT",
  },
  {
    name: "Chị Trần Thu Hà",
    role: "Phụ huynh Học sinh Lớp 8 • Hà Nội",
    quote:
      "Mình thích nhất là Góc Phụ huynh và Học bạ Số. Mỗi tối chỉ cần mở điện thoại là biết ngay con đã làm bài tập chưa, điểm thi thử từng môn ra sao và có BOT AI bảo vệ con an toàn khi học nhóm.",
    tag: "Phụ huynh tin dùng",
  },
  {
    name: "Thầy Lê Hoàng Nam",
    role: "Giáo viên Tin học & Mentor Fullstack",
    quote:
      "Lộ trình 6 Cụm Lập trình từ HTML/CSS đến React, Next.js và NestJS giúp học sinh thực hành chạy test ngay trên trình duyệt không cần cài đặt nặng máy. Cấp Chứng chỉ QR tự động rất chuyên nghiệp.",
    tag: "Giáo viên Tích xanh",
  },
];

const SEO_FAQS = [
  {
    q: "Học bài giảng Lớp 1–12 trên Owlie Edu có mất phí không?",
    a: "Kho 157+ bài giảng chuẩn chương trình GDPT 2018 (bám sát bộ sách Kết nối tri thức, Chân trời sáng tạo, Cánh diều), Học bạ Số và Góc Phụ huynh Đồng hành đều miễn phí 0đ trọn đời. Bạn chỉ cần nâng cấp Owlie Pro khi muốn mở khóa AI Gia sư không giới hạn lượt hỏi, bộ đề thi chuyên sâu và các dự án Fullstack nâng cao.",
  },
  {
    q: "Phòng thi trắc nghiệm có đúng cấu trúc đề thi Bộ GD&ĐT 2025+ không?",
    a: "Hoàn toàn chuẩn cấu trúc mới 2025+ với đủ 4 dạng câu hỏi: Trắc nghiệm nhiều lựa chọn, Nhiều đáp án đúng, Đúng/Sai 4 mệnh đề và Trả lời ngắn. Sau khi nộp bài, hệ thống tự chấm điểm ngay lập tức, vẽ biểu đồ điểm yếu theo từng chuyên đề (<70%) và đề xuất đúng bài học cần củng cố.",
  },
  {
    q: "Lộ trình Học viện Lập trình 6 Cụm trên Owlie Edu dành cho ai?",
    a: "Phù hợp cả học sinh THCS/THPT yêu thích STEM lẫn sinh viên, người trái ngành muốn học bài bản từ con số 0. Lộ trình phân cấp rõ 6 cụm công nghệ: HTML & CSS → JavaScript & TypeScript → React & Next.js → Node.js & NestJS → Golang & Python → MongoDB & PostgreSQL, chấm test tự động ngay trên trình duyệt.",
  },
  {
    q: "Thanh toán nâng cấp Owlie Pro bằng hình thức nào? Có mã giảm giá không?",
    a: "Bạn có thể thanh toán siêu nhanh qua mã VietQR (hỗ trợ tất cả ngân hàng Việt Nam như Vietcombank, MB Bank, Techcombank, ACB, BIDV...) tại trang Bảng giá. Nhập mã OWLIE50 để được giảm ngay 50% hoặc KHAIGIANG20 để giảm 20% nhân dịp khai giảng.",
  },
  {
    q: "Làm thế nào để kiếm tiền cùng hệ sinh thái Owlie Edu?",
    a: "Có 2 mô hình tạo thu nhập minh bạch: (1) Trở thành Cộng tác viên Owlie Affiliate — chia sẻ link giới thiệu cá nhân để nhận 20% hoa hồng mỗi đơn nâng cấp Owlie Pro; (2) Đăng ký làm Giáo viên Creator — xuất bản khóa học, mở lớp Live, bán bộ đề chuyên sâu và giữ tới 85% doanh thu.",
  },
  {
    q: "Chứng chỉ hoàn thành khóa học có xác thực được không?",
    a: "Mỗi chứng chỉ hoàn thành trên Owlie Edu đều có mã định danh duy nhất và mã QR xác thực điện tử công khai tại trang Tra cứu Chứng chỉ (/chung-chi), hỗ trợ in PDF sắc nét để đính kèm vào hồ sơ học tập hoặc CV xin việc.",
  },
];

export default function LandingPage() {
  const { user, isTeacher, isAdmin } = useAuth();
  const isParent = user?.role === "parent";

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [totalLessons, setTotalLessons] = useState<number>(157);
  const [selectedLevel, setSelectedLevel] = useState<"primary" | "middle" | "high">("high");
  const [selectedGrade, setSelectedGrade] = useState<number>(12);
  const [featuredCourses, setFeaturedCourses] = useState<HomeCourse[]>([]);
  const [topTeachers, setTopTeachers] = useState<HomeTeacher[]>([]);
  const [billingMode, setBillingMode] = useState<"monthly" | "yearly">("yearly");
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      fetch(`${CORE_API_URL}/api/v1/curriculum/summary`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${CORE_API_URL}/api/v1/courses`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${CORE_API_URL}/api/v1/social/teachers`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([curr, crs, tchs]) => {
        if (curr) {
          setSummaryRows(curr.summary || []);
          if (curr.total_lessons) setTotalLessons(curr.total_lessons);
        }
        if (crs?.courses) {
          setFeaturedCourses((crs.courses as HomeCourse[]).slice(0, 3));
        }
        if (tchs?.teachers) {
          setTopTeachers((tchs.teachers as HomeTeacher[]).slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const currentLevelTab = LEVEL_TABS.find((t) => t.id === selectedLevel) || LEVEL_TABS[2];

  const handleSelectLevel = (lvlId: "primary" | "middle" | "high") => {
    setSelectedLevel(lvlId);
    const tab = LEVEL_TABS.find((t) => t.id === lvlId);
    if (tab && !tab.grades.includes(selectedGrade as never)) {
      setSelectedGrade(tab.grades[tab.grades.length - 1]);
    }
  };

  const subjectsInGrade = useMemo(() => {
    return summaryRows
      .filter((r) => r.grade_id === selectedGrade)
      .sort(
        (a, b) =>
          (SUBJECT_ORDER.indexOf(a.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(a.subject_code)) -
          (SUBJECT_ORDER.indexOf(b.subject_code) === -1 ? 99 : SUBJECT_ORDER.indexOf(b.subject_code))
      );
  }, [summaryRows, selectedGrade]);

  return (
    <div className="space-y-14 pb-14">
      {/* === 0. THANH CHÀO NHANH THEO VAI TRÒ KHI ĐÃ ĐĂNG NHẬP === */}
      {user && (
        <section
          aria-label="Không gian cá nhân"
          className={`rounded-3xl border p-5 shadow-xs ${
            isAdmin
              ? "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-slate-50"
              : isTeacher
                ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50/40"
                : isParent
                  ? "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50/40"
                  : "border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  isAdmin
                    ? "bg-rose-100 text-rose-700"
                    : isTeacher
                      ? "bg-emerald-100 text-emerald-700"
                      : isParent
                        ? "bg-amber-100 text-amber-800"
                        : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {isAdmin
                  ? "Không gian Quản trị viên"
                  : isTeacher
                    ? "Không gian Giáo viên"
                    : isParent
                      ? "Chế độ Phụ huynh Đồng hành"
                      : `Góc Học tập${user.current_grade ? ` • Lớp ${user.current_grade}` : ""}`}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                Chào mừng trở lại, {user.full_name}!
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <>
                  <Link
                    href="/quan-tri"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-rose-500 transition"
                  >
                    <ShieldCheck className="h-4 w-4" /> Trung tâm Quản trị &amp; Doanh thu
                  </Link>
                  <Link
                    href="/bang-gia"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100"
                  >
                    <Crown className="h-4 w-4 text-amber-600" /> Trang Bảng giá Pro
                  </Link>
                </>
              ) : isTeacher ? (
                <>
                  <Link
                    href="/cong-dong"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-emerald-500 transition"
                  >
                    <Users className="h-4 w-4" /> Cộng đồng Giáo viên
                  </Link>
                  <Link
                    href="/quan-tri"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    <GraduationCap className="h-4 w-4" /> Studio Giảng dạy
                  </Link>
                  <Link
                    href="/bang-gia"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100"
                  >
                    <BadgeDollarSign className="h-4 w-4 text-amber-600" /> Kiếm tiền Creator &amp; Affiliate
                  </Link>
                </>
              ) : isParent ? (
                <>
                  <Link
                    href="/phu-huynh"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 transition"
                  >
                    <HeartHandshake className="h-4 w-4" /> Theo dõi tiến độ của Con
                  </Link>
                  <Link
                    href="/bang-gia"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Crown className="h-4 w-4" /> Gói Gia đình 4 thành viên
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/hoc-ba"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-indigo-500 transition"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Học bạ Số của em
                  </Link>
                  <Link
                    href="/bang-gia"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-2xs hover:bg-amber-300 transition"
                  >
                    <Crown className="h-4 w-4" /> Nâng cấp Pro / Kiếm 20%
                  </Link>
                  <Link
                    href={`/tai-lieu?grade=${user.current_grade || 12}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <BookOpen className="h-4 w-4 text-blue-600" /> Bài giảng Lớp {user.current_grade || 12}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= 1. HERO LANDING PAGE HIỆN ĐẠI CHUẨN EDTECH 2026 & SEO ================= */}
      <section className="relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.14),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.12),_transparent_50%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
          {/* Cột trái: Tiêu đề H1 chuẩn từ khóa SEO + Smart Path CTA */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-indigo-200/80 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Nền tảng EdTech chuẩn GDPT 2018 • AI Gia sư 24/7 • 6 Cụm Lập trình</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 leading-[1.15] sm:text-5xl">
              Học trực tuyến{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Lớp 1–12 &amp; Lập trình Fullstack
              </span>{" "}
              hiện đại cùng Owlie Edu
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Khám phá kho <strong>{totalLessons}+ bài giảng SGK miễn phí</strong>, phòng <strong>ôn thi THPT 2025+</strong> phân tích điểm yếu tự động, <strong>AI Gia sư Socratic</strong>, <strong>Học bạ Số</strong> cho phụ huynh và <strong>Học viện Lập trình 6 Cụm</strong> cấp Chứng chỉ PDF + Mã QR xác thực.
            </p>

            {/* Nút hành động chuyển đổi cao */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/tai-lieu"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition"
              >
                <BookOpen className="h-4 w-4" />
                Học miễn phí Lớp 1–12
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/bang-gia"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <Crown className="h-4 w-4 text-amber-400" />
                Gói Pro &amp; Kiếm 20%
              </Link>
              <Link
                href="/lap-trinh"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 hover:border-indigo-300 hover:text-indigo-700 transition"
              >
                <Code2 className="h-4 w-4 text-rose-500" />
                Lộ trình Lập trình
              </Link>
            </div>

            {/* Thanh mục tiêu nhanh (Interactive Quick Intent Pills) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 backdrop-blur-xs space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Chọn nhanh mục tiêu của bạn hôm nay:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/thi"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Luyện đề 2025+
                </Link>
                <Link
                  href="/ai-gia-su"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 hover:bg-violet-100 transition"
                >
                  <Bot className="h-3.5 w-3.5" /> Hỏi AI Gia sư
                </Link>
                <Link
                  href="/phu-huynh"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                >
                  <HeartHandshake className="h-3.5 w-3.5" /> Góc Phụ huynh 0đ
                </Link>
                <Link
                  href="/cong-dong"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition"
                >
                  <Users className="h-3.5 w-3.5" /> MXH Giáo viên
                </Link>
              </div>
            </div>
          </div>

          {/* Cột phải: Visual hiện đại + Thẻ chỉ số tin cậy */}
          <div className="relative lg:col-span-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-3 shadow-2xl shadow-indigo-950/10 ring-1 ring-slate-200/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-owlie-edu.jpg"
                alt="Học sinh Việt Nam học trực tuyến Lớp 1 đến 12 và Lập trình cùng Owlie Edu"
                className="aspect-[16/10] w-full rounded-2xl object-cover"
              />

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Link
                  href="/chung-chi?code=OWLIE-CERT-2026-WEB01"
                  className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 hover:bg-amber-50 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">Chứng chỉ PDF + QR</p>
                    <p className="truncate text-[10px] font-semibold text-amber-800">Xác thực điện tử công khai</p>
                  </div>
                </Link>

                <Link
                  href="/bang-gia"
                  className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 hover:bg-emerald-50 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">Ưu đãi OWLIE50 -50%</p>
                    <p className="truncate text-[10px] font-semibold text-emerald-800">Thanh toán VietQR 24/7</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Số liệu Tin cậy Chuẩn SaaS */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-3.5 border-t border-slate-200/80 pt-7 sm:grid-cols-4">
          {[
            { value: `${totalLessons}+`, label: "Bài giảng chuẩn GDPT 2018", icon: BookOpen, tone: "text-indigo-700" },
            { value: "6 Cụm", label: "Lộ trình Fullstack 12 khóa thực hành", icon: Code2, tone: "text-rose-600" },
            { value: "4 Dạng", label: "Đề thi 2025+ phân tích điểm yếu", icon: BarChart3, tone: "text-emerald-700" },
            { value: "20% / 85%", label: "Hoa hồng Affiliate & Chia sẻ GV", icon: TrendingUp, tone: "text-amber-700" },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl bg-white px-4 py-3.5 shadow-2xs ring-1 ring-slate-200/70">
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-black sm:text-3xl ${stat.tone}`}>{stat.value}</p>
                  <StatIcon className={`h-5 w-5 opacity-60 ${stat.tone}`} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 2. BENTO GRID HIỆN ĐẠI — 6 TRỤ CỘT GIÁO DỤC ================= */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Zap className="h-3.5 w-3.5" /> Trải nghiệm EdTech Toàn diện Thế hệ Mới
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Mọi công cụ Học, Luyện thi &amp; Giảng dạy trong một hệ sinh thái duy nhất
            </h2>
          </div>
          <Link href="/dang-nhap" className="text-xs font-extrabold text-indigo-600 hover:underline">
            Tạo tài khoản miễn phí trong 30 giây →
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Bento Card Lớn 1 (col-span-7): Phòng thi 2025+ & Phân tích Điểm yếu */}
          <Link
            href="/thi"
            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl lg:col-span-7"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
                  <BarChart3 className="h-3.5 w-3.5" /> Cấu trúc Bộ GD&amp;ĐT 2025+
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-black sm:text-2xl">
                Phòng thi Trắc nghiệm &amp; Phân tích Điểm yếu Tự động
              </h3>
              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                Đủ 4 dạng câu hỏi mới (1 đáp án, nhiều đáp án, Đúng/Sai 4 mệnh đề, Trả lời ngắn). Nộp bài biết ngay điểm số, biểu đồ tỷ lệ đúng theo từng chuyên đề và gợi ý bài giảng cần ôn lại!
              </p>
            </div>

            {/* Mini visual analytics preview */}
            <div className="mt-6 grid grid-cols-3 gap-2.5 rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs ring-1 ring-white/10">
              <div>
                <p className="text-[10px] font-bold text-slate-300">Hàm số &amp; Đạo hàm</p>
                <div className="mt-1.5 h-2 rounded-full bg-white/15">
                  <div className="h-2 w-[92%] rounded-full bg-emerald-400" />
                </div>
                <p className="mt-1 text-[11px] font-extrabold text-emerald-300">92% Vững</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-300">Mũ &amp; Logarit</p>
                <div className="mt-1.5 h-2 rounded-full bg-white/15">
                  <div className="h-2 w-[78%] rounded-full bg-sky-400" />
                </div>
                <p className="mt-1 text-[11px] font-extrabold text-sky-300">78% Khá</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-300">Tích phân ứng dụng</p>
                <div className="mt-1.5 h-2 rounded-full bg-white/15">
                  <div className="h-2 w-[48%] rounded-full bg-amber-400" />
                </div>
                <p className="mt-1 text-[11px] font-extrabold text-amber-300">48% Cần ôn</p>
              </div>
            </div>
          </Link>

          {/* Bento Card Lớn 2 (col-span-5): AI Gia sư Socratic */}
          <Link
            href="/ai-gia-su"
            className="group flex flex-col justify-between rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md lg:col-span-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold text-violet-800">
                  <Bot className="h-3.5 w-3.5" /> AI Gia sư Socratic 24/7
                </span>
                <ArrowRight className="h-4 w-4 text-violet-500 transition group-hover:translate-x-1" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Gợi mở từng bước đúng chuẩn SGK từng Khối lớp
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Không chỉ đưa đáp án chép sẵn — AI Gia sư bám sát đúng trình độ Lớp 1–12 để dẫn dắt tư duy, giải thích công thức LaTeX rõ ràng và chấm bài tập về nhà 24/7.
              </p>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-violet-100 bg-white p-3.5 text-[11px] shadow-2xs">
              <p className="font-bold text-slate-500">Học sinh Lớp 12 hỏi:</p>
              <p className="rounded-xl bg-slate-100 px-3 py-2 font-semibold text-slate-800">
                Làm sao tìm cực trị của hàm số y = x³ - 3x + 2?
              </p>
              <p className="rounded-xl bg-violet-600 px-3 py-2 font-semibold text-white">
                Bước 1: Em hãy tính đạo hàm y&apos; và giải phương trình y&apos; = 0 trước nhé!
              </p>
            </div>
          </Link>

          {/* 4 Bento Cards nhỏ phía dưới */}
          {[
            {
              href: "/khoa-hoc",
              icon: Award,
              cls: "bg-amber-50 text-amber-700",
              title: "Khóa học 5 Sao & Chứng chỉ QR",
              desc: "Theo dõi tiến độ từng bài học, đánh giá sao minh bạch và nhận Chứng chỉ PDF kèm mã QR xác thực.",
            },
            {
              href: "/lop-hoc",
              icon: Radio,
              cls: "bg-rose-50 text-rose-600",
              title: "Lớp học Live & Điểm danh 0đ",
              desc: "Phòng học Video 2 chiều hoặc phát trực tiếp kèm bảng tin lớp, giao bài tập và ghi nhận chuyên cần.",
            },
            {
              href: "/phu-huynh",
              icon: HeartHandshake,
              cls: "bg-emerald-50 text-emerald-700",
              title: "Học bạ Số & Góc Phụ huynh",
              desc: "Phụ huynh liên kết mã Học bạ Số xem điểm thi thử, lịch sử học tập và nhắn tin trực tiếp với thầy cô.",
            },
            {
              href: "/cong-dong",
              icon: School,
              cls: "bg-sky-50 text-sky-700",
              title: "Mạng Xã Hội Giáo Viên Tích xanh",
              desc: "Chia sẻ giáo án chuẩn, nhân bản đề thi đồng nghiệp trong 1 chạm và bảo vệ học sinh bằng BOT AI 2 tầng.",
            },
          ].map((card) => {
            const CardIcon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md lg:col-span-3"
              >
                <div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.cls}`}>
                    <CardIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-indigo-600">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{card.desc}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600">
                  Khám phá <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 3. CHƯƠNG TRÌNH PHỔ THÔNG 3 CẤP HỌC (LỚP 1–12) ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <BookOpen className="h-3.5 w-3.5" /> Bám sát SGK Kết nối tri thức • Chân trời sáng tạo • Cánh diều
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              Kho Bài giảng Phổ thông Chuẩn GDPT 2018 (Lớp 1–12)
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Chọn nhanh Cấp học và Khối lớp để mở toàn bộ bài giảng lý thuyết, công thức trọng tâm và bài tập tự luyện.
            </p>
          </div>
          <Link
            href={`/tai-lieu?grade=${selectedGrade}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition"
          >
            Mở toàn bộ Lớp {selectedGrade} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {LEVEL_TABS.map((t) => {
            const active = selectedLevel === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectLevel(t.id)}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-300"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                }`}
              >
                <p className={`text-sm font-extrabold ${active ? "text-indigo-800" : "text-slate-800"}`}>{t.label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{t.badge}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Chọn lớp:</span>
          {currentLevelTab.grades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                selectedGrade === g
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Lớp {g}
            </button>
          ))}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {subjectsInGrade.map((s) => {
            const meta = getSubjectMeta(s.subject_code, s.subject_name);
            const SubIcon = meta.icon;
            return (
              <Link
                key={s.subject_code}
                href={`/tai-lieu?grade=${selectedGrade}&subject=${s.subject_code}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.badgeBg}`}>
                  <SubIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-slate-900 group-hover:text-indigo-600">
                    {s.subject_name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{s.lesson_count} bài giảng</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 4. HỌC VIỆN LẬP TRÌNH FULLSTACK — 6 CỤM CÔNG NGHỆ ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              <Code2 className="h-3.5 w-3.5" /> Chạy code &amp; Chấm Test tự động ngay trên Trình duyệt
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              Học viện Lập trình STEM — Phân cấp theo 6 Cụm Công nghệ
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Lộ trình bài bản từ con số 0: <strong>HTML &amp; CSS</strong> → <strong>JS &amp; TS</strong> → <strong>React &amp; Next.js</strong> → <strong>Node.js &amp; NestJS</strong> → <strong>Golang &amp; Python</strong> → <strong>MongoDB &amp; PostgreSQL</strong>.
            </p>
          </div>
          <Link
            href="/lap-trinh?path=custom"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-rose-500 transition"
          >
            Tự chọn Cụm Stack riêng <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CODING_ROADMAPS.map((rm) => (
            <Link
              key={rm.id}
              href={`/lap-trinh?path=${rm.id}`}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
            >
              <div className={`bg-gradient-to-br ${rm.gradient} p-4 text-white`}>
                <span className="inline-block rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-bold">
                  {rm.badge}
                </span>
                <h3 className="mt-2 text-base font-black">{rm.shortTitle}</h3>
                <p className="mt-0.5 text-[11px] text-white/90">{rm.durationLabel}</p>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{rm.audience}</p>
                <div className="flex flex-wrap gap-1">
                  {rm.clusters.map((cid) => (
                    <span
                      key={cid}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700"
                    >
                      {getClusterById(cid).shortLabel}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 group-hover:underline">
                  Xem lộ trình từng cụm <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-bold text-slate-500">6 Cụm Công nghệ (12 khóa):</span>
          {CODING_CLUSTERS.map((cluster) => (
            <Link
              key={cluster.id}
              href={`/lap-trinh?track=${cluster.tracks[0]}`}
              className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition hover:shadow-xs ${cluster.badgeBg}`}
            >
              {cluster.shortLabel}
            </Link>
          ))}
        </div>
      </section>

      {/* ================= 5. KHÓA HỌC 5 SAO & ĐỘI NGŨ GIÁO VIÊN TÍCH XANH ================= */}
      {featuredCourses.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                <Award className="h-3.5 w-3.5 text-amber-600" /> Đánh giá thực tế • Cấp Chứng chỉ PDF + QR
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
                Khóa học Trực tuyến Được Học viên Yêu thích nhất
              </h2>
            </div>
            <Link
              href="/khoa-hoc"
              className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:underline"
            >
              Xem tất cả Khóa học <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {featuredCourses.map((c) => (
              <Link
                key={c.id}
                href="/khoa-hoc"
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div
                  className={`bg-gradient-to-br ${
                    COVER_THEMES[c.cover_theme] || COVER_THEMES.indigo
                  } p-5 text-white space-y-2`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5">{c.subject_name}</span>
                    <span className="rounded-full bg-emerald-400/25 px-2.5 py-0.5 text-emerald-100">
                      Có Chứng chỉ QR
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-base font-extrabold leading-snug">{c.title}</h3>
                  <p className="text-[11px] text-white/85">
                    {c.grade_label} • {c.modules?.length || 0} bài học
                  </p>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{c.summary}</p>
                  <div className="space-y-2.5 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 truncate">
                        {c.teacher_name}
                        {c.teacher_verified && <VerifiedBadge />}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 font-extrabold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {c.avg_rating > 0 ? c.avg_rating.toFixed(1) : "5.0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{c.student_count} học viên tham gia</span>
                      <span className="font-extrabold text-indigo-600 group-hover:underline">Vào học ngay →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {topTeachers.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 shadow-xs sm:p-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Xác minh Thẻ Giáo viên • Xếp hạng Uy tín Minh bạch
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
                Đội ngũ Giáo viên Tiêu biểu trên Owlie Edu
              </h2>
            </div>
            <Link
              href="/cong-dong"
              className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:underline"
            >
              Khám phá Mạng Xã Hội Giáo Viên <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topTeachers.map((t) => (
              <Link
                key={t.id}
                href={`/giao-vien?id=${encodeURIComponent(t.id)}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 text-base font-black text-white shadow-xs">
                    {t.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-extrabold text-slate-900 group-hover:text-indigo-600">
                      <span className="truncate">{t.full_name}</span>
                      {t.is_verified && <VerifiedBadge />}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{t.school_name}</p>
                  </div>
                </div>
                {t.reputation_label && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200">
                    <Award className="h-3 w-3 text-amber-500" />
                    {t.reputation_label} • {t.reputation_score ?? 0}đ
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-semibold text-slate-500">
                  <span>{t.post_count} giáo án chia sẻ</span>
                  <span className="font-bold text-indigo-600">Xem hồ sơ →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= 6. BẢNG GIÁ OWLIE PRO & HỆ THỐNG KIẾM TIỀN MINH BẠCH ================= */}
      <section className="rounded-[36px] border border-indigo-200/80 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-10 space-y-8">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3.5 py-1 text-xs font-extrabold text-amber-300 ring-1 ring-amber-300/30">
            <Crown className="h-3.5 w-3.5" /> Linh hoạt Freemium • Thanh toán VietQR 24/7
          </span>
          <h2 className="text-2xl font-black sm:text-4xl">
            Học miễn phí trọn đời — Nâng cấp Pro khi muốn bứt tốc
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Nhập mã <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono font-bold text-amber-300">OWLIE50</code> giảm ngay 50% tại trang thanh toán VietQR.
          </p>

          {/* Toggle Tháng / Năm */}
          <div className="inline-flex rounded-2xl bg-white/10 p-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setBillingMode("monthly")}
              className={`rounded-xl px-4 py-2 transition ${
                billingMode === "monthly" ? "bg-white text-slate-950 shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Thanh toán Tháng
            </button>
            <button
              type="button"
              onClick={() => setBillingMode("yearly")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                billingMode === "yearly" ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              Thanh toán Năm
              <span className="rounded-full bg-slate-950/15 px-2 py-0.5 text-[10px]">Tiết kiệm 33%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Card 1: Miễn phí */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold text-slate-200">
                Mãi mãi 0đ
              </span>
              <div>
                <h3 className="text-lg font-black">Owlie Miễn Phí</h3>
                <p className="mt-1 text-xs text-slate-300">Đầy đủ kho SGK Lớp 1–12 &amp; Góc Phụ huynh</p>
              </div>
              <p className="text-3xl font-black">
                0đ <span className="text-xs font-medium text-slate-400">/ mãi mãi</span>
              </p>
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> 157+ bài giảng GDPT 2018 (Lớp 1–12)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Học bạ Số &amp; Phụ huynh theo dõi 0đ
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Tham gia Lớp Live &amp; Lập trình nền tảng
                </li>
              </ul>
            </div>
            <Link
              href="/dang-nhap"
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-3 text-xs font-extrabold text-white hover:bg-white/20 transition"
            >
              Đăng ký miễn phí <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2: Owlie Pro (Highlight) */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-indigo-900/90 to-slate-900 p-6 shadow-2xl shadow-amber-500/10">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-slate-950">
                <Crown className="h-3 w-3" /> PHỔ BIẾN NHẤT
              </span>
              <div>
                <h3 className="text-lg font-black">
                  {billingMode === "yearly" ? "Owlie Pro 1 Năm" : "Owlie Pro Tháng"}
                </h3>
                <p className="mt-1 text-xs text-indigo-200">Mở khóa toàn bộ sức mạnh AI &amp; Luyện thi 2025+</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 line-through">
                  {billingMode === "yearly" ? "1.188.000đ" : "149.000đ"}
                </p>
                <p className="text-3xl font-black text-amber-300">
                  {billingMode === "yearly" ? "799.000đ" : "99.000đ"}{" "}
                  <span className="text-xs font-medium text-slate-300">
                    {billingMode === "yearly" ? "/ năm (~66k/tháng)" : "/ tháng"}
                  </span>
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-100">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> AI Gia sư Socratic không giới hạn 24/7
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Toàn bộ đề thi chuyên sâu &amp; 6 Cụm Fullstack
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Cấp Chứng chỉ PDF + QR ưu tiên &amp; Hỗ trợ GV Tích xanh
                </li>
              </ul>
            </div>
            <Link
              href="/bang-gia"
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-amber-400 py-3 text-xs font-black text-slate-950 shadow-lg hover:bg-amber-300 transition"
            >
              <QrCode className="h-4 w-4" /> Nâng cấp qua VietQR ngay
            </Link>
          </div>

          {/* Card 3: Gia đình / Nhóm 4 */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-extrabold text-emerald-300">
                Chỉ ~49k / thành viên
              </span>
              <div>
                <h3 className="text-lg font-black">Gói Gia Đình / Nhóm 4</h3>
                <p className="mt-1 text-xs text-slate-300">4 tài khoản Pro học chung siêu tiết kiệm</p>
              </div>
              <p className="text-3xl font-black">
                199.000đ <span className="text-xs font-medium text-slate-400">/ tháng</span>
              </p>
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Toàn bộ quyền lợi Owlie Pro cho 4 tài khoản
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Báo cáo kết quả học tập gửi định kỳ cho Phụ huynh
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Phù hợp gia đình có nhiều con hoặc nhóm ôn thi
                </li>
              </ul>
            </div>
            <Link
              href="/bang-gia"
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-extrabold text-slate-950 hover:bg-indigo-50 transition"
            >
              Chọn Gói Gia đình <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 2 Kênh Kiếm tiền nổi bật ngay trong khối Monetization */}
        <div className="grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
          <Link
            href="/bang-gia"
            className="flex items-center justify-between gap-4 rounded-2xl bg-emerald-500/15 p-4 ring-1 ring-emerald-400/30 hover:bg-emerald-500/20 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-300">CHƯƠNG TRÌNH AFFILIATE • HOA HỒNG 20%</p>
                <p className="text-xs text-slate-200">Chia sẻ link giới thiệu Owlie Edu nhận ngay 20% mỗi đơn nâng cấp Pro.</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300" />
          </Link>

          <Link
            href="/bang-gia"
            className="flex items-center justify-between gap-4 rounded-2xl bg-indigo-500/15 p-4 ring-1 ring-indigo-400/30 hover:bg-indigo-500/20 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-200">GIÁO VIÊN CREATOR • GIỮ 85% DOANH THU</p>
                <p className="text-xs text-slate-200">Xuất bản khóa học, bán bộ đề thi &amp; mở lớp Live trực tiếp trên Owlie Edu.</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-indigo-300" />
          </Link>
        </div>
      </section>

      {/* ================= 7. CẢM NHẬN THỰC TẾ (SOCIAL PROOF) ================= */}
      <section className="space-y-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> Được Học sinh, Phụ huynh &amp; Giáo viên Tin chọn
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950 sm:text-3xl">
            Kết quả thực tế từ cộng đồng học tập Owlie Edu
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  <Quote className="h-5 w-5 text-indigo-200" />
                </div>
                <p className="text-xs leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{t.name}</p>
                  <p className="text-[11px] text-slate-500">{t.role}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700">
                  {t.tag}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= 8. CÂU HỎI THƯỜNG GẶP CHUẨN SEO (KHỚP JSON-LD FAQPAGE) ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-600" /> Giải đáp Chi tiết &amp; Minh bạch
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              Câu hỏi thường gặp về Owlie Edu
            </h2>
          </div>
          <Link
            href="/bang-gia"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:underline"
          >
            <Tag className="h-3.5 w-3.5" /> Xem ưu đãi &amp; thanh toán VietQR →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/40">
          {SEO_FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q} className="p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <h3 className="text-sm font-extrabold text-slate-900">{item.q}</h3>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 9. CTA CUỐI TRANG & TẢI APP MOBILE ================= */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-indigo-700 via-blue-700 to-emerald-700 p-8 text-center text-white shadow-xl sm:p-12">
        <div className="relative z-10 mx-auto max-w-2xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 p-2 shadow-lg ring-1 ring-white/25 backdrop-blur-xs">
            <CuBongLogoMark className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black sm:text-3xl">
            Bắt đầu hành trình học tập &amp; bứt phá cùng Owlie Edu ngay hôm nay
          </h2>
          <p className="text-xs leading-relaxed text-indigo-100 sm:text-sm">
            Đăng ký nhanh trong 30 giây bằng Email, Google hoặc Facebook — trải nghiệm miễn phí toàn bộ kho SGK 1–12 hoặc kích hoạt Owlie Pro bằng VietQR chỉ trong 1 phút.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-indigo-700 shadow-lg hover:bg-indigo-50 transition"
            >
              <GraduationCap className="h-4 w-4" /> Đăng ký Miễn phí ngay
            </Link>
            <Link
              href="/bang-gia"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-amber-300 transition"
            >
              <Crown className="h-4 w-4" /> Nâng cấp Pro / Kiếm 20%
            </Link>
            <Link
              href="/tai-app"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/25 transition"
            >
              <Smartphone className="h-4 w-4" /> Tải App Android &amp; iOS
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
