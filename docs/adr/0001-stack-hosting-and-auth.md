# ADR 0001: Stack, hosting, offline capability, and auth

## Status

Accepted (pending owner confirmation).

## Context

car-log is a single-user, phone-first PWA for tracking vehicle repairs and
maintenance. The owner is a Laravel API developer and Angular expert.
Goals: tool first, product option preserved, learn new things. Hard
environmental constraint: the owner lives in Venezuela with ~6-hour daily
power outages, so a home-hosted server is regularly unreachable, and the
app must still capture entries during those windows.

Alternatives considered:

- **Livewire full-stack** — initially chosen for the "learn full Laravel
  stack" goal; dropped because Livewire is server-driven: offline, every
  interaction is a brick. Offline capture requires client-side capability
  Livewire cannot provide.
- **DigitalOcean droplet (~$5/mo)** — stays up during home outages and is
  reachable via mobile data; rejected for now in favor of $0 home hosting,
  accepting outage downtime. Reversible: the app is one Docker container.
- **Laravel Cloud / Render / Koyeb free tiers** — sleep when idle or gone;
  cold starts tax the core "log it in 10 seconds" use case.
- **Free shared PHP hosting (InfinityFree et al.)** — no SSH, no Composer;
  rejected as miserable for a daily tool with no product path.
- **Full offline (mirror all data to device)** — rejected; capture-only
  offline covers the real need at half the client complexity.

## Decision

- **Architecture**: Angular PWA (frontend) + Laravel 13 API-only (backend),
  PHP 8.5, SQLite, one Docker container.
- **Offline**: capture-only. A service worker + IndexedDB **outbox** stores
  entries created while offline and replays them to the API in order when
  connectivity returns. No conflict resolution beyond ordered replay
  (single user, append-mostly data). A read cache backs the home screen
  offline; full-history offline browsing is explicitly not built.
- **Hosting**: the owner's home PC, exposed via Cloudflare Tunnel at a
  subdomain of `alipadron.dev` (domain already owned). Accepted cost: the
  API is unreachable during power outages; the outbox covers capture, and
  everything syncs when power returns.
- **Auth**: one password (env var) exchanged for a Sanctum API token stored
  on the device. No user accounts until the app goes multi-user.
- **i18n**: UI language, distance unit, and currency configurable from
  day one.

## Consequences

- The learning goal shifts from "Livewire/full-stack Laravel" to
  "offline-capable PWA sync" — an accepted trade; the owner's Angular
  expertise makes the outbox pattern nearly free.
- During outages the home screen may show stale data; entries captured
  offline must be visibly marked "pending sync" in the UI so their state
  is never ambiguous.
- The outbox's ordered replay means server-side endpoints must be
  idempotent or tolerate replays (e.g. client-generated UUIDs on every
  entry) — a requirement the API design must honor from the start.
- If home hosting proves too fragile in practice, migrating to a droplet
  is a DNS + machine move, not a code change.
