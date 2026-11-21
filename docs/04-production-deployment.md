# 04. Hướng dẫn Triển khai Production (Đưa Website lên mạng cho Người dùng)

Hệ thống đã được đóng gói đầy đủ **Docker Production Multi-stage**, **Nginx Reverse Proxy**, **Kubernetes Auto-scaling**, và **GitHub Actions CI/CD**.

---

## Phương án 1 (Nhanh nhất & Toàn quyền): Triển khai trên 1 VPS Ubuntu (DigitalOcean / Hetzner / Vultr / AWS EC2 / Viettel Cloud)

### Bước 1: Cài Docker & kéo mã nguồn trên VPS
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
git clone https://github.com/HuynhAnh24h/edu-website.git
cd edu-website
```

### Bước 2: Cấu hình mật khẩu Production
```bash
cp .env.production.example .env
nano .env
# Đổi POSTGRES_PASSWORD và JWT_SECRET (tạo bằng: openssl rand -hex 32)
```

### Bước 3: Khởi chạy toàn bộ 7 container Production
```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```
Toàn bộ dịch vụ (`Nginx` cổng 80 + `Next.js` + `Go API` + `Python AI` + `PostgreSQL pgvector` + `Redis` + `Redpanda Kafka`) sẽ tự chạy và tự khởi động lại nếu server reboot.

### Bước 4: Bật HTTPS & Chống DDoS 1M CCU miễn phí bằng Cloudflare
1. Trỏ tên miền của bạn (VD: `eduk12.vn`) về IP VPS trên **Cloudflare DNS** và bật **Proxy (Đám mây cam)**.
2. Vào **Cloudflare → SSL/TLS → Flexible hoặc Full (Strict)** (hoặc cài Certbot/Caddy trên VPS).
3. Bật **Cache Rules** cho `/api/v1/exams/*/bundle` và `/api/v1/lessons*` để Cloudflare CDN gánh 90%+ tải đọc!

### Bước 5: Import gói bài giảng Lớp 1–12 & Đề thi chuẩn
- Đăng nhập `/dang-nhap` bằng `admin@eduk12.vn` / `Admin@123` (**đổi mật khẩu ngay sau khi vào!**)
- Vào `/quan-tri` → Tab **Import JSON / Tách đề** → Upload 2 file trong `database/seeds/` hoặc dùng trình **Soạn Bài giảng kiểu Word**.

---

## Phương án 2 (Managed Cloud): Frontend trên Vercel + Backend trên Railway / VPS / Kubernetes

1. **Frontend (`apps/web`):** Kết nối repo `HuynhAnh24h/edu-website` lên **Vercel**, đặt:
   - Root Directory: `apps/web`
   - Environment Variables:
     - `NEXT_PUBLIC_CORE_API_URL=https://api.tenmien.vn`
     - `NEXT_PUBLIC_AI_API_URL=https://ai.tenmien.vn`
2. **Backend (`services/core-api`, `services/ai-tutor`, DB, Redis, Kafka):** Deploy trực tiếp bằng Docker images mà **GitHub Actions CI/CD** đã tự build sẵn tại `ghcr.io/huynhanh24h/edu-website/*` lên Kubernetes (`kubectl apply -f infra/k8s/production.yaml`) hoặc VPS.

---

## Checklist An toàn trước khi mở cho 1M người dùng
- [ ] Đổi mật khẩu tài khoản `admin@eduk12.vn` và tắt hoặc xóa 3 tài khoản demo.
- [ ] Thay `JWT_SECRET` bằng chuỗi 64 ký tự ngẫu nhiên.
- [ ] Bật backup tự động hằng ngày cho PostgreSQL (`pg_dump` lên Cloudflare R2 / S3).
- [ ] Chạy kiểm thử tải bằng `k6 run tests/load/exam-thundering-herd.js` trước ngày mở thi thật.
