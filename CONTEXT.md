# car-log — Context

A personal app to track what's done to your vehicles: repairs, scheduled
maintenance, odometer readings, and costs. Single-user, phone-first,
self-hosted at home, **offline-capable**: it must capture new entries during
power/connectivity outages and sync when the server returns. Tool first;
kept product-shaped so multi-user is possible later without a rewrite.

## Glossary

- **Vehicle** — a thing you maintain. Types: `car`, `bike`. You own three:
  two cars, one bike.
- **Odometer entry** — a dated distance reading for a vehicle. Attached to
  repairs and maintenance events automatically; can also be logged standalone.
- **Repair** — something broke and was fixed. Dated, with odometer, cost,
  notes.
- **Maintenance schedule** — a recurring service rule on a vehicle, e.g.
  "oil every 10,000 km or 12 months". Either interval may be omitted.
  Seeded from **templates** per vehicle type (5–8 items); fully editable;
  custom schedules allowed.
- **Maintenance event** — one performed instance of a schedule (or a one-off
  service). Dated, with odometer, cost, notes.
- **Due / overdue** — derived, never stored: a schedule is due when
  `last event + interval` is reached by current odometer or current date.
  Shown as an in-app due/overdue list on the home screen.
- **Cost** — a money amount on a repair or maintenance event, in the user's
  configured currency.
- **Outbox** — the client-side queue (IndexedDB) holding entries captured
  while offline. Replayed to the API when connectivity returns, then
  cleared. Client-only concept; the server never sees it.

## Settled decisions

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Audience | Single-user (just me). Architecture stays product-shaped. |
| 2 | v1 scope | Vehicles, repairs log, maintenance schedules with due/overdue, odometer entries, costs. |
| 3 | v2 scope | Fuel logging + consumption stats, document/receipt photos, push notifications. |
| 4 | Vehicles | Multi-vehicle from day one: `car` and `bike` types. |
| 5 | Platform | Phone-first installable **Angular PWA**. Offline scope: capture-only — new entries queue locally and sync on reconnect (see 13). |
| 6 | Reminders | In-app due/overdue list. Push deferred to v2. |
| 7 | Data location | Server + database, not device-local (except the transient outbox). |
| 8 | Hosting | **Home PC**, Docker deployment, exposed via **Cloudflare Tunnel** at a subdomain of `alipadron.dev`. Accepted cost: the server is down during power outages (~6h daily); offline capture covers the gap. No UPS. |
| 9 | Auth | Single password → API token (Laravel Sanctum) stored on the device. No user table until multi-user exists. |
| 10 | Stack | **Laravel 13 API-only** + **Angular PWA**, PHP 8.5, SQLite. (Livewire was considered and dropped: server-driven rendering can't work offline, and Angular is the owner's expertise.) |
| 11 | i18n & units | Configurable UI language, distance unit (km/mi), and currency from day one. |
| 12 | Schedules | Seeded templates per vehicle type, editable, custom allowed. |
| 13 | Offline sync | IndexedDB outbox on the device; entries captured offline are replayed to the API in order when the server is reachable, then cleared. Append-mostly data + single user ⇒ no conflict resolution beyond ordered replay. |

## Data model sketch

Server (SQLite):

- `vehicles` — id, name, type, make/model/year, created_at
- `odometer_entries` — vehicle_id, value, recorded_at
- `repairs` — vehicle_id, title, notes, cost, performed_at, odometer_value
- `maintenance_schedules` — vehicle_id, name, interval_km?, interval_months?
- `maintenance_events` — schedule_id (nullable for one-offs), notes, cost, performed_at, odometer_value
- `settings` — language, distance_unit, currency (single row)

Current odometer per vehicle = latest odometer entry, or the max value seen
on any event — whichever is newer. Due/overdue computed from schedules +
latest events at read time.

Client (IndexedDB): an `outbox` store of pending create-operations
(entity type + payload + client timestamp), plus a read cache of recent
server state for offline viewing of the home screen.

## Explicitly out of scope (until product decision)

Accounts, sharing, multi-user, social anything, a public marketing site.
