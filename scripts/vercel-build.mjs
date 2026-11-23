/**
 * Build command on Vercel (see vercel.json → "buildCommand": "npm run vercel-build").
 *
 * - Production deployments: apply pending database migrations, then build.
 * - Preview deployments: build only. Previews must never migrate the shared
 *   production database; use a separate preview database (e.g. Neon branching)
 *   if a branch needs schema changes.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const env = process.env.VERCEL_ENV ?? "unset";

if (env === "production") {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    console.error(
      "\n✗ DATABASE_URL is not set for Production.\n" +
        "  Attach a Postgres database (Vercel → Storage → Neon) or add DATABASE_URL, then redeploy.\n",
    );
    process.exit(1);
  }
  console.log("▶ Applying database migrations (prisma migrate deploy)…");
  run("npx prisma migrate deploy");
} else {
  console.log(`▶ Skipping migrations (VERCEL_ENV=${env}).`);
}

run("npx next build");
