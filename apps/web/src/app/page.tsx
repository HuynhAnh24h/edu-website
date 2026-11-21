"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  GraduationCap,
  HeartHandshake,
  Lock,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { getSubjectMeta, SUBJECT_ORDER } from "@/lib/subjects";
import { CODING_TRACKS } from "@/lib/codingCurriculum";
import { useAuth } from "@/context/AuthContext";

interface SummaryRow {
  grade_id: number;
  subject_code: string;
  subject_name: string;
  lesson_count: number;
}

const PLATFORM_FEATURES = [
  {
    href: "/lap-trinh",
    icon: Code2,
    badge: "Mới • Cộng đồng Dev",
    color: "bg-indigo-50 text-indigo-600",
    title: "Code trực tiếp trên Trình duyệt",
    desc: "8 lộ trình thực chiến: HTML, CSS, JS, TS, Python, Golang, MongoDB, PostgreSQL. Chấm test tự động — chạy ĐÚNG mới qua bài tiếp theo.",
  },
  {
    href: "/tai-lieu",
    icon: BookOpen,
    badge: "Lớp 1 → 12",
    color: "bg-blue-50 text-blue-600",
    title: "Kho Tài liệu GDPT 2018",
    desc: "Đầy đủ môn Toán, Ngữ văn, Tiếng Anh, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Tin học chia rõ theo từng Chương & Bài giảng.",
  },
  {
    href: "/lop-hoc",
    icon: Radio,
    badge: "Trực tuyến 0đ",
    color: "bg-rose-50 text-rose-600",
    title: "Phòng học Trực tuyến & Livestream",
    desc: "Dạy học Video tương tác 2 chiều hoặc phát Livestream ngay trong lớp kèm Live Chat, Điểm danh tự động và giao giáo án.",
  },
  {
    href: "/thi",
    icon: ShieldCheck,
    badge: "Chuẩn 2025+",
    color: "bg-emerald-50 text-emerald-600",
    title: "Thi trắc nghiệm Online",
    desc: "Hỗ trợ đủ 4 dạng câu hỏi mới của Bộ GD&ĐT, tự động lưu bài làm ngay trên máy giúp không lo mất bài khi rớt mạng.",
  },
  {
    href: "/ai-gia-su",
    icon: Bot,
    badge: "Gia sư 24/7",
    color: "bg-purple-50 text-purple-600",
    title: "AI Gia sư theo Khối lớp",
    desc: "Bám sát đúng kiến thức từng lớp học, gợi mở phương pháp tư duy từng bước thay vì chỉ đưa đáp án chép sẵn.",
  },
  {
    href: "/cong-dong",
    icon: Users,
    badge: "Mới • MXH Giáo viên",
    color: "bg-amber-50 text-amber-700",
    title: "Mạng Xã Hội Giáo Viên",
    desc: "Nơi thầy cô chia sẻ giáo án hay, đề thi chuẩn mới, kinh nghiệm đứng lớp, theo dõi đồng nghiệp và lưu nhanh về tủ bài giảng.",
  },
];

