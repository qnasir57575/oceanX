# API Testing Guide

How to test the OceanX API by hand (curl, Postman, Swagger UI) and with the automated test suites.

- **Local base URL:** `http://localhost:3000/api/v1`
- **Spec:** [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1) — import into Postman / Insomnia / Swagger Editor.
- **Reference:** [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md). Only endpoints marked `IMPLEMENTED` respond on the live backend; `PLANNED` ones return a JSON `404` that says so (use the mock API for those).

The example outputs below were captured from the local dev server with the seeded demo data.

---

## 1. Start the backend locally

```bash
npm install
cp .env.example .env && cp .env.example .env.local
npm run db:up         # Postgres 17 in Docker on localhost:5434 (dev DB "oceanx" + test DB "oceanx_test")
npm run db:migrate    # apply prisma/migrations
npm run db:seed       # demo data (same as the mock API); wipes the dev database first
npm run dev           # http://localhost:3000
curl -s http://localhost:3000/api/v1/health
# {"success":true,"data":{"status":"ok","version":"1.0.0","timestamp":"…","checks":{"database":"ok"}}}
```

If `/health` returns `503 SERVICE_UNAVAILABLE`, the database isn't reachable — check that Docker is running (`docker compose ps`).

## 2. Authentication

Auth is a **httpOnly session cookie** (`oceanx_session`). With curl, keep it in a cookie jar:

```bash
B=http://localhost:3000/api/v1

# Log in (stores the cookie in jar.txt)
curl -s -c jar.txt -X POST "$B/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"editor@demo.oceanx.local","password":"demo-password-123"}'

# Send the cookie on later requests
curl -s -b jar.txt "$B/auth/session"          # → data.user.role = "EDITOR"

# Log out (server revokes the session; cookie cleared)
curl -s -b jar.txt -c jar.txt -X POST "$B/auth/logout"
curl -s -b jar.txt "$B/auth/session"          # → {"user":null,"expiresAt":null}
```

Demo accounts (dev seed and mock API), password `demo-password-123`:

| Email | Role |
|---|---|
| `admin@demo.oceanx.local` | ADMIN |
| `editor@demo.oceanx.local` | EDITOR |
| `researcher@demo.oceanx.local` | RESEARCHER |
| `member@demo.oceanx.local` | MEMBER |

**Postman/Insomnia:** cookies are kept automatically after calling *Log in*. The OpenAPI spec declares the `sessionCookie` security scheme.

**CSRF:** state-changing requests with an `Origin` header that doesn't match `APP_ORIGIN` are rejected:

```bash
curl -s -X POST "$B/auth/login" -H "Origin: https://evil.example" -H "Content-Type: application/json" \
  -d '{"email":"a@b.co","password":"x"}'
# 403 {"success":false,"error":{"code":"FORBIDDEN","message":"Cross-origin request rejected.","details":{"reason":"ORIGIN_NOT_ALLOWED"},…}}
```

curl doesn't send `Origin` by default, so normal curl requests pass.

## 3. Sample valid requests

```bash
# List with filters
curl -s "$B/expeditions?region=ANTARCTICA&page=1&limit=2"
# data: 2 items, pagination: {"page":1,"limit":2,"total":3,"totalPages":2,"hasNextPage":true,"hasPreviousPage":false}

# Detail by slug (or ID)
curl -s "$B/expeditions/demo-antarctic-coastal-ice-survey"
# data.id = "exp_demo_01", data.counts = {"publications":2,"datasets":1,"media":3}

# Other public reads
curl -s "$B/publications?type=JOURNAL_ARTICLE&yearFrom=2020"
curl -s "$B/publications/pub_demo_01"                      # includes citation + aiSummary
curl -s "$B/datasets?format=netcdf&accessLevel=OPEN"
curl -s "$B/media?type=IMAGE&featured=true&limit=24"
curl -s "$B/activities?type=EVENT&upcoming=true"
curl -s "$B/categories?withCounts=true"
curl -s "$B/keywords?q=ice"
curl -s "$B/outreach?audience=STUDENTS"
curl -s "$B/home"
curl -s "$B/stats"

# Unified search (arrays are comma-separated)
curl -s "$B/search?q=ice&types=DATASET,PUBLICATION&limit=3"
# 3 results of 6 total; meta.facets.types counts every type (ignores the types filter)
curl -s "$B/search/suggest?q=gla&limit=5"

# Register (creates a MEMBER and logs in)
curl -s -c jar.txt -X POST "$B/auth/register" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test.user@example.org","password":"long-enough-password"}'

# Authenticated profile update / password change
curl -s -b jar.txt -X PATCH "$B/users/me" -H "Content-Type: application/json" -d '{"bio":"Hello"}'
curl -s -b jar.txt -X POST "$B/auth/password/change" -H "Content-Type: application/json" \
  -d '{"currentPassword":"long-enough-password","newPassword":"another-long-password"}'
```

