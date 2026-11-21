"use client";

import { BadgeCheck } from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      title="Giáo viên Đã Xác Thực Chính Thức (Tích xanh)"
      className="inline-flex items-center gap-0.5 text-sky-500"
    >
      <BadgeCheck className={`${cls} fill-sky-500 text-white`} />
    </span>
  );
}

export function isImageFileUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url);
}

export function resolveFileUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${CORE_API_URL}${url}`;
}

export interface UploadedFileResult {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_image: boolean;
}

export async function uploadRealFile(
  file: File,
  accessToken: string,
  purpose = "general"
): Promise<{ ok: boolean; data?: UploadedFileResult; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  try {
    const res = await fetch(`${CORE_API_URL}/api/v1/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: fd,
    });
    const d = await res.json();
    if (!res.ok) return { ok: false, error: d.error || "Không thể tải tệp lên" };
    return { ok: true, data: d as UploadedFileResult };
  } catch {
    return { ok: false, error: "Lỗi kết nối khi tải tệp lên" };
  }
}
