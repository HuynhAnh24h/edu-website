"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  MessageSquare,
  Pin,
  Radio,
  Send,
  StopCircle,
  Tv,
  Users,
  Video,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

export interface LiveSessionInfo {
  id: string;
  classroom_id: string;
  title: string;
  mode: "webrtc" | "youtube" | "stream_url";
  room_slug: string;
  stream_url: string;
  status: "live" | "ended";
  pinned_note: string;
  host_id: string;
  host_name: string;
  started_at: string;
  ended_at?: string;
  attendance_count?: number;
  locked?: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  is_pinned: boolean;
  created_at: string;
}

interface AttendanceItem {
  user_id: string;
  user_name: string;
  user_email: string;
  joined_at: string;
  last_seen_at: string;
  is_online: boolean;
}

interface AssignmentShortcut {
  id: string;
  item_type: "lesson" | "exam";
  item_id: string;
  item_title: string;
}

interface Props {
  classroomId: string;
  classroomName: string;
  accessToken: string | null;
  userName: string;
  isHost?: boolean;
  assignments?: AssignmentShortcut[];
  onOpenLesson?: (lessonId: string) => void;
  onSessionEnded?: () => void;
  onNotify?: (type: "ok" | "err", msg: string) => void;
}

function extractYouTubeEmbed(rawUrl: string): string | null {
  const s = rawUrl.trim();
  if (!s) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && m[1]) {
      return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1`;
    }
  }
  return null;
}

function formatTimeHHMM(isoLike?: string): string {
  if (!isoLike) return "";
  try {
    const d = new Date(isoLike.includes("T") ? isoLike : isoLike.replace(" ", "T") + "Z");
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function LiveClassroomStudio({
  classroomId,
  classroomName,
  accessToken,
  userName,
  isHost = false,
  assignments = [],
  onOpenLesson,
  onSessionEnded,
  onNotify,
}: Props) {
  const [session, setSession] = useState<LiveSessionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [rightTab, setRightTab] = useState<"chat" | "attendance">("chat");
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [webrtcServer, setWebrtcServer] = useState<"ffmuc" | "jitsi">("ffmuc");
  const [noteDraft, setNoteDraft] = useState("");
  const [copiedAttendance, setCopiedAttendance] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef(0);

  const fetchLiveState = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/classrooms/${encodeURIComponent(classroomId)}/live`,
        { headers }
      );
      if (!res.ok) return;
      const d = await res.json();
      setSession(d.session || null);
      setMessages(d.messages || []);
      setAttendance(d.attendance || []);
      setOnlineCount(Number(d.online_count || 0));
      if (d.session && !noteDraft && d.session.pinned_note) {
        setNoteDraft(d.session.pinned_note);
      }
    } finally {
      setLoading(false);
    }
  }, [classroomId, accessToken, noteDraft]);

  const sendCheckin = useCallback(async () => {
    if (!accessToken) return;
    await fetch(
      `${CORE_API_URL}/api/v1/classrooms/${encodeURIComponent(classroomId)}/live/checkin`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ).catch(() => {});
  }, [classroomId, accessToken]);

  useEffect(() => {
    void sendCheckin().then(() => fetchLiveState());
    const pollTimer = setInterval(() => void fetchLiveState(), 3000);
    const heartbeatTimer = setInterval(() => void sendCheckin(), 25000);
    return () => {
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    };
  }, [fetchLiveState, sendCheckin]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !accessToken || !session) return;
    setSending(true);
    try {
      const res = await fetch(
        `${CORE_API_URL}/api/v1/classrooms/${encodeURIComponent(classroomId)}/live/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message: chatInput.trim(), session_id: session.id }),
        }
      );
      if (res.ok) {
        setChatInput("");
        void fetchLiveState();
      } else {
        const d = await res.json().catch(() => ({}));
        onNotify?.("err", d.error || "Không thể gửi tin nhắn");
      }
    } finally {
      setSending(false);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    if (!isHost || !accessToken || !session) return;
    await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(classroomId)}/live/${encodeURIComponent(
        session.id
      )}/messages/${encodeURIComponent(msgId)}/pin`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    void fetchLiveState();
  };

  const handleUpdatePinnedNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost || !accessToken || !session) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(classroomId)}/live/${encodeURIComponent(
        session.id
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pinned_note: noteDraft }),
      }
    );
    if (res.ok) {
      onNotify?.("ok", "Đã cập nhật thông báo ghim cho cả lớp!");
      void fetchLiveState();
    }
  };

  const handleEndLive = async () => {
    if (!isHost || !accessToken || !session) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/cms/classrooms/${encodeURIComponent(classroomId)}/live/${encodeURIComponent(
        session.id
      )}/end`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      onNotify?.("ok", "Đã kết thúc buổi học trực tuyến & lưu danh sách điểm danh!");
      setSession(null);
      onSessionEnded?.();
    }
  };

  const copyAttendanceList = () => {
    const lines = attendance.map(
      (a, i) => `${i + 1}. ${a.user_name} (${a.user_email}) — Vào lúc ${formatTimeHHMM(a.joined_at)}`
    );
    navigator.clipboard.writeText(
      `ĐIỂM DANH LỚP: ${classroomName}\nBuổi học: ${session?.title || ""}\nTổng sĩ số: ${attendance.length}\n\n${lines.join("\n")}`
    );
    setCopiedAttendance(true);
    setTimeout(() => setCopiedAttendance(false), 2500);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Đang kết nối Phòng học Trực tuyến &amp; Điểm danh tự động...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Radio className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-900">
          Hiện chưa có buổi phát trực tuyến nào đang diễn ra
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Khi giáo viên bấm &quot;Phát Trực Tiếp&quot;, màn hình video và phòng chat sẽ tự động mở tại đây.
        </p>
      </div>
    );
  }

  if (session.locked) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <Radio className="mx-auto h-8 w-8 animate-pulse text-rose-500" />
        <h3 className="mt-2 text-base font-bold text-slate-900">
          Lớp đang phát trực tuyến: {session.title}
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Bạn cần đăng ký tham gia lớp học này để mở luồng video, trò chuyện Live và điểm danh.
        </p>
      </div>
    );
  }

  // Tạo URL trình phát tương ứng từng chế độ
  const encodedName = encodeURIComponent(userName || "Thành viên EduK12");
  const jitsiDomain = webrtcServer === "ffmuc" ? "meet.ffmuc.net" : "meet.jit.si";
  const webrtcUrl = `https://${jitsiDomain}/${encodeURIComponent(
    session.room_slug
  )}#userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=${
    isHost ? "false" : "true"
  }`;

  const ytEmbedUrl = session.mode === "youtube" ? extractYouTubeEmbed(session.stream_url) : null;
  const isDirectVideoFile =
    session.mode === "stream_url" &&
    /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(session.stream_url.trim());

  const pinnedMsg = messages.find((m) => m.is_pinned);
  const lessonShortcuts = assignments.filter((a) => a.item_type === "lesson");
  const examShortcuts = assignments.filter((a) => a.item_type === "exam");

  return (
    <div className="space-y-4">
      {/* Thanh trạng thái đầu Phòng Live */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 px-5 py-3.5 text-white shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            TRỰC TIẾP
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">{session.title}</h2>
            <p className="truncate text-[11px] text-slate-400">
              {session.host_name} •{" "}
              {session.mode === "webrtc"
                ? "Phòng Video Tương tác 2 chiều"
                : session.mode === "youtube"
                  ? "Livestream YouTube / OBS"
                  : "Luồng phát trực tiếp (Stream URL)"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
            <Users className="h-3.5 w-3.5" />
            {Math.max(onlineCount, 1)} đang học • {attendance.length} điểm danh
          </span>
          {session.mode === "webrtc" && (
            <a
              href={webrtcUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20"
            >
              Mở tab rộng <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {isHost && (
            <button
              type="button"
              onClick={() => void handleEndLive()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition"
            >
              <StopCircle className="h-3.5 w-3.5" /> Kết thúc Live
            </button>
          )}
        </div>
      </div>

      {/* Thông báo ghim của giáo viên */}
      {session.pinned_note && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-900">
          <Pin className="h-4 w-4 shrink-0 text-indigo-600" />
          <span>
            <strong>Thông báo giáo viên:</strong> {session.pinned_note}
          </span>
        </div>
      )}

      {/* Bố cục chính: Video Stage (8 cột) + Live Chat & Điểm danh (4 cột) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* CỘT TRÁI: MÀN HÌNH VIDEO / LIVESTREAM */}
        <div className="space-y-4 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg">
            <div className="relative aspect-video w-full">
              {session.mode === "webrtc" ? (
                <iframe
                  key={webrtcUrl}
                  src={webrtcUrl}
                  title={session.title}
                  allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : session.mode === "youtube" ? (
                ytEmbedUrl ? (
                  <iframe
                    src={ytEmbedUrl}
                    title={session.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-300">
                    <Tv className="h-10 w-10 text-rose-400" />
                    <p className="mt-2 text-sm font-bold">Link YouTube chưa đúng định dạng</p>
                    <a
                      href={session.stream_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs text-indigo-400 underline"
                    >
                      Mở trực tiếp: {session.stream_url}
                    </a>
                  </div>
                )
              ) : isDirectVideoFile ? (
                <video
                  src={session.stream_url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full bg-black"
                />
              ) : (
                <iframe
                  src={session.stream_url}
                  title={session.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}
            </div>

            {/* Thanh chuyển server WebRTC dự phòng */}
            {session.mode === "webrtc" && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-emerald-400" />
                  Bật Camera / Mic / Chia sẻ màn hình Slide trực tiếp trên trình duyệt (Miễn phí 0đ)
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Máy chủ:</span>
                  <button
                    type="button"
                    onClick={() => setWebrtcServer("ffmuc")}
                    className={`rounded-md px-2 py-0.5 font-bold ${
                      webrtcServer === "ffmuc"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Open Jitsi (Không cần đăng nhập)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebrtcServer("jitsi")}
                    className={`rounded-md px-2 py-0.5 font-bold ${
                      webrtcServer === "jitsi"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Jitsi Dự phòng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Điều khiển nhanh cho Giáo viên ngay dưới video */}
          {isHost && (
            <form
              onSubmit={handleUpdatePinnedNote}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs"
            >
              <Pin className="h-4 w-4 shrink-0 text-indigo-600" />
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ghim thông báo trên màn hình học sinh (VD: Mở Bài 1 & làm kiểm tra lúc 20:30)..."
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Ghim thông báo
              </button>
            </form>
          )}

          {/* Học liệu & Bài kiểm tra gắn liền buổi Live */}
          {(lessonShortcuts.length > 0 || examShortcuts.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {lessonShortcuts.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
                    <BookOpen className="h-3.5 w-3.5" /> Giáo án buổi học ({lessonShortcuts.length})
                  </h4>
                  <div className="mt-2.5 space-y-1.5">
                    {lessonShortcuts.slice(0, 4).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onOpenLesson?.(l.item_id)}
                        className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition"
                      >
                        <span className="truncate">{l.item_title}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {examShortcuts.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Làm Bài kiểm tra ngay ({examShortcuts.length})
                  </h4>
                  <div className="mt-2.5 space-y-1.5">
                    {examShortcuts.slice(0, 4).map((ex) => (
                      <Link
                        key={ex.id}
                        href={`/thi/phong-thi?id=${encodeURIComponent(ex.item_id)}`}
                        target="_blank"
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-600 hover:text-white transition"
                      >
                        <span className="truncate">{ex.item_title}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: LIVE CHAT THỜI GIAN THỰC + ĐIỂM DANH TỰ ĐỘNG */}
        <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs lg:col-span-4">
          {/* Tabs Chat / Điểm danh */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1.5">
            <button
              type="button"
              onClick={() => setRightTab("chat")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                rightTab === "chat"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Live Chat ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setRightTab("attendance")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                rightTab === "attendance"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Điểm danh ({attendance.length})
            </button>
          </div>

          {rightTab === "chat" ? (
            <>
              {pinnedMsg && (
                <div className="border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700">
                    <Pin className="h-3 w-3" /> Tin nhắn đã ghim • {pinnedMsg.user_name}
                  </div>
                  <p className="mt-0.5 font-medium text-slate-800">{pinnedMsg.message}</p>
                </div>
              )}

              <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400">
                    <MessageSquare className="h-7 w-7 text-slate-300" />
                    <p className="mt-2">Hãy gửi lời chào hoặc đặt câu hỏi bài học tại đây!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isTeacherMsg = ["teacher", "content_admin", "super_admin"].includes(
                      m.user_role
                    );
                    return (
                      <div
                        key={m.id}
                        className={`group rounded-xl p-2.5 text-xs ${
                          isTeacherMsg
                            ? "border border-indigo-200 bg-indigo-50/70"
                            : "bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-bold text-slate-900">{m.user_name}</span>
                            {isTeacherMsg && (
                              <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                Giáo viên
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {formatTimeHHMM(m.created_at)}
                            </span>
                            {isHost && (
                              <button
                                type="button"
                                onClick={() => void handleTogglePin(m.id)}
                                title={m.is_pinned ? "Bỏ ghim" : "Ghim câu hỏi này"}
                                className={`rounded p-0.5 transition ${
                                  m.is_pinned
                                    ? "text-amber-600"
                                    : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-indigo-600"
                                }`}
                              >
                                <Pin className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-700 leading-relaxed">
                          {m.message}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleSendChat}
                className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-2.5"
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc bình luận..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !chatInput.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-40"
                  aria-label="Gửi tin nhắn"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/50 px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-emerald-800">
                  Đã điểm danh tự động: <strong>{attendance.length}</strong> người
                </span>
                {isHost && attendance.length > 0 && (
                  <button
                    type="button"
                    onClick={copyAttendanceList}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                  >
                    {copiedAttendance ? (
                      <>
                        <Check className="h-3 w-3" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Chép danh sách
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-3">
                {attendance.map((a) => (
                  <div key={a.user_id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          a.is_online ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={a.is_online ? "Đang xem trực tiếp" : "Đã rời phòng"}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{a.user_name}</p>
                        <p className="truncate text-[10px] text-slate-400">{a.user_email}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Vào {formatTimeHHMM(a.joined_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
