"use client";

import React from "react";
import {
  Check,
  Copy,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

export interface DraftQuestion {
  localId: string;
  topic: string;
  q_type: "single_choice" | "multi_choice" | "true_false_group" | "short_answer";
  difficulty: "nhan_biet" | "thong_hieu" | "van_dung" | "van_dung_cao";
  content_mdx: string;
  options: { key: string; text: string }[];
  answer_single: string;
  answer_multi: string[];
  answer_true_false: Record<string, boolean>;
  answer_short: string;
  explanation_mdx: string;
}

export function createEmptyDraftQuestion(defaultTopic = "Bài tập củng cố"): DraftQuestion {
  return {
    localId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    topic: defaultTopic,
    q_type: "single_choice",
    difficulty: "thong_hieu",
    content_mdx: "",
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ],
    answer_single: "A",
    answer_multi: ["A"],
    answer_true_false: { a: true, b: false, c: true, d: false },
    answer_short: "",
    explanation_mdx: "",
  };
}

const QTYPE_OPTIONS = [
  { value: "single_choice", label: "Trắc nghiệm 1 đáp án (A/B/C/D)" },
  { value: "multi_choice", label: "Chọn nhiều đáp án đúng" },
  { value: "true_false_group", label: "Đúng / Sai 4 mệnh đề (Chuẩn 2025)" },
  { value: "short_answer", label: "Điền đáp án / Trả lời ngắn" },
] as const;

const QUICK_MATH_CHIPS = [
  { label: "x²", insert: "$x^2$" },
  { label: "√x", insert: "$\\sqrt{x}$" },
  { label: "a/b", insert: "$\\frac{a}{b}$" },
  { label: "π", insert: "$\\pi$" },
  { label: "∫", insert: "$\\int_a^b f(x)\\,dx$" },
  { label: "≤ / ≥", insert: "$\\le$" },
];

interface VisualQuestionBuilderProps {
  questions: DraftQuestion[];
  onChange: (next: DraftQuestion[]) => void;
  defaultTopic?: string;
  title?: string;
  subtitle?: string;
}

