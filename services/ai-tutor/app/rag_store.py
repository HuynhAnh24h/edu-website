import hashlib
import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass
from typing import List, Optional

import psycopg

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://edu_admin:edu_dev_password@127.0.0.1:5432/edu_k12",
)
VECTOR_DIM = 768


@dataclass
class KnowledgeChunk:
    id: str
    grade_id: int
    subject: str
    citation: str
    content: str


SEED_KNOWLEDGE = [
    (1, "toan", "kntt", "SGK Toán 1 (KNTT) — Phép cộng, trừ phạm vi 10",
     "Ở lớp 1, học sinh làm quen với phép cộng $a + b$ bằng cách gộp hai nhóm đồ vật hoặc đếm tiếp từ số lớn hơn. Không dùng số âm hay ẩn $x$."),
    (4, "toan", "kntt", "SGK Toán 4 (KNTT) — Phân số & Rút gọn phân số",
     "Phân số $\\frac{a}{b}$ gồm tử số $a$ và mẫu số $b \\neq 0$. Rút gọn phân số bằng cách chia cả tử và mẫu cho cùng một số tự nhiên lớn hơn $1$."),
    (5, "toan", "kntt", "SGK Toán 5 (KNTT) — Diện tích hình tam giác, hình thang",
     "Diện tích hình tam giác: $S = \\frac{a \\times h}{2}$. Diện tích hình thang: $S = \\frac{(a + b) \\times h}{2}$ (cùng đơn vị đo)."),
    (8, "toan", "kntt", "SGK Toán 8 (KNTT) — 7 Hằng đẳng thức đáng nhớ",
     "Ba hằng đẳng thức trọng tâm: $(A+B)^2 = A^2 + 2AB + B^2$, $(A-B)^2 = A^2 - 2AB + B^2$, và $A^2 - B^2 = (A-B)(A+B)$."),
    (9, "toan", "ctst", "SGK Toán 9 (CTST) — Phương trình bậc hai & Định lý Viète",
     "Với $ax^2 + bx + c = 0$ ($a \\neq 0$), biệt thức $\\Delta = b^2 - 4ac$. Khi $\\Delta \\ge 0$, theo hệ thức Viète: $x_1 + x_2 = -\\frac{b}{a}$, $x_1 x_2 = \\frac{c}{a}$, và $x_1^2 + x_2^2 = (x_1+x_2)^2 - 2x_1x_2$."),
    (11, "toan", "kntt", "SGK Toán 11 (KNTT) — Hàm số & Phương trình lượng giác",
     "Phương trình cơ bản $\\sin x = \\sin \\alpha \\Leftrightarrow x = \\alpha + k2\\pi$ hoặc $x = \\pi - \\alpha + k2\\pi$ ($k \\in \\mathbb{Z}$). Công thức cơ bản: $\\sin^2 x + \\cos^2 x = 1$."),
    (12, "toan", "kntt", "SGK Toán 12 (KNTT) — Chương 1: Ứng dụng đạo hàm & Cực trị",
     "Để tìm cực trị của $y = f(x)$: (1) Tìm tập xác định và tính $f'(x)$; (2) Giải $f'(x) = 0$; (3) Lập bảng biến thiên xét dấu $f'(x)$: đổi dấu $(+) \\to (-)$ là cực đại, $(-) \\to (+)$ là cực tiểu."),
    (12, "toan", "kntt", "SGK Toán 12 (KNTT) — Chương 4: Nguyên hàm & Tích phân",
     "Công thức Newton–Leibniz: $\\int_a^b f(x)\\,dx = F(b) - F(a)$ với $F'(x) = f(x)$. Ví dụ: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C$ ($n \\neq -1$)."),
    (12, "vat-ly", "kntt", "SGK Vật lý 12 (KNTT) — Chương 1: Vật lí nhiệt",
     "Định luật I Nhiệt động lực học: $\\Delta U = A + Q$. Quy ước dấu: $Q > 0$ (nhận nhiệt), $Q < 0$ (tỏa nhiệt); $A > 0$ (nhận công), $A < 0$ (thực hiện công). Nhiệt lượng: $Q = m c \\Delta T$."),
    (12, "tieng-anh", "general", "SGK Tiếng Anh 12 Global Success — Unit 1: Past Tenses",
     "Dùng Past Continuous (was/were + V-ing) cho hành động đang diễn ra ở quá khứ và Past Simple (V2/V-ed) cho hành động bất ngờ xen vào."),
]


def tokenize(text: str) -> Counter:
    cleaned = re.sub(
        r"[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
        " ",
        text.lower(),
    )
    tokens = [t for t in cleaned.split() if len(t) > 0]
    return Counter(tokens)


