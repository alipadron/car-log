# ADR 0004: Home-PC deployment — one image, Docker Compose, Cloudflare Tunnel

## Status

Accepted.

## Context

ADR 0001 settled *that* car-log runs on the owner's home PC, exposed via
Cloudflare Tunnel at a subdomain of `alipadron.dev`, with the whole database
as one SQLite file. What it did not settle is *how* — how the built PWA and
the API are packaged and served, how the machine brings them up, and how the
SQLite file is persisted and backed up. Ticket 11 is that decision.

Constraints on the record: single-user home server (no multi-tenant concerns),
power outages (the container must survive restarts with state intact), the
whole database is one file to copy (user story 19), and the owner's phone is
the primary client — the app must be reachable at a real subdomain, so a
Cloudflare Tunnel is required, and its creation is a human-in-the-browser
step.

Alternatives considered:

- **Two images (API container + static nginx container)** — rejected: more
  moving parts on a machine the owner maintains by hand; the spec says
  "one Docker image serves the API and the built PWA".
- **Serve the PWA from Laravel via a catch-all web route** — rejected: the
  app is deliberately API-only (`withRouting(api: ...)`, no `web.php`); a
  catch-all route would fight the SPA's client-side routing and the
  `shouldRenderJsonWhen` exception handling. Nginx serves the static build
  and only routes `/api/*` and `/up` to PHP, which keeps the API boundary
  clean.
- **SQLite in a Windows NTFS bind mount** — rejected: on Docker Desktop
  (Windows), SQLite's POSIX file locking is unreliable over a bind mount into
  NTFS, risking "database is locked" corruption. The database lives on a
  **Docker named volume** (`carlog-data`), mounted at a dedicated
  `/var/www/html/data` dir inside the container. A named volume is ext4 in the
  Docker VM, so locking behaves; backups are `docker compose cp` of the one
  file. Linux users may opt into a bind mount via `CAR_LOG_DATA_VOLUME=./data`.
- **Host-side scripts in bash (Git Bash / WSL)** — rejected: the owner runs
  the deployment from the Windows 11 host itself, not from a WSL distribution.
  The wizard and smoke test are **PowerShell 7 scripts** (`setup.ps1`,
  `smoke-test.ps1`), which run natively on Windows PowerShell and on
  Linux/macOS via `pwsh`. Docker Desktop's WSL2 backend is transparent — no
  distro is ever touched.
- **Expose the app on a host port** — rejected: the tunnel is the only entry
  point; binding a host port adds an attack surface for zero benefit.
- **FrankenPHP or a single-binary server** — rejected: nginx + php-fpm is
  the Laravel-documented baseline and familiar to the owner; the extra
  process (supervised) is worth the boringness on a home server.

## Decision

- **One image** (`deploy/Dockerfile`, multi-stage): the Angular PWA is built
  (Node stage) and its `dist/web/browser` output is copied into the Laravel
  `public/` dir; Composer deps are installed `--no-dev`; the runtime stage is
  `php:8.5-fpm` with nginx and supervisord. The container answers `/` and
  `/api/*`.
- **Serving** (`deploy/nginx.conf`): nginx serves static files from
  `public/`; `/api/*` and `/up` go to php-fpm via `public/index.php`; any
  other non-file path falls back to `index.html` so Angular client-side
  routes work on deep links and refresh. No `web.php`, no catch-all route.
- **Processes** (`deploy/supervisord.conf`): supervisord runs nginx and
  php-fpm in the container; the entrypoint (`deploy/entrypoint.sh`) ensures
  storage dirs, touches the SQLite file, applies migrations idempotently,
  then hands off to supervisord.
- **Env vars reach Laravel**: the php-fpm pool sets `clear_env = no` — the
  container's environment (`APP_KEY`, `CAR_LOG_UNLOCK_PASSWORD`, ...) is
  visible to workers without baking a `.env` into the image.
- **Compose** (`deploy/docker-compose.yml`): two services — `app` (built
  from the repo root) and `tunnel` (`cloudflare/cloudflared`, running with
  the tunnel token from env, `network_mode: service:app` so its public
  hostname points at `http://localhost:80`). No host port for `app`.
- **Persistence**: the SQLite file lives on the named volume `carlog-data`,
  mounted at `/var/www/html/data` — a dedicated dir, never over the whole
  `database/` dir (which would hide the image's migrations). `DB_DATABASE`
  points Laravel at `/var/www/html/data/database.sqlite`. Linux users can
  opt into a bind mount via `CAR_LOG_DATA_VOLUME=./data`.
- **Human steps**: `deploy/setup.ps1` (wizard, PowerShell 7) walks the owner
  through choosing the subdomain, creating the Cloudflare Tunnel and copying
  its token, setting the unlock password, and generating `APP_KEY`, writing
  `deploy/.env`.
- **Backup**: `docker compose cp app:/var/www/html/data/database.sqlite ...`
  (documented in the README).
- **OS support**: Windows 11 host via Docker Desktop, Linux/macOS via Docker
  Engine or Docker Desktop. All host commands are PowerShell-compatible.

## Consequences

- One command on the home PC brings the whole app up:
  `docker compose -f deploy/docker-compose.yml up -d --build`.
- Updating = rebuild the image (`docker compose ... up -d --build` again);
  migrations run in the entrypoint before nginx/php-fpm start.
- `APP_KEY` must never change after first use — it signs the Sanctum tokens
  stored on the phone. The wizard generates it once and it lives in
  `deploy/.env` (gitignored).
- The image build happens on the home PC (npm ci + composer install in the
  build); no CI/CD is set up yet. That is acceptable at this scale and can
  be added later without changing the image contract.
- The tunnel token and unlock password live in `deploy/.env`, which is
  gitignored; the host is the owner's single-user machine, so a secret
  store is not warranted yet.