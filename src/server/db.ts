/** Prisma client singleton (Prisma 7 + node-postgres driver adapter). Server-only. */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (or set it in Vercel).");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { __oceanxPrisma?: PrismaClient };

function getClient(): PrismaClient {
  globalForPrisma.__oceanxPrisma ??= createPrismaClient();
  return globalForPrisma.__oceanxPrisma;
}

/**
 * Created lazily on first use, so importing this module (e.g. while `next build`
 * collects route configuration) never requires DATABASE_URL.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
