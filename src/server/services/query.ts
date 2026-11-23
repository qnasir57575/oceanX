/** Shared helpers for building list/detail queries over content tables. */
import type { User as UserRow } from "@/generated/prisma/client";
import type { ContentStatus, Pagination } from "@/types/api";
import { forbidden, notFound } from "@/server/http/errors";

export const isStaff = (user: UserRow | null) => user?.role === "EDITOR" || user?.role === "ADMIN";

/** `status` filter: PUBLISHED for everyone; other statuses for EDITOR/ADMIN only. */
export function statusWhere(status: ContentStatus | undefined, user: UserRow | null): { status: ContentStatus } {
  const wanted = status ?? "PUBLISHED";
  if (wanted !== "PUBLISHED" && !isStaff(user)) throw forbidden("The `status` filter requires an EDITOR or ADMIN session.");
  return { status: wanted };
}

export function taxonomyWhere(q: { category?: string; keyword?: string }) {
  return {
    ...(q.category ? { categories: { some: { slug: q.category } } } : {}),
    ...(q.keyword ? { keywords: { some: { slug: q.keyword } } } : {}),
  };
}

export function yearWhere(q: { year?: number; yearFrom?: number; yearTo?: number }) {
  if (q.year !== undefined) return { year: q.year };
  if (q.yearFrom === undefined && q.yearTo === undefined) return {};
  return { year: { ...(q.yearFrom !== undefined ? { gte: q.yearFrom } : {}), ...(q.yearTo !== undefined ? { lte: q.yearTo } : {}) } };
}

/** Case-insensitive contains over several string columns (OR). */
export function textWhere(q: string | undefined, fields: string[]) {
  if (!q) return {};
  return { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) };
}

export const pageArgs = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });

export function pagination(page: number, limit: number, total: number): Pagination {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && total > 0 };
}

export const idOrSlug = (value: string) => ({ OR: [{ id: value }, { slug: value }] });

/** Detail visibility: published for everyone; owner (non-archived) or staff otherwise. Never reveals drafts (404). */
export function assertVisible<T extends { status: ContentStatus; ownerId: string | null }>(
  record: T | null,
  user: UserRow | null,
  label: string,
): T {
  if (!record) throw notFound(label);
  if (record.status === "PUBLISHED") return record;
  if (user && record.status !== "ARCHIVED" && (isStaff(user) || record.ownerId === user.id)) return record;
  throw notFound(label);
}

export const PUBLISHED = { status: "PUBLISHED" as const };
