"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  Code2,
  Copy,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Laptop,
  Printer,
  Radio,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface PortfolioData {
  student: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    current_grade: number | null;
    school_name: string;
    parent_link_code: string;
  };
  summary: {
    exams_taken: number;
    avg_exam_score: number | null;
    coding_passed: number;
    coding_total: number;
    certificates_count: number;
    projects_count: number;
    live_sessions_attended: number;
    safety_alerts_count: number;
  };
  exams: {
    id: string;
    exam_id: string;
    exam_title: string;
    subject_name: string;
    grade_id: number;
    score: number;
    max_score: number;
    correct_count: number;
    total_questions: number;
    duration_sec: number;
    graded_at: string;
  }[];
  coding_tracks: {
    id: string;
    name: string;
    passed: number;
    total: number;
    percent: number;
  }[];
  courses: {
    course_id: string;
    title: string;
    subject_name: string;
    done_count: number;
    total_count: number;
    percent: number;
  }[];
  certificates: {
    id: string;
    cert_code: string;
    course_title: string;
    subject_name: string;
    teacher_name: string;
    issued_at: string;
  }[];
  projects: {
    id: string;
    title: string;
    submission_type: string;
    subject_name: string;
    avg_score: number | null;
    reviews: { teacher_name: string; score: number; badge: string; feedback: string }[];
    created_at: string;
  }[];
  live_attendance: {
    session_id: string;
    session_title: string;
    classroom_name: string;
    joined_at: string;
  }[];
}

