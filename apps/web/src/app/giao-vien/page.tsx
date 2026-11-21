"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Edit3,
  FileText,
  Flag,
  GraduationCap,
  MessageCircle,
  Paperclip,
  School,
  Star,
  Upload,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { isImageFileUrl, resolveFileUrl, uploadRealFile, VerifiedBadge } from "@/components/VerifiedBadge";

interface TeacherProfilePayload {
  teacher: {
    id: string;
    full_name: string;
    role: string;
    school_name: string;
    created_at: string;
    is_active: boolean;
    is_verified: boolean;
    verification_status: string;
    specialty: string;
    bio: string;
    years_exp: number;
    verified_at: string | null;
    admin_review_note: string;
    proof_file_url: string;
  };
  stats: {
    follower_count: number;
    post_count: number;
    course_count: number;
    avg_rating: number;
    review_count: number;
    is_following: boolean;
  };
  posts: {
    id: string;
    category: string;
    grade_id: number;
    subject_name: string;
    title: string;
    content: string;
    attachment_label: string;
    attachment_url: string;
    tags: string[];
    is_pinned: boolean;
    created_at: string;
  }[];
  courses: {
    id: string;
    title: string;
    subject_name: string;
    grade_label: string;
    cover_theme: string;
    summary: string;
    lesson_count: number;
  }[];
  reviews: {
    id: string;
    course_id: string;
    course_title: string;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }[];
}

