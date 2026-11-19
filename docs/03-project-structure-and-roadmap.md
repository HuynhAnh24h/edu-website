# 03. Cấu trúc Dự án (Monorepo) & Kế hoạch Triển khai

Để vừa **khởi chạy nhanh ở giai đoạn MVP**, vừa **mở rộng mượt lên 1 triệu CCU** mà không phải đập đi viết lại, dự án được tổ chức theo mô hình **Polyglot Monorepo** (mỗi dịch vụ đúng ngôn ngữ mạnh nhất của nó).

---

## 1. Cấu trúc thư mục chuẩn Production

```text
edu-website/
├── docs/                                # Tài liệu thiết kế kiến trúc, API, vận hành
│   ├── 01-system-architecture.md
│   ├── 02-api-specification.md
│   └── 03-project-structure-and-roadmap.md
│
├── database/
│   ├── schema.sql                       # Schema PostgreSQL chuẩn (K-12, Exam, AI RAG)
│   ├── migrations/                      # Quản lý migration (Golang-migrate / Atlas)
│   └── seeds/                           # Dữ liệu mẫu lớp 1-12, môn học, đề thi thử
│
├── apps/
│   └── web/                             # Frontend: Next.js (App Router) + Tailwind + KaTeX + PWA
│       ├── src/
│       │   ├── app/
│       │   │   ├── (marketing)/         # Trang chủ, giới thiệu (Static SSG)
│       │   │   ├── lop/[grade]/         # Tài liệu lớp 1-12 (ISR + CDN Edge)
│       │   │   ├── bai-tap/[setId]/     # Làm bài tập tương tác chấm ngay
│       │   │   ├── thi/[examId]/        # Phòng thi trắc nghiệm (Offline-first IndexedDB)
│       │   │   └── ai-gia-su/           # Giao diện AI dạy học (Streaming SSE + KaTeX)
│       │   ├── components/
│       │   │   ├── math/                # Component render công thức KaTeX siêu nhanh
│       │   │   ├── exam/                # Bộ đếm giờ, bảng câu hỏi, giải mã đề AES-GCM
│       │   │   └── ai/                  # Khung chat Socratic, upload ảnh bài tập
│       │   └── lib/
│       │       ├── indexeddb.ts         # Lưu nháp bài thi chống rớt mạng
│       │       └── api-client.ts        # Fetch wrapper kèm JWT & retry jitter
│       └── package.json
│
├── services/
│   ├── core-api/                        # Backend tải cao (Go + Fiber/Chi): Auth, Content, Exam, Grading
│   │   ├── cmd/
│   │   │   ├── api/                     # HTTP API Server
│   │   │   └── grader-worker/           # Kafka Consumer chấm điểm hàng loạt
│   │   ├── internal/
│   │   │   ├── auth/
│   │   │   ├── curriculum/
│   │   │   ├── exam/                    # Bundle generator (AES-GCM), autosave Redis, submit Kafka
│   │   │   └── mastery/                 # Cập nhật điểm thành thạo chuyên đề
│   │   └── go.mod
│   │
│   └── ai-tutor/                        # Backend AI (Python FastAPI): RAG, Semantic Cache, SSE
│       ├── app/
│       │   ├── api/                     # SSE streaming endpoints
│       │   ├── rag/                     # Hybrid search Qdrant + Grade-locked filter
│       │   ├── cache/                   # Redis Vector Semantic Cache
│       │   ├── prompts/                 # System prompt sư phạm Socratic theo từng cấp học (1-5, 6-9, 10-12)
│       │   └── router/                  # Định tuyến Model (vLLM nội bộ vs Cloud LLM)
│       └── pyproject.toml
│
├── infra/
│   ├── docker-compose.yml               # Môi trường dev cục bộ (PG + pgvector, Redis, Kafka, Qdrant)
│   ├── k8s/                             # Manifest Kubernetes + KEDA Auto-scaling (Scale lên 1M CCU)
│   └── terraform/                       # Hạ tầng Cloud (EKS/GKE, Cloudflare R2, CDN rules)
│
└── tests/
    └── load/                            # Kịch bản bắn tải chịu đựng bằng k6
        ├── exam-thundering-herd.js      # Giả lập 100k-1M học sinh mở đề & nộp bài cùng lúc
        └── ai-sse-concurrency.js        # Giả lập hàng chục nghìn kết nối AI streaming
```

---

## 2. Lộ trình thực thi chi tiết (Từ MVP đến 1M CCU)

### Giai đoạn A — Khởi tạo & Hoàn thiện MVP (Tuần 1 – Tuần 6)
1. **Hạ tầng Dev (Tuần 1):**
   - Chạy `docker-compose.yml` gồm PostgreSQL 16 (kèm `pgvector`), Redis 7, Redpanda/Kafka.
   - Chạy `database/schema.sql` và dữ liệu mẫu cho 12 lớp học + các môn chính.
2. **Frontend & Tài liệu lớp 1–12 (Tuần 2):**
   - Xây giao diện chọn Cấp học → Lớp 1–12 → Môn → Bộ sách → Bài học.
   - Tích hợp **KaTeX** để hiển thị mượt công thức Toán/Lý/Hóa và trình xem PDF/Video.
3. **Engine Làm bài tập & Thi trắc nghiệm (Tuần 3–4):**
   - Hỗ trợ đủ 4 dạng câu hỏi (1 đáp án, nhiều đáp án, Đúng/Sai 4 ý, trả lời ngắn).
   - Triển khai lưu nháp tức thì bằng **IndexedDB** + tự đồng bộ có **random jitter**.
   - Xuất đề thi tĩnh mã hóa AES-256-GCM và luồng nộp bài qua **Kafka → Grading Worker**.
4. **AI dạy học (Tuần 5):**
   - Xây pipeline nạp kiến thức SGK vào Vector DB gắn cứng metadata `grade_id` & `subject_id`.
   - Xây khung chat AI streaming SSE với chế độ gợi mở **Socratic** + **Semantic Cache** trên Redis.
5. **Kiểm thử tải & Tối ưu (Tuần 6):**
   - Viết script **k6** kiểm thử kịch bản 10.000 người mở đề & nộp bài đồng loạt trên 1 node để đo điểm nghẽn thực tế.

### Giai đoạn B — Scale-up (100.000 CCU)
- Đưa toàn bộ file tài liệu, video HLS và đề thi mã hóa lên **Cloudflare R2 + CDN**.
- Bật **Kubernetes HPA + KEDA** tự động nhân bản `core-api` và `grader-worker` theo lag của Kafka.
- Triển khai Read Replicas cho PostgreSQL và Redis Cluster phân tán.

### Giai đoạn C — Quy mô 1.000.000 CCU
- Chuyển PostgreSQL sang mô hình Sharding (**Citus** hoặc **TiDB**), tách báo cáo phân tích sang **ClickHouse**.
- Triển khai **Multi-Region** (tối thiểu 2 cụm máy chủ gần người dùng Việt Nam: Singapore + Tokyo/Việt Nam) chạy Active-Active dưới Cloudflare Global Load Balancer.
- Triển khai cụm GPU riêng chạy **vLLM** phục vụ 80% câu hỏi AI phổ thông để cắt giảm 70–85% chi phí token.
