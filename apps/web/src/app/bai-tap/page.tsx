"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { CORE_API_URL, ExerciseSet, QuestionGradeDetail } from "@/lib/api";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { MathContent } from "@/components/MathContent";

export default function ExercisesPage() {
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [activeSet, setActiveSet] = useState<ExerciseSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<Record<string, QuestionGradeDetail>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${CORE_API_URL}/api/v1/exercises`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.exercise_sets || []) as ExerciseSet[];
        setSets(list);
        setActiveSet(list[0] || null);
      })
      .catch(() => setSets([]));
  }, []);

  const checkQuestion = async (questionId: string) => {
    setCheckingId(questionId);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/exercises/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          answer: answers[questionId],
        }),
      });
      const detail = (await res.json()) as QuestionGradeDetail;
      setResults((prev) => ({ ...prev, [questionId]: detail }));
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Làm Bài tập Trực tuyến (Chấm tức thì)
        </h1>
        <p className="text-sm text-slate-500">
          Hỗ trợ đủ 4 dạng câu hỏi mới (1 đáp án, nhiều đáp án, Đúng/Sai 4 mệnh đề tính điểm lũy tiến, trả lời ngắn) kèm lời giải chi tiết.
        </p>
      </div>

      {/* Chọn bộ bài tập */}
      <div data-tour="ex-sets" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sets.map((s) => {
          const selected = activeSet?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setActiveSet(s);
                setAnswers({});
                setResults({});
              }}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                Lớp {s.grade_id} • {s.subject_name}
              </span>
              <h2 className="mt-1.5 text-sm font-bold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {s.questions.length} câu hỏi tương tác
              </p>
            </button>
          );
        })}
      </div>

      {/* Danh sách câu hỏi trong bộ */}
      {activeSet && (
        <div data-tour="ex-questions" className="space-y-5">
          {activeSet.questions.map((q, idx) => {
            const detail = results[q.id];
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <QuestionRenderer
                  index={idx}
                  question={q}
                  value={answers[q.id]}
                  onChange={(val) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: val }))
                  }
                />

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={checkingId === q.id}
                    onClick={() => checkQuestion(q.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {checkingId === q.id ? "Đang chấm..." : "Kiểm tra đáp án"}
                  </button>

                  {detail && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        detail.is_correct
                          ? "bg-emerald-50 text-emerald-700"
                          : detail.earned_points > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {detail.is_correct ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {detail.is_correct
                        ? `Chính xác! +${detail.earned_points}/${detail.max_points} điểm`
                        : `Đạt ${detail.earned_points}/${detail.max_points} điểm`}
                    </span>
                  )}
                </div>

                {detail && (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                      Lời giải chi tiết
                    </p>
                    <MathContent content={detail.explanation_mdx} className="text-sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
