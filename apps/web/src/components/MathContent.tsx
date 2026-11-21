"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathContentProps {
  content: string;
  className?: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderLatexInsideHtml(html: string): string {
  // Render display math $$...$$ trước
  let out = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => {
    const clean = expr.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    try {
      return `<div class="my-2 overflow-x-auto">${katex.renderToString(clean, {
        displayMode: true,
        throwOnError: false,
      })}</div>`;
    } catch {
      return expr;
    }
  });
  // Render inline math $...$
  out = out.replace(/\$([^$\n<]+?)\$/g, (_, expr: string) => {
    const clean = expr.replace(/&nbsp;/g, " ").trim();
    try {
      return katex.renderToString(clean, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return expr;
    }
  });
  return out;
}

function sanitizeWordHtml(rawHtml: string): string {
  // Loại bỏ script/iframe/event handler để đảm bảo an toàn XSS khi hiển thị nội dung soạn từ Word Editor
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function renderInlineFormatting(text: string): string {
  const mathTokens: string[] = [];
  let processed = text.replace(/\$([^$\n]+?)\$/g, (_, expr: string) => {
    let html = "";
    try {
      html = katex.renderToString(expr.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      html = escapeHtml(expr);
    }
    const idx = mathTokens.push(html) - 1;
    return `%%MATH_${idx}%%`;
  });

  processed = escapeHtml(processed);
  processed = processed.replace(
    /\*\*(.+?)\*\*/g,
    "<strong class='font-semibold text-slate-900'>$1</strong>"
  );
  processed = processed.replace(/\*(.+?)\*/g, "<em class='italic'>$1</em>");
  processed = processed.replace(
    /`([^`]+?)`/g,
    "<code class='rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-indigo-700'>$1</code>"
  );

  processed = processed.replace(/%%MATH_(\d+)%%/g, (_, idxStr: string) => {
    return mathTokens[Number(idxStr)] ?? "";
  });

  return processed;
}

function renderMarkdownWithKaTeX(source: string): string {
  if (!source) return "";

  // Nếu là tài liệu soạn từ Trình soạn thảo kiểu Word
  if (source.trim().startsWith("<!--word-doc-->")) {
    const body = source.replace("<!--word-doc-->", "").trim();
    return renderLatexInsideHtml(sanitizeWordHtml(body));
  }

  const blockMaths: string[] = [];
  const withPlaceholders = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => {
    let html = "";
    try {
      html = katex.renderToString(expr.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      html = escapeHtml(expr);
    }
    const idx = blockMaths.push(`<div class="my-2 overflow-x-auto">${html}</div>`) - 1;
    return `\n%%BLOCK_MATH_${idx}%%\n`;
  });

  const lines = withPlaceholders.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }

    const blockMatch = line.match(/^%%BLOCK_MATH_(\d+)%%$/);
    if (blockMatch) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(blockMaths[Number(blockMatch[1])] ?? "");
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<h3 class="mt-4 mb-2 text-base font-bold text-slate-900">${renderInlineFormatting(line.slice(4))}</h3>`
      );
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      if (!inList) {
        out.push('<ul class="my-2 list-disc space-y-1 pl-5">');
        inList = true;
      }
      out.push(`<li>${renderInlineFormatting(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(`<p class="my-1.5 leading-relaxed">${renderInlineFormatting(line)}</p>`);
  }

  if (inList) {
    out.push("</ul>");
  }
  return out.join("\n");
}

export function MathContent({ content, className = "" }: MathContentProps) {
  const html = useMemo(() => renderMarkdownWithKaTeX(content), [content]);
  return (
    <div
      className={`edu-doc-content text-slate-700 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-1.5 [&_th]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-xl ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
