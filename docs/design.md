# car-log — Design tokens (living document)

The decisions behind these values are in `docs/adr/0002-design-foundations.md`.
This file holds the current values; it is expected to change. Token
*semantics* changes (adding/removing a state color) require amending the ADR.

Implementation: `web/src/styles.css` (`@theme` + CSS custom properties,
Tailwind v4 CSS-first config). Dark values apply automatically via
`prefers-color-scheme`.

## Color tokens

All values are steps of the Tailwind default palette. State colors use the
palette step that passes WCAG AA contrast (4.5:1) as text on `--surface`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `surface` | white | zinc-950 | Page background |
| `surface-muted` | zinc-100 | zinc-900 | Cards, inset areas |
| `ink` | zinc-900 | zinc-100 | Primary text |
| `ink-muted` | zinc-500 | zinc-400 | Secondary text, placeholders |
| `border` | zinc-200 | zinc-800 | Borders, dividers |
| `accent` | blue-600 | blue-500 | Primary actions, focus rings, links |
| `accent-ink` | white | white | Text on `accent` backgrounds |
| `success` | green-700 | green-400 | Synced, schedule OK |
| `warning` | amber-700 | amber-400 | Due soon |
| `danger` | red-700 | red-400 | Overdue, errors |
| `pending` | sky-700 | sky-400 | Captured offline, pending sync |

Usage in templates: `bg-surface`, `text-ink`, `border-border`, `bg-accent`,
`text-accent-ink`, `text-danger`, etc. State colors are for text and small
indicators (badges, dots); do not paint large areas with them.

## Typography

- Font: system stack (Tailwind's default `--font-sans`). No bundled fonts.
- Scale: Tailwind defaults (`text-sm` / `text-base` / `text-lg` /
  `text-2xl`). Hierarchy comes from size and weight, not typeface.
- Form inputs and buttons: `text-base` (16px) minimum — prevents iOS
  auto-zoom on focus.

## Spacing, radius, layout

- Spacing: Tailwind default scale.
- Radius: `rounded-lg` for inputs, buttons, cards.
- Layout: centered single column. Forms: `mx-auto w-full max-w-md px-4`
  (~28rem). Lists (e.g. home screen) may use `max-w-2xl`. No multi-column
  desktop layouts in v1.

## Touch and interaction

- Interactive elements: `min-h-11` (44px) minimum.
- Focus: visible ring — `focus:ring-2 focus:ring-accent/30` on inputs;
  never remove outlines without a replacement.
- Primary actions on phone screens sit within one-handed reach (lower half).

## Icons

Inline SVG copied into the project from an MIT set (Lucide or Heroicons —
pick when the first icon ships). No icon fonts, no CDN assets.

## Rules for agents

- No per-component CSS files (`angular.json` enforces `style: "none"` for
  generated components). Style with Tailwind utilities only.
- Use semantic token utilities (`text-danger`, `bg-surface`), not raw palette
  colors (`text-red-700`) in templates.
- DRY the styling, not just the logic — but extraction is the owner's call.
  When a cluster of Tailwind utilities appears twice, or a UI piece has a
  name (button, input, form field, card, badge), agents flag it as an
  extraction candidate and explain the reasoning; the owner decides whether
  to extract. This is a judgment rule, not a rigid one — some duplication is
  acceptable and stays. Approved primitives become presentational components
  under `web/src/app/ui/` with a clean `input()`/`output()` API.
- New visual primitives not covered here (a new state color, a new layout
  pattern, a component family) require asking the owner first — see the
  agency rule in ADR 0002.
- Reference implementation: `web/src/app/unlock/unlock.html`.
