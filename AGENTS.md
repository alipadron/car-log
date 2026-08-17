# car-log

Personal vehicle maintenance tracker. Read `CONTEXT.md` for the domain
glossary and settled decisions, `docs/SPEC.md` for the v1 contract, and
`docs/adr/` for architectural decisions.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
