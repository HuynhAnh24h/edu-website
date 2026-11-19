import json
import os
import time
from collections import Counter
from typing import Dict, List, Optional, Tuple

import redis

from app.rag_store import cosine_similarity, tokenize

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")


class SemanticCache:
    """Redis-backed Semantic Cache dùng chung cho toàn cụm AI Worker (TTL 24h)."""

    def __init__(self, similarity_threshold: float = 0.85, max_entries_per_bucket: int = 200):
        self.threshold = similarity_threshold
        self.max_entries = max_entries_per_bucket
        self.client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1.5)

    def _bucket_key(self, grade_id: int, subject: str, tutor_mode: str) -> str:
        return f"ai:semcache:g{grade_id}:{subject}:{tutor_mode}"

    def is_connected(self) -> bool:
        try:
            return bool(self.client.ping())
        except Exception:
            return False

    def lookup(
        self, query: str, grade_id: int, subject: str, tutor_mode: str
    ) -> Optional[Tuple[str, List[str], float]]:
        try:
            key = self._bucket_key(grade_id, subject, tutor_mode)
            raw_items = self.client.lrange(key, 0, self.max_entries - 1)
            if not raw_items:
                self.client.incr("ai:stats:misses")
                return None

            q_vec = tokenize(query)
            best_score = 0.0
            best_payload = None

            for raw in raw_items:
                item = json.loads(raw)
                entry_vec = Counter(item.get("tokens", {}))
                sim = cosine_similarity(q_vec, entry_vec)
                if sim > best_score:
                    best_score = sim
                    best_payload = item

            if best_payload and best_score >= self.threshold:
                self.client.incr("ai:stats:hits")
                return best_payload["response"], best_payload.get("citations", []), round(best_score, 3)

            self.client.incr("ai:stats:misses")
            return None
        except Exception:
            return None

    def put(
        self,
        query: str,
        grade_id: int,
        subject: str,
        tutor_mode: str,
        response_text: str,
        citations: List[str],
    ) -> None:
        try:
            key = self._bucket_key(grade_id, subject, tutor_mode)
            payload = json.dumps(
                {
                    "tokens": dict(tokenize(query)),
                    "response": response_text,
                    "citations": citations,
                    "created_at": time.time(),
                },
                ensure_ascii=False,
            )
            pipe = self.client.pipeline()
            pipe.lpush(key, payload)
            pipe.ltrim(key, 0, self.max_entries - 1)
            pipe.expire(key, 86400)
            pipe.execute()
        except Exception:
            pass

    def stats(self) -> Dict[str, object]:
        try:
            hits = int(self.client.get("ai:stats:hits") or 0)
            misses = int(self.client.get("ai:stats:misses") or 0)
            keys = self.client.keys("ai:semcache:*")
            cached_entries = sum(self.client.llen(k) for k in keys)
            total = hits + misses
            hit_rate = round((hits / total) * 100, 1) if total > 0 else 0.0
            return {
                "redis_ok": True,
                "hits": hits,
                "misses": misses,
                "hit_rate_pct": hit_rate,
                "cached_entries": cached_entries,
            }
        except Exception:
            return {
                "redis_ok": False,
                "hits": 0,
                "misses": 0,
                "hit_rate_pct": 0.0,
                "cached_entries": 0,
            }
