"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Lock,
  Send,
  Trophy,
  Zap,
} from "lucide-react";
import {
  CORE_API_URL,
  decryptExamBundle,
  EncryptedExamBundle,
  ExamAttemptResult,
  ExamPayloadPlain,
  LeaderboardEntry,
} from "@/lib/api";
import { clearExamDraft, loadExamDraft, saveExamDraft } from "@/lib/indexeddb";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { MathContent } from "@/components/MathContent";
import { useAuth } from "@/context/AuthContext";

function ExamRoomInner() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("id") || "exam-toan-12-thpt-2025";
  const { user, accessToken } = useAuth();

  const [studentName, setStudentName] = useState("Nguyễn Minh Anh (Lớp 12A1)");
  useEffect(() => {
    if (user?.full_name) {
      setStudentName(user.full_name);
    }
  }, [user]);
  const [phase, setPhase] = useState<"ready" | "taking" | "submitting" | "result">("ready");
  const [attemptId, setAttemptId] = useState<string>("");
  const [examData, setExamData] = useState<ExamPayloadPlain | null>(null);
  const [decryptMs, setDecryptMs] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [lastSavedLabel, setLastSavedLabel] = useState<string>("Chưa lưu");
  const [result, setResult] = useState<ExamAttemptResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const cheatFlagsRef = useRef<{ type: string; at: string; duration_sec: number }[]>([]);

  // 1. Bắt đầu thi: Tải gói AES-256-GCM từ CDN + Lấy khóa + Giải mã cục bộ trên trình duyệt
  const handleStartExam = async () => {
    setErrorMsg("");
    try {
      const startHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        startHeaders["Authorization"] = `Bearer ${accessToken}`;
      }
      const [bundleRes, startRes] = await Promise.all([
        fetch(`${CORE_API_URL}/api/v1/exams/${examId}/bundle`),
        fetch(`${CORE_API_URL}/api/v1/exams/${examId}/start`, {
          method: "POST",
          headers: startHeaders,
          body: JSON.stringify({
            user_name: studentName.trim() || "Học sinh K-12",
          }),
        }),
      ]);

      if (!bundleRes.ok || !startRes.ok) {
        throw new Error("Không thể khởi tạo phòng thi. Hãy kiểm tra Go API (:8080).");
      }

      const bundle = (await bundleRes.json()) as EncryptedExamBundle;
      const startInfo = await startRes.json();

      // Giải mã đề trên CPU trình duyệt (0ms chạm DB)
      const { payload, decryptMs: dMs } = await decryptExamBundle(
        bundle,
        startInfo.decrypt_key_b64
      );

      // Khôi phục bài làm offline nếu học sinh lỡ tải lại trang
      const savedDraft = await loadExamDraft(examId);
      if (savedDraft?.answers) {
        setAnswers(savedDraft.answers);
        setLastSavedLabel("Đã khôi phục từ IndexedDB");
      } else {
        setAnswers({});
      }

      setAttemptId(startInfo.attempt_id);
      setExamData(payload);
      setDecryptMs(dMs);
      setSecondsLeft(payload.exam.duration_minutes * 60);
      setPhase("taking");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối phòng thi");
    }
  };

  // Lưu tức thì vào IndexedDB mỗi lần chọn đáp án
  const updateAnswer = useCallback(
    (questionId: string, val: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: val };
        if (attemptId) {
          void saveExamDraft({
            examId,
            attemptId,
            answers: next,
            updatedAt: Date.now(),
          });
          setLastSavedLabel(`Đã lưu IndexedDB lúc ${new Date().toLocaleTimeString("vi-VN")}`);
        }
        return next;
      });
    },
    [attemptId, examId]
  );

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (phase !== "taking") return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Autosave nền lên Go API kèm random jitter (25-40s) tránh dồn tải
  useEffect(() => {
    if (phase !== "taking" || !attemptId) return;
    const jitterMs = 25000 + Math.floor(Math.random() * 15000);
    const interval = setInterval(() => {
      void fetch(`${CORE_API_URL}/api/v1/attempts/${attemptId}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersRef.current,
          cheat_flags: cheatFlagsRef.current,
        }),
      }).then(() => {
        setLastSavedLabel(`Đã đồng bộ Server lúc ${new Date().toLocaleTimeString("vi-VN")}`);
      });
    }, jitterMs);
    return () => clearInterval(interval);
  }, [phase, attemptId]);

  // Giám sát chuyển tab nhẹ (Proctoring không tốn băng thông)
  useEffect(() => {
    if (phase !== "taking") return;
    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches((c) => c + 1);
        cheatFlagsRef.current.push({
          type: "tab_blur",
          at: new Date().toISOString(),
          duration_sec: 1,
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  // 2. Nộp bài bất đồng bộ -> 202 Accepted -> Poll kết quả từ Grading Worker
  const handleSubmit = async () => {
    if (!attemptId) return;
    setPhase("submitting");
    try {
      const submitRes = await fetch(`${CORE_API_URL}/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `submit-${attemptId}`,
        },
        body: JSON.stringify({
          answers: answersRef.current,
          cheat_flags: cheatFlagsRef.current,
        }),
      });
      if (!submitRes.ok) {
        throw new Error("Không thể nộp bài, vui lòng thử lại.");
      }

      // Poll kết quả từ Worker (thường xong trong <20ms)
      let graded: ExamAttemptResult | null = null;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const res = await fetch(`${CORE_API_URL}/api/v1/attempts/${attemptId}/result`);
        const data = (await res.json()) as ExamAttemptResult;
        if (data.status === "graded") {
          graded = data;
          break;
        }
      }

      await clearExamDraft(examId);
      if (graded) {
        setResult(graded);
        setPhase("result");
        fetch(`${CORE_API_URL}/api/v1/exams/${examId}/leaderboard`)
          .then((r) => r.json())
          .then((lb) => setLeaderboard(lb.leaderboard || []))
          .catch(() => {});
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi nộp bài");
      setPhase("taking");
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (phase === "ready") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          <Lock className="h-3.5 w-3.5" /> Đề thi mã hóa AES-256-GCM
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Chuẩn bị vào phòng thi
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Khi bấm bắt đầu, đồng hồ sẽ bắt đầu đếm ngược và hệ thống tự động lưu bài làm trên máy để không bị mất đáp án khi rớt mạng.
        </p>

        <div className="mt-5 space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Họ tên thí sinh (hiển thị trên bảng xếp hạng)
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {errorMsg && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {errorMsg}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleStartExam}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
          >
            Bắt đầu làm bài
          </button>
          <Link
            href="/thi"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-indigo-200 bg-white p-10 text-center shadow-xs">
        <Zap className="mx-auto h-10 w-10 animate-pulse text-indigo-600" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          Đang tiếp nhận &amp; chấm điểm bài thi...
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Hệ thống đang chấm điểm chi tiết và cập nhật bảng xếp hạng...
        </p>
      </div>
    );
  }

  if (phase === "result" && result && examData) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                Kết quả chính thức • {result.user_name}
              </p>
              <h1 className="mt-1 text-3xl font-bold">
                {result.score.toFixed(2)} / {result.max_score.toFixed(2)} điểm
              </h1>
              <p className="mt-1 text-sm text-indigo-100">
                Đúng trọn vẹn {result.correct_count}/{result.total_questions} câu • Thời gian làm: {result.duration_sec} giây
              </p>
            </div>
            <Link
              href="/thi"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50"
            >
              Về danh sách kỳ thi
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <h2 className="text-base font-bold text-slate-900">
              Chi tiết bài làm &amp; Lời giải từng câu
            </h2>
            {examData.questions.map((q, idx) => {
              const d = result.details?.find((item) => item.question_id === q.id);
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      Câu {idx + 1} • {q.topic}
                    </span>
                    {d && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          d.is_correct
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        +{d.earned_points} / {d.max_points} điểm
                      </span>
                    )}
                  </div>
                  <MathContent content={q.content_mdx} className="text-sm" />
                  {d && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3.5 text-xs">
                      <p className="font-semibold text-slate-700">
                        Đáp án chuẩn:{" "}
                        <span className="text-emerald-700">
                          {JSON.stringify(d.correct_answer)}
                        </span>
                      </p>
                      <div className="mt-2 border-t border-slate-200 pt-2">
                        <MathContent content={d.explanation_mdx} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 h-fit">
            <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
              <Trophy className="h-5 w-5 text-amber-500" />
              Bảng xếp hạng vừa cập nhật
            </div>
            <div className="space-y-2">
              {leaderboard.map((item) => (
                <div
                  key={`${item.rank}-${item.user_id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-slate-800">
                    #{item.rank} {item.user_name}
                  </span>
                  <span className="font-bold text-indigo-700">
                    {item.score.toFixed(2)}đ
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // Phase === "taking"
  return (
    <div className="space-y-5">
      {/* Thanh trạng thái phòng thi dính đầu trang */}
      <div className="sticky top-[61px] z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-sm font-bold text-slate-900 sm:text-base">
            {examData?.exam.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <Lock className="h-3 w-3" /> Đã giải mã AES-256-GCM ({decryptMs}ms)
            </span>
            <span className="inline-flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-indigo-500" /> {lastSavedLabel}
            </span>
            {tabSwitches > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                <AlertTriangle className="h-3 w-3" /> Chuyển tab: {tabSwitches} lần
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-mono text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-amber-400" />
            {formatTimer(secondsLeft)}
          </div>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
          >
            <Send className="h-4 w-4" /> Nộp bài
          </button>
        </div>
      </div>

      {/* Các câu hỏi trong đề */}
      <div className="space-y-5">
        {examData?.questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <QuestionRenderer
              index={idx}
              question={q}
              value={answers[q.id]}
              onChange={(val) => updateAnswer(q.id, val)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pb-6">
        <button
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-emerald-500 transition"
        >
          <CheckCircle2 className="h-4 w-4" /> Hoàn thành &amp; Nộp bài thi
        </button>
      </div>
    </div>
  );
}

export default function ExamRoomPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang mở phòng thi...</div>}>
      <ExamRoomInner />
    </Suspense>
  );
}