function fmtDate(iso: string) {
  try {
    return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export default function DigitalPortfolioPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${CORE_API_URL}/api/v1/portfolio/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Học bạ Số &amp; Hồ sơ Năng lực Học sinh</h1>
        <p className="text-xs leading-relaxed text-slate-600">
          Đăng nhập tài khoản Học sinh để xem trọn bộ bảng điểm thi thử, kỹ năng lập trình 8 ngôn ngữ, tủ chứng chỉ QR, sản phẩm phần mềm được thầy cô chấm điểm và lấy Mã liên kết cho Phụ huynh.
        </p>
        <Link
          href="/dang-nhap"
          className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500"
        >
          Đăng nhập xem Học bạ Số →
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="p-10 text-center text-sm text-slate-500">Đang tổng hợp Học bạ Số &amp; Hồ sơ Năng lực...</div>;
  }

  const copyParentCode = () => {
    navigator.clipboard.writeText(data.student.parent_link_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Học bạ Số */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-2xl font-black text-white shadow-lg">
              {data.student.full_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Học bạ Số &amp; Hồ sơ Năng lực Owlie Edu
              </span>
              <h1 className="text-2xl font-extrabold sm:text-3xl">{data.student.full_name}</h1>
              <p className="text-xs text-slate-300">
                {data.student.current_grade ? `Lớp ${data.student.current_grade}` : "Học viên Owlie Edu"}
                {data.student.school_name ? ` • ${data.student.school_name}` : ""} • {data.student.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mã liên kết Phụ huynh */}
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur-xs">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <HeartHandshake className="h-3.5 w-3.5" /> Mã Liên kết Phụ huynh (Miễn phí)
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="font-mono text-base font-black tracking-wider text-white">
                  {data.student.parent_link_code}
                </code>
                <button
                  type="button"
                  onClick={copyParentCode}
                  className="print:hidden inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
                >
                  {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedCode ? "Đã copy" : "Copy"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-xs font-extrabold text-slate-900 shadow hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" /> In Học bạ (PDF)
            </button>
          </div>
        </div>
      </section>

      {/* 4 Thẻ chỉ số Năng lực cốt lõi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase">Điểm TB Thi thử</span>
            <Trophy className="h-5 w-5" />
          </div>
          <p className="mt-2 text-3xl font-black text-indigo-700">
            {data.summary.avg_exam_score !== null ? `${data.summary.avg_exam_score.toFixed(2)}đ` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">{data.summary.exams_taken} lượt thi đã chấm điểm</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase">Thực hành Lập trình</span>
            <Code2 className="h-5 w-5" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-700">
            {data.summary.coding_passed} / {data.summary.coding_total}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">Bài tập code hoàn thành trên 8 ngôn ngữ</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase">Chứng chỉ Khóa học</span>
            <Award className="h-5 w-5" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-700">{data.summary.certificates_count}</p>
          <p className="mt-1 text-[11px] text-slate-600">Chứng chỉ điện tử kèm mã QR xác thực</p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-bold uppercase">Sản phẩm &amp; Lớp Live</span>
            <Radio className="h-5 w-5" />
          </div>
          <p className="mt-2 text-3xl font-black text-sky-700">
            {data.summary.projects_count} SP • {data.summary.live_sessions_attended} Live
          </p>
          <p className="mt-1 text-[11px] text-slate-600">Dự án phần mềm &amp; buổi điểm danh trực tiếp</p>
        </div>
      </div>

      {/* Hàng 1: Lịch sử Điểm thi + Tủ Chứng chỉ */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Trophy className="h-4 w-4 text-indigo-600" /> Bảng điểm Thi thử &amp; Kiểm tra
            </h2>
            <Link href="/thi" className="print:hidden text-xs font-bold text-indigo-600 hover:underline">
              Vào thi thêm →
            </Link>
          </div>

          {data.exams.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              Chưa có bài thi nào được chấm. Hãy thử sức tại Phòng Thi Trắc nghiệm nhé!
            </p>
          ) : (
            <div className="space-y-3">
              {data.exams.map((ex) => {
                const pct = ex.max_score > 0 ? Math.min(100, Math.round((ex.score / ex.max_score) * 100)) : 0;
                return (
                  <div key={ex.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">{ex.exam_title}</p>
                        <p className="text-[11px] text-slate-500">
                          {ex.subject_name} • Đúng {ex.correct_count}/{ex.total_questions} câu • {fmtDate(ex.graded_at)}
                        </p>
                      </div>
                      <span
                        className={`rounded-xl px-3 py-1 text-sm font-black ${
                          pct >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : pct >= 50
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {ex.score.toFixed(2)} / {ex.max_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Award className="h-4 w-4 text-amber-500" /> Chứng chỉ đã đạt được
            </h2>
            <Link href="/chung-chi" className="print:hidden text-xs font-bold text-amber-700 hover:underline">
              Mở Cổng Chứng chỉ →
            </Link>
          </div>

          {data.certificates.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              Chưa có chứng chỉ nào. Hoàn thành 100% một khóa học tại mục Khóa học để nhận Chứng chỉ PDF + QR!
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.certificates.map((c) => (
                <Link
                  key={c.id}
                  href={`/chung-chi?code=${encodeURIComponent(c.cert_code)}`}
                  className="block rounded-2xl border border-amber-200 bg-amber-50/50 p-4 hover:bg-amber-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                      {c.subject_name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-700">{c.cert_code}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-extrabold text-slate-900">{c.course_title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    GV: {c.teacher_name} • Cấp ngày {fmtDate(c.issued_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hàng 2: Hồ sơ Kỹ năng 8 Ngôn ngữ Lập trình */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <Code2 className="h-4 w-4 text-emerald-600" /> Bản đồ Kỹ năng 8 Ngôn ngữ Lập trình
          </h2>
          <Link href="/lap-trinh" className="print:hidden text-xs font-bold text-emerald-700 hover:underline">
            Luyện Code thêm →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.coding_tracks.map((tr) => (
            <div key={tr.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                <span>{tr.name}</span>
                <span className="text-emerald-700">
                  {tr.passed}/{tr.total} ({tr.percent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${tr.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hàng 3: Sản phẩm Phần mềm + Tiến độ Khóa học & Điểm danh Live */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Laptop className="h-4 w-4 text-indigo-600" /> Sản phẩm Phần mềm &amp; Đánh giá Thầy Cô
            </h2>
            <Link href="/cong-dong" className="print:hidden text-xs font-bold text-indigo-600 hover:underline">
              Đăng sản phẩm mới →
            </Link>
          </div>

          {data.projects.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-xs text-slate-500">
              Chưa đăng sản phẩm phần mềm nào. Hãy chia sẻ dự án đầu tay tại Góc Sản phẩm Học sinh để thầy cô góp ý!
            </p>
          ) : (
            <div className="space-y-3">
              {data.projects.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-slate-900">{p.title}</p>
                    {p.avg_score !== null && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                        {p.avg_score}/10đ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {p.subject_name} • {fmtDate(p.created_at)}
                  </p>
                  {p.reviews.map((r, i) => (
                    <p key={i} className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-700 ring-1 ring-slate-200/70">
                      <strong>{r.teacher_name}</strong> ({r.score}/10 — {r.badge}): {r.feedback}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <GraduationCap className="h-4 w-4 text-sky-600" /> Tiến độ Khóa học &amp; Điểm danh Live
          </h2>

          {data.courses.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-extrabold uppercase text-slate-400">Khóa học đang theo học</p>
              {data.courses.map((c) => (
                <div key={c.course_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-indigo-700">{c.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase text-slate-400">
              Lịch sử Điểm danh Lớp Live ({data.live_attendance.length} buổi)
            </p>
            {data.live_attendance.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Chưa có lịch sử điểm danh buổi học trực tiếp.
              </p>
            ) : (
              <div className="space-y-1.5">
                {data.live_attendance.map((att, idx) => (
                  <div
                    key={`${att.session_id}-${idx}`}
                    className="flex items-center justify-between rounded-xl bg-sky-50/60 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                      {att.classroom_name || "Lớp Live"} — {att.session_title || "Buổi học trực tuyến"}
                    </span>
                    <span className="text-[11px] text-slate-500">{fmtDate(att.joined_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
