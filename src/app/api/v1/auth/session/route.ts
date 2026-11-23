import { defineRoute } from "@/server/http/route";
import { prisma } from "@/server/db";
import { toUser } from "@/server/mappers";

export const GET = defineRoute("getSession", async ({ user, sessionId }) => {
  if (!user || !sessionId) return { success: true as const, data: { user: null, expiresAt: null } };
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { expiresAt: true } });
  return { success: true as const, data: { user: toUser(user), expiresAt: session?.expiresAt.toISOString() ?? null } };
});
