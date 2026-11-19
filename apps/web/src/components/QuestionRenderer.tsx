"use client";

import React from "react";
import { PublicQuestion } from "@/lib/api";
import { MathContent } from "./MathContent";

interface QuestionRendererProps {
  index: number;
  question: PublicQuestion;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled?: boolean;
}

const QTYPE_BADGE: Record<string, string> = {
  single_choice: "Trắc nghiệm 1 đáp án",
  multi_choice: "Chọn nhiều đáp án",
  true_false_group: "Đúng / Sai 4 ý (Chuẩn 2025)",
  short_answer: "Trả lời ngắn",
};

export function QuestionRenderer({
  index,
  question,
  value,
  onChange,
  disabled = false,
}: QuestionRendererProps) {
  const handleMultiToggle = (key: string) => {
    const prev = Array.isArray(value) ? (value as string[]) : [];
    if (prev.includes(key)) {
      onChange(prev.filter((k) => k !== key));
    } else {
      onChange([...prev, key]);
    }
  };

  const handleTrueFalse = (key: string, boolVal: boolean) => {
    const prev =
      value && typeof value === "object" && !Array.isArray(value)
        ? { ...(value as Record<string, boolean>) }
        : {};
    prev[key] = boolVal;
    onChange(prev);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
            Câu {index + 1}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {QTYPE_BADGE[question.q_type] || question.q_type}
          </span>
          <span className="text-xs text-slate-400">{question.topic}</span>
        </div>
        <span className="text-xs font-semibold text-indigo-600">
          {question.points} điểm
        </span>
      </div>

      <div className="text-sm sm:text-base">
        <MathContent content={question.content_mdx} />
      </div>

      {/* 1. Single Choice */}
      {question.q_type === "single_choice" && question.options && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options.map((opt) => {
            const selected = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.key)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  selected
                    ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {opt.key}
                </span>
                <MathContent content={opt.text} className="text-sm" />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Multi Choice */}
      {question.q_type === "multi_choice" && question.options && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options.map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const selected = arr.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                disabled={disabled}
                onClick={() => handleMultiToggle(opt.key)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  selected
                    ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                    selected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {opt.key}
                </span>
                <MathContent content={opt.text} className="text-sm" />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. True/False Group (Chuẩn thi THPT 2025+) */}
      {question.q_type === "true_false_group" && question.options && (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {question.options.map((opt) => {
            const mapVal =
              value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, boolean>)
                : {};
            const current = mapVal[opt.key];
            return (
              <div
                key={opt.key}
                className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {opt.key})
                  </span>
                  <MathContent content={opt.text} className="text-sm" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTrueFalse(opt.key, true)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      current === true
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                    }`}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTrueFalse(opt.key, false)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      current === false
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-rose-50"
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

      {/* 4. Short Answer */}
      {question.q_type === "short_answer" && (
        <div className="max-w-sm">
          <input
            type="text"
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.unit_hint || "Nhập câu trả lời của bạn..."}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
          />
        </div>
      )}
    </div>
  );
}
