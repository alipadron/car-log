# ADR 0002: Design foundations

## Status

Accepted (pending owner confirmation).

## Context

car-log's spec, CONTEXT.md, and ADR 0001 settled everything about stack,
hosting, offline, and auth — but nothing about visual design. By the time
ticket 02 (unlock screen) landed, the only styling in the repo was ~30 lines
of hand-rolled CSS with one hardcoded color. Ticket 03 (register vehicles)
is the first real form UI, so styling decisions could not be deferred any
longer without accreting ad-hoc CSS that ticket 08 (home screen) would
inherit as debt.

Constraints already on record: phone-first installable PWA, tool first,
WCAG AA / AXE compliance (web/AGENTS.md), and offline-capable — so no
runtime dependencies on fonts or icon CDNs. The owner also uses the app
from desktop, so layouts must be respectable on wide screens, and the
ADR 0001 consequence "pending sync must be visibly marked" plus the
due/overdue home screen make state colors core vocabulary, not decoration.

Alternatives considered:

- **Defer design until the home screen (ticket 08)** — rejected: tickets
  03–07 would each invent their own forms, colors, and state styling.
- **Angular Material or another component library** — rejected: the app is
  a handful of forms and lists; a library costs bundle size and imposes a
  look for little gain at this scope.
- **Plain CSS with custom properties, no framework** — rejected on owner
  preference: the owner works in Tailwind daily, and CONTEXT.md already
  privileges owner expertise (Angular over Livewire) for the same reason.
- **Bespoke palette / bundled font / icon font** — rejected: invention and
  offline-fragile assets with no users to impress. Tailwind's shipped
  palette, the system font stack, and inline SVG icons suffice.

## Decision

- **Timing**: design foundations decided once, up front (this ADR), before
  ticket 03. Per-screen layout decisions are made ticket by ticket.
- **Ambition**: tool-first minimal — a neutral, utilitarian look driven by
  a small set of semantic tokens. No mockups, no branding exercise.
- **Stack**: Tailwind CSS v4 (CSS-first config) as the authoring layer.
  Tokens are defined in `@theme` / CSS custom properties in
  `web/src/styles.css`, so the foundation is the tokens, not the framework.
- **Tokens**: a semantic layer over Tailwind's default palette —
  surface/ink/border, one accent (blue), and four state colors
  (success/due-ok, warning/due-soon, danger/overdue, pending-sync), chosen
  at the palette step that passes WCAG AA on its surface. Living values in
  `docs/design.md`.
- **Dark mode**: every color token has a light and dark value from day one;
  the app follows `prefers-color-scheme`. No manual toggle in v1.
- **Typography**: system font stack (Tailwind's default `--font-sans`).
  No bundled font assets.
- **Layout**: phone-first, centered single column on desktop. Forms
  max-width ~28rem (`max-w-md`); lists may go wider (`max-w-2xl`).
  Multi-column desktop layouts are deferred until a screen justifies them.
- **Touch**: minimum 44px targets; form inputs at 16px minimum font size
  to prevent iOS zoom; primary actions reachable one-handed on phone.
- **Icons**: inline SVG from an MIT set (Lucide or Heroicons), copied into
  the project. No icon fonts. Which set is decided when the first icon
  ships.
- **Component styles**: no per-component CSS files. Components use Tailwind
  utilities only; `angular.json` sets `@schematics/angular:component` to
  `"style": "none"` so generated components follow suit.
- **Reusable primitives over repeated utilities — by proposal, not
  unilaterally**: when a cluster of Tailwind classes appears twice, or a UI
  piece has a name (button, input, form field, card, badge), agents flag it
  as an extraction candidate with their reasoning; the owner decides whether
  to extract. The rule is deliberately not rigid — some duplication is
  acceptable and stays. Approved extractions become presentational
  components under `web/src/app/ui/`. Tailwind makes duplication cheap to
  write; this rule is the counterweight.
- **Agency rule**: once these foundations are settled, agents implement
  within them without asking, but must stop and ask the owner whenever a
  ticket needs something the foundations don't cover (a new component
  pattern, a new color, a new icon, a wider layout).

## Consequences

- `docs/design.md` holds the living token values; this ADR holds the
  decisions. Token *values* may change without amending the ADR; token
  *semantics* (adding/removing a state color) may not.
- The unlock screen (ticket 02) is restyled to these foundations as the
  reference implementation.
- Ticket 03 (register vehicles) inherits form styling, state colors, and
  layout rules — no styling decisions remain open for it.
- A future "settings" decision (ticket 04) may add a manual dark/light
  toggle; the token structure already supports it.
- If the app ever goes multi-user/product, these foundations are a
  starting point, not a brand — revisiting them is expected, not a failure.
