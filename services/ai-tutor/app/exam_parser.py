import re
from typing import Any, Dict, List


def parse_raw_exam_text(
    raw_text: str,
    grade_id: int = 12,
    subject_code: str = "toan",
    default_topic: str = "Đề thi tổng hợp",
) -> List[Dict[str, Any]]:
    """
    Trình tách đề thi chuẩn Việt Nam (GDPT 2018 / cấu trúc Bộ GD&ĐT 2025+):
    - Hỗ trợ PHẦN I (1 đáp án A/B/C/D), PHẦN II (Đúng/Sai 4 ý a/b/c/d), PHẦN III (Trả lời ngắn).
    - Tự nhận diện đáp án inline ('Đáp án: B', 'Đáp án: a-Đ, b-S, c-Đ, d-Đ', 'Đáp án: 4.5')
      hoặc bảng đáp án ở cuối file ('1A 2B 3C 4D').
    - Tự tách 'Lời giải:' / 'Hướng dẫn giải:'.
    """
    text = raw_text.replace("\r\n", "\n").strip()
    if not text:
        return []

    # 1. Tìm bảng đáp án ở cuối (nếu có dạng: BẢNG ĐÁP ÁN \n 1A 2B 3C 4D hoặc 1.A 2.B)
    bottom_answers: Dict[int, str] = {}
    ans_table_match = re.search(
        r"(?im)^(?:BẢNG ĐÁP ÁN|ĐÁP ÁN THAM KHẢO|ĐÁP ÁN TRẮC NGHIỆM)\s*:?\s*$([\s\S]+)$",
        text,
    )
    if ans_table_match:
        table_body = ans_table_match.group(1)
        for m in re.finditer(r"(\d+)\s*[.\-:]?\s*([A-D])\b", table_body, flags=re.IGNORECASE):
            bottom_answers[int(m.group(1))] = m.group(2).upper()
        text = text[: ans_table_match.start()].strip()

    # 2. Tách các khối câu hỏi theo 'Câu <số>.' hoặc 'Câu <số>:' hoặc 'Bài <số>.'
    q_pattern = re.compile(r"(?im)^(?:Câu|Bài)\s+(\d+)\s*[:.)]\s*")
    matches = list(q_pattern.finditer(text))
    if not matches:
        return []

    questions: List[Dict[str, Any]] = []
    for idx, match in enumerate(matches):
        q_num = int(match.group(1))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        block = text[start:end].strip()

        # Xác định ngữ cảnh PHẦN (I / II / III) xuất hiện gần nhất trước câu này
        prefix = text[: match.start()]
        section_matches = list(re.finditer(r"(?im)^PHẦN\s+(I{1,3}|[123])\b.*$", prefix))
        current_section = section_matches[-1].group(1).upper() if section_matches else ""

        # Tách lời giải nếu có
        explanation = ""
        exp_match = re.search(r"(?im)^(?:Lời giải|Hướng dẫn giải|Giải thích)\s*[:.]?\s*", block)
        if exp_match:
            explanation = block[exp_match.end() :].strip()
            block = block[: exp_match.start()].strip()

        # Tách đáp án inline nếu có
        inline_ans = ""
        ans_match = re.search(r"(?im)^(?:Đáp án|Đáp số|Chọn)\s*[:.]?\s*(.+)$", block)
        if ans_match:
            inline_ans = ans_match.group(1).strip()
            block = (block[: ans_match.start()] + "\n" + block[ans_match.end() :]).strip()

        # Kiểm tra dạng câu hỏi:
        # (a) Dạng Đúng/Sai 4 ý: a) ... b) ... c) ... d) ...
        tf_opts = re.findall(r"(?m)^\s*([a-d])\s*[).]\s*(.+)$", block)
        # (b) Dạng Trắc nghiệm A. / B. / C. / D. (hỗ trợ cả nằm trên cùng 1 dòng hoặc nhiều dòng)
        mc_split = re.split(r"(?:^|\s)([A-D])\s*[.)]\s+", block)

        if len(tf_opts) >= 2 or current_section in ("II", "2"):
            # Tách đề bài trước ý a)
            first_opt = re.search(r"(?m)^\s*a\s*[).]\s*", block)
            stem = block[: first_opt.start()].strip() if first_opt else block
            options = [{"key": k.lower(), "text": v.strip()} for k, v in tf_opts]

            tf_map: Dict[str, bool] = {"a": True, "b": True, "c": False, "d": True}
            if inline_ans:
                # Hỗ trợ format: "a-Đ, b-S, c-Đ, d-S" hoặc "a) Đúng, b) Sai..." hoặc "Đ S Đ S"
                parsed_pairs = re.findall(r"([a-d])\s*[-:.)]?\s*(Đúng|Sai|Đ|S|True|False|T|F)", inline_ans, flags=re.IGNORECASE)
                if parsed_pairs:
                    tf_map = {}
                    for k, val in parsed_pairs:
                        tf_map[k.lower()] = val.lower() in ("đúng", "đ", "true", "t")
                else:
                    seq = re.findall(r"\b(Đúng|Sai|Đ|S|T|F)\b", inline_ans, flags=re.IGNORECASE)
                    keys = ["a", "b", "c", "d"]
                    if len(seq) >= 2:
                        tf_map = {keys[i]: seq[i].lower() in ("đúng", "đ", "t") for i in range(min(4, len(seq)))}

            questions.append(
                {
                    "grade_id": grade_id,
                    "subject_code": subject_code,
                    "topic": default_topic,
                    "q_type": "true_false_group",
                    "difficulty": "van_dung",
                    "content_mdx": stem,
                    "options": options,
                    "answer_true_false": tf_map,
                    "explanation_mdx": explanation,
                }
            )
        elif len(mc_split) >= 5:
            stem = mc_split[0].strip()
            options = []
            for i in range(1, len(mc_split) - 1, 2):
                k = mc_split[i].upper()
                v = mc_split[i + 1].strip()
                if k in ("A", "B", "C", "D") and v:
                    options.append({"key": k, "text": v})

            ans_single = bottom_answers.get(q_num, "")
            if inline_ans:
                m_ans = re.search(r"\b([A-D])\b", inline_ans.upper())
                if m_ans:
                    ans_single = m_ans.group(1)
            if not ans_single:
                ans_single = "A"

            questions.append(
                {
                    "grade_id": grade_id,
                    "subject_code": subject_code,
                    "topic": default_topic,
                    "q_type": "single_choice",
                    "difficulty": "thong_hieu",
                    "content_mdx": stem,
                    "options": options,
                    "answer_single": ans_single,
                    "explanation_mdx": explanation,
                }
            )
        else:
            # Dạng trả lời ngắn (PHẦN III)
            accepted = [s.strip() for s in re.split(r"[;|/]", inline_ans) if s.strip()] if inline_ans else ["0"]
            questions.append(
                {
                    "grade_id": grade_id,
                    "subject_code": subject_code,
                    "topic": default_topic,
                    "q_type": "short_answer",
                    "difficulty": "van_dung",
                    "content_mdx": block,
                    "options": [],
                    "unit_hint": "Nhập đáp số",
                    "answer_short": accepted,
                    "explanation_mdx": explanation,
                }
            )

    return questions