export default function LandingPage() {
  const { user, isTeacher, isAdmin } = useAuth();
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [totalLessons, setTotalLessons] = useState<number>(157);
  const [selectedGrade, setSelectedGrade] = useState<number>(12);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/curriculum/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSummaryRows(data.summary || []);
          if (data.total_lessons) setTotalLessons(data.total_lessons);
        }
      })
      .catch(() => {});
  }, []);

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
      {/* === THANH ĐIỀU HƯỚNG THÔNG MINH THEO VAI TRÒ KHI ĐÃ ĐĂNG NHẬP === */}
      {user && (
        <section
          className={`rounded-3xl border p-5 shadow-xs sm:p-6 ${
            isAdmin
              ? "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-slate-50"
              : isTeacher
                ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50/40"
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
                      : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {isAdmin
                  ? "Không gian Quản trị viên"
                  : isTeacher
                    ? "Không gian Giáo viên"
                    : `Không gian Học sinh${user.current_grade ? ` • Lớp ${user.current_grade}` : ""}`}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                Xin chào, {user.full_name}!
              </h2>
              <p className="text-xs text-slate-600">
                {isAdmin
                  ? "Chọn nhanh chức năng quản trị người dùng, kiểm duyệt cộng đồng giáo viên hoặc cập nhật kho học liệu."
                  : isTeacher
                    ? "Vào ngay Mạng Xã Hội Giáo Viên để chia sẻ giáo án cùng đồng nghiệp hoặc mở Studio để dạy Live & soạn đề."
                    : "Bắt đầu ngay vào lớp học, bài giảng, thi thử hoặc xem chia sẻ mới từ thầy cô."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <>
                  <Link
                    href="/quan-tri"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-rose-500 transition"
                  >
                    <ShieldCheck className="h-4 w-4" /> Trung tâm Quản trị
                  </Link>
                  <Link
                    href="/cong-dong"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <Users className="h-4 w-4 text-indigo-600" /> Mạng XH Giáo viên
                  </Link>
                </>
              ) : isTeacher ? (
                <>
                  <Link
                    href="/cong-dong"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-500 transition"
                  >
                    <Users className="h-4 w-4" /> Mạng Xã Hội Giáo Viên
                  </Link>
                  <Link
                    href="/quan-tri"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    <GraduationCap className="h-4 w-4" /> Mở Studio Giảng dạy
                  </Link>
                  <Link
                    href="/lop-hoc"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <Radio className="h-4 w-4 text-rose-500" /> Lớp đang dạy
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/khoa-hoc"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 transition"
                  >
                    <GraduationCap className="h-4 w-4" /> Khóa học 5★
                  </Link>
                  <Link
                    href="/lop-hoc"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 transition"
                  >
                    <Radio className="h-4 w-4" /> Lớp của em
                  </Link>
                  <Link
                    href="/tai-lieu"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <BookOpen className="h-4 w-4 text-blue-600" /> Bài giảng Lớp {user.current_grade || 12}
                  </Link>
                  <Link
                    href="/thi"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Thi trắc nghiệm
                  </Link>
                  <Link
                    href="/cong-dong"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <Users className="h-4 w-4 text-amber-600" /> Góc Thầy Cô &amp; Sản phẩm
                  </Link>
                  <Link
                    href="/tin-nhan"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <HeartHandshake className="h-4 w-4 text-emerald-600" /> Chat hỏi Thầy Cô
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= 1. HERO LANDING SECTION ================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-white/15">
              <HeartHandshake className="h-4 w-4" />
              <span>Nền tảng Học tập Mở • 100% Miễn phí cho Cộng đồng Việt Nam</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl">
              Học Phổ thông Lớp 1–12 &amp;{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Thực hành Lập trình
              </span>{" "}
              ngay trên trình duyệt
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Từ kiến thức chuẩn Bộ GD&amp;ĐT Lớp 1–12, lớp học Livestream trực tuyến, AI Gia sư cho đến 8 khóa Lập trình thực chiến (HTML, CSS, JS, TS, Python, Golang, MongoDB, PostgreSQL) chấm test tự động — tất cả trong một hệ thống duy nhất.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/lap-trinh"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 transition"
              >
                <Terminal className="h-4 w-4" />
                Học Lập trình &amp; Code ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tai-lieu"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
              >
                <BookOpen className="h-4 w-4" />
                Khám phá Lớp 1–12
              </Link>
              <Link
                href="/lop-hoc"
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/20 px-5 py-3.5 text-sm font-bold text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/30 transition"
              >
                <Radio className="h-4 w-4" />
                Vào Lớp Live
              </Link>
            </div>
          </div>

          {/* Minh họa Code IDE trực quan trên Hero */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/90 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-slate-400">main.go • EduK12 Browser IDE</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  PASS 3/3
                </span>
              </div>
              <pre className="p-4 font-mono text-xs leading-6 text-slate-200 overflow-x-auto">
                <code>{`func SumSlice(nums []int) int {
  total := 0
  for _, v := range nums {
    total += v
  }
  return total
}`}</code>
              </pre>
              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/70 px-4 py-2.5 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đạt 100% test — Mở khóa bài tiếp theo!
                </span>
                <Link href="/lap-trinh?track=golang" className="font-bold text-indigo-400 hover:underline">
                  Thử ngay →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Thống kê Nổi bật */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4">
          {[
            { value: `${totalLessons}+`, label: "Bài giảng chuẩn GDPT 2018" },
            { value: "8 Khóa", label: "HTML, CSS, JS, TS, Go, Py, DB" },
            { value: "Live 0đ", label: "Phòng học Video + Điểm danh" },
            { value: "2FA + AI", label: "Bảo mật cao & AI Gia sư 24/7" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-extrabold text-white sm:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 2. HỆ THỐNG CHÚNG TÔI CÓ GÌ? (6 TRỤ CỘT) ================= */}
      <section className="space-y-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" /> Hệ sinh thái Toàn diện
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Website chúng tôi mang lại gì cho bạn?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Mọi công cụ học tập, giảng dạy trực tuyến và thực hành lập trình hiện đại — thiết kế mở để ai cũng có thể học và phát triển.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_FEATURES.map((f) => {
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
                  Khám phá ngay <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 3. LỘ TRÌNH 8 KHÓA LẬP TRÌNH THỰC CHIẾN ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Code2 className="h-3.5 w-3.5" /> Học đi đôi với Hành • Chấm Test Tự động
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              8 Khóa Lập trình Code ngay trên Trình duyệt
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Không cần cài đặt phức tạp. Viết code, bấm chạy kiểm tra — <strong>đạt 100% test case mới được mở khóa bài tiếp theo</strong> để đảm bảo vững nền tảng!
            </p>
          </div>
          <Link
            href="/lap-trinh"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Mở Phòng Thực hành Code <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {CODING_TRACKS.map((track) => (
            <Link
              key={track.id}
              href={`/lap-trinh?track=${track.id}`}
              className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-indigo-400 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold ${track.accentBg} ${track.accentText} ${track.accentBorder}`}
                >
                  {track.shortName}
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {track.category}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                {track.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{track.tagline}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> {track.lessons.length} bài có chấm test
                </span>
                <span className="font-bold text-indigo-600">Code →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= 4. KHÁM PHÁ NHANH CHƯƠNG TRÌNH LỚP 1–12 ================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <GraduationCap className="h-6 w-6 text-indigo-600" />
              Chương trình Giáo dục Phổ thông Lớp 1–12
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Chọn khối lớp để truy cập ngay kho bài giảng phân theo từng Môn học (Toán, Lý, Hóa, Sinh, Sử, Địa...).
            </p>
          </div>
          <Link
            href={`/tai-lieu?grade=${selectedGrade}`}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Xem toàn bộ Lớp {selectedGrade} →
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                selectedGrade === g
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Lớp {g}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {subjectsInGrade.map((s) => {
            const meta = getSubjectMeta(s.subject_code, s.subject_name);
            const SubIcon = meta.icon;
            return (
              <Link
                key={s.subject_code}
                href={`/tai-lieu?grade=${selectedGrade}&subject=${s.subject_code}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:border-indigo-300 hover:bg-white hover:shadow-xs"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.badgeBg}`}>
                  <SubIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{s.subject_name}</p>
                  <p className="text-[11px] text-slate-500">{s.lesson_count} bài giảng</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 5. COMMUNITY CALL-TO-ACTION ================= */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 p-8 text-center text-white shadow-lg sm:p-12">
        <Users className="mx-auto h-10 w-10 text-indigo-200" />
        <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          Cùng xây dựng Cộng đồng Học tập &amp; Lập trình Mở
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100">
          Tạo tài khoản miễn phí bằng Email, Google hoặc Facebook — lưu trọn bộ tiến độ code 8 ngôn ngữ, vào lớp học trực tuyến và bảo vệ tài khoản bằng 2FA.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/tai-app"
            className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow hover:bg-emerald-300 transition"
          >
            Tải App Android &amp; iOS tại đây
          </Link>
          <Link
            href="/dang-nhap"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-indigo-700 shadow hover:bg-indigo-50 transition"
          >
            Đăng ký Miễn phí ngay
          </Link>
          <Link
            href="/lap-trinh"
            className="rounded-2xl bg-indigo-950/40 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-indigo-950/60 transition"
          >
            Code thử ngay không cần đăng nhập
          </Link>
        </div>
      </section>
    </div>
  );
}
