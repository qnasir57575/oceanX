# Deployment (Vercel + Neon Postgres)

The app (frontend + `/api/v1` backend) deploys as one Vercel project. The database is a hosted PostgreSQL (Neon, added through Vercel's Storage/Marketplace). Region: **Mumbai** — Vercel functions run in `bom1` (`vercel.json`); create the database in the same region.

## One-time setup (≈10 minutes, done by the repo owner)

1. **Import the project** — https://vercel.com/new → *Import Git Repository* → `qnasir57575/oceanX`.
   - Framework preset: **Next.js** (auto-detected). Leave Build Command, Output and Install settings at their defaults — `vercel.json` sets the build command to `npm run vercel-build`.
   - Production branch: `main`.
   - **Do not add `NEXT_PUBLIC_USE_MOCK_API`** (production builds refuse it).
   - You can click *Deploy* now; the first build will stop with “DATABASE_URL is not set” until step 2 is done. That's expected.
2. **Add the database** — Project → *Storage* → *Create Database* → **Neon (Serverless Postgres)** → region **AWS Asia Pacific (Mumbai)** → connect it to the project for **Production** (and Preview/Development if you like). This sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) automatically.
3. **Environment variables** — Project → *Settings* → *Environment Variables* (Production):

   | Name | Value | Required |
   |---|---|---|
   | `DATABASE_URL` | set by the Neon integration | yes |
   | `DATABASE_URL_UNPOOLED` | set by the Neon integration (used for migrations) | yes |
   | `APP_ORIGIN` | `https://<your-project>.vercel.app` (or your custom domain) | recommended |
   | `SESSION_TTL_DAYS` | `14` | optional |

   Not needed on Vercel: `API_INTERNAL_ORIGIN` (detected from Vercel's system variables), `NEXT_PUBLIC_API_BASE_URL` (defaults to `/api/v1`), `TEST_DATABASE_URL`.
4. **Redeploy** — *Deployments* → latest → *Redeploy*. The build runs `prisma migrate deploy` (production only) and then `next build`.
5. **Load demo data (first deploy only, optional)** — the portal is empty until content exists. To load the clearly-labelled demo dataset, run locally with the **unpooled** production URL (Neon dashboard or Vercel env page):

   ```bash
   DATABASE_URL="postgresql://…-unpooled…" npm run db:seed
   ```

   ⚠️ The seed **wipes all tables** first. Only run it on a fresh database — never after real content or users exist.
6. **Verify** — `https://<your-project>.vercel.app/api/v1/health` returns `{"success":true,"data":{"status":"ok",…}}`; then open the homepage.

After this, every push/merge to `main` deploys to production automatically, and every pull request gets a preview deployment.

## How it works

- `npm run vercel-build` (`scripts/vercel-build.mjs`): on **production** deployments applies pending migrations, then builds; on **preview** deployments it only builds.
- The Prisma CLI uses `DATABASE_URL_UNPOOLED` (direct connection, needed for migrations); the app uses the pooled `DATABASE_URL` at runtime.
- Server Components call the API over HTTP. On Vercel the client resolves the origin automatically: production → `https://$VERCEL_PROJECT_PRODUCTION_URL`, previews → `https://$VERCEL_URL`. Set `API_INTERNAL_ORIGIN` to override.
- Session cookies get the `Secure` flag in production.

## Preview deployments

- Previews use whatever `DATABASE_URL` is configured for the *Preview* environment. If that's the production database, previews show production data — and must not change the schema (that's why previews skip migrations). For branches with schema changes, enable Neon's preview branching or point Preview at a separate database.
- With Vercel Deployment Protection on (the default for previews), Server Components calling their own preview URL need *Settings → Deployment Protection → Protection Bypass for Automation* enabled; the client then sends the `VERCEL_AUTOMATION_BYPASS_SECRET` header automatically. Without it, preview pages render their error states while the production deployment works normally.

## Known limitations on Vercel (phase 1)

- Rate limiting is in-memory per function instance, so limits are approximate on serverless.
- File upload/download endpoints are not implemented yet; download links return a JSON 404. A storage provider (e.g. Vercel Blob, S3/R2) will be needed for phase 2.
- Password reset needs an email provider (planned).

## Rollback

Vercel → *Deployments* → pick a previous production deployment → *Promote to Production*. Database migrations are not rolled back automatically; write a forward migration instead.