def cosine_similarity(c1: Counter, c2: Counter) -> float:
    if not c1 or not c2:
        return 0.0
    common = set(c1.keys()) & set(c2.keys())
    dot = sum(c1[k] * c2[k] for k in common)
    norm1 = math.sqrt(sum(v * v for v in c1.values()))
    norm2 = math.sqrt(sum(v * v for v in c2.values()))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def embed_text_768(text: str) -> str:
    """Tạo vector 768 chiều chuẩn hóa L2 (feature hashing unigram + bigram) lưu trực tiếp vào pgvector."""
    vec = [0.0] * VECTOR_DIM
    tokens = list(tokenize(text).keys())
    features = list(tokens)
    for i in range(len(tokens) - 1):
        features.append(f"{tokens[i]}_{tokens[i+1]}")

    for feat in features:
        h = hashlib.blake2b(feat.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(h[:4], "little") % VECTOR_DIM
        sign = 1.0 if (h[4] & 1) == 0 else -1.0
        vec[idx] += sign

    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return "[" + ",".join(str(x) for x in vec) + "]"


def _get_conn():
    return psycopg.connect(DATABASE_URL, autocommit=True)


def init_pgvector_store() -> bool:
    """Kết nối PostgreSQL pgvector và nạp kho tri thức SGK 1-12 lần đầu nếu bảng trống."""
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM knowledge_chunks")
                count = cur.fetchone()[0]
                if count == 0:
                    for grade_id, sub_code, textbook, citation, content in SEED_KNOWLEDGE:
                        cur.execute("SELECT id FROM subjects WHERE code = %s", (sub_code,))
                        row = cur.fetchone()
                        if not row:
                            continue
                        subject_id = row[0]
                        emb = embed_text_768(f"{citation} {content}")
                        meta = json.dumps({"citation": citation}, ensure_ascii=False)
                        cur.execute(
                            """
                            INSERT INTO knowledge_chunks (grade_id, subject_id, textbook, chunk_text, metadata_json, embedding)
                            VALUES (%s, %s, %s::textbook_series, %s, %s::jsonb, %s::vector)
                            """,
                            (grade_id, subject_id, textbook, content, meta, emb),
                        )
        return True
    except Exception as exc:
        print(f"⚠️ pgvector init warning: {exc}")
        return False


def add_knowledge_chunk(
    grade_id: int, subject_code: str, textbook: str, citation: str, content: str
) -> Optional[str]:
    """Cho phép CMS nạp thêm bài giảng mới trực tiếp vào PostgreSQL pgvector."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM subjects WHERE code = %s", (subject_code,))
            row = cur.fetchone()
            if not row:
                return None
            subject_id = row[0]
            emb = embed_text_768(f"{citation} {content}")
            meta = json.dumps({"citation": citation}, ensure_ascii=False)
            cur.execute(
                """
                INSERT INTO knowledge_chunks (grade_id, subject_id, textbook, chunk_text, metadata_json, embedding)
                VALUES (%s, %s, %s::textbook_series, %s, %s::jsonb, %s::vector)
                RETURNING id::text
                """,
                (grade_id, subject_id, textbook or "kntt", content, meta, emb),
            )
            return cur.fetchone()[0]


def retrieve_grade_locked_chunks(
    query: str, grade_id: int, subject: str, top_k: int = 2
) -> List[KnowledgeChunk]:
    """Truy vấn pgvector thật trên PostgreSQL với bộ lọc cứng grade_id để AI không giải vượt cấp."""
    q_emb = embed_text_768(query)
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                # Ưu tiên đúng lớp & đúng môn học
                if subject != "all":
                    cur.execute(
                        """
                        SELECT kc.id::text, kc.grade_id, s.code,
                               COALESCE(kc.metadata_json->>'citation', 'SGK GDPT 2018'),
                               kc.chunk_text
                        FROM knowledge_chunks kc
                        JOIN subjects s ON kc.subject_id = s.id
                        WHERE kc.grade_id = %s AND s.code = %s
                        ORDER BY kc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (grade_id, subject, q_emb, top_k),
                    )
                else:
                    cur.execute(
                        """
                        SELECT kc.id::text, kc.grade_id, s.code,
                               COALESCE(kc.metadata_json->>'citation', 'SGK GDPT 2018'),
                               kc.chunk_text
                        FROM knowledge_chunks kc
                        JOIN subjects s ON kc.subject_id = s.id
                        WHERE kc.grade_id = %s
                        ORDER BY kc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (grade_id, q_emb, top_k),
                    )
                rows = cur.fetchall()

                # Fallback cùng cấp hoặc lớp thấp hơn (tuyệt đối không vượt quá grade_id)
                if not rows:
                    cur.execute(
                        """
                        SELECT kc.id::text, kc.grade_id, s.code,
                               COALESCE(kc.metadata_json->>'citation', 'SGK GDPT 2018'),
                               kc.chunk_text
                        FROM knowledge_chunks kc
                        JOIN subjects s ON kc.subject_id = s.id
                        WHERE kc.grade_id <= %s
                        ORDER BY kc.grade_id DESC, kc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (grade_id, q_emb, top_k),
                    )
                    rows = cur.fetchall()

                return [
                    KnowledgeChunk(id=r[0], grade_id=r[1], subject=r[2], citation=r[3], content=r[4])
                    for r in rows
                ]
    except Exception as exc:
        print(f"⚠️ pgvector query fallback: {exc}")
        return []


def pgvector_status() -> dict:
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM knowledge_chunks")
                cnt = cur.fetchone()[0]
                return {"pgvector_ok": True, "knowledge_chunks": cnt}
    except Exception:
        return {"pgvector_ok": False, "knowledge_chunks": 0}
