// Trình tách đề thi chuẩn GDPT 2018 (3 Phần: A/B/C/D, Đúng/Sai 4 ý, Trả lời ngắn) chạy trực tiếp tại Cloudflare Edge

export interface ParsedQuestionItem {
  grade_id: number;
  subject_code: string;
  topic: string;
  q_type: "single_choice" | "multi_choice" | "true_false_group" | "short_answer";
  difficulty: string;
  content_mdx: string;
  options: { key: string; text: string }[];
  unit_hint?: string;
  answer_single?: string;
  answer_true_false?: Record<string, boolean>;
  answer_short?: string[];
  explanation_mdx: string;
}

export function parseRawExamText(
  rawText: string,
  gradeId = 12,
  subjectCode = "toan",
  defaultTopic = "Đề thi tổng hợp"
): ParsedQuestionItem[] {
  let text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const bottomAnswers: Record<number, string> = {};
  const tableMatch = text.match(/^(?:BẢNG ĐÁP ÁN|ĐÁP ÁN THAM KHẢO|ĐÁP ÁN TRẮC NGHIỆM)\s*:?\s*$([\s\S]+)$/im);
  if (tableMatch && tableMatch.index !== undefined) {
    const body = tableMatch[1];
    for (const m of body.matchAll(/(\d+)\s*[.\-:]?\s*([A-D])\b/gi)) {
      bottomAnswers[Number(m[1])] = m[2].toUpperCase();
    }
    text = text.slice(0, tableMatch.index).trim();
  }

  const qRegex = /^(?:Câu|Bài)\s+(\d+)\s*[:.)]\s*/gim;
  const matches = Array.from(text.matchAll(qRegex));
  if (matches.length === 0) return [];

  const questions: ParsedQuestionItem[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const qNum = Number(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    let block = text.slice(start, end).trim();

    const prefix = text.slice(0, match.index ?? 0);
    const secMatches = Array.from(prefix.matchAll(/^PHẦN\s+(I{1,3}|[123])\b.*$/gim));
    const currentSec = secMatches.length ? secMatches[secMatches.length - 1][1].toUpperCase() : "";

    let explanation = "";
    const expMatch = block.match(/^(?:Lời giải|Hướng dẫn giải|Giải thích)\s*[:.]?\s*/im);
    if (expMatch && expMatch.index !== undefined) {
      explanation = block.slice(expMatch.index + expMatch[0].length).trim();
      block = block.slice(0, expMatch.index).trim();
    }

    let inlineAns = "";
    const ansMatch = block.match(/^(?:Đáp án|Đáp số|Chọn)\s*[:.]?\s*(.+)$/im);
    if (ansMatch && ansMatch.index !== undefined) {
      inlineAns = ansMatch[1].trim();
      block = (block.slice(0, ansMatch.index) + "\n" + block.slice(ansMatch.index + ansMatch[0].length)).trim();
    }

    const tfOpts = Array.from(block.matchAll(/^\s*([a-d])\s*[).]\s*(.+)$/gm));
    const mcSplit = block.split(/(?:^|\s)([A-D])\s*[.)]\s+/);

    if (tfOpts.length >= 2 || currentSec === "II" || currentSec === "2") {
      const firstOpt = block.match(/^\s*a\s*[).]\s*/m);
      const stem = firstOpt && firstOpt.index !== undefined ? block.slice(0, firstOpt.index).trim() : block;
      const options = tfOpts.map((m) => ({ key: m[1].toLowerCase(), text: m[2].trim() }));
      let tfMap: Record<string, boolean> = { a: true, b: true, c: false, d: true };

      if (inlineAns) {
        const pairs = Array.from(
          inlineAns.matchAll(/([a-d])\s*[-:.)]?\s*(Đúng|Sai|Đ|S|True|False|T|F)/gi)
        );
        if (pairs.length) {
          tfMap = {};
          for (const p of pairs) {
            tfMap[p[1].toLowerCase()] = ["đúng", "đ", "true", "t"].includes(p[2].toLowerCase());
          }
        }
      }

      questions.push({
        grade_id: gradeId,
        subject_code: subjectCode,
        topic: defaultTopic,
        q_type: "true_false_group",
        difficulty: "van_dung",
        content_mdx: stem,
        options,
        answer_true_false: tfMap,
        explanation_mdx: explanation,
      });
    } else if (mcSplit.length >= 5) {
      const stem = mcSplit[0].trim();
      const options: { key: string; text: string }[] = [];
      for (let j = 1; j < mcSplit.length - 1; j += 2) {
        const k = mcSplit[j].toUpperCase();
        const v = mcSplit[j + 1].trim();
        if (["A", "B", "C", "D"].includes(k) && v) options.push({ key: k, text: v });
      }
      let ansSingle = bottomAnswers[qNum] || "";
      if (inlineAns) {
        const m = inlineAns.toUpperCase().match(/\b([A-D])\b/);
        if (m) ansSingle = m[1];
      }
      questions.push({
        grade_id: gradeId,
        subject_code: subjectCode,
        topic: defaultTopic,
        q_type: "single_choice",
        difficulty: "thong_hieu",
        content_mdx: stem,
        options,
        answer_single: ansSingle || "A",
        explanation_mdx: explanation,
      });
    } else {
      const accepted = inlineAns
        ? inlineAns.split(/[;|/]/).map((s) => s.trim()).filter(Boolean)
        : ["0"];
      questions.push({
        grade_id: gradeId,
        subject_code: subjectCode,
        topic: defaultTopic,
        q_type: "short_answer",
        difficulty: "van_dung",
        content_mdx: block,
        options: [],
        unit_hint: "Nhập đáp số",
        answer_short: accepted,
        explanation_mdx: explanation,
      });
    }
  }

  return questions;
}
