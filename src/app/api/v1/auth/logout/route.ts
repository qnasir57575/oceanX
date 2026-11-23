import { defineRoute } from "@/server/http/route";
import { clearSessionCookie } from "@/server/auth/session";
import { logout } from "@/server/services/auth";

export const POST = defineRoute("logout", async ({ sessionId, user, ip, setCookie }) => {
  await logout(sessionId, user, ip);
  setCookie(clearSessionCookie());
  return { success: true as const, data: { loggedOut: true as const } };
});
