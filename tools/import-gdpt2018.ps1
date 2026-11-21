param(
    [string]$BaseUrl  = "https://eduk12-scale.eduk12-scale.workers.dev",
    [string]$Email    = "admin@eduk12.vn",
    [string]$Password = "Admin@123",
    [int]$BatchSize   = 35
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$packPath = Join-Path $root "database\seeds\gdpt2018-full-k12.json"

if (-not (Test-Path $packPath)) {
    throw "Khong tim thay file $packPath. Hay chay python tools/generate-gdpt2018-pack.py truoc!"
}

Write-Host "1. Dang nhap Admin tai $BaseUrl..." -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($loginBody))
$headers = @{ Authorization = "Bearer $($auth.access_token)" }

$pack = Get-Content -Raw -Encoding UTF8 $packPath | ConvertFrom-Json
$allLessons = @($pack.lessons)
$total = $allLessons.Count
Write-Host "2. Bat dau Batch Import $total bai giang GDPT 2018 (Lop 1-12) theo lo $BatchSize bai/request..." -ForegroundColor Cyan

$totalImported = 0
$totalAiIndexed = 0

for ($i = 0; $i -lt $total; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize - 1, $total - 1)
    $slice = @($allLessons[$i..$end])

    # a) Import bai giang vao D1
    $payload = @{ lessons = $slice } | ConvertTo-Json -Depth 8
    $res = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/cms/import/lessons" -ContentType "application/json; charset=utf-8" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))
    $totalImported += [int]$res.imported

    # b) Dong bo RAG chunks vao D1 AI Knowledge Base
    $aiItems = @()
    foreach ($l in $slice) {
        $aiItems += @{
            id           = "kc-$($l.id)"
            grade_id     = $l.grade_id
            subject_code = $l.subject_code
            textbook     = $l.textbook
            citation     = "GDPT 2018 Lop $($l.grade_id) - $($l.chapter) - $($l.title)"
            content      = "$($l.summary)`n$($l.content_mdx)"
        }
    }
    $aiPayload = @{ items = $aiItems } | ConvertTo-Json -Depth 6
    $aiRes = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/ai/knowledge/bulk" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($aiPayload))
    $totalAiIndexed += [int]$aiRes.indexed

    Write-Host "   [Batch $([Math]::Floor($i / $BatchSize) + 1)] Da nap $($end + 1)/$total bai giang + AI RAG..." -ForegroundColor Green
}

Write-Host "3. Kiem tra tong so lieu truc tiep tren Cloudflare D1..." -ForegroundColor Cyan
$summary = Invoke-RestMethod -Uri "$BaseUrl/api/v1/curriculum/summary"
Write-Host "HOAN TAT! Tong so bai giang dang LIVE tren Cloud: $($summary.total_lessons) bai | AI RAG chunks da dong bo: $totalAiIndexed" -ForegroundColor Yellow
