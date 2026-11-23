import type { User as UserRow } from "@/generated/prisma/client";
import type { BodyOf } from "@/contracts/registry";
import { prisma } from "@/server/db";
import { audit } from "@/server/audit";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, revokeSession, revokeUserSessions } from "@/server/auth/session";
import { conflict, forbidden, unauthenticated } from "@/server/http/errors";
import { iso, toUser } from "@/server/mappers";

interface ClientMeta {
  ip: string | null;
  userAgent: string | null;
}

export async function registerMember(body: BodyOf<"register">, meta: ClientMeta) {
  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      affiliation: body.affiliation ?? null,
      passwordHash: await hashPassword(body.password),
      role: "MEMBER",
      lastLoginAt: new Date(),
    },
  });
  const session = await createSession(user.id, { userAgent: meta.userAgent, ipAddress: meta.ip });
  await audit({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id, ipAddress: meta.ip });
  return { user, session };
}

export async function login(body: BodyOf<"login">, meta: ClientMeta) {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const valid = await verifyPassword(body.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await audit({ actorId: user?.id ?? null, action: "auth.login_failed", entityType: "User", entityId: user?.id, ipAddress: meta.ip });
    throw unauthenticated("Invalid email or password.");
  }
  if (user.status === "SUSPENDED") throw forbidden("This account is suspended.", "ACCOUNT_SUSPENDED");
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createSession(user.id, { userAgent: meta.userAgent, ipAddress: meta.ip });
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ipAddress: meta.ip });
  return { user: updated, session };
}

export async function logout(sessionId: string | null, user: UserRow | null, ip: string | null) {
  if (sessionId) await revokeSession(sessionId);
  if (user) await audit({ actorId: user.id, action: "auth.logout", entityType: "User", entityId: user.id, ipAddress: ip });
}

export async function changePassword(user: UserRow, sessionId: string | null, body: BodyOf<"changePassword">, ip: string | null) {
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw unauthenticated("Current password is incorrect.", "INVALID_CURRENT_PASSWORD");
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
  await revokeUserSessions(user.id, sessionId ?? undefined);
  await audit({ actorId: user.id, action: "auth.password_change", entityType: "User", entityId: user.id, ipAddress: ip });
}

export async function updateProfile(user: UserRow, body: BodyOf<"updateMyProfile">, ip: string | null) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.affiliation !== undefined ? { affiliation: body.affiliation } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
    },
  });
  await audit({ actorId: user.id, action: "user.profile_update", entityType: "User", entityId: user.id, metadata: { fields: Object.keys(body) }, ipAddress: ip });
  return toUser(updated);
}

export function authResult(user: UserRow, expiresAt: Date) {
  return { success: true as const, data: { user: toUser(user), expiresAt: iso(expiresAt) } };
}
