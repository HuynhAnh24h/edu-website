import asyncio
import json
import os
from typing import AsyncGenerator, List, Optional, Tuple

import httpx

from app.rag_store import KnowledgeChunk

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
AI_PROVIDER = os.getenv("AI_PROVIDER", "auto").lower()  # auto | ollama | mock


async def detect_ollama_model() -> Optional[str]:
    """Kiểm tra nhanh xem Ollama cục bộ có đang chạy không (timeout 800ms)."""
    if AI_PROVIDER == "mock":
        return None
    try:
        async with httpx.AsyncClient(timeout=0.8) as client:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if res.status_code != 200:
                return None
            models = [m.get("name", "") for m in res.json().get("models", [])]
            if not models:
                return None
            if OLLAMA_MODEL in models:
                return OLLAMA_MODEL
            return models[0]
    except Exception:
        return None


def build_system_prompt(grade_id: int, subject: str, tutor_mode: str, chunks: List[KnowledgeChunk]) -> str:
    level_rule = (
        "Học sinh Tiểu học (lớp 1–5): dùng ngôn ngữ cực kỳ thân thiện, ví dụ gần gũi, KHÔNG dùng đại số ẩn x hay số âm."
        if grade_id <= 5
        else "Học sinh THCS (lớp 6–9): giải thích mạch lạc, bám sát chương trình THCS, KHÔNG dùng đạo hàm/tích phân của THPT."
        if grade_id <= 9
        else "Học sinh THPT (lớp 10–12): chặt chẽ, chuẩn định dạng thi tốt nghiệp THPT 2025+."
    )

    mode_instruction = {
        "socratic": "PHƯƠNG PHÁP SOCRATIC: Không đưa ngay đáp án cuối cùng. Hãy phân tích đề, gợi ý bước đầu tiên kèm công thức liên quan và đặt 1 câu hỏi gợi mở để học sinh tự tính.",
        "explain": "GIẢI CHI TIẾT: Trình bày lời giải rõ ràng từng bước bằng LaTeX ($...$ và $$...$$), chỉ ra lỗi sai hay gặp.",
        "check_homework": "CHỮA BÀI LÀM: Khen điểm làm đúng trước, chỉ rõ chỗ sai (nếu có) và hướng dẫn sửa nhẹ nhàng.",
    }.get(tutor_mode, "Hướng dẫn học sinh từng bước rõ ràng.")

    rag_context = "\n".join([f"- [{c.citation}]: {c.content}" for c in chunks]) or "Áp dụng kiến thức chuẩn chương trình GDPT 2018."

    return (
        f"Bạn là Gia sư AI chuyên môn {subject} cho học sinh Lớp {grade_id} tại Việt Nam.\n"
        f"{level_rule}\n"
        f"{mode_instruction}\n"
        f"Kiến thức SGK liên quan (bắt buộc bám sát):\n{rag_context}\n"
        "Luôn viết công thức toán học bằng LaTeX hợp lệ ($...$ hoặc $$...$$)."
    )


