"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Code2,
  HeartHandshake,
  Link2,
  MessageCircle,
  Radio,
  ShieldCheck,
  Trophy,
  Unlink,
  UserPlus,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface LinkedChild {
  relation_label: string;
  linked_at: string;
  student: {
    id: string;
    email: string;
    full_name: string;
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
    exam_title: string;
    subject_name: string;
    score: number;
    max_score: number;
    correct_count: number;
    total_questions: number;
    graded_at: string;
  }[];
  certificates: {
    id: string;
    cert_code: string;
    course_title: string;
    subject_name: string;
    issued_at: string;
  }[];
  live_attendance: {
    session_id: string;
    session_title: string;
    classroom_name: string;
    joined_at: string;
  }[];
  classrooms: {
    id: string;
    code: string;
    name: string;
    subject_name: string;
    teacher_id: string;
    teacher_name: string;
  }[];
}

function fmtDate(iso: string) {
  try {
    return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export default function ParentCompanionPage() {
  const { user, accessToken } = useAuth();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [relationLabel, setRelationLabel] = useState("Phụ huynh");
  const [linking, setLinking] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadChildren = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/parent/children`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        setChildren(d.children || []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setLinking(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/parent/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          link_code: linkCode,
          relation_label: relationLabel,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể liên kết mã học sinh");
      } else {
        setLinkCode("");
        showNotice("ok", d.message || "Đã liên kết theo dõi con thành công!");
        void loadChildren();
      }
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!accessToken || !window.confirm(`Hủy liên kết theo dõi học sinh ${studentName}?`)) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/parent/links/${encodeURIComponent(studentId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      showNotice("ok", "Đã hủy liên kết theo dõi.");
      void loadChildren();
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Chế độ Phụ huynh Đồng hành — Theo dõi Con miễn phí 100%
        </h1>
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
          Chỉ cần nhập Mã liên kết từ Học bạ Số của con (VD: <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono font-bold text-amber-800">PH-MINHANH12</code>), bố mẹ có thể theo dõi bảng điểm thi thử, lịch sử điểm danh Lớp Live, tiến độ lập trình, chứng chỉ và trạng thái An toàn học đường của con mỗi ngày.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/dang-nhap"
            className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400"
          >
            Đăng nhập tài khoản Phụ huynh (hoặc dùng Demo) →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Góc Phụ huynh Đồng hành */}
      <section className="rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
              <HeartHandshake className="h-3.5 w-3.5" /> Chế độ Phụ huynh Đồng hành • Miễn phí trọn đời
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Xin chào {user.full_name} — Đồng hành cùng tiến bộ của Con
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Theo dõi trực tiếp điểm thi thử, buổi học Live đã điểm danh, chứng chỉ khóa học, trạng thái an toàn học đường và nhắn tin trao đổi trực tiếp với thầy cô chủ nhiệm.
            </p>
          </div>

          {/* Form nhập mã liên kết thêm Con */}
          <form
            onSubmit={handleLinkChild}
            className="w-full max-w-md space-y-2.5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-xs sm:w-auto sm:min-w-[340px]"
          >
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-200">
              <UserPlus className="h-4 w-4" /> Liên kết thêm Học sinh bằng Mã (VD: PH-MINHANH12)
            </p>
            <div className="grid grid-cols-5 gap-2">
              <input
                required
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                placeholder="PH-MINHANH12"
                className="col-span-3 rounded-xl bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400"
              />
              <select
                value={relationLabel}
                onChange={(e) => setRelationLabel(e.target.value)}
                className="col-span-2 rounded-xl bg-white px-2 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Mẹ">Mẹ</option>
                <option value="Bố">Bố</option>
                <option value="Phụ huynh">Phụ huynh</option>
                <option value="Người giám hộ">Giám hộ</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={linking}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {linking ? "Đang liên kết..." : "Liên kết theo dõi Con ngay"}
            </button>
          </form>
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

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Đang tải hồ sơ học tập của con...</div>
      ) : children.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/40 p-10 text-center space-y-2">
          <p className="text-base font-extrabold text-slate-900">Chưa liên kết học sinh nào</p>
          <p className="text-xs text-slate-600">
            Hãy mở trang <strong>Học bạ Số (/hoc-ba)</strong> trong tài khoản của con để lấy mã <code>PH-...</code> (hoặc thử nhập mã demo <strong>PH-MINHANH12</strong> ở khung phía trên).
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map((ch) => (
            <article
              key={ch.student.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
            >
              {/* Header thông tin 1 học sinh + Trạng thái An toàn Học đường */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white shadow-sm">
                    {ch.student.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">{ch.student.full_name}</h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        Quan hệ: {ch.relation_label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {ch.student.current_grade ? `Lớp ${ch.student.current_grade}` : "Học sinh"}
                      {ch.student.school_name ? ` • ${ch.student.school_name}` : ""} • Mã liên kết:{" "}
                      <strong className="font-mono">{ch.student.parent_link_code}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {ch.summary.safety_alerts_count === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                      <ShieldCheck className="h-4 w-4" /> An toàn Học đường: Tốt 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-1.5 text-xs font-extrabold text-rose-700 ring-1 ring-rose-300">
                      <AlertTriangle className="h-4 w-4" /> Có {ch.summary.safety_alerts_count} cảnh báo an toàn cần lưu ý
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleUnlink(ch.student.id, ch.student.full_name)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Hủy liên kết
                  </button>
                </div>
              </div>

              {/* 4 KPI học tập của con */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-indigo-50/60 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                    <Trophy className="h-4 w-4" /> Điểm TB Thi thử
                  </p>
                  <p className="mt-1 text-2xl font-black text-indigo-800">
                    {ch.summary.avg_exam_score !== null ? `${ch.summary.avg_exam_score.toFixed(2)}đ` : "Chưa thi"}
                  </p>
                  <p className="text-[11px] text-slate-500">{ch.summary.exams_taken} bài thi đã làm</p>
                </div>
                <div className="rounded-2xl bg-sky-50/70 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700">
                    <Radio className="h-4 w-4" /> Điểm danh Lớp Live
                  </p>
                  <p className="mt-1 text-2xl font-black text-sky-800">{ch.summary.live_sessions_attended} buổi</p>
                  <p className="text-[11px] text-slate-500">Đã tham gia đầy đủ</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/70 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                    <Code2 className="h-4 w-4" /> Thực hành Lập trình
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-800">
                    {ch.summary.coding_passed}/{ch.summary.coding_total} bài
                  </p>
                  <p className="text-[11px] text-slate-500">Trên 8 ngôn ngữ</p>
                </div>
                <div className="rounded-2xl bg-amber-50/70 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                    <Award className="h-4 w-4" /> Chứng chỉ Khóa học
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-800">{ch.summary.certificates_count}</p>
                  <p className="text-[11px] text-slate-500">Kèm mã QR xác thực</p>
                </div>
              </div>

              {/* Chi tiết 2 cột: Bảng điểm & Chứng chỉ | Lớp học & Chat với Giáo viên */}
              <div className="grid gap-5 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-7">
                  <h3 className="text-sm font-extrabold text-slate-900">Kết quả Thi thử gần nhất</h3>
                  {ch.exams.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                      Con chưa làm bài thi thử nào gần đây.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ch.exams.slice(0, 5).map((ex) => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{ex.exam_title}</p>
                            <p className="text-[11px] text-slate-500">
                              {ex.subject_name} • Đúng {ex.correct_count}/{ex.total_questions} câu • {fmtDate(ex.graded_at)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-indigo-100 px-2.5 py-1 font-extrabold text-indigo-800">
                            {ex.score.toFixed(2)}/{ex.max_score.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {ch.certificates.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-sm font-extrabold text-slate-900">Chứng chỉ Con đã đạt được</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ch.certificates.map((c) => (
                          <Link
                            key={c.id}
                            href={`/chung-chi?code=${encodeURIComponent(c.cert_code)}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 text-xs hover:bg-amber-100/70 transition"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-extrabold text-slate-900">{c.course_title}</p>
                              <p className="font-mono text-[10px] text-amber-800">{c.cert_code}</p>
                            </div>
                            <Award className="h-4 w-4 shrink-0 text-amber-600" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 lg:col-span-5">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Lớp học &amp; Liên hệ trực tiếp Giáo viên
                  </h3>
                  {ch.classrooms.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                      Con chưa ghi danh vào lớp học trực tuyến nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ch.classrooms.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-900">{cls.name}</p>
                            <p className="text-[11px] text-slate-500">
                              GV: {cls.teacher_name} • {cls.subject_name}
                            </p>
                          </div>
                          {cls.teacher_id && (
                            <Link
                              href={`/tin-nhan?peer=${encodeURIComponent(cls.teacher_id)}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Nhắn GV
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {ch.live_attendance.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-extrabold text-slate-700">Điểm danh Live gần nhất</p>
                      {ch.live_attendance.slice(0, 4).map((att, idx) => (
                        <div
                          key={`${att.session_id}-${idx}`}
                          className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-2 text-[11px]"
                        >
                          <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {att.classroom_name}
                          </span>
                          <span className="text-slate-500">{fmtDate(att.joined_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
