"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Radio,
  School,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
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
  { id: "primary", label: "Tiểu học (Lớp 1–5)", grades: [1, 2, 3, 4, 5], badge: "Nền tảng vững chắc" },
  { id: "middle", label: "THCS (Lớp 6–9)", grades: [6, 7, 8, 9], badge: "Bứt phá & Vào lớp 10" },
  { id: "high", label: "THPT (Lớp 10–12)", grades: [10, 11, 12], badge: "Chinh phục THPT 2025+" },
] as const;

const ROLE_CARDS = [
  {
    role: "Dành cho Học sinh (Lớp 1–12)",
    title: "Tự học chủ động, nắm chắc kiến thức & tích lũy Học bạ Số",
    desc: "Học 157+ bài giảng theo chương trình GDPT 2018, luyện đề phân tích điểm yếu tự động, hỏi AI Gia sư 24/7 và nhận Chứng chỉ PDF kèm mã QR.",
    icon: GraduationCap,
    accent: "border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60",
    iconCls: "bg-indigo-600 text-white",
    ctaPrimary: { href: "/tai-lieu", label: "Vào học Lớp 1–12" },
    ctaSecondary: { href: "/hoc-ba", label: "Xem Học bạ Số" },
  },
  {
    role: "Dành cho Giáo viên & Cố vấn",
    title: "Chia sẻ giáo án chuẩn, dạy Lớp Live & nhận Tích xanh Uy tín",
    desc: "Tham gia Mạng Xã Hội Giáo Viên, nhân bản đề thi đồng nghiệp về lớp trong 1 chạm, mở phòng Live điểm danh tự động và xây dựng Tường Hồ sơ chuyên môn.",
    icon: School,
    accent: "border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60",
    iconCls: "bg-emerald-600 text-white",
    ctaPrimary: { href: "/cong-dong", label: "Cộng đồng Giáo viên" },
    ctaSecondary: { href: "/quan-tri", label: "Studio Giảng dạy" },
  },
  {
    role: "Dành cho Phụ huynh Đồng hành",
    title: "Theo dõi sát sao điểm số, chuyên cần & an toàn của con — 0đ",
    desc: "Chỉ cần nhập mã liên kết từ Học bạ Số của con để xem bảng điểm thi thử, lịch sử điểm danh Lớp Live, chứng chỉ đạt được và nhắn tin trực tiếp với thầy cô.",
    icon: HeartHandshake,
    accent: "border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50",
    iconCls: "bg-amber-500 text-slate-950",
    ctaPrimary: { href: "/phu-huynh", label: "Mở Góc Phụ huynh" },
    ctaSecondary: { href: "/chung-chi", label: "Tra cứu Chứng chỉ QR" },
  },
];

