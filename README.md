# car-log

Personal vehicle maintenance tracker — see `CONTEXT.md` for the domain
glossary and settled decisions, and `docs/adr/` for architectural decisions.

## Layout

- `api/` — Laravel 13 API (PHP 8.5, SQLite)
- `web/` — Angular frontend

## Requirements

- PHP 8.5 + Composer and Node.js 26 + npm (both pinned via `mise.toml` —
  with [mise](https://mise.jdx.dev) installed, `mise install` provides them)

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
php artisan serve
```

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
