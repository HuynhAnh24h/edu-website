"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { AI_API_URL, CORE_API_URL } from "@/lib/api";
import { MathContent } from "@/components/MathContent";

interface Subject {
  id: number;
  code: string;
  name: string;
}

interface ParsedQuestion {
  grade_id: number;
  subject_code: string;
  topic: string;
  q_type: string;
  difficulty: string;
  content_mdx: string;
  options?: { key: string; text: string }[];
  unit_hint?: string;
  answer_single?: string;
  answer_true_false?: Record<string, boolean>;
  answer_short?: string[];
  explanation_mdx?: string;
}

interface BulkImportPanelProps {
  accessToken: string | null;
  subjects: Subject[];
  onNotify: (type: "ok" | "err", msg: string) => void;
  onImported?: () => void;
}

const SAMPLE_RAW_EXAM = `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn
Câu 1. Nguyên hàm của hàm số $f(x) = 3x^2 + 1$ là:
A. $x^3 + x + C$
B. $6x + C$
C. $x^3 + C$
D. $3x^3 + x + C$
Đáp án: A
Lời giải: Áp dụng $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$, ta được $F(x) = x^3 + x + C$.

PHẦN II. Câu trắc nghiệm đúng sai
Câu 2. Cho hàm số $y = x^3 - 3x + 1$. Xét tính đúng sai các mệnh đề sau:
a) Đạo hàm của hàm số là $y' = 3x^2 - 3$.
b) Hàm số có đúng $2$ điểm cực trị là $x = -1$ và $x = 1$.
c) Hàm số đồng biến trên khoảng $(-1; 1)$.
d) Giá trị cực đại của hàm số bằng $3$.
Đáp án: a-Đ, b-Đ, c-S, d-Đ
Lời giải: $y' = 3x^2 - 3 < 0$ trên $(-1; 1)$ nên hàm nghịch biến trên $(-1; 1)$, do đó c) Sai.

PHẦN III. Câu trắc nghiệm trả lời ngắn
Câu 3. Tìm giá trị lớn nhất của hàm số $y = -x^2 + 6x - 5$ trên đoạn $[0; 5]$.
Đáp án: 4
Lời giải: $y' = -2x + 6 = 0 \\Leftrightarrow x = 3 \\in [0; 5]$. $y(3) = -9 + 18 - 5 = 4$.`;