const EDU_PILLARS = [
  {
    href: "/tai-lieu",
    icon: BookOpen,
    badge: "GDPT 2018",
    color: "bg-blue-50 text-blue-600",
    title: "Kho Bài giảng Chuẩn Lớp 1–12",
    desc: "Đầy đủ Toán, Ngữ văn, Tiếng Anh, Lý, Hóa, Sinh, Sử, Địa, Tin học trình bày mạch lạc theo từng Khối, Chương và Bài học.",
  },
  {
    href: "/thi",
    icon: BarChart3,
    badge: "Định dạng 2025+",
    color: "bg-emerald-50 text-emerald-600",
    title: "Thi Trắc nghiệm & Phân tích Điểm yếu",
    desc: "Đủ 4 dạng câu hỏi mới, tự động chấm điểm tức thì, chỉ rõ chuyên đề còn yếu (<70%) và gợi ý đúng bài giảng cần ôn lại.",
  },
  {
    href: "/khoa-hoc",
    icon: Award,
    badge: "Chứng chỉ QR",
    color: "bg-amber-50 text-amber-700",
    title: "Khóa học 5 Sao & Chứng chỉ PDF",
    desc: "Theo dõi tiến độ từng bài giảng của thầy cô, đánh giá sao trực tiếp và nhận Chứng chỉ Hoàn thành có mã QR xác thực.",
  },
  {
    href: "/lop-hoc",
    icon: Radio,
    badge: "Tương tác trực tiếp",
    color: "bg-rose-50 text-rose-600",
    title: "Lớp học Trực tuyến & Livestream 0đ",
    desc: "Phòng học Video 2 chiều hoặc phát trực tiếp kèm bảng tin lớp, giao bài tập về nhà và tự động ghi nhận điểm danh.",
  },
  {
    href: "/ai-gia-su",
    icon: Bot,
    badge: "Phương pháp Socratic",
    color: "bg-violet-50 text-violet-600",
    title: "AI Gia sư Bám sát Khối lớp 24/7",
    desc: "Gợi mở từng bước tư duy đúng theo kiến thức SGK từng lớp thay vì chỉ đưa đáp án chép sẵn — giúp học sinh hiểu sâu gốc rễ.",
  },
  {
    href: "/hoc-ba",
    icon: FileSpreadsheet,
    badge: "Minh bạch & An toàn",
    color: "bg-sky-50 text-sky-600",
    title: "Học bạ Số & Bảo vệ An toàn Học đường",
    desc: "Lưu giữ trọn vẹn bảng điểm, chứng chỉ, dự án phần mềm cùng BOT AI 2 tầng bảo vệ học sinh khỏi quấy rối và bắt nạt mạng.",
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
    <div className="space-y-12 pb-12">
      {/* === 0. THANH CHÀO NHANH THEO VAI TRÒ KHI ĐÃ ĐĂNG NHẬP === */}
      {user && (
        <section
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
                    <ShieldCheck className="h-4 w-4" /> Trung tâm Quản trị
                  </Link>
                  <Link
                    href="/cong-dong"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Users className="h-4 w-4 text-indigo-600" /> Cộng đồng Giáo viên
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
                    href="/lop-hoc"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Radio className="h-4 w-4 text-rose-500" /> Lớp đang dạy
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
                    href="/chung-chi"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Award className="h-4 w-4 text-amber-600" /> Tra cứu Chứng chỉ QR
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
                    href="/khoa-hoc"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-2xs hover:bg-amber-300 transition"
                  >
                    <GraduationCap className="h-4 w-4" /> Khóa học 5★
                  </Link>
                  <Link
                    href={`/tai-lieu?grade=${user.current_grade || 12}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <BookOpen className="h-4 w-4 text-blue-600" /> Bài giảng Lớp {user.current_grade || 12}
                  </Link>
                  <Link
                    href="/thi"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Phòng thi
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= 1. HERO GIÁO DỤC SÁNG, ẤM ÁP & CHUẨN HỌC THUẬT ================= */}
      <section className="relative overflow-hidden rounded-[32px] border border-indigo-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
          {/* Cột trái: Thông điệp giáo dục & Hành động nhanh */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Nền tảng Giáo dục Mở Chuẩn GDPT 2018 • Miễn phí 100%</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.18] sm:text-5xl">
              Học tập Thông minh từ{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Lớp 1 đến Lớp 12
              </span>{" "}
              cùng Owlie Edu
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Đồng hành cùng học sinh, giáo viên và phụ huynh Việt Nam: kho <strong>{totalLessons}+ bài giảng chuẩn SGK</strong>, khóa học 5 sao cấp <strong>Chứng chỉ QR</strong>, phòng thi thử <strong>phân tích điểm yếu</strong>, Học bạ Số và học viện <strong>STEM Lập trình</strong> hoàn toàn miễn phí.
            </p>

            {/* Nút hành động chính */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/tai-lieu"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition"
              >
                <BookOpen className="h-4 w-4" />
                Bắt đầu học Lớp 1–12
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/khoa-hoc"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-800 shadow-xs hover:border-indigo-300 hover:text-indigo-700 transition"
              >
                <GraduationCap className="h-4 w-4 text-amber-500" />
                Khám phá Khóa học 5★
              </Link>
              <Link
                href="/thi"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Thi thử Online
              </Link>
            </div>

            {/* Thanh cam kết học đường minh bạch */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Không quảng cáo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Giáo viên Tích xanh xác thực
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Phụ huynh theo dõi miễn phí
              </span>
            </div>
          </div>

          {/* Cột phải: Tranh minh họa Giáo dục Hiện đại + Thẻ nổi chuẩn EdTech */}
          <div className="relative lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white bg-white p-2.5 shadow-xl shadow-indigo-900/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-owlie-edu.jpg"
                alt="Học sinh học tập cùng chú cú Owlie trên nền tảng giáo dục Owlie Edu"
                className="aspect-[16/10] w-full rounded-2xl object-cover"
              />

              {/* Thẻ nổi góc dưới trái: Chứng chỉ QR */}
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-0 sm:grid-cols-2 sm:gap-3 sm:pt-3">
                <Link
                  href="/chung-chi?code=OWLIE-CERT-2026-WEB01"
                  className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 hover:bg-amber-50 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">Chứng chỉ PDF + QR</p>
                    <p className="truncate text-[10px] font-medium text-amber-800">Xác thực điện tử công khai</p>
                  </div>
                </Link>

                <Link
                  href="/phu-huynh"
                  className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 hover:bg-emerald-50 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">An toàn Học đường AI</p>
                    <p className="truncate text-[10px] font-medium text-emerald-800">Bảo vệ 24/7 &amp; Góc Phụ huynh</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Số liệu Giáo dục Nổi bật */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 border-t border-indigo-100/90 pt-7 sm:grid-cols-4">
          {[
            { value: `${totalLessons}+`, label: "Bài giảng chuẩn GDPT 2018", tone: "text-indigo-700" },
            { value: "Lớp 1–12", label: "Đủ 3 cấp Tiểu học • THCS • THPT", tone: "text-blue-700" },
            { value: "8 Khóa", label: "Lập trình STEM chạy ngay trên web", tone: "text-emerald-700" },
            { value: "100% Free", label: "Mở cho Học sinh, Giáo viên, Phụ huynh", tone: "text-amber-700" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/60">
              <p className={`text-2xl font-black sm:text-3xl ${stat.tone}`}>{stat.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 2. CHỌN KHÔNG GIAN THEO VAI TRÒ (HỌC SINH • GIÁO VIÊN • PHỤ HUYNH) ================= */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Users className="h-3.5 w-3.5" /> Thiết kế cho Toàn bộ Hệ sinh thái Nhà trường
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Bạn tham gia Owlie Edu với vai trò nào?
            </h2>
          </div>
          <Link href="/dang-nhap" className="text-xs font-bold text-indigo-600 hover:underline">
            Tạo tài khoản miễn phí trong 30 giây →
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.role}
                className={`flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition hover:shadow-md ${card.accent}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ${card.iconCls}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      {card.role}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold leading-snug text-slate-900">{card.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">{card.desc}</p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-2">
                  <Link
                    href={card.ctaPrimary.href}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 transition"
                  >
                    {card.ctaPrimary.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={card.ctaSecondary.href}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {card.ctaSecondary.label}
                  </Link>
                </div>
              </div>
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
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Chương trình Giáo dục Phổ thông Lớp 1–12
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Chọn Cấp học &amp; Khối lớp để mở ngay kho bài giảng chi tiết kèm bài tập củng cố và đề thi thử tương ứng.
            </p>
          </div>
          <Link
            href={`/tai-lieu?grade=${selectedGrade}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition"
          >
            Mở toàn bộ Lớp {selectedGrade} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Tab 3 Cấp học */}
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
                <p className={`text-sm font-extrabold ${active ? "text-indigo-800" : "text-slate-800"}`}>
                  {t.label}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{t.badge}</p>
              </button>
            );
          })}
        </div>

        {/* Nút chọn Khối lớp trong cấp đang chọn */}
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

        {/* Lưới Môn học theo Lớp */}
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

      {/* ================= 4. KHÓA HỌC 5 SAO NỔI BẬT TỪ ĐỘI NGŨ GIÁO VIÊN ================= */}
      {featuredCourses.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                <Award className="h-3.5 w-3.5 text-amber-600" /> Học bài bản • Hoàn thành nhận Chứng chỉ PDF + QR
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                Khóa học Cộng đồng Được Yêu thích nhất
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
                      Miễn phí • Có Chứng chỉ
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

      {/* ================= 5. ĐỘI NGŨ GIÁO VIÊN TIÊU BIỂU (TÍCH XANH & ĐIỂM UY TÍN) ================= */}
      {topTeachers.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 shadow-xs sm:p-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Xác minh Thẻ Giáo viên • Xếp hạng Uy tín Minh bạch
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
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
                  <span className="text-indigo-600 font-bold">Xem hồ sơ →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= 6. HỆ SINH THÁI HỌC TẬP 6 TRỤ CỘT ================= */}
      <section className="space-y-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" /> Trải nghiệm Giáo dục Toàn diện
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Mọi công cụ học &amp; dạy hiện đại trên một nền tảng
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Thiết kế khoa học, trực quan cho học sinh từ Tiểu học đến THPT — giúp việc tự học nhẹ nhàng, hứng thú và đo lường được tiến bộ mỗi ngày.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {EDU_PILLARS.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.title}
                href={f.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${f.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{f.desc}</p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                  Tìm hiểu thêm <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 7. HỌC VIỆN LẬP TRÌNH & CHỌN LỘ TRÌNH STACK (KIỂU F8) ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              <Code2 className="h-3.5 w-3.5" /> Học theo Lộ trình Nghề nghiệp &amp; Tự chọn Stack cá nhân
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Học viện Lập trình STEM — Phân cấp theo 6 Cụm Công nghệ
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Gộp bài bản từng cụm: <strong>HTML &amp; CSS</strong> → <strong>JS &amp; TS</strong> → <strong>React &amp; Next.js</strong> → <strong>Node.js &amp; NestJS</strong> → <strong>Golang &amp; Python</strong> → <strong>MongoDB &amp; PostgreSQL</strong>!
            </p>
          </div>
          <Link
            href="/lap-trinh?path=custom"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-rose-500 transition"
          >
            Tự chọn Cụm Stack riêng <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4 Lộ trình Stack phân cấp theo Cụm kiểu F8 */}
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

        {/* Lối tắt 6 Cụm Công nghệ (12 khóa) */}
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

      {/* ================= 8. LỜI MỜI ĐỒNG HÀNH & TẢI APP MOBILE ================= */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-indigo-700 via-blue-700 to-emerald-700 p-8 text-center text-white shadow-xl sm:p-12">
        <div className="relative z-10 mx-auto max-w-2xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 p-2 shadow-lg ring-1 ring-white/25 backdrop-blur-xs">
            <CuBongLogoMark className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black sm:text-3xl">
            Bắt đầu hành trình học tập miễn phí cùng Owlie Edu ngay hôm nay
          </h2>
          <p className="text-xs leading-relaxed text-indigo-100 sm:text-sm">
            Đăng ký trong 30 giây bằng Email, Google hoặc Facebook — hoàn toàn miễn phí cho Học sinh, Giáo viên và Phụ huynh trên cả Web lẫn Điện thoại.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/dang-nhap"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-indigo-700 shadow-lg hover:bg-indigo-50 transition"
            >
              <GraduationCap className="h-4 w-4" /> Đăng ký Miễn phí ngay
            </Link>
            <Link
              href="/phu-huynh"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-amber-300 transition"
            >
              <HeartHandshake className="h-4 w-4" /> Dành cho Phụ huynh
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
