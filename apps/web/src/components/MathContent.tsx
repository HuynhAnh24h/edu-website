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

function renderInlineFormatting(text: string): string {
  // Bảo vệ inline math $...$ trước khi format markdown
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
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-slate-900'>$1</strong>");
  processed = processed.replace(/\*(.+?)\*/g, "<em class='italic'>$1</em>");
  processed = processed.replace(/`([^`]+?)`/g, "<code class='rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-indigo-700'>$1</code>");

  processed = processed.replace(/%%MATH_(\d+)%%/g, (_, idxStr: string) => {
    return mathTokens[Number(idxStr)] ?? "";
  });

  return processed;
}

function renderMarkdownWithKaTeX(source: string): string {
  if (!source) return "";

  // Tách block math $$...$$ trước
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
      className={`text-slate-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
