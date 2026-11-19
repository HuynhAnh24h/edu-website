# 02. Thiết kế API chuẩn Hiệu năng cao (REST + SSE Streaming)

Tất cả API đều theo chuẩn **Stateless** (xác thực qua `Authorization: Bearer <JWT>`), phiên bản hóa tại `/api/v1`, trả về JSON gọn nhẹ và áp dụng chiến lược **CDN Caching** cho toàn bộ đường dẫn đọc công khai.

---

## 1. Quy ước chung & Chống quá tải

- **Compression:** Bật `Brotli` (ưu tiên) và `Gzip` tại Edge/API Gateway.
- **Idempotency Key:** Các API ghi quan trọng (như nộp bài thi `POST /submit`) bắt buộc gửi header `Idempotency-Key: <uuid>` để tránh học sinh bấm đúp tạo trùng bản ghi.
- **Rate Limiting (Redis Token Bucket):**
  - Tài liệu công khai: Không giới hạn tại origin (được CDN hấp thụ).
  - API Thi cử (`autosave` / `submit`): `30 req / phút / user`.
  - API AI Tutor (`chat`): `10 req / phút / user` + hạn mức ngày theo gói (`free` / `plus` / `pro`).

---

## 2. Nhóm API Xác thực (Auth Service)

| Method | Endpoint | Mô tả | Ghi chú hiệu năng |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký học sinh/giáo viên (chọn khối lớp 1–12) | Hash mật khẩu bằng `Argon2id` |
| `POST` | `/api/v1/auth/login` | Đăng nhập, trả về Access Token (15p) + Refresh Token (30 ngày) | Access Token ký `Ed25519` verify cục bộ tại Gateway không cần gọi DB |
| `POST` | `/api/v1/auth/refresh` | Cấp lại Access Token | Kiểm tra Refresh Token trong Redis |
| `GET` | `/api/v1/users/me` | Lấy thông tin cá nhân & điểm thành thạo chuyên đề | Cache Redis 5 phút theo `user_id` |

---

## 3. Nhóm API Chương trình học & Tài liệu (Content Service)

> Toàn bộ endpoint `GET` dưới đây gắn header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` để CDN Edge phục vụ trực tiếp.

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/grades` | Danh sách lớp 1–12 phân theo 3 cấp học |
| `GET` | `/api/v1/grades/{gradeId}/courses?textbook=kntt` | Danh sách môn học theo lớp & bộ sách |
| `GET` | `/api/v1/courses/{slug}/curriculum` | Cây mục lục Chương → Bài học của 1 môn |
| `GET` | `/api/v1/lessons/{lessonId}` | Chi tiết bài học (lý thuyết MDX + danh sách PDF/Video/Bài tập) |
| `POST` | `/api/v1/materials/{materialId}/signed-url` | Cấp link tải PDF hoặc phát Video HLS tạm thời (hết hạn sau 15 phút) |

---

## 4. Nhóm API Làm bài tập trực tuyến (Exercise Engine)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/lessons/{lessonId}/exercises` | Lấy bộ bài tập gắn với bài học |
| `POST` | `/api/v1/exercises/{setId}/check-question` | Chấm tức thì 1 câu bài tập, trả về đúng/sai + lời giải từng bước |
| `POST` | `/api/v1/exercises/{setId}/complete` | Hoàn thành bộ bài tập, đẩy event cập nhật `user_skill_mastery` |
| `GET` | `/api/v1/users/me/weak-topics?grade=12&subject=toan` | Gợi ý các chuyên đề học sinh còn yếu để ôn tập hoặc hỏi AI |

---

## 5. Nhóm API Thi trắc nghiệm chịu tải 1M CCU (Exam Engine)

### 5.1. Danh sách Endpoint

| Method | Endpoint | Mô tả | Tầng xử lý |
|---|---|---|---|
| `GET` | `/api/v1/exams?grade=12&subject=toan&mode=mock_live` | Danh sách đề thi / kỳ thi thử | CDN Cache |
| `GET` | `https://cdn.domain.edu/exams/{examId}/v{n}.enc.json` | Tải gói đề thi đã mã hóa (không chứa đáp án) | **100% CDN R2** |
| `POST` | `/api/v1/exams/{examId}/start` | Bắt đầu lượt thi: trả về `attempt_id`, `shuffle_seed`, `decrypt_key`, `ends_at` | Go + Redis |
| `PATCH` | `/api/v1/attempts/{attemptId}/autosave` | Lưu nháp các câu vừa thay đổi (gọi mỗi 30–60s kèm jitter) | Go → Redis Hash |
| `POST` | `/api/v1/attempts/{attemptId}/submit` | Nộp bài (trả về `202 Accepted` sau khi ghi vào Kafka) | Go → **Kafka** |
| `GET` | `/api/v1/attempts/{attemptId}/result` | Lấy điểm, đáp án đúng & lời giải chi tiết sau khi Worker chấm xong | Redis → PG |
| `GET` | `/api/v1/exams/{examId}/leaderboard?limit=100` | Bảng xếp hạng thời gian thực (Redis Sorted Set `ZREVRANGE`) | Redis (Cache 5s CDN) |

### 5.2. Payload mẫu — `POST /api/v1/attempts/{attemptId}/submit`

**Request:**
```json
{
  "submitted_client_at": "2026-11-19T09:30:00Z",
  "answers": {
    "q-uuid-01": "B",
    "q-uuid-02": { "a": true, "b": false, "c": true, "d": false },
    "q-uuid-03": "12.5"
  },
  "cheat_flags": [
    { "type": "tab_blur", "at": "2026-11-19T08:42:10Z", "duration_sec": 4 }
  ]
}
```

**Response (`202 Accepted` — phản hồi `< 50ms`):**
```json
{
  "attempt_id": "att-uuid-999",
  "status": "submitted_queued",
  "message": "Bài thi của bạn đã được ghi nhận an toàn và đang được chấm điểm.",
  "poll_url": "/api/v1/attempts/att-uuid-999/result"
}
```

---

## 6. Nhóm API AI dạy học (AI Tutor Service — SSE Streaming)

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/ai/conversations` | Tạo phiên học mới gắn ngữ cảnh (`grade_id`, `subject_id`, `lesson_id`, `tutor_mode`) |
| `GET` | `/api/v1/ai/conversations` | Danh sách lịch sử hội thoại học tập của học sinh |
| `POST` | `/api/v1/ai/upload-image` | Xin presigned URL tải ảnh chụp bài tập lên R2 để OCR |
| `POST` | `/api/v1/ai/conversations/{id}/messages` | Gửi câu hỏi và nhận phản hồi **Server-Sent Events (`text/event-stream`)** |

### Định dạng luồng SSE trả về từ AI Tutor
```text
event: meta
data: {"message_id":"msg-123","cache_hit":false,"model":"vllm-edu-8b","citations":["SGK Toán 12 KNTT - Bài 2"]}

event: delta
data: {"text":"Để tìm cực trị của hàm số $y = x^3 - 3x + 1$, bước đầu tiên em hãy tính "}

event: delta
data: {"text":"đạo hàm $y'$ nhé. Theo em $y'$ bằng bao nhiêu?"}

event: done
data: {"latency_ms":640,"tokens_used":92}
```
