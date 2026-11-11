# UNIPOD ERP — shared design system (frontend team)

One source of truth for colors, type, spacing and component look, per the
assignment's "Shared design and engineering standards" section. Every
screen (all 11 roles) should pull color through these tokens instead of
hardcoding hex — that's what makes a future palette correction or
dark-mode pass a one-file change instead of a hunt through every page.

## Where it lives

- `src/styles/tokens.css` — the canonical Mak Red/Black/Green/Gold/Silver
  scale, typography scale, spacing scale, radius/shadow, focus ring.
  Imported once, at the top of `src/index.css`.
- `src/index.css` — remaps shadcn/ui's semantic variables (`--primary`,
  `--destructive`, `--border`, `--ring`, `--sidebar-*`, …) onto the Mak
  tokens. Any screen built with the `src/components/ui/*` component
  library (Button, Badge, Dialog, Table, …) picks up the brand automatically.
- `src/api.css` — the stylesheet the live app actually renders through
  today (see "Known gaps" below). Its own `:root` token block (`--forest`,
  `--green`, `--amber`, `--blue`, `--rose`, `--sidebar-*`) is now sourced
  from the Mak palette too. Components here (`.btn`, `.stage-pill`,
  `.live-table`, `.api-error`, …) already reference these variables, so
  nothing in that file needed per-component edits — only the token values
  changed.

## The palette

Source: the official Makerere University crest (mak.ac.ug site theme
asset, not an invented palette). Each hue is a small scale, not one raw
swatch, because the crest's own tones don't all clear WCAG 2.2 AA
(4.5:1) for normal text on white.

| Role (per the standards doc)     | Token                              | Hex       | Use |
|---|---|---|---|
| Primary emphasis                 | `--mak-red-600`                    | `#C81B1D` | buttons, links, focus, selection — 5.8:1 on white |
| Primary hover/active             | `--mak-red-700` / `--mak-red-800`  | `#B11116` / `#94070A` | hover, pressed |
| Text / navigation                | `--mak-black-900`                  | `#231F20` | body text, nav ink — 16.3:1 on white |
| Positive / success               | `--mak-green-600`                  | `#006E34` | success text/icon — 6.4:1 on white |
| Pending / needs attention        | `--mak-gold-500` + dark text       | `#FDB515` | backgrounds only — pair with black/dark text, never gold text on white |
| Neutral surfaces & borders       | `--mak-silver-*`                   | `#F1F2F3` → `#67686B` | cards, dividers, muted text |

Two states the standards doc doesn't name a hue for, resolved as
documented judgment calls rather than inventing a 6th brand color:

- **In progress** (fact-finding / under review stages): a darker neutral
  (silver/black) tier, distinct from the lighter "draft" neutral.
- **Error / destructive**: the darker red tier (`--mak-red-800` family),
  distinguished from primary-action red by context (icon + tinted
  background), not by a different hue.

All text/background pairs above were checked against WCAG 2.2 AA
(4.5:1 normal text, 3:1 large text/UI) before landing in the token file.

## Known gaps / open items for the team

- **`src/components/ui/*` (shadcn/ui, ~54 files) is almost entirely
  unused by the live app today** — only `not-found.jsx` imports from it.
  Every real screen (dashboard, submissions, fact-finding, reviewer,
  admin) is styled through the hand-rolled `src/api.css` classes instead.
  It's now re-themed and ready if anyone builds a screen with those
  components, but it isn't where most of the visual system actually lives.
- **`src/api.css` has a dead, shadowed block at the top of the file**
  (roughly its first ~35 physical lines) — an older, hardcoded-hex
  version of many of the same rules (`.btn-primary`, `.live-sidebar`,
  `.stage-pill`, …) that a merge left in place. CSS cascade rules mean
  the later, token-based rules (from `:root{...}` onward) win and are
  what actually renders, so this didn't need touching to retheme — but
  it's dead weight that could confuse the next person who edits colors
  in the wrong (shadowed) place. Worth a dedicated cleanup pass; not
  touched here to keep this change scoped to the palette.
- No official MUTIC/UniPod brand book was available — these hex values
  are extracted from the live Makerere crest asset, not a published style
  guide. If the university or UniPod has exact approved hex codes, only
  `src/styles/tokens.css` needs updating.