export function VisualQuestionBuilder({
  questions,
  onChange,
  defaultTopic = "Luyện tập bài học",
  title = "Bộ Câu hỏi & Đáp án trực quan",
  subtitle = "Điền câu hỏi, tick chọn đáp án đúng bằng label trực quan rồi bấm '+ Thêm câu hỏi'.",
}: VisualQuestionBuilderProps) {
  const updateQ = (idx: number, patch: Partial<DraftQuestion>) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const handleTypeChange = (idx: number, newType: DraftQuestion["q_type"]) => {
    const q = questions[idx];
    let opts = q.options;
    if (newType === "true_false_group") {
      opts = ["a", "b", "c", "d"].map((k, i) => ({
        key: k,
        text: q.options[i]?.text || "",
      }));
    } else if (newType === "single_choice" || newType === "multi_choice") {
      opts = ["A", "B", "C", "D"].map((k, i) => ({
        key: k,
        text: q.options[i]?.text || "",
      }));
    }
    updateQ(idx, { q_type: newType, options: opts });
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    const opts = questions[qIdx].options.map((o, i) =>
      i === optIdx ? { ...o, text } : o
    );
    updateQ(qIdx, { options: opts });
  };

  const toggleMultiAnswer = (qIdx: number, key: string) => {
    const prev = questions[qIdx].answer_multi;
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    updateQ(qIdx, { answer_multi: next });
  };

  const addQuestion = () => {
    onChange([...questions, createEmptyDraftQuestion(defaultTopic)]);
  };

  const duplicateQuestion = (idx: number) => {
    const clone: DraftQuestion = {
      ...questions[idx],
      localId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      options: questions[idx].options.map((o) => ({ ...o })),
      answer_multi: [...questions[idx].answer_multi],
      answer_true_false: { ...questions[idx].answer_true_false },
    };
    const next = [...questions];
    next.splice(idx + 1, 0, clone);
    onChange(next);
  };

  const removeQuestion = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <HelpCircle className="h-5 w-5 text-indigo-600" />
            {title}
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {questions.length} câu
            </span>
          </h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" /> Thêm câu hỏi mới
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Chưa có câu hỏi nào. Bấm <strong>&quot;+ Thêm câu hỏi mới&quot;</strong> để tạo câu hỏi &amp; đáp án trực quan kèm bài giảng!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.localId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
            >
              {/* Header Card với Label số thứ tự & Loại câu hỏi */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                    Câu hỏi #{idx + 1}
                  </span>

                  <select
                    value={q.q_type}
                    onChange={(e) =>
                      handleTypeChange(idx, e.target.value as DraftQuestion["q_type"])
                    }
                    className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-bold text-indigo-800"
                  >
                    {QTYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={q.difficulty}
                    onChange={(e) =>
                      updateQ(idx, {
                        difficulty: e.target.value as DraftQuestion["difficulty"],
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    <option value="nhan_biet">Mức: Nhận biết</option>
                    <option value="thong_hieu">Mức: Thông hiểu</option>
                    <option value="van_dung">Mức: Vận dụng</option>
                    <option value="van_dung_cao">Mức: Vận dụng cao</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Nhân bản câu hỏi"
                    onClick={() => duplicateQuestion(idx)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Xóa câu hỏi"
                    onClick={() => removeQuestion(idx)}
                    className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Label Nội dung câu hỏi + Phím tắt chèn toán nhanh */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    📝 Nội dung câu hỏi
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-slate-400">Chèn nhanh:</span>
                    {QUICK_MATH_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() =>
                          updateQ(idx, {
                            content_mdx: q.content_mdx
                              ? `${q.content_mdx} ${chip.insert}`
                              : chip.insert,
                          })
                        }
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={q.content_mdx}
                  onChange={(e) => updateQ(idx, { content_mdx: e.target.value })}
                  placeholder="Nhập đề bài tại đây (VD: Tính giá trị của biểu thức $P = 2^3 + 5$?)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
                {q.content_mdx.includes("$") && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="mr-2 font-bold text-slate-400">Xem trước:</span>
                    <MathContent content={q.content_mdx} className="inline" />
                  </div>
                )}
              </div>

              {/* Khu vực ĐIỀN ĐÁP ÁN TRỰC QUAN THEO LABEL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
                  ✅{" "}
                  {q.q_type === "single_choice"
                    ? "Điền các phương án & Bấm vào nhãn (A/B/C/D) để đánh dấu ĐÁP ÁN ĐÚNG"
                    : q.q_type === "multi_choice"
                    ? "Điền các phương án & Tick chọn TẤT CẢ các đáp án đúng"
                    : q.q_type === "true_false_group"
                    ? "Điền 4 mệnh đề (a, b, c, d) & Gạt chọn Đúng / Sai cho từng ý"
                    : "Nhập đáp án đúng học sinh cần điền"}
                </label>

                {/* Dạng 1 đáp án hoặc nhiều đáp án */}
                {(q.q_type === "single_choice" || q.q_type === "multi_choice") && (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect =
                        q.q_type === "single_choice"
                          ? q.answer_single === opt.key
                          : q.answer_multi.includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                              : "border-slate-200 bg-slate-50/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              q.q_type === "single_choice"
                                ? updateQ(idx, { answer_single: opt.key })
                                : toggleMultiAnswer(idx, opt.key)
                            }
                            title="Bấm để chọn làm đáp án đúng"
                            className={`flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition ${
                              isCorrect
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-emerald-50"
                            }`}
                          >
                            <span>{opt.key}</span>
                            {isCorrect && <Check className="h-3.5 w-3.5" />}
                          </button>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(idx, oIdx, e.target.value)}
                            placeholder={`Nhập nội dung đáp án ${opt.key}...`}
                            className="flex-1 bg-transparent px-1.5 py-1 text-sm text-slate-800 outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dạng Đúng/Sai 4 mệnh đề */}
                {q.q_type === "true_false_group" && (
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const val = q.answer_true_false[opt.key] ?? true;
                      return (
                        <div
                          key={opt.key}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-800">
                            {opt.key})
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(idx, oIdx, e.target.value)}
                            placeholder={`Nhập nội dung mệnh đề ${opt.key})...`}
                            className="min-w-[200px] flex-1 bg-transparent px-2 py-1 text-sm text-slate-800 outline-none"
                          />
                          <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateQ(idx, {
                                  answer_true_false: { ...q.answer_true_false, [opt.key]: true },
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-bold transition ${
                                val ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              Đúng
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateQ(idx, {
                                  answer_true_false: { ...q.answer_true_false, [opt.key]: false },
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-bold transition ${
                                !val ? "bg-rose-600 text-white" : "text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              Sai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dạng Trả lời ngắn */}
                {q.q_type === "short_answer" && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                    <span className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                      Đáp số đúng
                    </span>
                    <input
                      type="text"
                      value={q.answer_short}
                      onChange={(e) => updateQ(idx, { answer_short: e.target.value })}
                      placeholder="VD: 12.5, 12,5 (nhiều cách viết cách nhau bằng dấu phẩy)"
                      className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Label Lời giải chi tiết */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                  💡 Lời giải chi tiết (Hiện sau khi học sinh làm xong)
                </label>
                <input
                  type="text"
                  value={q.explanation_mdx}
                  onChange={(e) => updateQ(idx, { explanation_mdx: e.target.value })}
                  placeholder="Giải thích ngắn gọn cách làm để học sinh hiểu bản chất..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          ))}

          {/* Nút thêm câu hỏi ngay dưới danh sách */}
          <button
            type="button"
            onClick={addQuestion}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 py-3.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition"
          >
            <Plus className="h-4 w-4" /> Thêm câu hỏi tiếp theo (#{questions.length + 1})
          </button>
        </div>
      )}
    </div>
  );
}
