# OceanX — Polar Science Portal

**SIH26063 — Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal.**

One Next.js 16 application: the public website, the admin/contributor workspace and the REST API (`/api/v1`), backed by PostgreSQL (Prisma 7).

| I want to… | Read |
|---|---|
| Build the public frontend | [`docs/FRONTEND_HANDOFF.md`](docs/FRONTEND_HANDOFF.md) |
| Know what an endpoint does / returns / requires | [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) (single source of truth) |
| Test the API with curl / Postman | [`docs/API_TESTING.md`](docs/API_TESTING.md) · [`docs/openapi.yaml`](docs/openapi.yaml) |
| Change the API | [`CLAUDE.md`](CLAUDE.md) → “API contract rules” |
| Deploy to Vercel | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |

## Quick start

```bash
npm install
cp .env.example .env.local && cp .env.example .env

# Frontend only (no database): use the mock API
#   set NEXT_PUBLIC_USE_MOCK_API="true" in .env.local
npm run dev

# Full stack
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev       # http://localhost:3000 — API at http://localhost:3000/api/v1
```

Demo logins (mock API and seeded dev DB): `admin@`, `editor@`, `researcher@`, `member@demo.oceanx.local` / `demo-password-123`.

## Checks

```bash
npm run lint && npm run typecheck && npm run test:unit && npm run test:contract && npm run api:check && npm run build
```

## Branches

`main` (demo/production) ← `develop` (integration) ← `feat/backend-core`, `feat/public-frontend`. See [FRONTEND_HANDOFF §12](docs/FRONTEND_HANDOFF.md#12-git-workflow).
