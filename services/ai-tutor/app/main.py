import json
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.rag_store import (
    add_knowledge_chunk,
    init_pgvector_store,
    pgvector_status,
    retrieve_grade_locked_chunks,
)
from app.semantic_cache import SemanticCache
from app.tutor import AI_PROVIDER, OLLAMA_BASE_URL, detect_ollama_model, run_tutor_stream, stream_mock_tokens

semantic_cache = SemanticCache(similarity_threshold=0.85)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_pgvector_store()
    yield


app = FastAPI(
    title="Edu K-12 AI Tutor Service (PostgreSQL pgvector + Redis Semantic Cache + Ollama/Mock)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    grade_id: int = Field(ge=1, le=12, default=12)
    subject: str = Field(default="toan")
    tutor_mode: str = Field(default="socratic")  # socratic | explain | check_homework
    message: str = Field(min_length=1, max_length=2000)


class IngestKnowledgeRequest(BaseModel):
    grade_id: int = Field(ge=1, le=12)
    subject_code: str = Field(default="toan")
    textbook: str = Field(default="kntt")
    citation: str = Field(min_length=2, max_length=255)
    content: str = Field(min_length=10, max_length=8000)


@app.get("/health")
async def health():
    ollama_model = await detect_ollama_model()
    pg = pgvector_status()
    return {
        "status": "ok",
        "service": "edu-ai-tutor-fastapi",
        "provider_config": AI_PROVIDER,
        "active_provider": f"ollama:{ollama_model}" if ollama_model else "mock-socratic-k12",
        "ollama_url": OLLAMA_BASE_URL,
        "pgvector_ok": pg["pgvector_ok"],
        "knowledge_chunks": pg["knowledge_chunks"],
        "redis_ok": semantic_cache.is_connected(),
    }


@app.get("/api/v1/ai/stats")
async def stats():
    ollama_model = await detect_ollama_model()
    pg = pgvector_status()
    return {
        "active_provider": f"ollama:{ollama_model}" if ollama_model else "mock-socratic-k12",
        "pgvector_ok": pg["pgvector_ok"],
        "knowledge_chunks": pg["knowledge_chunks"],
        "semantic_cache": semantic_cache.stats(),
    }


@app.post("/api/v1/ai/knowledge")
async def ingest_knowledge(req: IngestKnowledgeRequest):
    chunk_id = add_knowledge_chunk(
        grade_id=req.grade_id,
        subject_code=req.subject_code,
        textbook=req.textbook,
        citation=req.citation,
        content=req.content,
    )
    if not chunk_id:
        raise HTTPException(status_code=400, detail="Không thể nạp tri thức vào pgvector (kiểm tra mã môn học).")
    return {"id": chunk_id, "status": "indexed_in_pgvector"}


def sse_event(event_name: str, data: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/v1/ai/chat/stream")
async def chat_stream(req: ChatRequest):
    started = time.perf_counter()

    async def event_generator() -> AsyncGenerator[str, None]:
        # 1. Kiểm tra Redis Semantic Cache trước (<20ms, 0đ token)
        cached = semantic_cache.lookup(req.message, req.grade_id, req.subject, req.tutor_mode)
        if cached:
            cached_text, citations, similarity = cached
            yield sse_event(
                "meta",
                {
                    "cache_hit": True,
                    "similarity": similarity,
                    "model": "redis-semantic-cache",
                    "grade_id": req.grade_id,
                    "citations": citations,
                },
            )
            yield sse_event("delta", {"text": cached_text})
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            yield sse_event("done", {"latency_ms": elapsed_ms, "cache_hit": True})
            return

        # 2. Truy xuất PostgreSQL pgvector (HNSW cosine similarity + lọc cứng grade_id)
        chunks = retrieve_grade_locked_chunks(req.message, req.grade_id, req.subject, top_k=2)
        citations = [c.citation for c in chunks] or [f"Chương trình GDPT 2018 — Lớp {req.grade_id}"]

        model_label, token_stream = await run_tutor_stream(
            grade_id=req.grade_id,
            subject=req.subject,
            tutor_mode=req.tutor_mode,
            user_message=req.message,
            chunks=chunks,
        )

        yield sse_event(
            "meta",
            {
                "cache_hit": False,
                "model": model_label,
                "grade_id": req.grade_id,
                "citations": citations,
            },
        )

        collected = []
        try:
            async for token in token_stream:
                collected.append(token)
                yield sse_event("delta", {"text": token})
        except Exception as exc:
            fallback = f"\n\n*(Ollama tạm gián đoạn: {exc} — đã tự động chuyển về chế độ dự phòng)*"
            async for token in stream_mock_tokens(fallback):
                collected.append(token)
                yield sse_event("delta", {"text": token})

        full_response = "".join(collected)
        if full_response.strip():
            semantic_cache.put(req.message, req.grade_id, req.subject, req.tutor_mode, full_response, citations)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        yield sse_event("done", {"latency_ms": elapsed_ms, "cache_hit": False})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