## 4. Sample invalid requests

| Request | Expected |
|---|---|
| `curl -s "$B/expeditions?limit=1000&region=MARS"` | `422 VALIDATION_ERROR`, `details.fieldErrors` = `limit: ["Too big: expected number to be <=100"]`, `region: ["Invalid option: expected one of …"]` |
| `curl -s "$B/media?featured=yes"` | `422` (booleans must be `true`/`false`) |
| `curl -s "$B/search?q=a"` | `422` (`q` needs ≥ 2 characters) |
| `curl -s "$B/datasets/nope"` | `404 NOT_FOUND` "Dataset not found." |
| `curl -s -X POST "$B/auth/login" -H "Content-Type: application/json" -d '{"email":"member@demo.oceanx.local","password":"wrong"}'` | `401 UNAUTHENTICATED` "Invalid email or password." |
| `curl -s -X POST "$B/auth/login" -H "Content-Type: application/json" -d '{not json'` | `400 BAD_REQUEST` (`INVALID_JSON`) |
| `curl -s -X POST "$B/auth/register" -d '{}'` (no Content-Type) | `400 BAD_REQUEST` (`UNSUPPORTED_CONTENT_TYPE`) |
| 11 failed logins within 5 minutes from one IP | `429 RATE_LIMITED` with a `Retry-After` header |
| `curl -s -X POST "$B/expeditions" -H "Content-Type: application/json" -d '{}'` | `404 NOT_FOUND` "POST /api/v1/expeditions is PLANNED and not served by the backend yet…" |
| `curl -s "$B/admin/dashboard"` | `404 NOT_FOUND` (PLANNED) |

Every error body has the shape `{ "success": false, "error": { "code", "message", "details?", "requestId" } }`, and every response carries an `X-Request-Id` header.

## 5. Testing pagination

```bash
curl -s "$B/publications?page=1&limit=5"   | jq '.pagination'
# {"page":1,"limit":5,"total":14,"totalPages":3,"hasNextPage":true,"hasPreviousPage":false}
curl -s "$B/publications?page=2&limit=5"   | jq '.pagination'
# {"page":2,"limit":5,"total":14,"totalPages":3,"hasNextPage":true,"hasPreviousPage":true}
curl -s "$B/publications?page=99&limit=5"  | jq '{data, pagination}'
# data: [] — a page past the end is 200 with an empty array, not an error
curl -s "$B/publications?page=0"           # 422 (page must be ≥ 1)
curl -s "$B/publications?limit=101"        # 422 (limit max 100; search max 50)
```

Check that items don't repeat across pages and that `total` matches the number of items you get when walking all pages.

## 6. Testing file uploads

Upload endpoints are **PLANNED** — not yet served by the backend. Use the mock API to build and test the UI now; the live steps below will work once they're implemented.

Flow (signed URL, **not** multipart/form-data):

