# MUTIC ERP frontend — team contribution guide

Quick reference for everyone building against the v2 assignment doc (78 screens,
6 domains, 12 slots). Assignment 4 (Fact-Finding/Reviewer) is already built in
this repo and is the pattern to copy — don't invent a new folder shape.

## 1. Who owns what

| # | Developer | Domain | Screen folder (suggested) |
|---|---|---|---|
| 1 | Malual Martin Biar | Platform & Administration | `pages/admin/` |
| 2 | Mulema Blaise Davis | Innovation coordinator & decisions | `pages/coordinator/` |
| 3 | Peter Arnold Mukasa | Reception intake | `pages/reception/` *(already has `ReceptionQueuePage.jsx`)* |
| 4 | Wasswa Job Kitandwe | Submitter self-service | `pages/submitter/` *(already has `MySubmissionsPage.jsx`, `NewSubmissionPage.jsx`)* |
| 5 | Kasibante Taufic Larry | Fact-finding, Reviewer, dept intake | `pages/fact-finding/`, `pages/reviewer/` *(built)* |
| 6 | Namayanja Mary Prechard | Finance & Partners (shared) | `pages/finance/` |
| 7 | Ssebyala Denis Ntendo | Multimedia — quoting & scheduling | `pages/multimedia/` |
| 8 | Namulinde Jean Madrine | Multimedia — skilling/equipment | `pages/multimedia/` (same folder as #7 — agree on file names) |
| 9 | Textile owner | Textile domain | `pages/textile/` |
| 10 | CNC & Carpentry owner | CNC & Carpentry domain | `pages/cnc-carpentry/` |
| 11 | Telecoms owner | Telecoms domain | `pages/telecoms/` |
| 12 | Shared modules owner | Rules, Notifications, operational-domain kit | `pages/rules/`, components under `components/kit/` |

Each domain gets **one folder under `src/pages/<domain>/`**, one file per screen,
named for the screen (`OrderBoard.jsx`, `NewOrderPage.jsx`, …) — same pattern as
`src/pages/fact-finding/FactFindingWorkspace.jsx`.

## 2. What already exists — reuse it, don't rebuild it

| Need | Use this | Don't |
|---|---|---|
| Page shell, sidebar, nav, topbar, search, notifications bell | `src/components/BackendWorkspace.jsx` | build your own layout |
| Fetch client, error handling, base URL | `src/services/api-client.js` (`request()`, `ApiError`) | call `fetch` directly in a page |
| Role/permission checks | `src/lib/permissions.js` (add your role helpers here, follow `isFactFindingOfficer` style) | hardcode role strings in a page |
| Session/auth state | `src/lib/auth.js` | read tokens from `localStorage` (never — tokens stay in memory/session only, per the assignment's security rule) |
| Buttons, inputs, tables, badges, alerts, panels, page headers | the class names in `src/api.css` (`.btn`, `.btn-primary`, `.live-table`, `.stage-pill`, `.api-error`, `.live-panel`, `.live-page-heading`, …) — see `DESIGN_SYSTEM.md` | write new one-off CSS per screen |
| Brand colors (Mak Red/Black/Green/Gold/Silver) | the CSS variables in `src/styles/tokens.css` (`var(--mak-red-600)`, etc.) | hardcode a new hex |
| Error boundaries | `src/components/error-boundary.jsx` | let a page crash the whole app |
| Mock network layer | `src/mocks/handlers.js` + `src/mocks/fixtures/*.js` + `src/mocks/server.js`/`browser.js` | hardcode arrays of fake data inside a page component |
| Toggle mocks | `VITE_ENABLE_MOCKS=true` in `.env.local` | — |

Read `DESIGN_SYSTEM.md` before styling anything — it has the full color table,
contrast notes, and known CSS gaps.

## 3. What's shared but not built yet — coordinate before you start

- **The payment gate (Assignment 6)**: every paid action in every domain
  (Multimedia, Textile, CNC & Carpentry, Telecoms, bootcamp/training seats)
  must lock on the same invoice → proof → Finance-check → receipt → Paid
  flow. Domains 7–11: don't build your own payment screens — call into
  Assignment 6's invoice/proof/receipt service once it's published, the same
  way `src/pages/fact-finding/*` calls into `src/services/fact-finding.js`.
- **The operational-domain kit (Assignment 12)**: intake form, quote &
  payment panel, Kanban board, detail page, stock/equipment list is **one**
  shared component family for Multimedia/Textile/CNC & Carpentry/Telecoms.
  If you're assignments 7–11, don't each build your own board component —
  agree props/routes with #12 first. A good home for it once it exists:
  `src/components/kit/` (e.g. `OperationalBoard.jsx`, `IntakeForm.jsx`,
  `StockList.jsx`), imported and skinned per domain the way
  `BackendWorkspace.jsx` is imported by every role today.
- **Notifications (Assignment 12)**: one global bell/panel. If your screen
  needs to fire a notification, call the shared helper #12 publishes under
  `src/services/notifications.js` (already scaffolded) — don't build a
  second notification list.

## 4. Routes — the one file everyone touches

`src/App.jsx` holds every route. It's a single shared file, so:

1. Add your routes grouped together with a one-line comment naming your
   domain (see the existing fact-finding/reviewer block for the pattern).
2. Gate each route with your role check from `src/lib/permissions.js`
   (`canFactFind ? <Page/> : <AccessRestricted .../>`), never leave a route
   unguarded.
3. Keep PRs to `App.jsx` small (just your added routes) so merges don't
   collide — rebase onto `main` before opening, don't let this file sit
   stale in a long-lived branch.

## 5. Git workflow

- One feature branch per domain: `feature/<yourname>-<domain>` (matches the
  existing `feature/wasswa-fact-finding-reviewer` branch).
- Before opening a PR: `npm run typecheck && npm run lint && npm run build && npm run test` must all pass.
- A designated maintainer merges into `main` — don't self-merge into `main`.

## 6. Resolving merge conflicts in the shared files

Everyone's branch edits the same handful of files — `src/App.jsx` (routes),
`src/components/BackendWorkspace.jsx` (sidebar nav), `src/mocks/handlers.js`
(mock login + API handlers), `src/api.css` (design tokens). Conflicts here
are expected, not a sign you did something wrong. Two things to know before
you touch one:

**The rule for all four: keep both sides' additions, never pick one.** A
conflict here almost never means "mine vs. theirs" — it means "my new route
*and* their new route both belong in the file." If you see
`<<<<<<< HEAD` / `=======` / `>>>>>>>`:
- **Imports**: merge into one import statement per module, dedupe anything
  listed twice.
- **Routes in `App.jsx`**: keep every `<Route>` from both sides. Only drop
  one if it's a genuine duplicate of the exact same path.
- **`mockUsers` in `handlers.js`**: it must stay **one** object literal.
  Merge both sides' entries into it; never leave a second `{`/`};` pair
  floating mid-file — that's valid-*looking* but broken JS (we've hit this
  twice already).
- **`:root{}` in `api.css`**: there must be exactly **one** active token
  block. If you see a second `--forest:`/`--bg:`/etc. definition appear
  further down in the same file, that's a leftover duplicate from a bad
  merge, not an intentional override — delete it, don't keep both.

**The dangerous case is the one git *doesn't* flag.** Several real breakages
this week produced **no conflict markers at all** — git's line-based merge
"succeeded" but left a second copy of `mockUsers`'s content stranded after
unrelated code, or two copies of the whole token block concatenated
together. Git can't always tell that two branches touching different lines
of the *same logical object* actually collide. So:

> **After every `git pull`, conflict or not, run:**
> ```bash
> npm run typecheck && npm run lint && npm run build && npm run test
> ```
> Don't skip this when the pull says "already up to date" or merges without
> a single conflict marker — that's exactly when the silent kind slips through.

If something's broken and you can't see why, check for duplicates directly:
```bash
grep -c "const mockUsers" src/mocks/handlers.js   # should be 1
grep -c "^:root{" src/api.css                     # should match what you expect, not jump up by 1
grep -c "YourRoleHelperName" src/App.jsx           # should appear once in the import, not twice
```

If you're stuck, say so rather than force-pushing past it — these exact
failure modes have already come up and been fixed multiple times, so there's
a fast path to getting it sorted.

## 7. Two things the spec doc assumes that this repo does differently

- **Tailwind**: the assignment doc says v3/PostCSS; this repo already runs
  **Tailwind v4, CSS-first** (`@tailwindcss/vite`, no `tailwind.config.js`,
  no PostCSS file). Don't add one — just `@import 'tailwindcss'` is already
  wired in `src/index.css`.
- **API prefix**: the doc assumes `/api/v1`; the real deployed backend
  (`src/services/api-client.js`) uses `/api` with no version segment. Follow
  what's in `api-client.js`, not the doc's assumed prefix.

## 8. Open items (Section 9 of the assignment doc)

Several real-world facts are still unconfirmed by department heads (prices,
Textile/CNC/Telecoms workflows, review outcome list, whether student podcast
slots are free). Build against the assumed pattern in the assignment doc,
but mark these assumptions in your own handover notes rather than treating
them as settled — they're tracked in the assignment doc's Section 9, not
duplicated here.
