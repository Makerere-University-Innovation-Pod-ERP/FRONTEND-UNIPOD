# MUTIC ERP Frontend

The MUTIC ERP browser app is imported from `Innovation-Hub-UI` and
integrated with the deployed Spring Boot API. The browser never connects
directly to PostgreSQL; database access and credentials remain on the backend.

## Run locally

Requirements: Node.js 20.19+ and npm.

```powershell
npm install
npm run dev
```

By default, both local development and production builds call
`https://backend-unipod.onrender.com/api` directly. The backend must allow the
frontend's exact browser origin in `CORS_ALLOWED_ORIGINS`. Override the API
origin by copying `.env.example` to `.env.local` and setting
`VITE_API_BASE_URL`. For a local Java backend, set it to
`http://localhost:8080/api`.

The backend must allow the frontend's exact browser origin in
`CORS_ALLOWED_ORIGINS`. The current backend defaults include
`http://localhost:5173` for Vite development. For a deployed frontend, add
its assigned HTTPS origin to the Render backend's environment, for example:

```text
CORS_ALLOWED_ORIGINS=https://your-frontend.example
```

Keep any existing allowed origins that are still needed. After changing the
backend environment variable, redeploy the backend.

## Build and validate

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

For static hosting, build with `npm run build` and publish `dist`. Set
`VITE_API_BASE_URL` in the hosting provider's build environment if the API
origin differs from the default.

## Deploy to Render

The root `render.yaml` defines a static site named `frontend-unipod`, builds
the app with `npm ci && npm run build`, publishes `dist`, and rewrites
client-side routes to `index.html`. Create/update the frontend from this
Blueprint and confirm its assigned public URL.

In the backend Web Service's Render environment, set
`CORS_ALLOWED_ORIGINS` to a comma-separated list that includes the exact
frontend origin, plus any development origins still needed. For the default
Render URL, use:

```text
CORS_ALLOWED_ORIGINS=https://frontend-unipod.onrender.com,http://localhost:5173,http://localhost:3000
```

If Render assigns a different URL, replace the frontend origin with the actual
origin (scheme and host only; no trailing slash or path). Save and redeploy the
backend after changing this variable. No PostgreSQL URL or database credential
belongs in the frontend service.

## Integrated workflows

- Sign in with an administrator-provisioned account; public signup is disabled.
- View role-scoped dashboard metrics and cases requiring attention.
- Search by exact case code or title with Ctrl/Cmd+K; browse all, student, and
  general submission lists with category, stage, and sector filters.
- Give submitters a dedicated, read-only My Submissions home with account
  capabilities and locked-module guidance.
- Review the reception queue and create administrator-provisioned accounts.
- Manage sectors and sector-officer assignments as an Administrator.
- Create submission drafts and view case details.
- Register drafts, forward received cases to a sector, and apply backend-approved
  case-stage transitions, outcomes, reviewer assignments, and document metadata.
- Check service health from the workspace connection indicator.

Access tokens are kept in `sessionStorage` and sent as bearer tokens. The
backend remains authoritative for authorization and validates every write.
Frontend environment variables must never contain database URLs with
credentials, database passwords, JWT signing secrets, or admin passwords.

## Textile Operations (customer orders, stock and machines)

Screens for the `ROLE_TEXTILE_DOMAIN_OWNER` role, shown in the sidebar under
**Textile operations**. They follow the Textile Domain Owner screen designs
and use the shared design tokens.

| Screen | Route |
|---|---|
| New order (Textile service-request intake, draft or send) | `/textile/orders/new` (`?draft=<id>` resumes a draft) |
| Order review & quote | `/textile/review` (`?order=<id>` selects an order) |
| Order board (New → Scheduled → Being made → Ready → Collected) | `/textile/board` |
| Order page (materials/machine/staff, quality checklist, collection) | `/textile/orders/:id` (index at `/textile/orders`) |
| Stock list (configurable minimum per item, movement audit trail) | `/textile/stock` |
| Add/use stock (Received / Used on order / Correction) | `/textile/stock/movements` |
| Machine list | `/textile/machines` |
| Report a fault / service | `/textile/machines/report` |
| Book the workshop (incl. training sign-up and attendance) | `/textile/bookings` |

Acceptance rules live in `src/lib/textile.js`, so the UI and the mock backend
enforce them the same way. The real backend must enforce them too:

- An order moves to **Scheduled** only when `payment.status` is `CONFIRMED`.
  Payment is confirmed by the shared Finance screens (Assignment 6), using the
  order code as the reference. Otherwise `POST /textile/orders/:id/transitions`
  returns `409`.
- A stock movement that would take an item below zero returns `409`. Every
  movement records who made it and when.
- A machine that is not `WORKING` cannot be booked or assigned to an order
  until it is marked Working again. A fault/service report alerts the managers
  straight away.
- A booking that clashes with another booking or with the class timetable
  returns `409`. The form also warns about clashes before submitting.

The `/textile/*` API contract (`src/services/textile.js`) is a proposal and
is not deployed yet. Run with `VITE_ENABLE_MOCKS=true` and sign in as
`textile@unipod.test` (any password) to use the MSW implementation in
`src/mocks/textile-handlers.js`.

To run **only the Textile screens**, use `npm run dev:textile`. It turns the
mock API on, signs in as the Textile domain owner automatically, opens the
order board, applies the Textile green theme and shows the Textile sidebar.
Links to other teams' modules open a placeholder page. Plain `npm run dev` is
unchanged.

In mock mode, quoted orders show a **Simulate Finance confirming payment**
button, so an order can be taken all the way to Collected without the
Finance screens. It calls a demo-only mock endpoint
(`/__demo__/finance/confirm-payment`), is hidden when the real backend is
used, and is not part of the `/textile` contract.

Tests: `src/lib/textile.test.js` (rules) and `src/services/textile.test.js`
(API contract through MSW) run in Vitest's node environment.
`src/pages/textile/Textile.test.jsx` (screens) needs jsdom, which needs
Node ≥ 22.22.2 (or ≥ 24.15). On older Node it fails to start with
"Cannot read properties of undefined (reading 'bind')" in undici.
