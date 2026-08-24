#!/usr/bin/env pwsh
#
# car-log deploy smoke test — builds the single image and verifies the v1
# acceptance criteria that are verifiable off-phone:
#
#   1. One image serves the API and the built PWA (index.html + /api).
#   2. SQLite lives on a mounted volume, password comes from env.
#   3. SPA fallback serves index.html for client-side routes.
#   4. The API is auth-gated and the password unlock works.
#   5. Create endpoints are idempotent on client UUID (outbox replay safety).
#   6. PWA install assets (manifest, service worker) are served.
#   7. The database is one copyable file on the mounted volume (backup copy +
#      persistence across container recreation).
#
# Run from the repo root:  pwsh -File deploy/smoke-test.ps1
#
# Requires docker and PowerShell 7 (pwsh).

$ErrorActionPreference = 'Stop'

$container = 'car-log-smoke'
$volume = "car-log-smoke-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$port = 8081
$password = 'smoke-test-password'

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $appKey = "base64:" + [Convert]::ToBase64String($bytes)
} finally {
    $rng.Dispose()
}

function step([string]$msg) {
    Write-Host ""
    Write-Host "▸ $msg" -ForegroundColor Blue
}
function ok([string]$msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}
function fail([string]$msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    exit 1
}

function Cleanup {
    & docker rm -f $container *> $null
    & docker volume rm $volume *> $null
}

