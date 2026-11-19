Write-Host "1. Khoi dong ha tang Docker (PostgreSQL pgvector + Redis + Redpanda Kafka)..." -ForegroundColor Yellow
docker compose -f "$PSScriptRoot\infra\docker-compose.yml" up -d

Write-Host "2. Khoi dong 3 dich vu EduK12 Scale (Go :8080, Python FastAPI :8001, Next.js :3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\services\core-api'; go run ./cmd/api"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\services\ai-tutor'; .\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; npm run dev"

Write-Host "San sang! Mo trinh duyet tai: http://localhost:3000 (CMS: /quan-tri | Dang nhap: /dang-nhap)" -ForegroundColor Green
