#!/usr/bin/env pwsh
#
# car-log setup wizard — PowerShell 7 (pwsh), cross-platform.
#
# On Windows 11:   powershell -ExecutionPolicy Bypass -File .\deploy\setup.ps1
# On Linux/macOS:  pwsh -File deploy/setup.ps1
#
# Walks a human through the steps that only a human can do: choose the
# subdomain, create the Cloudflare Tunnel and copy its token, set the app's
# unlock password, and generate the Laravel APP_KEY. Writes deploy/.env.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir '.env'

# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

$script:writtenEnv = @()
$script:stageIndex = 0
$totalStages = 0

function Write-Say  { Write-Host "  $($args -join ' ')" }
function Write-Step { Write-Host "  • $($args -join ' ')" -ForegroundColor Blue }
function Write-Note { Write-Host "  $($args -join ' ')" -ForegroundColor DarkGray }
function Write-Warn { Write-Host "  ⚠ $($args -join ' ')" -ForegroundColor Yellow }
function Write-Ok   { Write-Host "  ✓ $($args -join ' ')" -ForegroundColor Green }

function Wait-Key {
  Write-Host "  $($args[0]) " -ForegroundColor DarkGray -NoNewline
  $null = Read-Host
}

function Confirm-Prompt {
  $reply = Read-Host "  $($args[0])? [y/N]"
  return $reply -match '^[Yy]'
}

function Get-EnvValue([string]$key) {
  if (-not (Test-Path $envFile)) { return $null }
  $line = Get-Content $envFile | Where-Object { $_ -match "^$([regex]::Escape($key))=" } | Select-Object -Last 1
  if (-not $line) { return $null }
  return $line.Substring($line.IndexOf('=') + 1)
}

function Read-Value([string]$key, [string]$prompt) {
  $current = Get-EnvValue $key
  $suffix = if ($current) { " [Enter keeps current]" } else { "" }
  $input = Read-Host "$prompt$suffix"
  if ([string]::IsNullOrWhiteSpace($input) -and $current) { return $current }
  return $input
}

function Read-Secret([string]$key, [string]$prompt) {
  $current = Get-EnvValue $key
  if ($current) {
    Write-Note "already set — Enter keeps it"
  }
  $secure = Read-Host "$prompt" -AsSecureString
  if ($null -eq $secure -or $secure.Length -eq 0) { return $current }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Write-Env([string]$key, [string]$value) {
  $lines = if (Test-Path $envFile) { @(Get-Content $envFile) } else { @() }
  $out = @($lines | Where-Object { $_ -notmatch "^$([regex]::Escape($key))=" })
  $out += "$key=$value"
  # UTF-8 without BOM: Windows PowerShell 5.1's `-Encoding utf8` adds a BOM,
  # which breaks docker compose's .env interpolation — write the bytes by hand.
  $content = ($out -join "`n") + "`n"
  [System.IO.File]::WriteAllText($envFile, $content, (New-Object System.Text.UTF8Encoding($false)))
  $script:writtenEnv += $key
  Write-Ok "wrote $key -> $envFile"
}

function Open-Url([string]$url) {
  Write-Host "  ↗ opening $url" -ForegroundColor Green
  try {
    if ($IsLinux) {
      Start-Process -FilePath 'xdg-open' -ArgumentList $url
    } elseif ($IsMacOS) {
      Start-Process -FilePath 'open' -ArgumentList $url
    } else {
      Start-Process $url
    }
  } catch {
    Write-Warn "couldn't open a browser — visit it manually: $url"
  }
}

function Start-Stage([string]$title) {
  $script:stageIndex++
  Write-Host ""
  Write-Host "▸ Stage $script:stageIndex/$totalStages · $title" -ForegroundColor Blue
}

function Generate-AppKey {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    return "base64:" + [Convert]::ToBase64String($bytes)
  } finally {
    $rng.Dispose()
  }
}