function TeacherProfileInner() {
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuth();
  const targetId = searchParams.get("id") || user?.id || "u-teacher-1";

  const [data, setData] = useState<TeacherProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "courses" | "reviews">("posts");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Edit profile / Verification modal states
  const [editOpen, setEditOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [yearsExp, setYearsExp] = useState(3);
  const [bio, setBio] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofName, setProofName] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/teachers/${encodeURIComponent(targetId)}/profile`,
        { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
      );
      if (res.ok) {
        const d = (await res.json()) as TeacherProfilePayload;
        setData(d);
        setSpecialty(d.teacher.specialty || "");
        setSchoolName(d.teacher.school_name || "");
        setYearsExp(d.teacher.years_exp || 1);
        setBio(d.teacher.bio || "");
        setProofUrl(d.teacher.proof_file_url || "");
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [targetId, accessToken]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!accessToken || !data) {
      showNotice("err", "Vui lòng đăng nhập để theo dõi giáo viên.");
      return;
    }
    const res = await fetch(
      `${CORE_API_URL}/api/v1/social/teachers/${encodeURIComponent(data.teacher.id)}/follow`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const r = await res.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              stats: { ...prev.stats, is_following: r.is_following, follower_count: r.follower_count },
            }
          : prev
      );
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/teachers/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          specialty,
          school_name: schoolName,
          years_exp: yearsExp,
          bio,
        }),
      });
      const d = await res.json();
      if (!res.ok) showNotice("err", d.error || "Không thể lưu hồ sơ");
      else {
        setEditOpen(false);
        showNotice("ok", d.message || "Đã cập nhật hồ sơ giáo viên!");
        void loadProfile();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadProof = async (file: File) => {
    if (!accessToken) return;
    setUploading(true);
    const res = await uploadRealFile(file, accessToken, "teacher_verification");
    setUploading(false);
    if (res.ok && res.data) {
      setProofUrl(res.data.url);
      setProofName(res.data.filename);
      showNotice("ok", `Đã tải lên minh chứng: ${res.data.filename}`);
    } else {
      showNotice("err", res.error || "Không thể tải tệp lên");
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/teachers/verification/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          specialty,
          school_name: schoolName,
          years_exp: yearsExp,
          bio,
          proof_file_url: proofUrl,
          proof_note: proofNote,
        }),
      });
      const d = await res.json();
      if (!res.ok) showNotice("err", d.error || "Không thể gửi yêu cầu xác minh");
      else {
        setVerifyOpen(false);
        showNotice("ok", d.message || "Đã gửi hồ sơ xin cấp Tích xanh cho Admin!");
        void loadProfile();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReportImpersonation = async () => {
    if (!accessToken || !data) {
      showNotice("err", "Vui lòng đăng nhập để báo cáo mạo danh.");
      return;
    }
    const reason = window.prompt(
      `Nhập lý do nghi ngờ tài khoản "${data.teacher.full_name}" mạo danh giáo viên:`
    );
    if (!reason || !reason.trim()) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/safety/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: "impersonation",
        source_type: "teacher_profile",
        source_id: data.teacher.id,
        suspect_user_id: data.teacher.id,
        suspect_name: data.teacher.full_name,
        reason: reason.trim(),
        content_snapshot: `Hồ sơ giáo viên: ${data.teacher.full_name} (${data.teacher.school_name})`,
      }),
    });
    const d = await res.json();
    if (res.ok) showNotice("ok", d.message || "Đã gửi báo cáo mạo danh về cho Admin!");
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
        Đang tải tường hồ sơ cá nhân giáo viên...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ giáo viên này.</p>
        <Link href="/cong-dong" className="text-xs font-bold text-indigo-600 hover:underline">
          ← Quay lại Mạng Xã Hội Giáo Viên
        </Link>
      </div>
    );
  }

  const { teacher, stats, posts, courses, reviews } = data;
  const isOwner = user?.id === teacher.id;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/cong-dong"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Về Mạng Xã Hội Giáo Viên
        </Link>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice.msg}</span>
        </div>
      )}

      {/* === BANNER HỒ SƠ CÁ NHÂN GIÁO VIÊN (TEACHER PROFILE WALL) === */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Ảnh bìa */}
        <div className="h-32 bg-gradient-to-r from-slate-900 via-indigo-900 to-emerald-900 sm:h-40" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-emerald-600 to-indigo-600 text-3xl font-extrabold text-white shadow-lg">
                {teacher.full_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {teacher.full_name}
                  </h1>
                  {teacher.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-extrabold text-sky-700 ring-1 ring-sky-200">
                      <VerifiedBadge /> Giáo viên Xác thực
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {teacher.verification_status === "pending" ? "Đang chờ duyệt Tích xanh" : "Chưa xác minh Tích xanh"}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <School className="h-3.5 w-3.5 text-indigo-500" /> {teacher.school_name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> {teacher.specialty} • {teacher.years_exp} năm KN
                  </span>
                </div>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditOpen((v) => !v);
                      setVerifyOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa Hồ sơ
                  </button>
                  {!teacher.is_verified && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyOpen((v) => !v);
                        setEditOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-sky-500"
                    >
                      <BadgeCheck className="h-4 w-4" /> Xin cấp Tích xanh Giáo viên
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleFollow()}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                      stats.is_following
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-indigo-600 text-white shadow hover:bg-indigo-500"
                    }`}
                  >
                    {stats.is_following ? (
                      <>
                        <UserCheck className="h-4 w-4" /> Đang theo dõi
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Theo dõi Thầy/Cô
                      </>
                    )}
                  </button>
                  <Link
                    href={`/tin-nhan?peer=${encodeURIComponent(teacher.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" /> Nhắn tin trực tuyến
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleReportImpersonation()}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Flag className="h-3.5 w-3.5" /> Báo cáo mạo danh
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700">{teacher.bio}</p>

          {/* 4 chỉ số nổi bật */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3.5 text-center">
              <p className="text-xl font-extrabold text-slate-900">{stats.follower_count}</p>
              <p className="text-[11px] font-semibold text-slate-500">Người theo dõi</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3.5 text-center">
              <p className="text-xl font-extrabold text-indigo-600">{stats.post_count}</p>
              <p className="text-[11px] font-semibold text-slate-500">Giáo án &amp; Bài chia sẻ</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3.5 text-center">
              <p className="text-xl font-extrabold text-emerald-600">{stats.course_count}</p>
              <p className="text-[11px] font-semibold text-slate-500">Khóa học đang dạy</p>
            </div>
            <div className="rounded-2xl bg-amber-50/70 p-3.5 text-center">
              <p className="flex items-center justify-center gap-1 text-xl font-extrabold text-amber-700">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : "5.0"}
              </p>
              <p className="text-[11px] font-semibold text-amber-800">{stats.review_count} đánh giá học viên</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Chỉnh sửa Hồ sơ (chủ hồ sơ) */}
      {editOpen && isOwner && (
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900">Cập nhật Hồ sơ Giảng dạy</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Trường / Đơn vị công tác"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Môn chuyên trách (VD: Toán 12)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value))}
              placeholder="Số năm kinh nghiệm"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Giới thiệu phương pháp giảng dạy & thành tích nổi bật..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white">
              {saving ? "Đang lưu..." : "Lưu Hồ sơ"}
            </button>
          </div>
        </form>
      )}

      {/* Form Xin cấp Tích xanh Giáo viên (có Upload ảnh thẻ giáo viên thật!) */}
      {verifyOpen && isOwner && (
        <form onSubmit={handleSubmitVerification} className="rounded-2xl border border-sky-300 bg-sky-50/50 p-5 shadow-xs space-y-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-sky-950">
              <BadgeCheck className="h-5 w-5 text-sky-600" /> Gửi Hồ sơ Xác minh Tích xanh Giáo viên
            </h2>
            <p className="mt-0.5 text-xs text-sky-800">
              Tải ảnh chụp Thẻ Giáo viên, Giấy xác nhận công tác hoặc Bằng sư phạm (PDF/PNG/JPG ≤ 5 MB). Chỉ Quản trị viên mới xem được tài liệu này để duyệt Tích xanh.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Tên trường đang giảng dạy"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs"
            />
            <input
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Bộ môn phụ trách (VD: Toán THPT)"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-700 ring-1 ring-sky-300 hover:bg-sky-50">
              <Upload className="h-4 w-4" />
              {uploading ? "Đang tải tệp lên..." : "Tải ảnh Thẻ Giáo viên / PDF minh chứng"}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadProof(f);
                }}
              />
            </label>
            {proofUrl && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <Paperclip className="h-3.5 w-3.5" /> {proofName || "Đã đính kèm minh chứng"}
              </span>
            )}
          </div>

          <textarea
            rows={2}
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
            placeholder="Ghi chú thêm cho Quản trị viên (VD: Email công vụ trường, số năm công tác...)"
            className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs"
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setVerifyOpen(false)} className="rounded-xl bg-white px-4 py-2 text-xs font-semibold ring-1 ring-slate-200">
              Đóng
            </button>
            <button type="submit" disabled={saving || uploading} className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-extrabold text-white shadow hover:bg-sky-500">
              {saving ? "Đang gửi..." : "Gửi Admin duyệt Tích xanh"}
            </button>
          </div>
        </form>
      )}

      {/* 3 Tab nội dung tường cá nhân */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "posts", label: `Bài chia sẻ & Giáo án (${posts.length})`, icon: BookOpen },
          { id: "courses", label: `Khóa học (${courses.length})`, icon: GraduationCap },
          { id: "reviews", label: `Đánh giá Học viên (${reviews.length})`, icon: Award },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Bài chia sẻ & Giáo án */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Giáo viên chưa đăng bài chia sẻ nào.
            </div>
          ) : (
            posts.map((p) => {
              const fileFull = resolveFileUrl(p.attachment_url);
              const isFileApi = p.attachment_url.startsWith("/api/v1/files/");
              return (
                <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-bold text-indigo-700">{p.subject_name}</span>
                    {p.grade_id > 0 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">Lớp {p.grade_id}</span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{p.title}</h3>
                  <p className="whitespace-pre-line text-sm text-slate-700">{p.content}</p>
                  {p.attachment_url && (
                    isFileApi && isImageFileUrl(p.attachment_url) ? (
                      <a href={fileFull} target="_blank" rel="noreferrer" className="block pt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fileFull} alt={p.attachment_label || p.title} className="max-h-72 rounded-xl border border-slate-200" />
                      </a>
                    ) : isFileApi ? (
                      <a
                        href={fileFull}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <FileText className="h-4 w-4" /> Tải tệp đính kèm: {p.attachment_label || "Tài liệu học tập"} <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link
                        href={p.attachment_url}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                      >
                        <BookOpen className="h-4 w-4" /> {p.attachment_label || "Mở tài nguyên"} <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    )
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Khóa học đang dạy */}
      {activeTab === "courses" && (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Giáo viên chưa xuất bản khóa học nào.
            </div>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700">{c.subject_name}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">{c.grade_label}</span>
                  <span className="text-slate-400">• {c.lesson_count} bài học</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{c.title}</h3>
                <p className="line-clamp-2 text-xs text-slate-600">{c.summary}</p>
                <Link
                  href="/khoa-hoc"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:underline"
                >
                  Vào học &amp; Đánh giá 5★ →
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Đánh giá 5 sao từ Học viên */}
      {activeTab === "reviews" && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Chưa có đánh giá nào từ học viên.
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-slate-900">{r.user_name}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-900">
                    {"★".repeat(Math.round(r.rating))} ({r.rating}.0/5.0)
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-indigo-600">Khóa học: {r.course_title}</p>
                <p className="text-xs leading-relaxed text-slate-700">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TeacherProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang mở hồ sơ giáo viên...</div>}>
      <TeacherProfileInner />
    </Suspense>
  );
}
