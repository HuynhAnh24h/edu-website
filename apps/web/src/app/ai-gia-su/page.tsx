"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookMarked, Bot, Send, Sparkles, User, Zap } from "lucide-react";
import { AI_API_URL } from "@/lib/api";
import { MathContent } from "@/components/MathContent";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  cacheHit?: boolean;
  citations?: string[];
  latencyMs?: number;
}

const SAMPLE_PROMPTS = [
  { grade: 12, subject: "toan", text: "Tìm cực trị của hàm số y = x^3 - 3x + 2 giúp em với!" },
  { grade: 9, subject: "toan", text: "Giải thích cho em cách dùng định lý Viète thi vào lớp 10" },
  { grade: 12, subject: "vat-ly", text: "Quy ước dấu của Định luật I Nhiệt động lực học như thế nào ạ?" },
  { grade: 5, subject: "toan", text: "Làm sao nhớ nhanh công thức diện tích hình tam giác và hình thang ạ?" },
];

function AITutorContent() {
  const searchParams = useSearchParams();
  const [gradeId, setGradeId] = useState<number>(Number(searchParams.get("grade")) || 12);
  const [subject, setSubject] = useState<string>(searchParams.get("subject") || "toan");
  const [tutorMode, setTutorMode] = useState<string>("socratic");
  const [input, setInput] = useState<string>(searchParams.get("q") || "");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Xin chào! Thầy là **AI Gia sư K–12**.\n\nHãy chọn đúng **Khối lớp (1–12)** và **Chế độ học** ở phía trên. Thầy sẽ hướng dẫn sát chương trình lớp em đang học (không giải vượt cấp) và gợi mở từng bước giúp em tự hiểu bài nhé!",
      model: "system",
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (overrideText?: string, overrideGrade?: number, overrideSubject?: string) => {
    const text = (overrideText ?? input).trim();
    const g = overrideGrade ?? gradeId;
    const sub = overrideSubject ?? subject;
    if (!text || streaming) return;

    if (overrideGrade) setGradeId(overrideGrade);
    if (overrideSubject) setSubject(overrideSubject);
    if (!overrideText) setInput("");

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    const assistantId = `a-${Date.now() + 1}`;
    const placeholderMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
    };

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`${AI_API_URL}/api/v1/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_id: g,
          subject: sub,
          tutor_mode: tutorMode,
          message: text,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Không thể kết nối Python FastAPI AI Tutor (:8001).");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          let evName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) evName = line.slice(6).trim();
            if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          const payload = JSON.parse(dataStr);

          if (evName === "meta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      model: payload.model,
                      cacheHit: payload.cache_hit,
                      citations: payload.citations,
                    }
                  : m
              )
            );
          } else if (evName === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + (payload.text || "") } : m
              )
            );
          } else if (evName === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, latencyMs: payload.latency_ms, cacheHit: payload.cache_hit }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                text: `Lỗi kết nối AI Service: ${
                  err instanceof Error ? err.message : "Unknown error"
                }`,
              }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      {/* Thanh cấu hình ngữ cảnh Grade-Locked RAG */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                AI Gia sư Lớp 1–12
              </h1>
              <p className="text-xs text-slate-500">
                Trợ lý học tập 24/7 — bám sát kiến thức từng khối lớp và gợi mở tư duy từng bước
              </p>
            </div>
          </div>

          <div data-tour="ai-controls" className="flex flex-wrap gap-2">
            <select
              value={gradeId}
              onChange={(e) => setGradeId(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  Khóa kiến thức: Lớp {g}
                </option>
              ))}
            </select>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="toan">Toán học</option>
              <option value="vat-ly">Vật lý</option>
              <option value="tieng-anh">Tiếng Anh</option>
            </select>

            <select
              value={tutorMode}
              onChange={(e) => setTutorMode(e.target.value)}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800"
            >
              <option value="socratic">Chế độ: Gợi mở Socratic</option>
              <option value="explain">Chế độ: Giải chi tiết</option>
              <option value="check_homework">Chế độ: Chữa bài làm</option>
            </select>
          </div>
        </div>

        {/* Gợi ý nhanh */}
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {SAMPLE_PROMPTS.map((sp) => (
            <button
              key={sp.text}
              type="button"
              onClick={() => void sendMessage(sp.text, sp.grade, sp.subject)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition"
            >
              <Sparkles className="mr-1 inline h-3 w-3 text-purple-500" />
              Lớp {sp.grade}: {sp.text}
            </button>
          ))}
        </div>
      </div>

      {/* Khung chat Streaming SSE */}
      <div className="flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-slate-50/70 text-slate-800"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <>
                    <MathContent content={m.text || "..."} />
                    {(m.citations?.length || m.model) && m.model !== "system" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2 text-[11px]">
                        {m.cacheHit ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            <Zap className="h-3 w-3" /> Phản hồi tức thì
                          </span>
                        ) : (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-semibold text-purple-800">
                            AI Gia sư
                          </span>
                        )}
                        {m.citations?.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200"
                          >
                            <BookMarked className="h-3 w-3 text-indigo-500" /> {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Form nhập câu hỏi */}
        <form
          data-tour="ai-input"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Nhập câu hỏi môn ${subject} Lớp ${gradeId}... để AI Gia sư hướng dẫn từng bước`}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-purple-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-purple-500 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" /> Gửi
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AITutorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang mở AI Gia sư...</div>}>
      <AITutorContent />
    </Suspense>
  );
}
