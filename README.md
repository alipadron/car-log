# car-log

Personal vehicle maintenance tracker — see `CONTEXT.md` for the domain
glossary and settled decisions, and `docs/adr/` for architectural decisions.

## Layout

- `api/` — Laravel 13 API (PHP 8.5, SQLite)
- `web/` — Angular frontend
- `deploy/` — Docker image + Compose for the home-PC deployment

## Requirements

- PHP 8.5 + Composer and Node.js 26 + npm (both pinned via `mise.toml` —
  with [mise](https://mise.jdx.dev) installed, `mise install` provides them)
- Docker with the Compose plugin on the deploy machine (the home PC)

## First-run setup

API:

```sh
cd api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

Web:

```sh
cd web
npm install
```

## Running in dev

Start the API (serves on http://localhost:8000, SQLite database at
`api/database/database.sqlite`):

```sh
cd api
composer run dev
```

This runs the server, queue listener, and log tail together (Vite is
excluded — the API has no frontend assets). `php artisan serve` alone
also works if you only want the server.

Start the web app (serves on http://localhost:4200, proxies `/api` to the API
via `web/proxy.conf.json`):

```sh
cd web
npm start
```

Open http://localhost:4200 — the home screen shows the API health check
result, fetched through the dev proxy.

## Tests

```sh
cd api && php artisan test   # Laravel feature/unit tests
cd web && npm test           # Angular unit tests (Vitest, single run: npx ng test --watch=false)
```

## Deploying to your home PC

One Docker command runs the whole app — API + built PWA — on the home PC,
reachable at a subdomain of `alipadron.dev` through a Cloudflare Tunnel. See
`docs/adr/0004-deployment.md` for the architecture.

The deployment is OS-agnostic: the containers run under Docker Desktop
(Windows 11) or Docker Engine (Linux/macOS), and you drive everything from
your host shell — PowerShell on Windows, bash on Linux. No WSL distribution
is needed; Docker Desktop's WSL2 backend is transparent.

### 1. Run the setup wizard

The wizard is a PowerShell 7 script (runs on Windows *and* Linux/macOS):

```powershell
# Windows 11 (PowerShell 7 / pwsh, or Windows PowerShell):
powershell -ExecutionPolicy Bypass -File .\deploy\setup.ps1
# Linux/macOS:
pwsh -File deploy/setup.ps1
```

It walks you through the human-only steps (4 stages): choosing the subdomain,
creating the Cloudflare Tunnel and copying its token, setting the app's unlock
password, and generating the Laravel `APP_KEY`. It writes `deploy/.env`. On
Windows, install PowerShell 7 with `winget install Microsoft.PowerShell`.

The tunnel's public hostname must point at `http://localhost:80` — the tunnel
container shares the app container's network namespace, so localhost reaches
nginx directly.

### 2. Bring it up

```powershell
docker compose -f deploy/docker-compose.yml up -d --build
```

Two services start: `app` (nginx + php-fpm in one image, serving the built PWA
and `/api/*`) and `tunnel` (`cloudflared`). The app is not bound to a host
port — it is reached only through the tunnel at
`https://<subdomain>.alipadron.dev`.

### 3. Verify

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\smoke-test.ps1   # builds the image and checks the PWA + API + auth + backup file
```

### 4. Acceptance pass from a phone (manual, once)

v1's acceptance is behavioral and happens on the phone over the internet:

1. Open `https://<subdomain>.alipadron.dev` on your phone and install the PWA
   (Add to Home Screen).
2. Unlock with the password from `deploy/.env` — it stays unlocked across
   sessions.
3. Register the three vehicles (two cars, one bike); the seeded schedule
   templates appear per vehicle type.
4. Log an odometer reading, a repair, and an oil change (against a schedule).
5. Check the home screen shows each vehicle's current odometer and the correct
   due/overdue states.
6. Put the app in airplane mode, log a repair, then reconnect — it syncs
   exactly once (pending-sync marker clears, no duplicates).
7. Switch language, distance unit, and currency in Settings.

## Backups

The entire database is one file: `database.sqlite` (SQLite — it also holds
sessions, cache, and queue tables). It lives on the Docker named volume
`carlog-data`, mounted at `/var/www/html/data` in the container. Backing up
is copying that one file out of the volume:

```powershell
# PowerShell (Windows or Linux):
docker compose -f deploy/docker-compose.yml up -d   # ensure the stack is running
docker compose -f deploy/docker-compose.yml cp app:/var/www/html/data/database.sqlite ./car-log-backup.sqlite
```

Or, without touching the running stack:

```powershell
docker run --rm -v carlog-data:/data -v ${PWD}:/backup alpine cp /data/database.sqlite /backup/car-log-backup.sqlite
```

Restoring is copying it back while the app is stopped, then `docker compose
-f deploy/docker-compose.yml up -d`:

```powershell
docker compose -f deploy/docker-compose.yml down
docker run --rm -v carlog-data:/data -v ${PWD}:/backup alpine sh -c 'cp /backup/car-log-backup.sqlite /data/database.sqlite'
docker compose -f deploy/docker-compose.yml up -d
```

The `APP_KEY` in `deploy/.env` must not change — it signs the API tokens
stored on your phone.

> **Linux only (optional):** if you'd rather the SQLite file be a plain host
> file you can `cp` directly, set `CAR_LOG_DATA_VOLUME=./data` in `deploy/.env`
> — the compose file then bind-mounts `deploy/data` instead of the named
> volume, and the backup is literally `cp deploy/data/database.sqlite ...`.
> Keep the default on Windows: SQLite's file locking is unreliable over a
> Docker Desktop NTFS bind mount, so the named volume is the safe choice.
