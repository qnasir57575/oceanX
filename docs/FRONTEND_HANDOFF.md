# Frontend Handoff Guide

Everything you need to build the **public frontend** of the OceanX Polar Science Portal (SIH26063) without waiting on the backend.

**TL;DR**

1. `npm install` → `cp .env.example .env.local` → set `NEXT_PUBLIC_USE_MOCK_API=true` → `npm run dev`.
2. Import data functions from `@/lib/api/*` and types from `@/types/api`. Never call `fetch` on the API directly.
3. Every endpoint, parameter and response is in [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md). The [page → API table](#9-pages-to-build-and-the-apis-they-use) below says which ones each page needs.
4. Build on branch `feat/public-frontend`; open PRs into `develop`. Don't edit backend or contract files (§11) — open an issue instead (§14).

---

## 1. Clone and run

Requirements: **Node.js 22+**, npm 10+, Git. Docker is only needed if you want to run the real backend locally (§13).

```bash
git clone https://github.com/qnasir57575/oceanX.git
cd oceanX
git checkout develop
git checkout -b feat/public-frontend      # first time only; afterwards: git checkout feat/public-frontend
npm install                               # also generates the Prisma client (postinstall)
cp .env.example .env.local
# edit .env.local → NEXT_PUBLIC_USE_MOCK_API="true"
npm run dev                               # http://localhost:3000
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates Next route types, then `tsc --noEmit` (also checks API type contracts) |
| `npm run test:unit` | Mock API, contract-drift and type tests (no database needed) |
| `npm run build` | Production build (fails if `NEXT_PUBLIC_USE_MOCK_API=true` — by design) |

Stack: Next.js 16 (App Router, **Cache Components enabled**), React 19, TypeScript (strict), Tailwind CSS 4. Next 16 differs from older versions — when in doubt read the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## 2. Environment variables

Only these matter for frontend work (all in `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | `true` = all API functions are served by `src/mocks` (development only). |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | `300` | Artificial latency so you can see loading states. |
| `NEXT_PUBLIC_MOCK_SCENARIO` | `normal` | `normal`, `empty`, `error`, `unauthenticated`, `slow` (§3). |
| `NEXT_PUBLIC_MOCK_USER` | *(unset)* | Start the mock session logged in: `admin`, `editor`, `researcher`, `member`. |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1` | API location. Leave as is (same origin). |
| `API_INTERNAL_ORIGIN` | `http://localhost:3000` | Used when Server Components call the API (absolute URL needed). |
| `NEXT_PUBLIC_VALIDATE_API_RESPONSES` | `true` | In development, logs a console warning if a live API response doesn't match the contract. |

Never put secrets in `NEXT_PUBLIC_*` variables — they are shipped to the browser. You don't need any secrets for frontend work.

## 3. Mock API

Set `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local` and restart `npm run dev`. That's it — **no component code changes**. Every function in `src/lib/api/*` is then answered in-process by `src/mocks/transport.ts`, which:

- covers **all 71 endpoints** (public, auth and admin), including ones the backend hasn't built yet;
- validates your query parameters and bodies with the same schemas as the backend (you get the same `422 VALIDATION_ERROR` with `fieldErrors`);
- enforces login and roles (`401` / `403`) like the backend;
- supports pagination, filtering, sorting and search over clearly-labelled **demo data** (titles start with “Demo”, images are placeholders in `public/demo/`);
- keeps changes in memory (creating/editing works until you reload).

**Testing UI states:**

```ts
// Anywhere in client code during development (e.g. a dev-only toolbar):
import { setMockScenario, setMockSessionUser, DEMO_ACCOUNTS } from "@/mocks";

setMockScenario("empty");          // lists return [], details 404 → design empty states
setMockScenario("error");          // every call throws 500 INTERNAL_ERROR → design error states
setMockScenario("slow");           // 2.5 s latency → design loading states
setMockScenario("unauthenticated");// protected calls throw 401
setMockScenario(null);             // back to NEXT_PUBLIC_MOCK_SCENARIO

setMockSessionUser("member");      // pretend to be logged in (admin | editor | researcher | member | null)
```

Or set `NEXT_PUBLIC_MOCK_SCENARIO` in `.env.local` and restart. Only import `@/mocks` from development-only code — and never from production paths.

**Demo logins** (work in mock mode *and* against the seeded dev database): `admin@`, `editor@`, `researcher@`, `member@demo.oceanx.local`, password `demo-password-123`.

**Safety:** mocks can't leak into production. `MOCK_API_ENABLED` is compiled to `false` in production builds, the runtime ignores the flag when `NODE_ENV=production`, and `next.config.ts` refuses to build or start with the flag set.

**Known mock limitations:**

- Mock state lives separately in the browser and in the dev server process; logging in via the browser doesn't log in Server Components. Use `NEXT_PUBLIC_MOCK_USER` if you need a logged-in server render.
- File download links (`/api/v1/files/{id}/download`) are not served in mock mode — they return a JSON 404. Render them as links anyway.
- AI generation endpoints return placeholder text; no model is called.

## 4. Using the shared API client

```tsx
// src/app/expeditions/page.tsx — Server Component
import { Suspense } from "react";
import { getExpeditions } from "@/lib/api/expeditions";
import type { ListExpeditionsQuery } from "@/types/api";

export default async function ExpeditionsPage({ searchParams }: PageProps<"/expeditions">) {
  const sp = await searchParams;
  const query: ListExpeditionsQuery = {
    region: (sp.region as ListExpeditionsQuery["region"]) ?? undefined,
    page: sp.page ? Number(sp.page) : 1,
    limit: 12,
  };
  return (
    <Suspense key={JSON.stringify(query)} fallback={<ExpeditionGridSkeleton count={12} />}>
      <ExpeditionGrid query={query} />
    </Suspense>
  );
}

async function ExpeditionGrid({ query }: { query: ListExpeditionsQuery }) {
  const { data, pagination } = await getExpeditions(query);
  if (data.length === 0) return <EmptyState />;
  return <Grid items={data} pagination={pagination} />;
}
```

```tsx
// Client Component with cancellation
"use client";
import { useEffect, useState } from "react";
import { getSearchSuggestions } from "@/lib/api/search";
import { isApiRequestError } from "@/lib/api-client";
import type { SearchSuggestion } from "@/types/api";

export function SearchBox() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  useEffect(() => {
    if (q.trim().length < 1) return setItems([]);
    const controller = new AbortController();
    const t = setTimeout(() => {
      getSearchSuggestions({ q, limit: 8 }, { signal: controller.signal })
        .then((res) => setItems(res.data))
        .catch((e) => { if (!(isApiRequestError(e) && e.isAborted)) console.error(e); });
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q]);
  /* … */
}
```

Rules of thumb:

- Every function returns the full envelope: `{ data }` or `{ data, pagination }` (search also has `meta`). Destructure what you need.
- Every failure throws `ApiRequestError` (`code`, `status`, `message`, `fieldErrors`, `requestId`, plus `isNotFound` / `isUnauthenticated` / `isForbidden` / `isValidationError` / `isAborted`). See API_DOCUMENTATION §3.2.
- Detail functions accept the **slug** from the URL: `getExpedition(params.slug)`.
- Links to search results: `searchResultHref(result)` from `@/lib/api/search`.
- File downloads: `<a href={file.downloadUrl} download>` — never `fetch()` them.
- Caching under Cache Components: see API_DOCUMENTATION §3.8. Short version: fetch inside `<Suspense>` at request time; don't call the API from `"use cache"` functions.
- Barrel import is available: `import { getExpeditions, search } from "@/lib/api"`.

## 5. Shared types

All types live in [`src/types/api.ts`](../src/types/api.ts) and are **derived from the contract schemas** in `src/contracts/` — they can't drift from what the API returns.

| Kind | Examples |
|---|---|
| Envelopes & errors | `ApiResponse<T>`, `PaginatedResponse<T>`, `Pagination`, `ApiError`, `ErrorCode` |
| Records | `Expedition` / `ExpeditionSummary`, `Publication` / `PublicationSummary`, `Dataset` / `DatasetSummary`, `MediaAsset` / `MediaAssetSummary`, `InstitutionalActivity` / `ActivitySummary`, `SearchResult`, `ResearchCategory`, `Keyword`, `AIOutreachContent` / `OutreachSummary`, `User`, `Session` |
| Small shapes | `ImageRef`, `FileRef`, `CategoryRef`, `GeoPoint`, `BoundingBox`, `Citation`, `Author` |
| Enums (string unions) | `PolarRegion`, `ExpeditionPhase`, `PublicationType`, `MediaType`, `ActivityType`, `AccessLevel`, `UserRole`, `SearchResultType`, `Audience`, … |
| Inputs | `ListExpeditionsQuery`, `SearchQuery`, `LoginRequest`, `RegisterRequest`, … |
| Per endpoint | `ResponseOf<"listExpeditions">`, `QueryInputOf<"search">`, `BodyInputOf<"login">` |

`Summary` types are what list endpoints return (cards); full types are what detail endpoints return.

## 6. Authentication

- The backend uses an **httpOnly session cookie** (`oceanx_session`). JavaScript can't read it and you must **not** store tokens anywhere (`localStorage`, `sessionStorage`, state).
- Log in: `login({ email, password })`. Register: `register({ name, email, password })` (creates a MEMBER and logs in). Log out: `logout()`. All set/clear the cookie automatically.
- Who is logged in: `getSession()` → `data.user` (`null` when logged out). It never throws 401.
- After login/logout call `router.refresh()` so Server Components re-render with the new session.
- Protected actions throw `ApiRequestError` with `isUnauthenticated` → redirect to `/login?next=<path>`; `isForbidden` → show a no-access message.
- **Server Components** need the browser's cookie forwarded for per-user data:

```tsx
import { Suspense } from "react";
import { getSession } from "@/lib/api/auth";
import { withRequestCookies } from "@/lib/api/server";

async function UserMenu() {
  const { data } = await getSession(await withRequestCookies());
  return data.user ? <AccountMenu user={data.user} /> : <LoginButton />;
}
// In the layout: <Suspense fallback={<UserMenuSkeleton />}><UserMenu /></Suspense>
```

Public pages (lists, details, search) don't need cookies.

## 7. Available APIs (implemented on the backend)

The live backend currently serves **26 endpoints** — everything the public frontend needs for read-only pages plus authentication:

- Health · Register · Login · Logout · Session · Change password · Update my profile
- Homepage data · Portal statistics
- Expeditions, Publications, Datasets, Media, News/Activities — list + detail
- Unified search · Search suggestions
- Categories (list, detail) · Keywords (list)
- Outreach (list, detail)

The authoritative, always-current list is the status table in [API_DOCUMENTATION §1–2](API_DOCUMENTATION.md#2-endpoint-summary).

## 8. Planned APIs

Still `PLANNED` (use the mocks; the contract is agreed): password reset (forgot/reset), all create/update/delete endpoints for content and taxonomy, file uploads/downloads, submissions & review, AI generation, admin users/dashboard/audit log. Of these, the public frontend only needs **forgot/reset password** and **file downloads** (dataset/publication pages). Everything else is used by the admin/contributor UI owned by the backend developer.

## 9. Pages to build and the APIs they use

Pages you own (public site): Home, About/Statistics, Expedition Explorer + detail, Research Publications + detail, Data Repository + detail, Media Gallery + detail, News & Events + detail, Search, Research Topics, Learn/Outreach + detail, Login, Register, My Account, Forgot/Reset password, the global header (search box, user menu) and footer, and `not-found` / `error` pages.

Not yours: everything under `/admin/**` and `/dashboard/**` (admin and contributor workspace) — built by the backend developer.

This table is generated from the API registry (`npm run api:generate`) and is always in sync with the docs:

<!-- BEGIN GENERATED: page-api-map -->
<!-- Do not edit: generated by `npm run api:generate` -->

| Page | Client functions | Endpoints (under `/api/v1`) | Status |
|---|---|---|---|
| Register (`/register`) | `register()` | `POST /auth/register` | IMPLEMENTED |
| Login (`/login`) | `login()`<br>`getSession()` | `POST /auth/login`<br>`GET /auth/session` | IMPLEMENTED<br>IMPLEMENTED |
| Global header (search box, user menu) | `logout()`<br>`getSession()`<br>`getSearchSuggestions()` | `POST /auth/logout`<br>`GET /auth/session`<br>`GET /search/suggest` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| My Account (`/account`) | `logout()`<br>`getSession()`<br>`changePassword()`<br>`updateMyProfile()` | `POST /auth/logout`<br>`GET /auth/session`<br>`POST /auth/password/change`<br>`PATCH /users/me` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| Forgot / Reset Password (`/forgot-password`, `/reset-password`) | `forgotPassword()`<br>`resetPassword()` | `POST /auth/password/forgot`<br>`POST /auth/password/reset` | PLANNED<br>PLANNED |
| Home (`/`) | `getHomePageData()`<br>`getMediaAssets()`<br>`getActivities()`<br>`getOutreachList()` | `GET /home`<br>`GET /media`<br>`GET /activities`<br>`GET /outreach` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| About & Statistics (`/about`) | `getPortalStats()` | `GET /stats` | IMPLEMENTED |
| Expedition Explorer (`/expeditions`) | `getExpeditions()`<br>`getCategories()` | `GET /expeditions`<br>`GET /categories` | IMPLEMENTED<br>IMPLEMENTED |
| Research Topics (`/topics`, `/topics/[slug]`) | `getExpeditions()`<br>`getPublications()`<br>`getDatasets()`<br>`getCategories()`<br>`getCategory()`<br>`getKeywords()` | `GET /expeditions`<br>`GET /publications`<br>`GET /datasets`<br>`GET /categories`<br>`GET /categories/{id}`<br>`GET /keywords` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| Expedition Detail (`/expeditions/[slug]`) | `getExpedition()`<br>`getPublications()`<br>`getDatasets()`<br>`getMediaAssets()` | `GET /expeditions/{id}`<br>`GET /publications`<br>`GET /datasets`<br>`GET /media` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| Research Publications (`/research`) | `getPublications()`<br>`getCategories()` | `GET /publications`<br>`GET /categories` | IMPLEMENTED<br>IMPLEMENTED |
| Publication Detail (`/research/[slug]`) | `getPublication()`<br>`getFileDownloadUrl()` | `GET /publications/{id}`<br>`GET /files/{id}/download` | IMPLEMENTED<br>PLANNED |
| Data Repository (`/datasets`) | `getDatasets()`<br>`getCategories()` | `GET /datasets`<br>`GET /categories` | IMPLEMENTED<br>IMPLEMENTED |
| Dataset Detail (`/datasets/[slug]`) | `getDataset()`<br>`getFile()`<br>`getFileDownloadUrl()` | `GET /datasets/{id}`<br>`GET /files/{id}`<br>`GET /files/{id}/download` | IMPLEMENTED<br>PLANNED<br>PLANNED |
| Media Gallery (`/gallery`) | `getMediaAssets()`<br>`getCategories()` | `GET /media`<br>`GET /categories` | IMPLEMENTED<br>IMPLEMENTED |
| Media Detail (`/gallery/[slug]`) | `getMediaAsset()` | `GET /media/{id}` | IMPLEMENTED |
| News & Events (`/news`) | `getActivities()` | `GET /activities` | IMPLEMENTED |
| News / Event Detail (`/news/[slug]`) | `getActivity()`<br>`getFileDownloadUrl()` | `GET /activities/{id}`<br>`GET /files/{id}/download` | IMPLEMENTED<br>PLANNED |
| Search Results (`/search`) | `search()`<br>`getSearchSuggestions()`<br>`getKeywords()` | `GET /search`<br>`GET /search/suggest`<br>`GET /keywords` | IMPLEMENTED<br>IMPLEMENTED<br>IMPLEMENTED |
| Learn / Outreach (`/learn`) | `getOutreachList()` | `GET /outreach` | IMPLEMENTED |
| Outreach Detail (`/learn/[slug]`) | `getOutreachItem()` | `GET /outreach/{id}` | IMPLEMENTED |

<!-- END GENERATED: page-api-map -->

Suggested route structure (adapt freely within your directories):

```
src/app/
  layout.tsx, page.tsx, globals.css, not-found.tsx, error.tsx
  about/page.tsx
  expeditions/page.tsx, expeditions/[slug]/page.tsx
  research/page.tsx,    research/[slug]/page.tsx
  datasets/page.tsx,    datasets/[slug]/page.tsx
  gallery/page.tsx,     gallery/[slug]/page.tsx
  news/page.tsx,        news/[slug]/page.tsx
  search/page.tsx
  topics/page.tsx,      topics/[slug]/page.tsx
  learn/page.tsx,       learn/[slug]/page.tsx
  (auth)/login/page.tsx, (auth)/register/page.tsx, (auth)/forgot-password/page.tsx, (auth)/reset-password/page.tsx
  account/page.tsx
src/components/   ← your UI components
```

## 10. What you own

You can freely create and modify:

| Path | Contents |
|---|---|
| `src/app/**` **except** `src/app/api/**`, `src/app/admin/**`, `src/app/dashboard/**` | Public pages, layouts, loading/error/not-found UI |
| `src/components/**` | Public UI components |
| `src/hooks/**`, `src/lib/ui/**`, `src/lib/format/**` | Frontend hooks and helpers (create as needed) |
| `src/app/globals.css`, Tailwind/theme setup | Styling |
| `public/**` (except `public/demo/`) | Static assets |

## 11. What not to modify without coordination

| Path | Owner | Why |
|---|---|---|
| `prisma/**`, `docker/**`, `docker-compose.yml` | Backend | Database schema & migrations |
| `src/app/api/**`, `src/server/**` | Backend | API route handlers, auth, services, storage, AI |
| `src/generated/**` | Generated | Prisma client (never edit) |
| `src/contracts/**` | **Shared contract** | Changing a schema changes the API for everyone |
| `src/types/api.ts` | **Shared contract** | Derived from contracts |
| `src/lib/api-client.ts`, `src/lib/api/**` | **Shared contract** | Typed client — `routes.generated.ts` is generated |
| `src/mocks/**` | **Shared contract** | Must stay identical to the contract (tests enforce it) |
| `docs/API_DOCUMENTATION.md`, `docs/openapi.yaml` | **Shared contract** | Generated sections; CI checks them |
| `.github/**`, `CLAUDE.md`, `next.config.ts`, `package.json` dependencies | Backend / both | CI, tooling, build config |

“Shared contract” changes need a PR reviewed by **both** developers (enforced via `.github/CODEOWNERS` once branch protection is on). If you need a field that doesn't exist, don't add it to a schema yourself — request it (§14).

## 12. Git workflow

| Branch | Purpose | Who pushes |
|---|---|---|
| `main` | Production / demo. Always deployable. | Merge from `develop` only, via PR |
| `develop` | Integration branch. Both of you merge here. | PRs only |
| `feat/backend-core` | Backend, database, auth, APIs | Backend developer |
| `feat/public-frontend` | Public frontend | You |

Day to day:

```bash
git checkout feat/public-frontend
git fetch origin
git merge origin/develop            # pick up the latest contract/backend changes (or rebase if you prefer)
# … work, commit in small steps …
git push -u origin feat/public-frontend
# open a PR: feat/public-frontend → develop
```

- Keep PRs focused (one page or feature). CI must pass: lint, typecheck, unit tests, contract tests, `api:check`, build.
- Use the PR template checklist (`.github/pull_request_template.md`).
- Merge `develop` into your branch at least daily so contract changes reach you early.
- Short-lived extra branches (`feat/public-frontend-search`) are fine; PR them into `develop` too.

## 13. Switching from mocks to the live backend

Per endpoint, check its status in [API_DOCUMENTATION §2](API_DOCUMENTATION.md#2-endpoint-summary). For `IMPLEMENTED` endpoints:

```bash
npm run db:up          # Postgres in Docker on localhost:5434
cp .env.example .env   # Prisma CLI reads .env (if you haven't yet)
npm run db:migrate     # apply migrations
npm run db:seed        # load the same demo data the mocks use
# .env.local → NEXT_PUBLIC_USE_MOCK_API="false"
npm run dev
```

Your components don't change. With `NEXT_PUBLIC_VALIDATE_API_RESPONSES=true` the dev console warns if a live response ever differs from the contract — report it (§14). Calls to endpoints that are still `PLANNED` return a JSON `404` whose message says the endpoint is planned; keep mocks on while you need them.

## 14. Reporting API contract issues

Open a GitHub issue using the **“API contract issue”** template (`.github/ISSUE_TEMPLATE/api-contract-issue.md`), or paste this:

```markdown
**Endpoint:** `GET /api/v1/expeditions` (operationId `listExpeditions`)
**Mode:** mock | live backend
**Type:** bug (API ≠ docs) | missing field / endpoint request | unclear docs
**Request:** query/body you sent
**Expected (per docs):** …
**Actual:** status, body (or console `[api-contract]` warning)
**requestId:** req_… (from `error.requestId` or the `X-Request-Id` header)
**Which page needs it / deadline:** …
```

The backend developer then updates the contract (registry → types → client → mocks → docs → tests, as required by `CLAUDE.md`) and records it in the API_DOCUMENTATION changelog. Pull `develop` to receive it.
