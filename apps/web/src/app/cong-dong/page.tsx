"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  Code2,
  CopyPlus,
  FileText,
  Flag,
  GraduationCap,
  Heart,
  Laptop,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  MessageSquarePlus,
  Paperclip,
  Pin,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StudentShowcaseSection } from "@/components/social/StudentShowcaseSection";
import { connectRealtimeChannel } from "@/lib/realtime";
import { isImageFileUrl, resolveFileUrl, uploadRealFile, VerifiedBadge } from "@/components/VerifiedBadge";

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
}

interface SocialPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_school: string;
  author_verified?: boolean;
  category: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  title: string;
  content: string;
  attachment_label: string;
  attachment_url: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  likes_count: number;
  comments_count: number;
  clones_count?: number;
  quality_score?: number;
  is_featured_lesson?: boolean;
  liked_by_me: boolean;
  saved_by_me: boolean;
  following_author: boolean;
  comments: PostComment[];
}

interface FeaturedTeacher {
  id: string;
  full_name: string;
  role: string;
  school_name: string;
  is_verified?: boolean;
  post_count: number;
  follower_count: number;
  classroom_count: number;
  total_clones?: number;
  avg_course_rating?: number;
  reputation_score?: number;
  reputation_tier?: string;
  reputation_label?: string;
  is_following: boolean;
}

interface SocialStats {
  total_posts: number;
  total_teachers: number;
  total_comments: number;
  following_count: number;
  saved_count: number;
  my_posts_count: number;
}

const CATEGORIES = [
  { id: "all", label: "Tất cả chủ đề", badge: "bg-slate-100 text-slate-700", icon: Sparkles },
  { id: "lesson_share", label: "Chia sẻ Giáo án", badge: "bg-blue-50 text-blue-700", icon: BookOpen },
  { id: "exam_share", label: "Đề thi hay", badge: "bg-emerald-50 text-emerald-700", icon: FileText },
  { id: "teaching_tip", label: "Mẹo giảng dạy", badge: "bg-amber-50 text-amber-800", icon: Lightbulb },
  { id: "discussion", label: "Hỏi đáp chuyên môn", badge: "bg-purple-50 text-purple-700", icon: MessageCircle },
  { id: "class_promo", label: "Mở Lớp Live", badge: "bg-rose-50 text-rose-700", icon: Radio },
] as const;

const SUBJECT_OPTIONS = [
  { code: "chung", name: "Liên môn / Chung" },
  { code: "toan", name: "Toán học" },
  { code: "ngu-van", name: "Ngữ văn" },
  { code: "tieng-anh", name: "Tiếng Anh" },
  { code: "vat-ly", name: "Vật lý" },
  { code: "hoa-hoc", name: "Hóa học" },
  { code: "sinh-hoc", name: "Sinh học" },
  { code: "lich-su", name: "Lịch sử" },
  { code: "dia-ly", name: "Địa lý" },
  { code: "tin-hoc", name: "Tin học" },
  { code: "python", name: "Lập trình Python" },
  { code: "javascript", name: "Lập trình JavaScript" },
  { code: "golang", name: "Lập trình Golang" },
];

const QUICK_ATTACHMENTS = [
  { label: "Đính kèm Kho Bài giảng 1–12", url: "/tai-lieu", text: "Mở Kho Bài giảng Lớp 1–12" },
  { label: "Đính kèm Phòng Thi trắc nghiệm", url: "/thi", text: "Vào xem & làm Đề thi thử" },
  { label: "Đính kèm Lớp Live của tôi", url: "/lop-hoc", text: "Vào Lớp học & Phòng Live" },
  { label: "Đính kèm Phòng thực hành Code", url: "/lap-trinh", text: "Thực hành Lập trình trên trình duyệt" },
];

function roleBadge(role: string) {
  if (role === "super_admin" || role === "content_admin") {
    return { label: "Quản trị viên", cls: "bg-rose-100 text-rose-700" };
  }
  if (role === "teacher") {
    return { label: "Giáo viên", cls: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Học sinh", cls: "bg-indigo-100 text-indigo-700" };
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} giờ trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "Gần đây";
  }
}

