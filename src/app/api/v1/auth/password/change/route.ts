import { defineRoute } from "@/server/http/route";
import { changePassword } from "@/server/services/auth";

export const POST = defineRoute("changePassword", async ({ user, sessionId, body, ip }) => {
  await changePassword(user, sessionId, body, ip);
  return { success: true as const, data: { changed: true as const } };
});