# ──────────────────────────────────────────────────────────────────────────
# Stages
# ──────────────────────────────────────────────────────────────────────────

$totalStages = 4

Write-Host ""
Write-Host "  car-log — deploy to your home PC" -ForegroundColor Blue
Write-Host "  $totalStages stages" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  You drive the browser; this wizard tells you exactly what to do and" -ForegroundColor DarkGray
Write-Host "  captures the values you copy back. Stop any time with Ctrl-C and re-run" -ForegroundColor DarkGray
Write-Host "  later — it remembers values already saved." -ForegroundColor DarkGray
Wait-Key "Ready to start?"

# ── Stage 1: subdomain ────────────────────────────────────────────────────
Start-Stage "Subdomain on alipadron.dev"
Write-Say "Pick the subdomain your car-log will live at. It must not already be"
Write-Say "in use on alipadron.dev — the tunnel (stage 2) creates the DNS record."
Write-Note "e.g. 'carlog' → https://carlog.alipadron.dev"
while ($true) {
  $subdomain = Read-Value 'CAR_LOG_SUBDOMAIN' 'Subdomain (letters/numbers/dashes)'
  if ($subdomain -match '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$') { break }
  Write-Warn "Must be lowercase letters, numbers, dashes (e.g. 'carlog')."
}
Write-Env 'CAR_LOG_SUBDOMAIN' $subdomain

# ── Stage 2: Cloudflare Tunnel token ──────────────────────────────────────
Start-Stage "Cloudflare Tunnel"
Write-Say "Create a Cloudflare Tunnel for this subdomain and copy its token."
Open-Url "https://dash.cloudflare.com/"
Write-Step "Log in and open the zone for alipadron.dev."
Write-Step "Go to Zero Trust → Networks → Tunnels → Create a tunnel."
Write-Step "Connector type: Cloudflared. Name it (e.g. 'car-log')."
Write-Step "Copy the tunnel token (the long 'eyJ...' value shown in the install"
Write-Step "   command — everything between 'run --token' and the next quote)."
Write-Step "In the tunnel's Public Hostname tab, add: subdomain '$subdomain',"
Write-Step "   domain 'alipadron.dev', service 'http://localhost:80'."
Write-Note "The service URL MUST be http://localhost:80 — the tunnel container"
Write-Note "shares the app container's network so localhost reaches nginx directly."
$token = Read-Secret 'CLOUDFLARE_TUNNEL_TOKEN' 'Paste the tunnel token'
Write-Env 'CLOUDFLARE_TUNNEL_TOKEN' $token

# ── Stage 3: unlock password ──────────────────────────────────────────────
Start-Stage "Unlock password"
Write-Say "This is the single password the app asks for on first use. Anyone who"
Write-Say "reaches your subdomain needs it to see or add data — make it strong."
$password = Read-Secret 'CAR_LOG_UNLOCK_PASSWORD' 'App unlock password'
if ($password.Length -lt 8) {
  Write-Warn "That's short for the only lock on your data — consider a passphrase."
}
Write-Env 'CAR_LOG_UNLOCK_PASSWORD' $password

# ── Stage 4: Laravel APP_KEY ──────────────────────────────────────────────
Start-Stage "Laravel app key"
Write-Say "Generating a fresh APP_KEY — the value Laravel uses to sign sessions and"
Write-Say "API tokens. It must never change after the app is in use."
$appKey = Generate-AppKey
Write-Env 'APP_KEY' $appKey

Write-Host ""
Write-Host "  ✓ Setup complete" -ForegroundColor Green
Write-Note "wrote $($script:writtenEnv.Count) value(s) to ${envFile}: $($script:writtenEnv -join ' ')"
Write-Host ""
Write-Host "  Deploy it now:" -ForegroundColor Blue
Write-Step "docker compose -f deploy/docker-compose.yml up -d --build"
Write-Step "open https://$subdomain.alipadron.dev on your phone"
Write-Host ""