export default function TeacherSocialPage() {
  const { user, accessToken, isStaff, isAdmin } = useAuth();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [teachers, setTeachers] = useState<FeaturedTeacher[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [spaceTab, setSpaceTab] = useState<"teachers" | "showcase">("teachers");

  // Report modal state
  const [reportTarget, setReportTarget] = useState<SocialPost | null>(null);
  const [reportCategory, setReportCategory] = useState<
    "impersonation" | "low_quality_lesson" | "violence" | "sexual_harassment"
  >("impersonation");
  const [reportReason, setReportReason] = useState("");

  // Clone to My Classroom modal state (Feature #4)
  const [cloneTarget, setCloneTarget] = useState<SocialPost | null>(null);
  const [myClassrooms, setMyClassrooms] = useState<{ id: string; code: string; name: string; subject_name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [cloneDueAt, setCloneDueAt] = useState("");
  const [cloning, setCloning] = useState(false);

  // Filters
  const [feedMode, setFeedMode] = useState<"all" | "following" | "saved" | "mine">("all");
  const [sortMode, setSortMode] = useState<"top" | "latest">("top");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Composer State (Teacher / Admin)
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("lesson_share");
  const [subjectCode, setSubjectCode] = useState("toan");
  const [gradeId, setGradeId] = useState(12);
  const [attachLabel, setAttachLabel] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Comments inline state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  const authHeaders = useCallback((): Record<string, string> => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("feed", feedMode);
      qs.set("sort", sortMode);
      if (selectedCat !== "all") qs.set("category", selectedCat);
      if (selectedSubject !== "all") qs.set("subject", selectedSubject);
      if (searchQuery.trim()) qs.set("q", searchQuery.trim());

      const headers = authHeaders();
      const [pRes, tRes, sRes] = await Promise.all([
        fetch(`${CORE_API_URL}/api/v1/social/posts?${qs.toString()}`, { headers }),
        fetch(`${CORE_API_URL}/api/v1/social/teachers`, { headers }),
        fetch(`${CORE_API_URL}/api/v1/social/stats`, { headers }),
      ]);
      if (pRes.ok) {
        const pd = await pRes.json();
        setPosts(pd.posts || []);
      }
      if (tRes.ok) {
        const td = await tRes.json();
        setTeachers(td.teachers || []);
      }
      if (sRes.ok) {
        setStats(await sRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [feedMode, sortMode, selectedCat, selectedSubject, searchQuery, authHeaders]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Tự động cập nhật bảng tin Mạng xã hội theo thời gian thực qua WebSocket
  useEffect(() => {
    const conn = connectRealtimeChannel("social:feed", accessToken, {
      onEvent: (ev) => {
        if (ev.type === "social_update") {
          void loadAll();
        }
      },
    });
    return () => conn.close();
  }, [accessToken, loadAll]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      showNotice("err", "Vui lòng đăng nhập bằng tài khoản Giáo viên để đăng bài.");
      return;
    }
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`${CORE_API_URL}/api/v1/social/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          content,
          category,
          grade_id: gradeId,
          subject_code: subjectCode,
          attachment_label: attachLabel,
          attachment_url: attachUrl,
          tags,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể đăng bài");
      } else {
        setTitle("");
        setContent("");
        setAttachLabel("");
        setAttachUrl("");
        setTagsInput("");
        setComposerOpen(false);
        showNotice("ok", "Đã đăng bài chia sẻ lên Mạng xã hội Giáo viên!");
        void loadAll();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!accessToken) {
      showNotice("err", "Hãy đăng nhập để thả tim bài chia sẻ của thầy cô.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(postId)}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, liked_by_me: d.liked, likes_count: d.likes_count } : p))
      );
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!accessToken) {
      showNotice("err", "Hãy đăng nhập để lưu bài giảng vào tủ cá nhân.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(postId)}/bookmark`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved_by_me: d.saved } : p)));
      showNotice("ok", d.saved ? "Đã lưu vào Tủ giáo án của bạn!" : "Đã bỏ lưu bài viết.");
    }
  };

  const handleToggleFollow = async (teacherId: string) => {
    if (!accessToken) {
      showNotice("err", "Hãy đăng nhập để theo dõi thầy cô.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/social/teachers/${encodeURIComponent(teacherId)}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId ? { ...t, is_following: d.is_following, follower_count: d.follower_count } : t
        )
      );
      setPosts((prev) =>
        prev.map((p) => (p.author_id === teacherId ? { ...p, following_author: d.is_following } : p))
      );
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!accessToken) {
      showNotice("err", "Hãy đăng nhập để tham gia thảo luận.");
      return;
    }
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    setSendingComment(postId);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const d = await res.json();
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments_count: p.comments_count + 1, comments: [...p.comments, d.comment] }
              : p
          )
        );
      }
    } finally {
      setSendingComment(null);
    }
  };

  const handleTogglePin = async (post: SocialPost) => {
    if (!accessToken || !isAdmin) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(post.id)}/moderate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ is_pinned: !post.is_pinned }),
    });
    if (res.ok) {
      showNotice("ok", post.is_pinned ? "Đã bỏ ghim bài viết." : "Đã ghim bài viết nổi bật lên đầu trang!");
      void loadAll();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!accessToken || !window.confirm("Bạn chắc chắn muốn xóa bài chia sẻ này?")) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showNotice("ok", "Đã xóa bài viết.");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !reportTarget) {
      showNotice("err", "Vui lòng đăng nhập để gửi báo cáo vi phạm.");
      return;
    }
    const res = await fetch(`${CORE_API_URL}/api/v1/safety/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: reportCategory,
        source_type: "teacher_post",
        source_id: reportTarget.id,
        suspect_user_id: reportTarget.author_id,
        suspect_name: reportTarget.author_name,
        reason: reportReason || "Báo cáo vi phạm từ Mạng xã hội Giáo viên",
        content_snapshot: `${reportTarget.title}\n\n${reportTarget.content}`,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      showNotice("ok", d.message || "Đã gửi báo cáo vi phạm cho Quản trị viên!");
      setReportTarget(null);
      setReportReason("");
    } else {
      showNotice("err", d.error || "Không thể gửi báo cáo");
    }
  };

  const openCloneModal = async (post: SocialPost) => {
    if (!accessToken || !isStaff) {
      showNotice("err", "Chỉ tài khoản Giáo viên / Quản trị viên mới có thể nhân bản giáo án & đề thi về lớp học.");
      return;
    }
    setCloneTarget(post);
    setCloneDueAt("");
    setLoadingClasses(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/classrooms/my`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        const list = (d.classrooms || []) as { id: string; code: string; name: string; subject_name: string }[];
        setMyClassrooms(list);
        setSelectedClassId(list[0]?.id || "");
      }
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleConfirmClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !cloneTarget || !selectedClassId) return;
    setCloning(true);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(cloneTarget.id)}/clone-to-class`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            classroom_id: selectedClassId,
            due_at: cloneDueAt.trim(),
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showNotice("err", d.error || "Không thể nhân bản về lớp học");
      } else {
        setPosts((prev) =>
          prev.map((p) => (p.id === cloneTarget.id ? { ...p, clones_count: (p.clones_count || 0) + 1 } : p))
        );
        setCloneTarget(null);
        showNotice("ok", d.message || "Đã nhân bản giáo án / đề thi về lớp của bạn thành công!");
      }
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Banner đầu trang Mạng xã hội Giáo viên */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <Users className="h-3.5 w-3.5" /> Mạng Xã Hội Giáo Viên EduK12
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Kết nối Thầy Cô — Chia sẻ Giáo án, Đề thi &amp; Kinh nghiệm Giảng dạy
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Không gian giao lưu chuyên môn dành riêng cho đội ngũ giáo viên trên toàn quốc: đăng tải giáo án hay, trao đổi đề thi mới, mở lớp Live và lưu nhanh tài liệu vào tủ bài giảng cá nhân.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isStaff ? (
              <>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 transition"
                >
                  <MessageSquarePlus className="h-4 w-4" /> Đăng bài chia sẻ mới
                </button>
                <Link
                  href="/quan-tri"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {isAdmin ? "Trung tâm Quản trị" : "Studio Giảng dạy"}
                </Link>
              </>
            ) : user ? (
              <Link
                href="/lop-hoc"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-xs font-bold text-white shadow hover:bg-indigo-400 transition"
              >
                <GraduationCap className="h-4 w-4" /> Về Lớp học của em
              </Link>
            ) : (
              <Link
                href="/dang-nhap"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-extrabold text-slate-900 shadow hover:bg-slate-100 transition"
              >
                Đăng nhập Giáo viên / Học sinh →
              </Link>
            )}
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold shadow-xs ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Chuyển đổi nhanh 2 Không gian: Bảng tin Giáo viên <-> Bài viết & Sản phẩm Học sinh */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSpaceTab("teachers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              spaceTab === "teachers"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="h-4 w-4" /> Bảng tin Giáo viên (Giáo án &amp; Đề thi)
          </button>
          <button
            type="button"
            onClick={() => setSpaceTab("showcase")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              spaceTab === "showcase"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Laptop className="h-4 w-4" /> Sản phẩm Phần mềm &amp; Bài viết Học sinh
          </button>
        </div>

        <Link
          href="/tin-nhan"
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" /> Chat trực tuyến Thầy Cô ↔ Học sinh
        </Link>
      </div>

      {/* Modal Báo cáo Vi phạm (Mạo danh / Giáo án kém / Quấy rối / Bạo lực) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="text-base font-extrabold text-rose-700">
                Báo cáo vi phạm về cho Quản trị viên
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Đối tượng: <strong>{reportTarget.author_name}</strong> — &quot;{reportTarget.title}&quot;
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Loại vi phạm</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as typeof reportCategory)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                <option value="impersonation">Mạo danh Giáo viên / Lừa đảo thu tiền</option>
                <option value="low_quality_lesson">Giáo án cũ lạc hậu / Kém chất lượng</option>
                <option value="sexual_harassment">Quấy rối tình dục / Nội dung nhạy cảm (Khẩn cấp)</option>
                <option value="violence">Bạo lực / Đe dọa / Bắt nạt học đường (Khẩn cấp)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Mô tả chi tiết để Admin xử lý</label>
              <textarea
                required
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Nêu rõ dấu hiệu mạo danh, giáo án sai chương trình hoặc hành vi vi phạm..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                Gửi cảnh báo khẩn cho Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Nhân bản Giáo án / Đề thi về Lớp học của tôi */}
      {cloneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmClone}
            className="w-full max-w-md rounded-2xl border border-indigo-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700">
                <CopyPlus className="h-3 w-3" /> Nhân bản nhanh về Lớp giảng dạy
              </span>
              <h3 className="mt-2 text-base font-extrabold text-slate-900">
                Nhân bản Giáo án / Đề thi về Lớp của tôi
              </h3>
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                Nguồn: <strong>{cloneTarget.title}</strong> (Tác giả: {cloneTarget.author_name})
              </p>
            </div>

            {loadingClasses ? (
              <p className="py-4 text-center text-xs text-slate-500">Đang tải danh sách lớp học của bạn...</p>
            ) : myClassrooms.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
                <p className="font-bold">Bạn chưa có lớp học nào để nhân bản vào.</p>
                <p>Hãy vào Studio Giảng dạy tạo lớp học đầu tiên trước khi nhân bản tài liệu nhé!</p>
                <Link
                  href="/quan-tri"
                  onClick={() => setCloneTarget(null)}
                  className="inline-block rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500"
                >
                  Mở Studio tạo Lớp học →
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Chọn lớp học nhận tài liệu</label>
                  <select
                    required
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800"
                  >
                    {myClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) — {c.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Hạn hoàn thành giao học sinh (tùy chọn)</label>
                  <input
                    type="date"
                    value={cloneDueAt}
                    onChange={(e) => setCloneDueAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link
                href="/lop-hoc"
                onClick={() => setCloneTarget(null)}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Xem các lớp của tôi →
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCloneTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Hủy
                </button>
                {myClassrooms.length > 0 && (
                  <button
                    type="submit"
                    disabled={cloning}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <CopyPlus className="h-3.5 w-3.5" />
                    {cloning ? "Đang nhân bản..." : "Xác nhận Nhân bản"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {spaceTab === "showcase" ? (
        <StudentShowcaseSection onNotice={showNotice} />
      ) : (
      /* Bố cục 3 cột chuẩn Mạng xã hội Giáo viên */
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* === CỘT TRÁI: HỒ SƠ CÁ NHÂN + BỘ LỌC BẢNG TIN === */}
        <aside className="space-y-4 lg:col-span-3 lg:sticky lg:top-20">
          {/* Thẻ Hồ sơ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-base font-extrabold text-white shadow-sm">
                    {user.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-900">{user.full_name}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadge(user.role).cls}`}>
                      {roleBadge(user.role).label}
                    </span>
                  </div>
                </div>
                {user.school_name && (
                  <p className="text-[11px] font-medium text-slate-500">{user.school_name}</p>
                )}
                {isStaff && (
                  <Link
                    href={`/giao-vien?id=${encodeURIComponent(user.id)}`}
                    className="block rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-[11px] font-extrabold text-sky-700 hover:bg-sky-100 transition"
                  >
                    Tường Hồ sơ &amp; Tích xanh của tôi →
                  </Link>
                )}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{stats?.my_posts_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Bài viết</p>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-indigo-600">{stats?.following_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Theo dõi</p>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-emerald-600">{stats?.saved_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Đã lưu</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm font-extrabold text-slate-900">Tham gia Cộng đồng Giáo viên</p>
                <p className="text-xs text-slate-500">
                  Đăng nhập để chia sẻ giáo án, lưu đề thi hay và theo dõi các thầy cô cùng chuyên môn.
                </p>
                <Link
                  href="/dang-nhap"
                  className="block rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Đăng nhập / Đăng ký miễn phí
                </Link>
              </div>
            )}
          </div>

          {/* Bộ lọc dòng thời gian */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Bảng tin của bạn
            </p>
            {[
              { id: "all", label: "Khám phá mới nhất", icon: Sparkles },
              { id: "following", label: "Thầy cô đang theo dõi", icon: UserCheck },
              { id: "saved", label: "Tủ Giáo án đã lưu", icon: Bookmark },
              ...(isStaff ? [{ id: "mine", label: "Bài chia sẻ của tôi", icon: FileText }] : []),
            ].map((item) => {
              const Icon = item.icon;
              const active = feedMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFeedMode(item.id as typeof feedMode)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Chuyên mục chia sẻ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Chuyên mục
            </p>
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = selectedCat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* === CỘT GIỮA: KHUNG ĐĂNG BÀI + BẢNG TIN CHÍNH === */}
        <section className="space-y-4 lg:col-span-6">
          {/* Thanh tìm kiếm & Lọc môn */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm giáo án, đề thi, tên thầy cô..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả môn học</option>
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSortMode("top")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition ${
                  sortMode === "top" ? "bg-amber-400 text-slate-950 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Star className="h-3 w-3 fill-current" /> Giáo án Chuẩn
              </button>
              <button
                type="button"
                onClick={() => setSortMode("latest")}
                className={`rounded-lg px-2.5 py-1.5 transition ${
                  sortMode === "latest" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mới nhất
              </button>
            </div>
          </div>

          {/* Khung Đăng bài dành riêng cho Giáo viên & Admin */}
          {isStaff ? (
            <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-xs">
              {!composerOpen ? (
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">
                    {user?.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-100 transition">
                    Thầy/Cô {user?.full_name} muốn chia sẻ giáo án, đề thi hay kinh nghiệm giảng dạy nào hôm nay?
                  </div>
                </button>
              ) : (
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Tạo bài chia sẻ lên Mạng xã hội Giáo viên
                    </h2>
                    <button
                      type="button"
                      onClick={() => setComposerOpen(false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                    >
                      Thu gọn
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
                    >
                      {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={gradeId}
                      onChange={(e) => setGradeId(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
                    >
                      <option value={0}>Chung / Lập trình</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>
                          Lớp {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tiêu đề ngắn gọn (VD: Chia sẻ bộ đề ôn tập giữa kỳ 1 Toán 12 có lời giải chi tiết)"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus:border-indigo-500 focus:outline-none"
                  />

                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Viết nội dung chia sẻ, kinh nghiệm đứng lớp, mã lớp học hoặc câu hỏi thảo luận cùng đồng nghiệp..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
                  />

                  {/* Gắn nhanh tài nguyên hoặc Upload tệp PDF / Word / Slide / Ảnh thật */}
                  <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-slate-600">
                        Đính kèm tệp học liệu thật (PDF, Word, Slide, Ảnh ≤ 5MB) hoặc lối tắt:
                      </p>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-xs hover:bg-emerald-500 transition">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingFile ? "Đang tải tệp lên..." : "Tải tệp từ máy tính"}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f || !accessToken) return;
                            setUploadingFile(true);
                            const up = await uploadRealFile(f, accessToken, "teacher_post");
                            setUploadingFile(false);
                            if (up.ok && up.data) {
                              setAttachLabel(up.data.filename);
                              setAttachUrl(up.data.url);
                              showNotice("ok", `Đã tải lên tệp: ${up.data.filename}`);
                            } else {
                              showNotice("err", up.error || "Không thể tải tệp lên");
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_ATTACHMENTS.map((qa) => (
                        <button
                          key={qa.url}
                          type="button"
                          onClick={() => {
                            setAttachLabel(qa.text);
                            setAttachUrl(qa.url);
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                            attachUrl === qa.url
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          + {qa.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={attachLabel}
                        onChange={(e) => setAttachLabel(e.target.value)}
                        placeholder="Tên nút đính kèm (VD: Vào lớp TOAN12-A1)"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                      />
                      <input
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                        placeholder="Đường dẫn (VD: /thi hoặc https://...)"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Thẻ chủ đề cách nhau dấu phẩy (VD: Toán 12, Đề thi, Ôn tập)"
                      className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submitting ? "Đang đăng..." : "Đăng lên Cộng đồng"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 text-xs text-indigo-900">
              <div className="space-y-0.5">
                <p className="font-extrabold">Góc Chia sẻ chuyên môn từ đội ngũ Thầy Cô</p>
                <p className="text-[11px] text-indigo-700">
                  Học sinh có thể theo dõi thầy cô yêu thích, thả tim, lưu tài liệu hay và đặt câu hỏi ngay dưới bài viết.
                </p>
              </div>
              {!user && (
                <Link
                  href="/dang-nhap"
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          )}

          {/* Danh sách Bài đăng */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Đang tải bảng tin Mạng xã hội Giáo viên...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-800">Chưa có bài viết nào phù hợp bộ lọc này</p>
              <p className="text-xs text-slate-500">
                Thử chuyển sang mục &quot;Khám phá mới nhất&quot; hoặc chọn môn học khác nhé!
              </p>
              <button
                type="button"
                onClick={() => {
                  setFeedMode("all");
                  setSelectedCat("all");
                  setSelectedSubject("all");
                  setSearchQuery("");
                }}
                className="mt-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                Xem tất cả bài viết
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const catInfo = CATEGORIES.find((c) => c.id === post.category) || CATEGORIES[1];
                const authorBadge = roleBadge(post.author_role);
                const isOwn = user?.id === post.author_id;
                const isCmtOpen = Boolean(expandedComments[post.id]);

                return (
                  <article
                    key={post.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs space-y-3.5 transition ${
                      post.is_pinned ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
                    }`}
                  >
                    {/* Header tác giả */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-emerald-600 text-sm font-extrabold text-white">
                          {post.author_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/giao-vien?id=${encodeURIComponent(post.author_id)}`}
                              className="truncate text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                            >
                              {post.author_name}
                            </Link>
                            {post.author_verified && <VerifiedBadge />}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${authorBadge.cls}`}>
                              {authorBadge.label}
                            </span>
                            {post.is_pinned && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                <Pin className="h-2.5 w-2.5" /> Ghim nổi bật
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {post.author_school ? `${post.author_school} • ` : ""}
                            {formatTime(post.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isOwn && (
                          <>
                            <Link
                              href={`/tin-nhan?peer=${encodeURIComponent(post.author_id)}`}
                              title="Nhắn tin trực tuyến với thầy/cô"
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <MessageCircle className="h-3 w-3" /> Nhắn tin
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleToggleFollow(post.author_id)}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                                post.following_author
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              }`}
                            >
                              {post.following_author ? (
                                <>
                                  <UserCheck className="h-3 w-3" /> Đang theo dõi
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3" /> Theo dõi
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReportTarget(post);
                                setReportCategory("low_quality_lesson");
                              }}
                              title="Báo cáo mạo danh / giáo án kém / vi phạm"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void handleTogglePin(post)}
                            title={post.is_pinned ? "Bỏ ghim" : "Ghim bài nổi bật"}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(isOwn || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => void handleDeletePost(post.id)}
                            title="Xóa bài viết"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Phân loại + Môn học */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`rounded-full px-2.5 py-0.5 font-bold ${catInfo.badge}`}>
                        {catInfo.label}
                      </span>
                      {post.is_featured_lesson && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-800 ring-1 ring-amber-300">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Giáo án Chuẩn ({post.quality_score}đ)
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                        {post.subject_name}
                      </span>
                      {post.grade_id > 0 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                          Lớp {post.grade_id}
                        </span>
                      )}
                      {post.tags.map((t) => (
                        <span key={t} className="text-indigo-600 font-semibold">
                          #{t.replace(/\s+/g, "")}
                        </span>
                      ))}
                    </div>

                    {/* Nội dung */}
                    <div className="space-y-2">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">{post.title}</h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {post.content}
                      </p>
                    </div>

                    {/* Đính kèm học liệu / Tệp thật PDF, Word, Slide, Ảnh */}
                    {post.attachment_url && (
                      post.attachment_url.startsWith("/api/v1/files/") && isImageFileUrl(post.attachment_url) ? (
                        <a
                          href={resolveFileUrl(post.attachment_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveFileUrl(post.attachment_url)}
                            alt={post.attachment_label || post.title}
                            className="max-h-80 w-full object-contain bg-slate-950/5"
                          />
                        </a>
                      ) : post.attachment_url.startsWith("/api/v1/files/") ? (
                        <a
                          href={resolveFileUrl(post.attachment_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="truncate">Tệp đính kèm: {post.attachment_label || "Tài liệu học tập"}</span>
                          </span>
                          <span className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] text-white">
                            Mở / Tải về
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={post.attachment_url}
                          className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition"
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                            {post.attachment_label || "Mở tài nguyên đính kèm"}
                          </span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </Link>
                      )
                    )}

                    {/* Thanh tương tác */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            post.liked_by_me
                              ? "bg-rose-50 text-rose-600"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-rose-500 text-rose-500" : ""}`} />
                          <span>Hữu ích ({post.likes_count})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>Thảo luận ({post.comments_count})</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => void openCloneModal(post)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition"
                            title="Nhân bản bài giảng / đề thi này vào danh sách bài tập lớp bạn đang dạy"
                          >
                            <CopyPlus className="h-3.5 w-3.5" />
                            <span>
                              Nhân bản về Lớp tôi{post.clones_count ? ` (${post.clones_count})` : ""}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggleBookmark(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            post.saved_by_me
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${post.saved_by_me ? "fill-emerald-600 text-emerald-600" : ""}`} />
                          <span>{post.saved_by_me ? "Đã lưu" : "Lưu giáo án"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Khu vực Bình luận */}
                    {(isCmtOpen || post.comments.length > 0) && (
                      <div className="space-y-2.5 rounded-xl bg-slate-50 p-3.5">
                        {post.comments.map((c) => {
                          const cb = roleBadge(c.user_role);
                          return (
                            <div key={c.id} className="flex gap-2.5 text-xs">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                                {c.user_name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{c.user_name}</span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cb.cls}`}>
                                    {cb.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{formatTime(c.created_at)}</span>
                                </div>
                                <p className="mt-1 text-slate-700 leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          );
                        })}

                        {user && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              value={commentDrafts[post.id] || ""}
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void handleSendComment(post.id);
                                }
                              }}
                              placeholder="Viết bình luận trao đổi chuyên môn hoặc đặt câu hỏi..."
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={sendingComment === post.id}
                              onClick={() => void handleSendComment(post.id)}
                              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                              Gửi
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* === CỘT PHẢI: GIÁO VIÊN NỔI BẬT + LỐI TẮT NHANH === */}
        <aside className="space-y-4 lg:col-span-3 lg:sticky lg:top-20">
          {/* Danh sách Giáo viên nổi bật */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Bảng Xếp Hạng Giáo Viên Uy Tín
              </h2>
              <span className="text-[11px] font-bold text-indigo-600">
                {stats?.total_teachers ?? teachers.length} thầy cô
              </span>
            </div>

            <div className="space-y-3">
              {teachers.slice(0, 6).map((t, idx) => {
                const isMe = user?.id === t.id;
                return (
                  <div key={t.id} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-700">
                        {t.full_name.slice(0, 1).toUpperCase()}
                        <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-950">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/giao-vien?id=${encodeURIComponent(t.id)}`}
                          className="flex items-center gap-1 truncate text-xs font-bold text-slate-900 hover:text-indigo-600"
                        >
                          <span className="truncate">{t.full_name}</span>
                          {t.is_verified && <VerifiedBadge />}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          {t.reputation_label && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800 ring-1 ring-amber-200">
                              {t.reputation_label} • {t.reputation_score ?? 0}đ
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {t.post_count} bài • {t.follower_count} theo dõi{t.total_clones ? ` • ${t.total_clones} nhân bản` : ""}
                        </p>
                      </div>
                    </div>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => void handleToggleFollow(t.id)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                          t.is_following
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-indigo-600 text-white hover:bg-indigo-500"
                        }`}
                      >
                        {t.is_following ? "Đang theo dõi" : "+ Theo dõi"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lối tắt Nghiệp vụ theo Vai trò */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              {isStaff ? "Công cụ Giảng dạy" : "Lối tắt Học tập"}
            </h2>
            {isStaff ? (
              <div className="space-y-1.5">
                <Link
                  href="/quan-tri"
                  className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                  <span>{isAdmin ? "Trung tâm Quản trị Admin" : "Mở Studio Giảng dạy"}</span>
                </Link>
                <Link
                  href="/lop-hoc"
                  className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                >
                  <Radio className="h-4 w-4 text-rose-600" />
                  <span>Phòng học Live &amp; Điểm danh</span>
                </Link>
                <Link
                  href="/tai-lieu"
                  className="flex items-center gap-2.5 rounded-xl bg-indigo-50 p-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>Kho Tài liệu Lớp 1–12</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Link
                  href="/lop-hoc"
                  className="flex items-center gap-2.5 rounded-xl bg-indigo-50 p-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  <Radio className="h-4 w-4 text-indigo-600" />
                  <span>Vào Lớp học &amp; Lớp Live</span>
                </Link>
                <Link
                  href="/thi"
                  className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Làm Đề thi Trắc nghiệm</span>
                </Link>
                <Link
                  href="/lap-trinh"
                  className="flex items-center gap-2.5 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  <Code2 className="h-4 w-4 text-slate-700" />
                  <span>Thực hành Lập trình</span>
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}
