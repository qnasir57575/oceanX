# CLAUDE.md

SIH26063 — Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal.
One Next.js 16 app: public frontend (pages) + backend (route handlers under `src/app/api/v1`) + PostgreSQL via Prisma 7.

@AGENTS.md

## Team and ownership

Two developers work in parallel:

- **Backend developer** (`feat/backend-core`): database, auth, APIs, storage, admin & contributor UI (`/admin/**`, `/dashboard/**`), AI integration.
- **Frontend developer** (`feat/public-frontend`): public pages, public components, styling, public UI states.

Integration branch `develop`; production/demo branch `main`. Feature branches merge into `develop` via PR; `develop` merges into `main` via PR. Never commit directly to `develop` or `main`.

| Area | Paths | Owner |
|---|---|---|
| Backend | `prisma/**`, `src/app/api/**`, `src/server/**`, `docker/**`, `docker-compose.yml` | Backend |
| Shared contract | `src/contracts/**`, `src/types/api.ts`, `src/lib/api-client.ts`, `src/lib/api/**`, `src/mocks/**`, `docs/API_DOCUMENTATION.md`, `docs/openapi.yaml` | Both — changes need review by both developers |
| Public frontend | `src/app/**` except `api/`, `admin/`, `dashboard/`; `src/components/**`; styling; `public/**` | Frontend |
| Generated | `src/generated/**`, `src/lib/api/routes.generated.ts`, generated sections of docs | Never edit by hand |

When working on the frontend branch, do not modify backend files or the shared contract unilaterally; open an API contract issue instead (template in `.github/ISSUE_TEMPLATE/`).

## Commands

```bash
npm run dev                 # Next dev server (http://localhost:3000)
npm run db:up               # Postgres in Docker on :5434 (dbs: oceanx, oceanx_test)
npm run db:migrate          # prisma migrate dev
npm run db:seed             # demo data (same fixtures as the mock API); wipes dev DB
npm run lint
npm run typecheck           # next typegen && tsc --noEmit (includes compile-time type contract tests)
npm run test:unit           # mocks + contract drift (no DB)
npm run test:contract       # real route handlers vs contracts on oceanx_test (needs db:up)
npm run api:generate        # regenerate openapi.yaml, docs sections, routes.generated.ts
npm run api:check           # CI drift gate: fails if generated artifacts are stale
npm run build
npm run vercel-build        # Vercel build command: migrations (production only) + next build
```

Deployment: Vercel (region `bom1`) + Neon Postgres — see `docs/DEPLOYMENT.md`. Pushing/merging to `main` deploys production. Never run `db:seed` against a database with real data (it wipes all tables).

## Architecture (API-first)

- **`src/contracts/` is the single source of truth.** Zod schemas (`schemas/*`) + the endpoint registry (`endpoints/*`, combined in `registry.ts`). Each endpoint declares method, path, request/response schemas, auth, roles, rate limit, status, documented errors, frontend usage, client function and an example request.
- **Backend:** every route handler is `export const GET = defineRoute("<operationId>", handler)` (`src/server/http/route.ts`). `defineRoute` enforces the registry's auth/roles/rate limit/CSRF, validates params/query/body, wraps errors in the standard envelope and (dev/test) validates responses against the contract. Services live in `src/server/services/`; Prisma rows are converted to contract shapes only in `src/server/mappers.ts`. Non-implemented methods on an existing path use `plannedRoute("<operationId>")`.
- **Types:** `src/types/api.ts` derives every type from the schemas — never hand-write API shapes.
- **Client:** `src/lib/api-client.ts` (`apiRequest(operationId, …)`) + domain modules `src/lib/api/*.ts`. Auth is an httpOnly cookie; never store tokens in JS.
- **Mocks:** `src/mocks/` — one handler per operationId (type-enforced), routed and validated through the same registry. Enabled by `NEXT_PUBLIC_USE_MOCK_API=true`, development only (production builds refuse it).
- **Docs:** `scripts/generate-api-docs.ts` generates `docs/openapi.yaml`, the endpoint table/status counts/reference in `docs/API_DOCUMENTATION.md`, and the page→API table in `docs/FRONTEND_HANDOFF.md`.
- Response envelope: `{ success: true, data, pagination? }` / `{ success: false, error: { code, message, details?, requestId } }`. One `error.code` per HTTP status (`ERROR_STATUS_CODES` in `src/contracts/primitives.ts`).
- Next.js 16 with Cache Components: no `dynamic`/`revalidate` route exports; route `params` are Promises; read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## API contract rules — MANDATORY

Whenever you **create, modify, deprecate or remove an API**, or change a request parameter, a response structure, authentication or authorization requirements, you MUST update all of the following in the same change:

1. **Contract** — schemas in `src/contracts/schemas/*` and the endpoint entry in `src/contracts/endpoints/*` (description, auth, roles, errors, frontend notes, client function, example, **status**).
2. **`src/types/api.ts`** — export any new/renamed types (they must be derived from schemas).
3. **Frontend client** — the function in `src/lib/api/<module>.ts` (explicit return type) and `src/lib/api/index.ts` if a new module.
4. **Mock** — the handler in `src/mocks/handlers/*` and fixtures if needed (the compiler requires a handler for every operationId).
5. **Contract tests** — `tests/contract/*.test.ts` for implemented endpoints (success + every documented error you can trigger). Update `tests/unit/*` if behaviour of mocks changes.
6. **Docs** — run `npm run api:generate` (regenerates `docs/openapi.yaml`, `docs/API_DOCUMENTATION.md` generated sections, `docs/FRONTEND_HANDOFF.md` table, `routes.generated.ts`), update hand-written sections of `docs/API_DOCUMENTATION.md` (§3 conventions) and `docs/FRONTEND_HANDOFF.md` if conventions change, and add a row to the **Changelog** (§5 of API_DOCUMENTATION.md).

Status rules:

- `PLANNED` → contract agreed, no route handler. `IN_PROGRESS` → partially implemented. `IMPLEMENTED` → route handler via `defineRoute` **and** a passing contract test that references the operationId. `DEPRECATED` → still served; set `deprecated: { since, replacement?, removal? }`.
- **Never describe a planned endpoint as implemented.** Never mark an endpoint IMPLEMENTED unless its contract tests actually ran and passed. Never claim tests passed without running them.
- Breaking changes (removing/renaming fields, tightening validation, changing auth) need a new version or a deprecation period, and must be called out in the changelog and the PR.
- Mock data must stay clearly labelled demonstration data — no real-looking scientific findings, people or DOIs (use the `10.5555` test prefix).

Before finishing any API change, run and report the results of:

```bash
npm run typecheck && npm run lint && npm run test:unit && npm run test:contract && npm run api:check
```

CI (`.github/workflows/ci.yml`) runs the same checks on every PR; `api:check` and the drift tests fail when docs, types, client, mocks, routes or tests are out of sync with the registry.

## Conventions

- Validate all input with the contract schemas (never trust the client). Public endpoints only return `PUBLISHED` records; detail endpoints return 404 (not 403) for records the caller can't see.
- Write audit-log entries (`src/server/audit.ts`) for auth events and content/role changes.
- Secrets only in server-side env vars (never `NEXT_PUBLIC_*`). AI provider: Anthropic API (`ANTHROPIC_API_KEY`, default model `AI_MODEL=claude-opus-5-5`), server-side only, outputs always saved as DRAFT for human review.
- Known phase-1 limitations: in-memory rate limiting (per instance); search uses ILIKE term matching (planned: Postgres full-text); file storage endpoints not implemented yet.
