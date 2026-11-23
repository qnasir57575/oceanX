/**
 * Database-backed sessions in an httpOnly cookie.
 * The cookie holds a random token; only its SHA-256 hash is stored.
 */
import { createHash, randomBytes } from "node:crypto";
import type { User as UserRow } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export const SESSION_COOKIE = "oceanx_session";
const TOUCH_INTERVAL_MS = 5 * 60_000;

const ttlDays = () => {
  const n = Number(process.env.SESSION_TTL_DAYS ?? 14);
  return Number.isFinite(n) && n > 0 ? n : 14;
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(v.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export interface SessionContext {
  sessionId: string;
  user: UserRow;
  expiresAt: Date;
}

export async function resolveSession(request: Request): Promise<SessionContext | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return { sessionId: session.id, user: session.user, expiresAt: session.expiresAt };
}

export async function createSession(userId: string, meta: { userAgent: string | null; ipAddress: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays() * 86_400_000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ipAddress: meta.ipAddress,
    },
  });
  return { token, expiresAt };
}

export async function revokeSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({ where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) } });
}

const secureFlag = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

export function sessionCookie(token: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag()}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}
