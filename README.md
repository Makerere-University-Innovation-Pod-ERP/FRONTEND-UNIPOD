# Innovation Hub Frontend

The Innovation Hub browser app is imported from `Innovation-Hub-UI` and
integrated with the deployed Spring Boot API. The browser never connects
directly to PostgreSQL; database access and credentials remain on the backend.

## Run locally

Requirements: Node.js 20.19+ and npm.

```powershell
npm install
npm run dev
```

By default, the frontend calls `https://backend-unipod.onrender.com/api`.
Override the API origin by copying `.env.example` to `.env.local` and setting
`VITE_API_BASE_URL`. For a local Java backend, use
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

## Integrated workflows

- Sign in with an administrator-provisioned account; public signup is disabled.
- View role-scoped dashboard metrics and cases requiring attention.
- Search and filter paginated submissions.
- Create submission drafts and view case details.
- Register drafts, forward received cases to a sector, and apply backend-approved
  case-stage transitions.
- Check service health from the workspace connection indicator.

Access tokens are kept in `sessionStorage` and sent as bearer tokens. The
backend remains authoritative for authorization and validates every write.
Frontend environment variables must never contain database URLs with
credentials, database passwords, JWT signing secrets, or admin passwords.
