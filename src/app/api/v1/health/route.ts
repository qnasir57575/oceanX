import { API_VERSION } from "@/contracts/registry";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { defineRoute } from "@/server/http/route";

export const GET = defineRoute("getHealth", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new HttpError(503, "Database is unreachable.");
  }
  return {
    success: true as const,
    data: { status: "ok" as const, version: API_VERSION, timestamp: new Date().toISOString(), checks: { database: "ok" as const } },
  };
});
