"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Heart,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface ModPost {
  id: string;
  author_name: string;
  author_role: string;
  author_school: string;
  category: string;
  grade_id: number;
  subject_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  status: "published" | "hidden";
  likes_count: number;
  comments_count: number;
  created_at: string;
}

const CAT_LABELS: Record<string, string> = {
  lesson_share: "Chia sẻ Giáo án",
  exam_share: "Đề thi hay",
  teaching_tip: "Mẹo giảng dạy",
  discussion: "Hỏi đáp chuyên môn",
  class_promo: "Mở Lớp Live",
};

export function CommunityModerationPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", msg: string) => void;
}) {
  const [posts, setPosts] = useState<ModPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/social/posts?include_hidden=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts || []);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleModerate = async (post: ModPost, patch: { is_pinned?: boolean; status?: "published" | "hidden" }) => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(post.id)}/moderate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      onToast("ok", "Đã cập nhật trạng thái bài đăng cộng đồng.");
      void loadPosts();
    } else {
      onToast("err", "Không thể cập nhật trạng thái bài đăng.");
    }
  };

  const handleDelete = async (postId: string) => {
    if (!accessToken || !window.confirm("Bạn chắc chắn muốn xóa vĩnh viễn bài viết này?")) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/social/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      onToast("ok", "Đã xóa bài viết khỏi Mạng xã hội Giáo viên.");
      void loadPosts();
    } else {
      onToast("err", "Không thể xóa bài viết.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Kiểm duyệt Mạng Xã Hội Giáo Viên ({posts.length} bài đăng)
          </h2>
          <p className="text-xs text-slate-500">
            Ghim giáo án/đề thi xuất sắc lên đầu bảng tin, tạm ẩn bài không phù hợp hoặc xóa nội dung vi phạm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cong-dong"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            Xem Bảng tin trực tiếp <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Đang tải danh sách bài đăng cộng đồng...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Chưa có bài đăng nào trên Mạng xã hội Giáo viên.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs transition ${
                p.status === "hidden" ? "border-amber-200 bg-amber-50/40" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {p.is_pinned && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-bold text-indigo-700">
                        📌 Đang ghim
                      </span>
                    )}
                    {p.status === "hidden" && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                        Đang tạm ẩn
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                      {CAT_LABELS[p.category] || p.category}
                    </span>
                    <span className="font-semibold text-slate-500">
                      {p.subject_name} {p.grade_id > 0 ? `• Lớp ${p.grade_id}` : "• Cộng đồng"}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{p.title}</h3>
                  <p className="line-clamp-2 text-xs text-slate-600">{p.content}</p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{p.author_name}</span>
                    {p.author_school && <span>• {p.author_school}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-500" /> {p.likes_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-indigo-500" /> {p.comments_count}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleModerate(p, { is_pinned: !p.is_pinned })}
                    className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      p.is_pinned
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    {p.is_pinned ? "Bỏ ghim" : "Ghim đầu trang"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleModerate(p, { status: p.status === "published" ? "hidden" : "published" })
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    {p.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {p.status === "published" ? "Tạm ẩn" : "Hiện lại"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
