"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  FileEdit,
  Heading1,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Lightbulb,
  List,
  ListOrdered,
  Redo2,
  Sigma,
  Table,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

interface RichWordEditorProps {
  value: string;
  onChange: (htmlWithMarker: string) => void;
}

const MATH_PRESETS = [
  { label: "Phân số", latex: "\\frac{a}{b}" },
  { label: "Căn bậc hai", latex: "\\sqrt{x^2 + 1}" },
  { label: "Lũy thừa", latex: "x^n" },
  { label: "Tích phân", latex: "\\int_a^b f(x)\\,dx" },
  { label: "Đạo hàm", latex: "f'(x) = 3x^2 - 3" },
  { label: "Hệ PT", latex: "\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}" },
  { label: "Vectơ", latex: "\\vec{a} \\cdot \\vec{b}" },
  { label: "Lôgarit", latex: "\\log_a b" },
  { label: "Hóa học", latex: "\\text{CH}_3\\text{COOH} + \\text{NaOH} \\rightarrow \\text{CH}_3\\text{COONa} + \\text{H}_2\\text{O}" },
];

export function RichWordEditor({ value, onChange }: RichWordEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathInput, setMathInput] = useState("\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}");
  const [mathDisplayBlock, setMathDisplayBlock] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  // Đồng bộ nội dung khởi tạo một lần khi mount hoặc khi form reset về rỗng
  useEffect(() => {
    if (!editorRef.current) return;
    const cleanIncoming = value.replace("<!--word-doc-->", "");
    if (editorRef.current.innerHTML !== cleanIncoming) {
      editorRef.current.innerHTML = cleanIncoming;
      updateWordCount(editorRef.current.innerText);
    }
  }, [value]);

  const updateWordCount = (plain: string) => {
    const words = plain.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    updateWordCount(editorRef.current.innerText);
    onChange(`<!--word-doc-->${html}`);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  };

  const insertHtml = (snippet: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, snippet);
    emitChange();
  };

  const handleInsertFormula = () => {
    if (!mathInput.trim()) return;
    const wrapped = mathDisplayBlock
      ? `<p style="text-align:center;margin:8px 0;">$$${mathInput.trim()}$$</p><p><br></p>`
      : `<span> $${mathInput.trim()}$ </span>`;
    insertHtml(wrapped);
    setShowMathModal(false);
  };

  const handleInsertCallout = () => {
    insertHtml(
      `<div style="background:#eef2ff;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:10px;margin:12px 0;"><strong>Ghi nhớ trọng tâm:</strong> Nhập nội dung công thức hoặc lưu ý quan trọng cho học sinh tại đây...</div><p><br></p>`
    );
  };

  const handleInsertTable = () => {
    insertHtml(
      `<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr><th>Khái niệm</th><th>Công thức</th><th>Ví dụ minh họa</th></tr></thead><tbody><tr><td>Mục 1</td><td>$y' = 0$</td><td>Ví dụ 1</td></tr><tr><td>Mục 2</td><td>$S = a \\times h / 2$</td><td>Ví dụ 2</td></tr></tbody></table><p><br></p>`
    );
  };

  const handleInsertImage = () => {
    const url = window.prompt("Dán đường dẫn ảnh minh họa (URL hình vẽ, đồ thị):");
    if (url && url.trim()) {
      insertHtml(
        `<p style="text-align:center;"><img src="${url.trim()}" alt="Hình minh họa bài giảng" style="max-width:100%;border-radius:12px;margin:8px auto;" /></p><p><br></p>`
      );
    }
  };

  const mathPreviewHtml = (() => {
    try {
      return katex.renderToString(mathInput.trim() || "x", {
        displayMode: mathDisplayBlock,
        throwOnError: false,
      });
    } catch {
      return mathInput;
    }
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-xs">
      {/* === RIBBON TOOLBAR KIỂU MICROSOFT WORD === */}
      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Undo / Redo */}
            <ToolbarBtn title="Hoàn tác (Ctrl+Z)" onClick={() => exec("undo")}>
              <Undo2 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Làm lại (Ctrl+Y)" onClick={() => exec("redo")}>
              <Redo2 className="h-4 w-4" />
            </ToolbarBtn>

            <Divider />

            {/* Kiểu chữ / Heading */}
            <ToolbarBtn title="Tiêu đề lớn (H1)" onClick={() => exec("formatBlock", "H2")}>
              <Heading1 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Tiêu đề mục (H2)" onClick={() => exec("formatBlock", "H3")}>
              <Heading2 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Đoạn văn thường" onClick={() => exec("formatBlock", "P")}>
              <span className="px-1 text-xs font-bold">P</span>
            </ToolbarBtn>

            <Divider />

            {/* Định dạng cơ bản */}
            <ToolbarBtn title="In đậm (Ctrl+B)" onClick={() => exec("bold")}>
              <Bold className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="In nghiêng (Ctrl+I)" onClick={() => exec("italic")}>
              <Italic className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Gạch chân (Ctrl+U)" onClick={() => exec("underline")}>
              <Underline className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Tô sáng vàng (Highlight)" onClick={() => exec("hiliteColor", "#fef08a")}>
              <Highlighter className="h-4 w-4 text-amber-600" />
            </ToolbarBtn>

            <Divider />

            {/* Căn lề */}
            <ToolbarBtn title="Căn trái" onClick={() => exec("justifyLeft")}>
              <AlignLeft className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Căn giữa" onClick={() => exec("justifyCenter")}>
              <AlignCenter className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Căn phải" onClick={() => exec("justifyRight")}>
              <AlignRight className="h-4 w-4" />
            </ToolbarBtn>

            <Divider />

            {/* Danh sách */}
            <ToolbarBtn title="Danh sách gạch đầu dòng" onClick={() => exec("insertUnorderedList")}>
              <List className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Danh sách đánh số 1, 2, 3" onClick={() => exec("insertOrderedList")}>
              <ListOrdered className="h-4 w-4" />
            </ToolbarBtn>

            <Divider />

            {/* Các khối chuyên dụng cho Giáo dục */}
            <button
              type="button"
              onClick={() => setShowMathModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
            >
              <Sigma className="h-3.5 w-3.5" /> Công thức
            </button>
            <button
              type="button"
              onClick={handleInsertCallout}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
            >
              <Lightbulb className="h-3.5 w-3.5" /> Ghi nhớ
            </button>
            <ToolbarBtn title="Chèn Bảng biểu" onClick={handleInsertTable}>
              <Table className="h-4 w-4 text-slate-700" />
            </ToolbarBtn>
            <ToolbarBtn title="Chèn Ảnh minh họa" onClick={handleInsertImage}>
              <ImageIcon className="h-4 w-4 text-slate-700" />
            </ToolbarBtn>
          </div>

          {/* Nút chuyển Soạn thảo / Xem như Học sinh */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                viewMode === "edit" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" /> Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                viewMode === "preview" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Xem bản học sinh
            </button>
          </div>
        </div>
      </div>

      {/* === TRANG GIẤY A4 KIỂU MICROSOFT WORD === */}
      <div className="p-4 sm:p-6">
        <div
          className={`mx-auto min-h-[340px] max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${
            viewMode === "preview" ? "hidden" : "block"
          }`}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            className="min-h-[280px] text-sm leading-relaxed text-slate-800 outline-none [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-indigo-900 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:font-semibold"
          />
        </div>

        {viewMode === "preview" && (
          <div className="mx-auto min-h-[340px] max-w-3xl rounded-xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-3 inline-block rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-bold text-emerald-700">
              Bản hiển thị thực tế của Học sinh (Công thức KaTeX đã render)
            </p>
            <MathContent content={value} />
          </div>
        )}
      </div>

      {/* === THANH TRẠNG THÁI ĐÁY TRANG KIỂU WORD === */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-500">
        <span>Trình soạn thảo Bài giảng chuẩn Word • Hỗ trợ gõ trực tiếp &amp; chèn công thức KaTeX</span>
        <span className="font-semibold text-slate-700">{wordCount} từ</span>
      </div>

      {/* === POPUP CHÈN CÔNG THỨC TOÁN / LÝ / HÓA === */}
      {showMathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Chèn Công thức Toán / Lý / Hóa (KaTeX)
              </h3>
              <button
                type="button"
                onClick={() => setShowMathModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Chọn nhanh mẫu công thức:</p>
              <div className="flex flex-wrap gap-1.5">
                {MATH_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMathInput(p.latex)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Mã công thức (LaTeX)</label>
              <input
                type="text"
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                Xem trước công thức
              </p>
              <div dangerouslySetInnerHTML={{ __html: mathPreviewHtml }} />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={mathDisplayBlock}
                  onChange={(e) => setMathDisplayBlock(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                Hiển thị căn giữa dòng riêng
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMathModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleInsertFormula}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Chèn vào bài giảng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-slate-700 hover:bg-slate-100 active:bg-indigo-50 active:text-indigo-700 transition"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}
