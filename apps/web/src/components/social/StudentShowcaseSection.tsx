"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Code2,
  ExternalLink,
  Laptop,
  MessageCircle,
  Plus,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { connectRealtimeChannel } from "@/lib/realtime";

interface SubmissionReview {
  id: string;
  submission_id: string;
  teacher_id: string;
  teacher_name: string;
  score: number;
  badge: string;
  feedback: string;
  created_at: string;
}

interface StudentSubmission {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_school: string;
  submission_type: "software_project" | "student_article";
  subject_name: string;
  title: string;
  description: string;
  demo_url: string;
  repo_url: string;
  tech_stack: string;
  created_at: string;
  reviews: SubmissionReview[];
  review_count: number;
  avg_score: number | null;
}

const BADGE_OPTIONS = ["Xuất sắc", "Rất tốt", "Khá", "Đáng khích lệ", "Cần cải thiện"];

export function StudentShowcaseSection({
  onNotice,
}: {
  onNotice: (type: "ok" | "err", msg: string) => void;
}) {
  const { user, accessToken, isStaff, isAdmin } = useAuth();
  const [items, setItems] = useState<StudentSubmission[]>([]);
  const [filterType, setFilterType] = useState<"all" | "software_project" | "student_article">("all");
  const [loading, setLoading] = useState(true);

  // Student submit form
  const [formOpen, setFormOpen] = useState(false);
  const [subType, setSubType] = useState<"software_project" | "student_article">("software_project");
  const [subjectName, setSubjectName] = useState("Tin học / Lập trình");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Teacher review form per submission
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [revScore, setRevScore] = useState<number>(9.5);
  const [revBadge, setRevBadge] = useState<string>("Xuất sắc");
  const [revFeedback, setRevFeedback] = useState<string>("");
  const [savingReview, setSavingReview] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/showcase?type=${filterType}`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.submissions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const conn = connectRealtimeChannel("social:feed", accessToken, {
      onEvent: (ev) => {
        if (ev.type === "showcase_update") {
          void loadItems();
        }
      },
    });
    return () => conn.close();
  }, [accessToken, loadItems]);

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      onNotice("err", "Vui lòng đăng nhập để đăng bài viết hoặc sản phẩm phần mềm.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/showcase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          submission_type: subType,
          subject_name: subjectName,
          title,
          description,
          demo_url: demoUrl,
          repo_url: repoUrl,
          tech_stack: techStack,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        onNotice("err", d.error || "Không thể đăng sản phẩm");
      } else {
        setTitle("");
        setDescription("");
        setDemoUrl("");
        setRepoUrl("");
        setTechStack("");
        setFormOpen(false);
        onNotice("ok", d.message || "Đã đăng sản phẩm thành công!");
        void loadItems();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent, submissionId: string) => {
    e.preventDefault();
    if (!accessToken || !isStaff) return;
    setSavingReview(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/showcase/${encodeURIComponent(submissionId)}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          score: revScore,
          badge: revBadge,
          feedback: revFeedback,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        onNotice("err", d.error || "Không thể gửi đánh giá");
      } else {
        setReviewingId(null);
        setRevFeedback("");
        onNotice("ok", d.message || "Đã gửi đánh giá & chấm điểm tới học sinh!");
        void loadItems();
      }
    } finally {
      setSavingReview(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken || !window.confirm("Bạn muốn xóa bài viết / sản phẩm này?")) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/showcase/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      onNotice("ok", "Đã xóa sản phẩm.");
      void loadItems();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Nút đăng sản phẩm cho học sinh */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5 shadow-xs">
        <div className="space-y-1 max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <Laptop className="h-5 w-5 text-indigo-600" />
            Góc Bài viết &amp; Sản phẩm Phần mềm Học sinh — Thầy Cô Xem &amp; Đánh giá
          </h2>
          <p className="text-xs text-slate-600">
            Học sinh đăng bài viết học thuật, sản phẩm web/app hoặc dự án KHKT. Giáo viên trực tiếp vào xem, chấm điểm (thang 10) và viết nhận xét góp ý chuyên môn!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 transition"
            >
              <Plus className="h-4 w-4" /> Đăng Bài viết / Sản phẩm
            </button>
          ) : (
            <Link
              href="/dang-nhap"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
            >
              Đăng nhập để đăng sản phẩm
            </Link>
          )}
        </div>
      </div>

      {/* Form Học sinh đăng bài viết / sản phẩm phần mềm */}
      {formOpen && user && (
        <form
          onSubmit={handleSubmitProject}
          className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Gửi Bài viết hoặc Sản phẩm Phần mềm để Thầy Cô Đánh giá
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Loại sản phẩm</label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value as typeof subType)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
              >
                <option value="software_project">💻 Sản phẩm Phần mềm / Ứng dụng / Website</option>
                <option value="student_article">📝 Bài viết học tập / Nghiên cứu / Tổng hợp kiến thức</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600">Môn học / Lĩnh vực</label>
              <input
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="VD: Tin học / Lập trình, Toán 12, Vật lý..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên sản phẩm phần mềm hoặc tiêu đề bài viết của em..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus:border-indigo-500 focus:outline-none"
          />

          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ý tưởng, tính năng chính hoặc nội dung bài viết và những điểm em mong thầy cô góp ý..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
          />

          <div className="grid gap-2.5 sm:grid-cols-3">
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="Công nghệ / Chủ đề (VD: HTML, JS, Python)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="Link chạy thử Demo (https://... tùy chọn)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Link mã nguồn GitHub (tùy chọn)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Đang gửi..." : "Đăng cho Thầy Cô xem & đánh giá"}
            </button>
          </div>
        </form>
      )}

      {/* Bộ lọc loại bài */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "Tất cả sản phẩm & bài viết" },
          { id: "software_project", label: "💻 Sản phẩm Phần mềm" },
          { id: "student_article", label: "📝 Bài viết Học thuật" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterType(f.id as typeof filterType)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              filterType === f.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Danh sách Sản phẩm & Đánh giá từ Giáo viên */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Đang tải danh sách bài viết &amp; sản phẩm học sinh...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Chưa có sản phẩm nào trong mục này.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => {
            const isProject = item.submission_type === "software_project";
            const canDelete = user?.id === item.student_id || isAdmin;

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  {/* Header Học sinh & Điểm trung bình */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
                        {item.student_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-slate-900">{item.student_name}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          Lớp {item.student_grade} {item.student_school ? `• ${item.student_school}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.avg_score !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {item.avg_score}/10
                        </span>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nhãn loại + Môn */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                        isProject ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isProject ? <Code2 className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                      {isProject ? "Sản phẩm Phần mềm" : "Bài viết Học sinh"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                      {item.subject_name}
                    </span>
                    {item.tech_stack && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {item.tech_stack}
                      </span>
                    )}
                  </div>

                  {/* Nội dung sản phẩm */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{item.title}</h3>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  {/* Links Demo / Source / Chat hỏi trực tiếp */}
                  <div className="flex flex-wrap gap-2">
                    {item.demo_url && (
                      <Link
                        href={item.demo_url}
                        target={item.demo_url.startsWith("http") ? "_blank" : undefined}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        Xem Demo <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {item.repo_url && (
                      <a
                        href={item.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Mã nguồn <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {user && user.id !== item.student_id && (
                      <Link
                        href={`/tin-nhan?peer=${encodeURIComponent(item.student_id)}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-3 w-3" /> Nhắn tin góp ý
                      </Link>
                    )}
                  </div>
                </div>

                {/* Khu vực Đánh giá từ Giáo viên */}
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      Đánh giá của Thầy Cô ({item.review_count})
                    </p>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewingId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
                      >
                        {reviewingId === item.id ? "Đóng form chấm" : "Chấm điểm & Đánh giá"}
                      </button>
                    )}
                  </div>

                  {/* Form Giáo viên chấm điểm */}
                  {isStaff && reviewingId === item.id && (
                    <form
                      onSubmit={(e) => void handleSubmitReview(e, item.id)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-900">
                            Điểm số (1 – 10)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min={1}
                            max={10}
                            required
                            value={revScore}
                            onChange={(e) => setRevScore(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-900">Xếp loại</label>
                          <select
                            value={revBadge}
                            onChange={(e) => setRevBadge(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                          >
                            {BADGE_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={revFeedback}
                        onChange={(e) => setRevFeedback(e.target.value)}
                        placeholder="Viết nhận xét chuyên môn, khen ngợi ưu điểm và gợi ý cải thiện cho học sinh..."
                        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={savingReview}
                        className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {savingReview ? "Đang gửi đánh giá..." : "Gửi Đánh giá & Thông báo cho Học sinh"}
                      </button>
                    </form>
                  )}

                  {/* Danh sách nhận xét đã có */}
                  {item.reviews.length === 0 ? (
                    <p className="text-[11px] italic text-slate-400">
                      Đang chờ thầy cô xem và gửi đánh giá đầu tiên...
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {item.reviews.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 text-xs space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-extrabold text-slate-900">{r.teacher_name}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                              {r.score}/10 • {r.badge}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{r.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
