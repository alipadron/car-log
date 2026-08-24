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

### 1. Run the setup wizard

```sh
deploy/setup.sh
```

It walks you through the human-only steps (4 stages): choosing the subdomain,
creating the Cloudflare Tunnel and copying its token, setting the app's unlock
password, and generating the Laravel `APP_KEY`. It writes `deploy/.env` and
creates the `deploy/data/database.sqlite` file.

The tunnel's public hostname must point at `http://localhost:80` — the tunnel
container shares the app container's network namespace, so localhost reaches
nginx directly.

### 2. Bring it up

```sh
docker compose -f deploy/docker-compose.yml up -d --build
```

Two services start: `app` (nginx + php-fpm in one image, serving the built PWA
and `/api/*`) and `tunnel` (`cloudflared`). The app is not bound to a host
port — it is reached only through the tunnel at
`https://<subdomain>.alipadron.dev`.

### 3. Verify

```sh
deploy/smoke-test.sh   # builds the image and checks the PWA + API + auth + backup file
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

The entire database is one file: `deploy/data/database.sqlite` (SQLite — it
also holds sessions, cache, and queue tables). Backing up is copying that
file:

```sh
cp deploy/data/database.sqlite ~/car-log-backup-$(date +%F).sqlite
```

Restoring is copying it back while the app is stopped, then `docker compose
-f deploy/docker-compose.yml up -d`. The `APP_KEY` in `deploy/.env` must not
change — it signs the API tokens stored on your phone.
