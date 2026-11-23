import { defineRoute } from "@/server/http/route";
import { sessionCookie } from "@/server/auth/session";
import { authResult, login } from "@/server/services/auth";

export const POST = defineRoute("login", async ({ body, ip, request, setCookie }) => {
  const { user, session } = await login(body, { ip, userAgent: request.headers.get("user-agent") });
  setCookie(sessionCookie(session.token, session.expiresAt));
  return authResult(user, session.expiresAt);
});
