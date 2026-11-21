param(
    [string]$CoreApiUrl = "http://127.0.0.1:8080",
    [string]$AiApiUrl   = "http://127.0.0.1:8001",
    [string]$Email      = "admin@eduk12.vn",
    [string]$Password   = "Admin@123"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "1. Dang nhap Admin/Giao vien ($Email) lay JWT Token..." -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$CoreApiUrl/api/v1/auth/login" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($loginBody))
$headers = @{ Authorization = "Bearer $($auth.access_token)" }
Write-Host "   OK! Role: $($auth.user.role)" -ForegroundColor Green

$lessonsFile = Join-Path $root "database\seeds\k12-curriculum-pack.json"
if (Test-Path $lessonsFile) {
    Write-Host "2. Bulk Import toan bo bai giang Lop 1-12 tu k12-curriculum-pack.json..." -ForegroundColor Cyan
    $rawBytes = [System.IO.File]::ReadAllBytes($lessonsFile)
    $lesRes = Invoke-RestMethod -Method Post -Uri "$CoreApiUrl/api/v1/cms/import/lessons" -ContentType "application/json; charset=utf-8" -Headers $headers -Body $rawBytes
    Write-Host "   Ket qua: Tong=$($lesRes.total) | Them moi=$($lesRes.imported) | Cap nhat=$($lesRes.updated)" -ForegroundColor Green

    Write-Host "3. Dong bo toan bo bai giang vao PostgreSQL pgvector (AI Gia su)..." -ForegroundColor Cyan
    $parsedLessons = Get-Content -Raw -Encoding UTF8 $lessonsFile | ConvertFrom-Json
    $aiItems = @()
    foreach ($l in $parsedLessons.lessons) {
        $aiItems += @{
            grade_id     = $l.grade_id
            subject_code = $l.subject_code
            textbook     = $l.textbook
            citation     = "Lop $($l.grade_id) - $($l.chapter) - $($l.title)"
            content      = "$($l.summary)`n$($l.content_mdx)"
        }
    }
    $aiJson = @{ items = $aiItems } | ConvertTo-Json -Depth 6
    $aiRes = Invoke-RestMethod -Method Post -Uri "$AiApiUrl/api/v1/ai/knowledge/bulk" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($aiJson))
    Write-Host "   AI pgvector indexed: $($aiRes.indexed)/$($aiRes.total) chunks" -ForegroundColor Green
}

$examsFile = Join-Path $root "database\seeds\official-format-exams-pack.json"
if (Test-Path $examsFile) {
    Write-Host "4. Bulk Import bo de thi chuan Bo GD&DT (Tu dong ma hoa AES-256-GCM len Redis)..." -ForegroundColor Cyan
    $examBytes = [System.IO.File]::ReadAllBytes($examsFile)
    $exRes = Invoke-RestMethod -Method Post -Uri "$CoreApiUrl/api/v1/cms/import/exams" -ContentType "application/json; charset=utf-8" -Headers $headers -Body $examBytes
    Write-Host "   Da import thanh cong: $($exRes.imported)/$($exRes.total) de thi!" -ForegroundColor Green
}

Write-Host "HOAN TAT IMPORT PRODUCTION PACK!" -ForegroundColor Yellow
