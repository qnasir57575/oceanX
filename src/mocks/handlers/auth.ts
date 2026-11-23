import type { User } from "@/types/api";
import { setMockSessionUser } from "../store";
import { MockHttpError, conflict, findById, newId, nowIso, ok, paginate, textMatch, type MockHandler } from "./helpers";

const sessionExpiry = () => new Date(Date.parse(nowIso()) + 14 * 86_400_000).toISOString();

export const getHealth: MockHandler<"getHealth"> = () =>
  ok({ status: "ok" as const, version: "mock", timestamp: nowIso(), checks: { database: "ok" as const } });

export const register: MockHandler<"register"> = ({ body, store }) => {
  if (store.users.some((u) => u.email === body.email)) {
    throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
  }
  const user: User = {
    id: newId("usr"),
    email: body.email,
    name: body.name,
    role: "MEMBER",
    status: "ACTIVE",
    affiliation: body.affiliation ?? null,
    bio: null,
    avatarUrl: null,
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
  };
  store.users.push(user);
  store.passwords[user.email] = body.password;
  setMockSessionUser(user.id);
  return ok({ user, expiresAt: sessionExpiry() });
};

export const login: MockHandler<"login"> = ({ body, store }) => {
  const user = store.users.find((u) => u.email === body.email);
  if (!user || store.passwords[user.email] !== body.password) {
    throw new MockHttpError(401, "Invalid email or password.");
  }
  if (user.status === "SUSPENDED") throw new MockHttpError(403, "This account is suspended.", { reason: "ACCOUNT_SUSPENDED" });
  user.lastLoginAt = nowIso();
  setMockSessionUser(user.id);
  return ok({ user, expiresAt: sessionExpiry() });
};

export const logout: MockHandler<"logout"> = () => {
  setMockSessionUser(null);
  return ok({ loggedOut: true as const });
};

export const getSession: MockHandler<"getSession"> = ({ user }) => ok({ user, expiresAt: user ? sessionExpiry() : null });

export const changePassword: MockHandler<"changePassword"> = ({ body, store, user }) => {
  if (store.passwords[user!.email] !== body.currentPassword) {
    throw new MockHttpError(401, "Current password is incorrect.", { reason: "INVALID_CURRENT_PASSWORD" });
  }
  store.passwords[user!.email] = body.newPassword;
  return ok({ changed: true as const });
};

export const forgotPassword: MockHandler<"forgotPassword"> = () => ok({ accepted: true as const });

export const resetPassword: MockHandler<"resetPassword"> = ({ body }) => {
  if (!body.token.startsWith("demo-")) throw new MockHttpError(400, "This reset link is invalid or has expired.", { reason: "INVALID_TOKEN" });
  return ok({ reset: true as const });
};

export const updateMyProfile: MockHandler<"updateMyProfile"> = ({ body, store, user }) => {
  const record = findById(store.users, user!.id, "User");
  Object.assign(record, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
  return ok(record);
};

// ─── Admin ──────────────────────────────────────────────────────────────────

export const listUsers: MockHandler<"listUsers"> = ({ query: q, store }) => {
  const items = store.users
    .filter((u) => (!q.role || u.role === q.role) && (!q.status || u.status === q.status) && textMatch(q.q, u.name, u.email))
    .sort(q.sort === "name" ? (a, b) => a.name.localeCompare(b.name) : q.sort === "oldest" ? (a, b) => a.createdAt.localeCompare(b.createdAt) : (a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(items, q.page, q.limit);
};

export const createUser: MockHandler<"createUser"> = ({ body, store }) => {
  if (store.users.some((u) => u.email === body.email)) throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
  const user: User = {
    id: newId("usr"),
    email: body.email,
    name: body.name,
    role: body.role,
    status: "ACTIVE",
    affiliation: body.affiliation ?? null,
    bio: null,
    avatarUrl: null,
    createdAt: nowIso(),
    lastLoginAt: null,
  };
  store.users.push(user);
  store.passwords[user.email] = body.temporaryPassword;
  return ok(user);
};

export const getUser: MockHandler<"getUser"> = ({ params, store }) => ok(findById(store.users, params.id, "User"));

export const updateUser: MockHandler<"updateUser"> = ({ params, body, store, user }) => {
  const record = findById(store.users, params.id, "User");
  if (record.id === user!.id && ((body.role && body.role !== "ADMIN") || body.status === "SUSPENDED")) {
    throw conflict("You cannot demote or suspend your own account.", "SELF_MODIFICATION");
  }
  Object.assign(record, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
  return ok(record);
};

export const getAdminDashboard: MockHandler<"getAdminDashboard"> = ({ store }) => {
  const all = [...store.expeditions, ...store.publications, ...store.datasets, ...store.media, ...store.activities];
  const contentByStatus = Object.fromEntries(
    (["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"] as const).map((s) => [s, all.filter((x) => x.status === s).length]),
  ) as Record<(typeof all)[number]["status"], number>;
  return ok({
    totals: {
      expeditions: store.expeditions.length,
      publications: store.publications.length,
      datasets: store.datasets.length,
      media: store.media.length,
      activities: store.activities.length,
      users: store.users.length,
    },
    contentByStatus,
    pendingSubmissions: store.submissions.filter((s) => s.status === "PENDING").length,
    recentSubmissions: [...store.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5),
    downloads: { last30Days: 312, total: store.files.reduce((s, f) => s + f.downloadCount, 0) },
    storage: { usedBytes: store.files.reduce((s, f) => s + f.sizeBytes, 0), fileCount: store.files.length },
    ai: { generatedLast30Days: store.aiContent.length, awaitingReview: store.aiContent.filter((a) => a.status === "DRAFT").length },
  });
};

export const listAuditLogs: MockHandler<"listAuditLogs"> = ({ query: q, store }) => {
  const items = store.auditLogs
    .filter((l) => !q.actorId || l.actor?.id === q.actorId)
    .filter((l) => !q.action || (q.action.endsWith(".") ? l.action.startsWith(q.action) : l.action === q.action))
    .filter((l) => !q.entityType || l.entityType === q.entityType)
    .filter((l) => (!q.from || l.createdAt.slice(0, 10) >= q.from) && (!q.to || l.createdAt.slice(0, 10) <= q.to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(items, q.page, q.limit);
};