export function BulkImportPanel({
  accessToken,
  subjects,
  onNotify,
  onImported,
}: BulkImportPanelProps) {
  // === 1. Smart Exam Parser state ===
  const [gradeId, setGradeId] = useState(12);
  const [subjectCode, setSubjectCode] = useState("toan");
  const [examTitle, setExamTitle] = useState("Đề thi thử THPT 2025 (Tách tự động từ văn bản)");
  const [durationMin, setDurationMin] = useState(50);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importingParsed, setImportingParsed] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);

  // === 2. JSON Bulk Upload state ===
  const [jsonUploading, setJsonUploading] = useState(false);
  const [syncPgVector, setSyncPgVector] = useState(true);

  const handleParseText = async () => {
    if (!rawText.trim()) {
      onNotify("err", "Vui lòng dán nội dung đề thi hoặc bấm 'Nạp ví dụ chuẩn 3 phần'.");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch(`${AI_API_URL}/api/v1/ai/parse-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          grade_id: gradeId,
          subject_code: subjectCode,
          topic: examTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify("err", data.detail || "Không thể phân tích văn bản đề thi.");
        return;
      }
      setParsedQuestions(data.questions || []);
      onNotify("ok", `Đã tách tự động ${data.count} câu hỏi! Hãy kiểm tra công thức KaTeX bên dưới rồi bấm Xuất bản.`);
    } catch {
      onNotify("err", "Không thể kết nối Python FastAPI (:8001) để tách đề.");
    } finally {
      setParsing(false);
    }
  };

  const handlePublishParsedExam = async () => {
    if (!accessToken || parsedQuestions.length === 0) return;
    setImportingParsed(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/cms/import/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          exams: [
            {
              grade_id: gradeId,
              subject_code: subjectCode,
              title: examTitle.trim() || `Đề thi Lớp ${gradeId}`,
              mode: "mock_live",
              duration_minutes: durationMin,
              total_points: 10.0,
              questions: parsedQuestions,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.imported === 0) {
        onNotify("err", (data.errors && data.errors[0]) || data.error || "Import đề thi thất bại.");
        return;
      }
      onNotify(
        "ok",
        `Đã xuất bản đề thi (${parsedQuestions.length} câu) vào PostgreSQL & mã hóa AES-256-GCM lên Redis!`
      );
      setParsedQuestions([]);
      setRawText("");
      onImported?.();
    } finally {
      setImportingParsed(false);
    }
  };

  const handleJsonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setJsonUploading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.lessons)) {
        const res = await fetch(`${CORE_API_URL}/api/v1/cms/import/lessons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ lessons: parsed.lessons }),
        });
        const report = await res.json();
        if (!res.ok) {
          onNotify("err", report.error || "Lỗi import bài giảng JSON");
          return;
        }
        let aiNote = "";
        if (syncPgVector) {
          try {
            const aiItems = parsed.lessons.map((l: Record<string, unknown>) => ({
              grade_id: Number(l.grade_id || 12),
              subject_code: String(l.subject_code || "toan"),
              textbook: String(l.textbook || "kntt"),
              citation: `Lớp ${l.grade_id} — ${l.title}`,
              content: `${l.summary || ""}\n${l.content_mdx || ""}`,
            }));
            const aiRes = await fetch(`${AI_API_URL}/api/v1/ai/knowledge/bulk`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: aiItems }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              aiNote = ` + Đồng bộ ${aiData.indexed} chunks vào AI pgvector!`;
            }
          } catch {
            // ignore if AI offline
          }
        }
        onNotify(
          "ok",
          `Import Bài giảng thành công: Thêm mới ${report.imported}, Cập nhật ${report.updated}/${report.total}${aiNote}`
        );
      } else if (Array.isArray(parsed.exams)) {
        const res = await fetch(`${CORE_API_URL}/api/v1/cms/import/exams`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ exams: parsed.exams }),
        });
        const report = await res.json();
        if (!res.ok) {
          onNotify("err", report.error || "Lỗi import đề thi JSON");
          return;
        }
        onNotify(
          "ok",
          `Import thành công ${report.imported}/${report.total} đề thi vào PostgreSQL & mã hóa AES-256-GCM lên Redis!`
        );
        onImported?.();
      } else {
        onNotify("err", 'File JSON phải chứa mảng "lessons" hoặc "exams" theo mẫu.');
      }
    } catch {
      onNotify("err", "File JSON không đúng cú pháp. Hãy tải file mẫu để xem cấu trúc.");
    } finally {
      setJsonUploading(false);
      e.target.value = "";
    }
  };

  const downloadSampleJson = () => {
    const sample = {
      lessons: [
        {
          grade_id: 12,
          subject_code: "toan",
          textbook: "kntt",
          chapter: "Chương 1: Ứng dụng đạo hàm",
          title: "Đường tiệm cận của đồ thị hàm số",
          summary: "Tìm tiệm cận đứng, tiệm cận ngang và tiệm cận xiên.",
          content_mdx: "### Tiệm cận ngang\nNếu $\\lim_{x \\to \\pm\\infty} f(x) = y_0$ thì $y = y_0$ là tiệm cận ngang.",
          duration_min: 25,
          materials: [{ title: "PDF Tiệm cận hàm số", type: "pdf", url: "#cdn-pdf", is_free: true }],
        },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eduk12-import-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* PHẦN 1: IMPORT HÀNG LOẠT BẰNG FILE JSON */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
              <FileJson className="h-4 w-4" /> BULK IMPORT HÀNG LOẠT (IDEMPOTENT UPSERT)
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              Nhập file JSON Bài giảng Lớp 1–12 hoặc Bộ Đề thi
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Hỗ trợ import trực tiếp 2 gói dữ liệu có sẵn trong <code className="rounded bg-slate-100 px-1 py-0.5">database/seeds/k12-curriculum-pack.json</code> và <code className="rounded bg-slate-100 px-1 py-0.5">official-format-exams-pack.json</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSampleJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" /> Tải JSON mẫu
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            <span>{jsonUploading ? "Đang import..." : "Chọn file .JSON để Import ngay"}</span>
            <input
              type="file"
              accept=".json,application/json"
              disabled={jsonUploading}
              onChange={handleJsonFileUpload}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={syncPgVector}
              onChange={(e) => setSyncPgVector(e.target.checked)}
              className="h-4 w-4 accent-purple-600"
            />
            <Database className="h-3.5 w-3.5 text-purple-600" />
            Tự động nạp toàn bộ bài giảng vào AI pgvector
          </label>
        </div>
      </div>

      {/* PHẦN 2: TRÌNH TÁCH ĐỀ THI TỰ ĐỘNG TỪ VĂN BẢN THÔ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700">
              <Wand2 className="h-4 w-4" /> SMART EXAM PARSER (CHUẨN CẤU TRÚC BỘ GD&amp;ĐT 2025+)
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              Dán Đề thi công khai (Word / PDF text) → Tự tách câu hỏi, đáp án &amp; lời giải
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRawText(SAMPLE_RAW_EXAM)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
          >
            <Sparkles className="h-3.5 w-3.5" /> Nạp ví dụ chuẩn 3 phần
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Tên đề thi</label>
            <input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Lớp &amp; Môn</label>
            <div className="mt-1 flex gap-2">
              <select
                value={gradeId}
                onChange={(e) => setGradeId(Number(e.target.value))}
                className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Lớp {g}</option>
                ))}
              </select>
              <select
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                {(subjects.length ? subjects : [{ id: 1, code: "toan", name: "Toán học" }]).map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Thời gian (phút)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <textarea
          rows={9}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Dán nội dung đề thi dạng Câu 1. ... A. ... B. ... C. ... D. ... Đáp án: A ... (Hỗ trợ cả PHẦN II Đúng/Sai a) b) c) d) và PHẦN III Trả lời ngắn)"
          className="w-full rounded-xl border border-slate-300 p-3.5 font-mono text-xs focus:border-purple-500 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={parsing}
            onClick={handleParseText}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-500 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" />
            {parsing ? "Đang tách câu hỏi..." : "Phân tích & Xem trước"}
          </button>

          {parsedQuestions.length > 0 && (
            <button
              type="button"
              disabled={importingParsed}
              onClick={handlePublishParsedExam}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {importingParsed
                ? "Đang lưu PostgreSQL..."
                : `Xuất bản ${parsedQuestions.length} câu thành Đề thi`}
            </button>
          )}
        </div>

        {/* Xem trước các câu hỏi đã tách với KaTeX */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Xem trước kết quả tách tự động ({parsedQuestions.length} câu hỏi)
            </p>
            {parsedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700">
                    Câu {idx + 1} • Dạng: {q.q_type}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                    Đáp án:{" "}
                    {q.answer_single ||
                      (q.answer_short ? q.answer_short.join(" / ") : "") ||
                      (q.answer_true_false
                        ? Object.entries(q.answer_true_false)
                            .map(([k, v]) => `${k}-${v ? "Đ" : "S"}`)
                            .join(", ")
                        : "")}
                  </span>
                </div>
                <MathContent content={q.content_mdx} className="text-sm" />
                {q.options && q.options.length > 0 && (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <div key={o.key} className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                        <strong className="mr-1">{o.key}.</strong>
                        <MathContent content={o.text} className="inline" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
