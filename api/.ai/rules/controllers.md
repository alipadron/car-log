---
paths:
  - 'app/Http/Controllers/**'
---

# Controllers

## Create endpoints are idempotent on client uuid
Every create endpoint must accept a client-generated `uuid` and be idempotent on it: if a record with that uuid already exists, return 200 with the original record instead of creating (see VehicleController::store). This is what makes client outbox replay safe (ADR 0001). Validation: `uuid` => required + uuid rule; DB column: `->uuid('uuid')->unique()`.
