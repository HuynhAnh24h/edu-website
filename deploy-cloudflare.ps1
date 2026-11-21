$ErrorActionPreference = "Stop"

Write-Host "=== 1. Build Next.js Static Export (apps/web/out) cho Cloudflare Edge CDN ===" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\apps\web"
$env:NEXT_STATIC_EXPORT = "1"
$env:NEXT_PUBLIC_CORE_API_URL = ""
$env:NEXT_PUBLIC_AI_API_URL = ""
npm run build
Pop-Location

Write-Host "=== 2. Kiem tra dang nhap Cloudflare CLI (cf) ===" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\apps\cloudflare-edge"
try {
    npx cf auth whoami | Out-Null
} catch {
    Write-Host "Chua dang nhap Cloudflare CLI! Dang mo trinh duyet dang nhap Cloudflare..." -ForegroundColor Yellow
    npx cf auth login
}

Write-Host "=== 3. Trien khai Full-stack Cloudflare Worker (Assets + D1 + KV + Workers AI) ===" -ForegroundColor Green
npx cf deploy --provision
Pop-Location
