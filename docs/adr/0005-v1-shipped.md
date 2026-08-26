# ADR 0005: v1 shipped — i18n deviates from the spec

## Status

Accepted.

## Context

v1 is shipped: tickets 2–10 closed, the deploy (ticket 11) is live on the
home PC via Cloudflare Tunnel (ADR 0004), and ADRs 0001–0004 hold. One
deliberate deviation from the spec surfaced during implementation and is
recorded here so no future agent "fixes" it back.

The spec said: *"i18n: Angular i18n with en/es at launch."* What shipped is
not Angular's built-in i18n (`@angular/localize`) — `package.json` has no
localize package and `angular.json` has no i18n block.

## Decision

i18n is a hand-rolled, signal-based string dictionary at
`web/src/app/i18n/translations.ts`: a flat `{ en: {...}, es: {...} }` map
with an `en` fallback, exposed through a `translation` signal so the UI
re-renders when the language setting changes. Chosen because the string set
is small and flat, it needs no locale-splitting or build-time translation
pipeline, and it makes language switching live without a rebuild — the right
shape for a single-user app.

## Consequences

- Do not "upgrade" `translations.ts` back to Angular's built-in i18n without
  a reason; the deviation is deliberate.
- Adding a language means extending the dictionary; adding many languages or
  per-locale pluralization/formatting would justify revisiting this.