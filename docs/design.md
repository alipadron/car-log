# car-log — Design foundation (living document)

The decisions behind this setup are in `docs/adr/0003-spartan-ui.md` (which
superseded the hand-rolled token layer from ADR 0002). This file describes
the current vocabulary; values live in `web/src/styles.css`.

## Foundation

The design foundation is [spartan/ui](https://spartan.ng): brain (headless,
accessible primitives from npm) + helm (styled components copied into
`web/libs/ui/`, owned by this repo). Theme: spartan's default **Neutral**
palette and radius, as OKLCH CSS variables in `web/src/styles.css`.

## Color tokens

Semantic CSS variables with light (`:root`) and dark (`:root.dark`) values,
consumed as Tailwind utilities:

| Token | Used for |
|---|---|
| `background` / `foreground` | Page background, primary text |
| `card` / `card-foreground` | Card surfaces (`hlmCard`) |
| `primary` / `primary-foreground` | Primary actions (default `hlmBtn`) |
| `secondary` / `secondary-foreground` | Secondary surfaces |
| `muted` / `muted-foreground` | Secondary text, subtle surfaces |
| `accent` / `accent-foreground` | Hovered/selected accents |
| `destructive` | Errors, destructive actions |
| `border`, `input`, `ring` | Borders, input borders, focus rings |

Usage in templates: `bg-card`, `text-muted-foreground`, `text-destructive`,
`border-border`, etc. Prefer helm components (`hlmBtn`, `hlmInput`,
`hlmCard`, `hlmLabel`) over hand-assembling these utilities.

Domain state colors (due/overdue/pending-sync) are deliberately **not**
defined yet; they arrive with the home screen ticket as custom variables per
spartan's theming docs. Until then `text-destructive` covers errors, and the
offline indicator is rendered as a spartan `hlm-alert variant="destructive"`
banner in the app shell (no new color token). The pending-sync color arrives
with the offline-capture ticket (#10).

## Dark mode

Class-based: `.dark` on `<html>` switches all variables. The toggle in the
app shell (`web/src/app/theme.ts`) persists the choice in localStorage and
defaults to `prefers-color-scheme`.

## Typography

- Font: system stack (`--font-sans` in `styles.css`). No bundled fonts.
- Scale: Tailwind defaults (`text-sm` / `text-base` / `text-xl` /
  `text-2xl`). Hierarchy comes from size and weight.
- Form inputs: `text-base` (16px) minimum — prevents iOS auto-zoom.
  `hlmInput` already ships `text-base`.

## Spacing, radius, layout

- Spacing: Tailwind default scale.
- Radius: spartan's `--radius` (0.625rem) via helm components.
- Layout: centered single column. Forms and shell: `mx-auto w-full max-w-md
  px-4` (~28rem). Lists may use `max-w-2xl`. No multi-column desktop
  layouts in v1.

## Touch and interaction

- Interactive elements: 44px touch targets. This is baked into the vendored
  helm defaults — `hlmBtn` default size is `h-11`, `size="icon"` is
  `size-11`, `hlmInput` is `h-11` (local edits in `libs/ui/button` and
  `libs/ui/input`, marked with a comment; regenerating those components with
  the CLI reverts them). Call sites should NOT add `min-h-11` overrides.
- Focus: helm components ship visible focus rings; never remove outlines
  without a replacement.
- Primary actions on phone screens sit within one-handed reach (lower half).

## Icons

Inline SVG copied into the template from an MIT set (Lucide — see the theme
toggle in `web/src/app/app.html`). No icon fonts, no CDN assets.

## Form structure

All create/edit forms follow the same pattern:

- **Card wrapper**: `hlmCard` with `hlmCardHeader` (title via `hlmCardTitle`,
  optional description via `hlmCardDescription`) and `hlmCardContent` holding
  the fields.
- **Spacing**: `gap-4` on the form and inside `hlmCardContent`.
- **Buttons**: Submit and cancel buttons sit *outside* the card, full-width
  (`w-full`). Cancel uses `variant="outline"`.
- **Saved feedback**: Only on screens that stay visible after save (e.g.
  settings). Forms that navigate away on save (e.g. vehicle create/edit)
  don't show inline confirmation.
- **Description**: Only when the form has non-obvious choices (settings).
  Self-explanatory forms (vehicles) use the title alone.

## Rules for agents

- Use the spartan skill (`.agents/skills/spartan`) and the `@spartan-ng/mcp`
  server (`.mcp.json`) to confirm component APIs instead of guessing.
- Add components with `ng g @spartan-ng/cli:ui <name>`; do not hand-write
  new helm components. Config: `web/components.json`.
- No per-component CSS files (`angular.json` enforces `style: "none"` for
  generated components). Style with Tailwind utilities only.
- Forms use Signal Forms (`[formField]`) composed with helm styling
  primitives (`hlmInput`, `hlmLabel`, `hlmBtn`) — not helm's CVA-oriented
  field components (ADR 0003).
- New visual primitives not covered by spartan (a new state color, a new
  layout pattern) require asking the owner first.
