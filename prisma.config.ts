import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The Prisma CLI (migrate) needs a direct, non-pooled connection. Hosted
    // Postgres (e.g. Neon via Vercel) exposes it as DATABASE_URL_UNPOOLED; the
    // app itself uses the pooled DATABASE_URL at runtime (src/server/db.ts).
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