try {
    step "Building image (this takes a few minutes on first run)"
    & docker build -t car-log:smoke -f deploy/Dockerfile . | Out-Host
    if ($LASTEXITCODE -ne 0) { fail "docker build failed" }

    step "Starting container (SQLite on a mounted volume, password from env)"
    Cleanup
    & docker run -d --name $container `
        -e APP_ENV=production `
        -e APP_DEBUG=false `
        -e APP_KEY=$appKey `
        -e APP_URL="http://127.0.0.1:$port" `
        -e CAR_LOG_UNLOCK_PASSWORD=$password `
        -e DB_CONNECTION=sqlite `
        -e DB_DATABASE=/var/www/html/data/database.sqlite `
        -v "$volume`:/var/www/html/data" `
        -p "$port`:80" `
        car-log:smoke *> $null
    if ($LASTEXITCODE -ne 0) { fail "docker run failed" }

    Write-Host "  waiting for the app to boot..."
    $up = $false
    for ($i = 1; $i -le 60; $i++) {
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/up" -UseBasicParsing -TimeoutSec 5
            $up = $true
            break
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    if (-not $up) { fail "container never became healthy" }
    ok "health check /up responds 200"

    step "PWA is served at /"
    $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing).Content
    if ($body -match '<app-root>') {
        ok "index.html served (contains <app-root>)"
    } else {
        fail "expected Angular index.html"
    }

    step "SPA fallback serves index.html for a client-side route"
    $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$port/vehicles/1" -UseBasicParsing).Content
    if ($body -match '<app-root>') {
        ok "deep link /vehicles/1 returns the PWA shell"
    } else {
        fail "expected SPA fallback"
    }

    step "PWA install assets are served (manifest + service worker)"
    foreach ($asset in @('manifest.webmanifest', 'ngsw-worker.js', 'ngsw.json')) {
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/$asset" -UseBasicParsing
            ok "/$asset served"
        } catch {
            fail "/$asset not served"
        }
    }

    step "API is auth-gated (401 without a token)"
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing
        fail "expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            ok "/api/health returns 401 unauthenticated"
        } else {
            fail "expected 401"
        }
    }

    step "Password unlock exchanges for a token"
    $payload = @{ password = $password } | ConvertTo-Json
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/auth/token" `
            -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing
        $token = ($resp.Content | ConvertFrom-Json).token
    } catch {
        fail "token exchange failed: $($_.Exception.Message)"
    }
    if ($token) { ok "token minted" } else { fail "token exchange returned no token" }

    step "Authenticated API call works through the same image"
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" `
            -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
        ok "/api/health returns 200 with a token"
    } catch {
        fail "expected 200"
    }

    step "Create endpoints are idempotent on client UUID (outbox replay safety)"
    $uuid = '22222222-2222-2222-2222-222222222222'
    $vehicle = @{
        name = 'Smoke Car'; type = 'car'; make = 'Acme'; model = 'Smoke'; year = 2020; uuid = $uuid
    } | ConvertTo-Json
    $headers = @{ Authorization = "Bearer $token" }

    function Get-PostStatus([string]$url, [string]$body, $headers) {
        try {
            $resp = Invoke-WebRequest -Uri $url -Method Post -ContentType 'application/json' -Body $body -Headers $headers -UseBasicParsing
            return $resp.StatusCode
        } catch {
            return $_.Exception.Response.StatusCode.value__
        }
    }

    $first = Get-PostStatus "http://127.0.0.1:$port/api/vehicles" $vehicle $headers
    $replay = Get-PostStatus "http://127.0.0.1:$port/api/vehicles" $vehicle $headers
    if ($first -eq 201 -and $replay -eq 200) {
        ok "first create 201, replay 200 (same record)"
    } else {
        fail "expected 201 then 200, got $first then $replay"
    }

    step "Wrong password is rejected"
    $bad = @{ password = 'wrong' } | ConvertTo-Json
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/auth/token" `
            -Method Post -ContentType 'application/json' -Body $bad -UseBasicParsing
        fail "expected 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            ok "wrong password returns 401"
        } else {
            fail "expected 401"
        }
    }

    step "SQLite file exists on the mounted volume"
    $test = & docker exec $container sh -c 'test -f /var/www/html/data/database.sqlite && echo yes'
    if ($test.Trim() -eq 'yes') {
        ok "database.sqlite present on the volume"
    } else {
        fail "database.sqlite not found on the volume"
    }

    step "Backup story: copy the SQLite file out to the host (documented command)"
    # docker cp writes to the CLI's filesystem, so it works from the host
    # (and from a containerized runner) without bind-path ambiguity.
    $backupDir = Join-Path $PSScriptRoot '.smoke-backup'
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $backupFile = Join-Path $backupDir 'car-log-backup.sqlite'
    & docker cp "$container`:/var/www/html/data/database.sqlite" $backupFile *> $null
    if ($LASTEXITCODE -ne 0) { fail "docker cp backup failed" }
    if ((Get-Item $backupFile).Length -gt 0) {
        ok "copied database.sqlite to host via the documented command (non-empty)"
    } else {
        fail "backed-up file is empty"
    }
    Remove-Item -Recurse -Force $backupDir

    step "Volume persistence: data survives container recreation"
    $before = & docker exec $container sh -c 'wc -c < /var/www/html/data/database.sqlite'
    & docker rm -f $container *> $null
    & docker run -d --name $container `
        -e APP_ENV=production `
        -e APP_DEBUG=false `
        -e APP_KEY=$appKey `
        -e APP_URL="http://127.0.0.1:$port" `
        -e CAR_LOG_UNLOCK_PASSWORD=$password `
        -e DB_CONNECTION=sqlite `
        -e DB_DATABASE=/var/www/html/data/database.sqlite `
        -v "$volume`:/var/www/html/data" `
        -p "$port`:80" `
        car-log:smoke *> $null
    if ($LASTEXITCODE -ne 0) { fail "recreate failed" }
    $after = & docker exec $container sh -c 'wc -c < /var/www/html/data/database.sqlite'
    if ([int]$after.Trim() -ge [int]$before.Trim() -and [int]$after.Trim() -gt 0) {
        ok "SQLite data survived container recreation ($before -> $after bytes)"
    } else {
        fail "volume did not persist ($before -> $after bytes)"
    }

    Write-Host ""
    Write-Host "All checks passed." -ForegroundColor Green
} finally {
    Cleanup
}