```bash
# 1. Ask for an upload ticket (must be logged in as RESEARCHER/EDITOR/ADMIN; MEMBER may upload AVATAR only)
curl -s -b jar.txt -X POST "$B/uploads" -H "Content-Type: application/json" \
  -d '{"fileName":"figure.png","contentType":"image/png","sizeBytes":482113,"purpose":"COVER_IMAGE"}'
# → data: { fileId, method: "PUT", uploadUrl, headers: {"Content-Type":"image/png"}, expiresAt, maxSizeBytes }

# 2. PUT the raw bytes to uploadUrl with the returned headers
curl -s -b jar.txt -X PUT "http://localhost:3000<uploadUrl>" -H "Content-Type: image/png" --data-binary @figure.png

# 3. Complete
curl -s -b jar.txt -X POST "$B/uploads/<fileId>/complete"
# → data: FileAsset with status "READY" — pass its id to e.g. coverImage / pdfFileId / fileIds
```

Negative cases to test: `sizeBytes` above the purpose limit → `413` with `details.maxSizeBytes`; a content type not allowed for the purpose → `422`; completing before uploading → `409`; another user's ticket → `403`. Limits are listed in API_DOCUMENTATION §3.7. The automated mock tests already cover the ticket → content → complete flow and the 409/413 cases (`tests/unit/mocks.test.ts`).

## 7. Testing role-based access

```bash
# Anonymous: staff-only filter is rejected
curl -s -o /dev/null -w "%{http_code}\n" "$B/expeditions?status=DRAFT"       # 403

# Editor: can list drafts
curl -s -c jar.txt -X POST "$B/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"editor@demo.oceanx.local","password":"demo-password-123"}' > /dev/null
curl -s -b jar.txt "$B/expeditions?status=DRAFT" | jq -c '[.data[].id]'      # ["exp_demo_09"]

# Drafts are invisible (404, not 403) to the public, visible to staff and the owner
curl -s -o /dev/null -w "%{http_code}\n" "$B/expeditions/exp_demo_09"         # 404
curl -s -b jar.txt -o /dev/null -w "%{http_code}\n" "$B/expeditions/exp_demo_09"   # 200
```

Repeat with `researcher@…` (owner of `exp_demo_09` → 200) and `member@…` (→ 404). Protected endpoints return `401` without a cookie and `403` for a role not listed under “Allowed roles” in the endpoint's documentation.

## 8. Automated tests

| Command | What runs | Needs DB |
|---|---|---|
| `npm run test:unit` | Mock API: every endpoint's example request validated against its schema; pagination, filters, scenarios, auth/roles, workflows. Contract drift: registry ↔ route handlers ↔ statuses ↔ contract tests ↔ client functions ↔ generated route map ↔ docs. | No |
| `npm run test:contract` | Calls the **real route handlers** in-process against the test database (`oceanx_test`, migrated automatically and re-seeded per file). For every IMPLEMENTED endpoint: success status and **strict** schema match (no undocumented fields), plus documented error cases (401/403/404/409/422/429, CSRF, malformed JSON). | Yes (`npm run db:up`) |
| `npm test` | Both projects | Yes |
| `npm run typecheck` | TypeScript, including compile-time checks that `src/types/api.ts` equals each endpoint's response type | No |
| `npm run api:check` | Fails if `docs/openapi.yaml`, the generated parts of `docs/API_DOCUMENTATION.md` / `docs/FRONTEND_HANDOFF.md`, or `src/lib/api/routes.generated.ts` are stale | No |

The contract tests refuse to run unless `TEST_DATABASE_URL` points at a database whose name contains `test`, because they wipe it.

**Rule:** an endpoint may only be marked `IMPLEMENTED` when it has a route handler built with `defineRoute()` **and** a contract test that references its `operationId`. The drift test enforces both.

## 9. Swagger UI / Postman

- **Swagger Editor:** open https://editor.swagger.io and paste `docs/openapi.yaml`. Operations show `x-status`; PLANNED summaries end with `[PLANNED]`.
- **Postman:** *Import → File → docs/openapi.yaml*. Set the collection base URL to `http://localhost:3000/api/v1`, run *Log in* first, and Postman keeps the session cookie.
- The spec includes request/response examples taken from the demo data.
