# EduK12 Scale — Nền tảng Giáo dục Lớp 1–12 (PostgreSQL pgvector + Redis + Kafka)

Hệ thống Polyglot Monorepo kết nối hạ tầng dữ liệu thật qua Docker Compose:
1. **Frontend (`apps/web`)** — Next.js 15 + Tailwind CSS + KaTeX + Auth JWT + Trang Quản trị CMS + Phòng thi AES-256-GCM & IndexedDB (`http://localhost:3000`).
2. **Core & Exam Engine (`services/core-api`)** — Go (`pgxpool` PostgreSQL 16 + `go-redis` Redis 7 + `franz-go` Redpanda Kafka + Stateless JWT/RBAC) (`http://localhost:8080`).
3. **AI Tutor (`services/ai-tutor`)** — Python FastAPI + **PostgreSQL `pgvector`** (HNSW Cosine RAG khóa theo lớp 1–12) + **Redis Semantic Cache** + SSE Streaming (tự nhận Local Ollama hoặc Mock miễn phí) (`http://localhost:8001`).

---

## Cách khởi động toàn bộ hệ thống (1 lệnh duy nhất)

```powershell
.\start-dev.ps1
```

Lệnh trên sẽ tự động:
1. Khởi chạy Docker (`edu-postgres` pgvector:pg16, `edu-redis`, `edu-kafka` Redpanda).
2. Mở Go Core/Exam API (`:8080`), Python AI Tutor (`:8001`), và Next.js Web (`:3000`).

Truy cập: **http://localhost:3000**

---

## Tài khoản Demo phân quyền (Tự động nạp vào PostgreSQL)

| Vai trò | Email | Mật khẩu | Quyền hạn |
|---|---|---|---|
| **Super Admin** | `admin@eduk12.vn` | `Admin@123` | Toàn quyền CMS (Tài liệu, Câu hỏi, Đề thi, Nạp AI pgvector) + Quản lý phân quyền User |
| **Giáo viên** | `giaovien@eduk12.vn` | `Teacher@123` | Truy cập `/quan-tri` để soạn Tài liệu 1–12, Ngân hàng câu hỏi & Xuất bản đề thi |
| **Học sinh** | `hocsinh@eduk12.vn` | `Student@123` | Học tài liệu, làm bài tập, thi trắc nghiệm, chat AI Gia sư (bị chặn 403 khỏi CMS) |

## Tài liệu thiết kế
- [01-system-architecture.md](docs/01-system-architecture.md)
- [database/schema.sql](database/schema.sql)
- [02-api-specification.md](docs/02-api-specification.md)
- [03-project-structure-and-roadmap.md](docs/03-project-structure-and-roadmap.md)
