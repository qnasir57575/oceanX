/** Prisma client singleton (Prisma 7 + node-postgres driver adapter). Server-only. */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { __oceanxPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__oceanxPrisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__oceanxPrisma = prisma;