async def stream_from_ollama(
    model_name: str, system_prompt: str, user_message: str
) -> AsyncGenerator[str, None]:
    payload = {
        "model": model_name,
        "stream": True,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                data = json.loads(line)
                token = data.get("message", {}).get("content", "")
                if token:
                    yield token
                if data.get("done"):
                    break


def generate_mock_response(
    grade_id: int, subject: str, tutor_mode: str, user_message: str, chunks: List[KnowledgeChunk]
) -> str:
    """Bộ Gia sư AI Mock thông minh bám sát đúng SGK lớp 1-12 để test miễn phí không cần GPU/API key."""
    rag_note = chunks[0].content if chunks else f"Áp dụng kiến thức chuẩn môn {subject} lớp {grade_id} (GDPT 2018)."
    citation = chunks[0].citation if chunks else f"Chương trình GDPT 2018 — Lớp {grade_id}"

    q_lower = user_message.lower()

    # Kịch bản cụ thể phổ biến cho trải nghiệm demo cực mượt
    if "cực trị" in q_lower or "đạo hàm" in q_lower or "x^3" in q_lower:
        if tutor_mode == "socratic":
            return (
                f"Chào em! Với bài toán **cực trị hàm số Lớp {grade_id}** này, thầy sẽ dẫn em giải từng bước theo phương pháp Socratic nhé:\n\n"
                f"1. **Kiến thức SGK ({citation}):**\n   {rag_note}\n\n"
                f"2. **Bước 1 — Tính đạo hàm:**\n   Với hàm bậc 3 dạng $y = x^3 - 3x + 2$, ta áp dụng công thức $(x^n)' = n x^{{n-1}}$.\n\n"
                f"👉 **Câu hỏi gợi mở cho em:** Em thử tính giúp thầy $y' = ?$ và cho biết phương trình $y' = 0$ có những nghiệm nào nhé!"
            )
        return (
            f"### Lời giải chi tiết (Chuẩn {citation})\n\n"
            f"1. **Tập xác định:** $D = \\mathbb{{R}}$.\n"
            f"2. **Tính đạo hàm:**\n$$y' = 3x^2 - 3$$\n"
            f"3. **Giải $y' = 0$:** $3x^2 - 3 = 0 \\Leftrightarrow x = -1$ hoặc $x = 1$.\n"
            f"4. **Kết luận từ bảng biến thiên:**\n"
            f"- Qua $x = -1$, $y'$ đổi dấu từ $(+)$ sang $(-)$ $\\Rightarrow$ đạt **cực đại** tại $x = -1$ ($y_{{\\text{{CĐ}}}} = 4$).\n"
            f"- Qua $x = 1$, $y'$ đổi dấu từ $(-)$ sang $(+)$ $\\Rightarrow$ đạt **cực tiểu** tại $x = 1$ ($y_{{\\text{{CT}}}} = 0$).\n\n"
            f"💡 *Mẹo tránh bẫy đề thi 2025:* Nhớ phân biệt **điểm cực đại của hàm số** ($x = -1$) và **giá trị cực đại** ($y = 4$)."
        )

    if "viète" in q_lower or "vi-ét" in q_lower or "bậc hai" in q_lower or "delta" in q_lower:
        if tutor_mode == "socratic":
            return (
                f"Rất hay! Dạng **Phương trình bậc hai & Viète Lớp {grade_id}** gần như năm nào cũng có trong đề thi vào 10.\n\n"
                f"- **Nhắc lại công thức ({citation}):**\n  $$x_1 + x_2 = -\\frac{{b}}{{a}}, \\qquad x_1 x_2 = \\frac{{c}}{{a}}$$\n\n"
                f"👉 **Bước đầu tiên em cần làm trước khi dùng Viète là gì?** (Gợi ý: Điều kiện về biệt thức $\\Delta$ để phương trình có nghiệm!). Em trả lời thử xem nào?"
            )
        return (
            f"### Hướng dẫn chuẩn thi vào 10 ({citation})\n\n"
            f"{rag_note}\n\n"
            f"**Quy trình 3 bước không bao giờ mất điểm:**\n"
            f"1. Kiểm tra điều kiện có nghiệm $\\Delta = b^2 - 4ac \\ge 0$.\n"
            f"2. Viết tổng $S = x_1 + x_2 = -\\dfrac{{b}}{{a}}$ và tích $P = x_1 x_2 = \\dfrac{{c}}{{a}}$.\n"
            f"3. Biến đổi biểu thức đề bài về $S$ và $P$, ví dụ: $x_1^2 + x_2^2 = S^2 - 2P$."
        )

    if grade_id <= 5:
        return (
            f"Chào bé lớp {grade_id}! 🌟 Thầy AI rất vui được học cùng bé.\n\n"
            f"Dựa theo **{citation}**:\n{rag_note}\n\n"
            f"Với câu hỏi *\"{user_message}\"*:\n"
            f"- **Bước 1:** Bé đọc thật kỹ xem đề bài cho biết những số nào nhé.\n"
            f"- **Bước 2:** Bé thử áp dụng công thức ở trên và nhắn cho thầy kết quả bé tính được để thầy kiểm tra và thưởng sao nhé! ⭐"
        )

    if tutor_mode == "check_homework":
        return (
            f"### Nhận xét bài làm (Lớp {grade_id} — {citation})\n\n"
            f"- **Điểm cộng:** Em đã xác định đúng hướng tiếp cận trọng tâm của bài.\n"
            f"- **Kiến thức cần đối chiếu:** {rag_note}\n"
            f"- **Gợi ý hoàn thiện:** Hãy kiểm tra kỹ lại điều kiện xác định và dấu trong bước biến đổi cuối cùng. Em có thể dán chi tiết từng dòng lời giải để thầy soi lỗi chính xác hơn nhé!"
        )

    if tutor_mode == "socratic":
        return (
            f"Chào em! Với câu hỏi thuộc chương trình **Lớp {grade_id}** (*{citation}*), thầy sẽ gợi ý theo hướng **Socratic** để em tự tìm ra đáp án:\n\n"
            f"📌 **Kiến thức nền SGK:** {rag_note}\n\n"
            f"1. Em hãy xác định xem đề bài yêu cầu tìm đại lượng nào và đã cho những dữ kiện gì.\n"
            f"2. Theo em, công thức nào trong phần kiến thức nền trên kết nối trực tiếp dữ kiện đó?\n\n"
            f"👉 Em thử viết bước đầu tiên ra đây, thầy sẽ đồng hành tiếp cùng em!"
        )

    return (
        f"### Giải thích chi tiết (Lớp {grade_id} — {citation})\n\n"
        f"**1. Cơ sở lý thuyết chuẩn SGK:**\n{rag_note}\n\n"
        f"**2. Phân tích yêu cầu:** *\"{user_message}\"*\n"
        f"- Xác định dạng bài theo đúng phạm vi kiến thức **Lớp {grade_id}** (không dùng công thức vượt cấp).\n"
        f"- Thay số cẩn thận và kiểm tra lại đơn vị / điều kiện xác định trước khi kết luận.\n\n"
        f"*(Đang chạy chế độ **Mock AI miễn phí**. Khi bạn cài và chạy **Ollama** cục bộ, hệ thống sẽ tự động chuyển sang LLM thật mà không cần sửa code!)*"
    )


async def stream_mock_tokens(text: str) -> AsyncGenerator[str, None]:
    """Stream từng cụm từ qua SSE giống hệt tốc độ LLM thực tế."""
    words = text.split(" ")
    for idx, word in enumerate(words):
        chunk = word if idx == len(words) - 1 else word + " "
        yield chunk
        await asyncio.sleep(0.015)


async def run_tutor_stream(
    grade_id: int,
    subject: str,
    tutor_mode: str,
    user_message: str,
    chunks: List[KnowledgeChunk],
) -> Tuple[str, AsyncGenerator[str, None]]:
    ollama_model = await detect_ollama_model()
    if ollama_model:
        system_prompt = build_system_prompt(grade_id, subject, tutor_mode, chunks)
        return f"ollama:{ollama_model}", stream_from_ollama(ollama_model, system_prompt, user_message)

    full_text = generate_mock_response(grade_id, subject, tutor_mode, user_message, chunks)
    return "mock-socratic-k12", stream_mock_tokens(full_text)
