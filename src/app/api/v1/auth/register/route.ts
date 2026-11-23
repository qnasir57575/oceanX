import { defineRoute } from "@/server/http/route";
import { sessionCookie } from "@/server/auth/session";
import { authResult, registerMember } from "@/server/services/auth";

export const POST = defineRoute("register", async ({ body, ip, request, setCookie }) => {
  const { user, session } = await registerMember(body, { ip, userAgent: request.headers.get("user-agent") });
  setCookie(sessionCookie(session.token, session.expiresAt));
  return authResult(user, session.expiresAt);
});
