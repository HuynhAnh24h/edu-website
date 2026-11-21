"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Flag,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { connectRealtimeChannel, RealtimeHandle } from "@/lib/realtime";
import { isImageFileUrl, resolveFileUrl, uploadRealFile, VerifiedBadge } from "@/components/VerifiedBadge";

interface ChatContact {
  id: string;
  full_name: string;
  role: string;
  school_name: string;
  current_grade: number | null;
  is_verified?: boolean;
  last_message: string;
  last_at: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  receiver_name: string;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  is_flagged: number;
  is_blocked: number;
  created_at: string;
}

function roleLabel(role: string) {
  if (role === "super_admin" || role === "content_admin") {
    return { text: "Quản trị viên", cls: "bg-rose-100 text-rose-700" };
  }
  if (role === "teacher") {
    return { text: "Giáo viên", cls: "bg-emerald-100 text-emerald-700" };
  }
  return { text: "Học sinh", cls: "bg-indigo-100 text-indigo-700" };
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const initialPeer = searchParams.get("peer") || "";
  const { user, accessToken } = useAuth();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialPeer);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [searchText, setSearchText] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingChatFile, setUploadingChatFile] = useState(false);
  const [botWarning, setBotWarning] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCat, setReportCat] = useState<"sexual_harassment" | "violence" | "impersonation">("impersonation");
  const [reportReason, setReportReason] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTypingName, setPeerTypingName] = useState("");
  const wsRef = useRef<RealtimeHandle | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadContacts = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/chat/contacts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      const list = (d.contacts || []) as ChatContact[];
      setContacts(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(initialPeer && list.some((c) => c.id === initialPeer) ? initialPeer : list[0].id);
      }
    }
  }, [accessToken, selectedId, initialPeer]);

  const loadMessages = useCallback(async () => {
    if (!accessToken || !selectedId) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/chat/messages?peer_id=${encodeURIComponent(selectedId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages || []);
    }
  }, [accessToken, selectedId]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    void loadMessages();
    setPeerOnline(false);
    setPeerTypingName("");
    if (!accessToken || !selectedId || !user) return;

    const roomKey = [user.id, selectedId].sort().join("__");
    const conn = connectRealtimeChannel(`chat:${roomKey}`, accessToken, {
      onStatus: setWsConnected,
      onEvent: (ev) => {
        if (ev.type === "chat_message" && ev.message) {
          const incoming = ev.message as DirectMessage;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          setPeerTypingName("");
          void loadContacts();
        } else if (ev.type === "presence" && Array.isArray(ev.online)) {
          const onlineIds = (ev.online as { uid: string }[]).map((o) => o.uid);
          setPeerOnline(onlineIds.includes(selectedId));
        } else if (ev.type === "typing") {
          if (ev.is_typing) {
            setPeerTypingName(String(ev.name || "Đang nhập"));
          } else {
            setPeerTypingName("");
          }
        }
      },
    });
    wsRef.current = conn;
    return () => {
      conn.close();
      wsRef.current = null;
    };
  }, [accessToken, selectedId, user, loadMessages, loadContacts]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const selectedContact = contacts.find((c) => c.id === selectedId) || null;

  const filteredContacts = contacts.filter((c) =>
    `${c.full_name} ${c.school_name}`.toLowerCase().includes(searchText.trim().toLowerCase())
  );

  const sendMessagePayload = async (
    text: string,
    attachment?: { url: string; name: string }
  ) => {
    if (!accessToken || !selectedId) return;
    setSending(true);
    setBotWarning("");
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receiver_id: selectedId,
          content: text,
          attachment_url: attachment?.url || "",
          attachment_name: attachment?.name || "",
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setBotWarning(d.error || "Không thể gửi tin nhắn.");
      } else {
        setDraft("");
        if (d.warning) {
          setBotWarning(d.warning);
        }
        void loadMessages();
        void loadContacts();
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await sendMessagePayload(draft.trim());
  };

  const handleChatFileUpload = async (file: File) => {
    if (!accessToken || !selectedId) return;
    setUploadingChatFile(true);
    const up = await uploadRealFile(file, accessToken, "direct_chat");
    setUploadingChatFile(false);
    if (up.ok && up.data) {
      await sendMessagePayload(draft.trim() || `Gửi tệp đính kèm: ${up.data.filename}`, {
        url: up.data.url,
        name: up.data.filename,
      });
    } else {
      setBotWarning(up.error || "Không thể tải tệp lên");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedContact) return;
    const latestSnapshot = messages
      .slice(-6)
      .map((m) => `${m.sender_name}: ${m.content}`)
      .join("\n");

    const res = await fetch(`${CORE_API_URL}/api/v1/safety/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: reportCat,
        source_type: "direct_chat",
        source_id: selectedContact.id,
        suspect_user_id: selectedContact.id,
        suspect_name: selectedContact.full_name,
        reason: reportReason || "Báo cáo khẩn từ khung chat trực tuyến",
        content_snapshot: latestSnapshot || "(Báo cáo trực tiếp từ cuộc trò chuyện)",
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setReportMsg(d.message || "Đã gửi báo cáo khẩn tới Quản trị viên!");
      setReportReason("");
      setReportOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Chat Trực tuyến Học sinh &amp; Giáo viên</h1>
        <p className="text-xs leading-relaxed text-slate-600">
          Đăng nhập để nhắn tin hỏi bài trực tiếp với thầy cô, trao đổi về sản phẩm phần mềm hoặc lịch học Live — được bảo vệ 24/7 bởi BOT Quét An toàn.
        </p>
        <Link
          href="/dang-nhap"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow hover:bg-indigo-500"
        >
          Đăng nhập ngay →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Banner trạng thái bảo vệ BOT */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-extrabold">Phòng Chat Học tập An toàn — BOT Quét 24/7 đang hoạt động</p>
            <p className="text-[11px] text-emerald-800">
              Hệ thống tự động phát hiện &amp; chặn ngay các hành vi bạo lực, quấy rối tình dục, mạo danh giáo viên và gửi hồ sơ cảnh báo trực tiếp về Quản trị viên.
            </p>
          </div>
        </div>
        <Link
          href="/cong-dong"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
        >
          <Users className="h-3.5 w-3.5 text-emerald-600" /> Về Mạng XH Giáo viên
        </Link>
      </div>

      {reportMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {reportMsg}
        </div>
      )}

      {/* Khung Chat 2 cột */}
      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-12 min-h-[580px]">
        {/* Cột trái: Danh sách liên hệ */}
        <aside className="flex flex-col border-b border-slate-200 lg:col-span-4 lg:border-r lg:border-b-0">
          <div className="border-b border-slate-100 p-4 space-y-3">
            <h1 className="text-sm font-extrabold text-slate-900">Tin nhắn Trực tuyến</h1>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm tên thầy cô hoặc học sinh..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
            {filteredContacts.map((c) => {
              const badge = roleLabel(c.role);
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    setBotWarning("");
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    active ? "bg-indigo-50/80" : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                      c.role === "teacher" ? "bg-emerald-600" : c.role.includes("admin") ? "bg-rose-600" : "bg-indigo-600"
                    }`}
                  >
                    {c.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1 truncate text-xs font-extrabold text-slate-900">
                        <span className="truncate">{c.full_name}</span>
                        {c.is_verified && <VerifiedBadge />}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {c.last_message || c.school_name || "Bấm để bắt đầu trò chuyện"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Cột phải: Nội dung cuộc trò chuyện */}
        <section className="flex flex-col lg:col-span-8">
          {selectedContact ? (
            <>
              {/* Header người đang chat */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
                    {selectedContact.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {selectedContact.role !== "student" ? (
                        <Link
                          href={`/giao-vien?id=${encodeURIComponent(selectedContact.id)}`}
                          className="text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                        >
                          {selectedContact.full_name}
                        </Link>
                      ) : (
                        <h2 className="text-sm font-extrabold text-slate-900">{selectedContact.full_name}</h2>
                      )}
                      {selectedContact.is_verified && <VerifiedBadge />}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          roleLabel(selectedContact.role).cls
                        }`}
                      >
                        {roleLabel(selectedContact.role).text}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          peerOnline ? "bg-emerald-500 animate-pulse" : wsConnected ? "bg-sky-400" : "bg-slate-300"
                        }`}
                      />
                      {peerOnline
                        ? "Đang trực tuyến (Real-time)"
                        : wsConnected
                          ? "Kết nối trực tiếp 24/7"
                          : "Đang kết nối..."}
                      {selectedContact.school_name ? ` • ${selectedContact.school_name}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                >
                  <Flag className="h-3.5 w-3.5" /> Báo cáo vi phạm / Mạo danh
                </button>
              </div>

              {/* Form báo cáo khẩn cấp */}
              {reportOpen && (
                <form
                  onSubmit={handleSubmitReport}
                  className="border-b border-rose-200 bg-rose-50/70 p-4 space-y-2.5"
                >
                  <p className="text-xs font-extrabold text-rose-900">
                    Báo cáo khẩn cấp tài khoản {selectedContact.full_name} về cho Quản trị viên:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={reportCat}
                      onChange={(e) => setReportCat(e.target.value as typeof reportCat)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="impersonation">Mạo danh Giáo viên / Lừa đảo thu tiền</option>
                      <option value="sexual_harassment">Quấy rối tình dục / Gạ gẫm học sinh (Khẩn)</option>
                      <option value="violence">Bạo lực / Đe dọa / Bắt nạt học đường (Khẩn)</option>
                    </select>
                    <input
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Mô tả nhanh hành vi vi phạm để Admin kiểm tra..."
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
                    >
                      Gửi cảnh báo &amp; Bằng chứng cho Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách tin nhắn */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5 max-h-[420px] bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-500">
                    Hãy gửi lời chào đầu tiên để bắt đầu trao đổi học tập với <strong>{selectedContact.full_name}</strong>!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user.id;
                    const blocked = Number(m.is_blocked) === 1;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                            blocked
                              ? "border border-rose-300 bg-rose-50 font-bold text-rose-700"
                              : isMine
                                ? "bg-indigo-600 text-white"
                                : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {blocked && (
                            <p className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-600">
                              <ShieldAlert className="h-3.5 w-3.5" /> Đã bị BOT An toàn chặn
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {m.attachment_url && !blocked && (
                            isImageFileUrl(m.attachment_url) ? (
                              <a
                                href={resolveFileUrl(m.attachment_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={resolveFileUrl(m.attachment_url)}
                                  alt={m.attachment_name || "Ảnh đính kèm"}
                                  className="max-h-56 rounded-xl border border-white/20"
                                />
                              </a>
                            ) : (
                              <a
                                href={resolveFileUrl(m.attachment_url)}
                                target="_blank"
                                rel="noreferrer"
                                className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold ${
                                  isMine
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-slate-100 text-indigo-700 hover:bg-slate-200"
                                }`}
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[200px]">{m.attachment_name || "Mở tệp đính kèm"}</span>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {peerTypingName && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] italic text-slate-500">
                      {peerTypingName} đang nhập tin nhắn...
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Cảnh báo từ BOT nếu vừa vi phạm */}
              {botWarning && (
                <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{botWarning}</span>
                </div>
              )}

              {/* Khung nhập tin nhắn + Đính kèm Ảnh bài làm / PDF */}
              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3.5">
                <label
                  title="Đính kèm ảnh bài làm, PDF, Word, Slide (≤ 5MB)"
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    disabled={uploadingChatFile || sending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleChatFileUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    wsRef.current?.send({ type: "typing", is_typing: e.target.value.trim().length > 0 });
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      wsRef.current?.send({ type: "typing", is_typing: false });
                    }, 2500);
                  }}
                  placeholder={
                    uploadingChatFile
                      ? "Đang tải tệp lên..."
                      : `Nhắn tin trực tuyến cho ${selectedContact.full_name}...`
                  }
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Gửi
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-xs text-slate-500">
              Chọn một thầy cô hoặc học sinh bên trái để bắt đầu trò chuyện.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang mở hộp thư trực tuyến...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
