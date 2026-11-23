import type { z } from "zod";
import type { ErrorStatus } from "@/contracts/primitives";
import type { BodyOf, OperationId, ParamsOf, QueryOf, ResponseOf } from "@/contracts/registry";
import type { ContentStatus, Pagination, User, UserSummary } from "@/types/api";
import type { Fixtures } from "../data/fixtures";
import { getMockScenario, mockNow } from "../store";

export interface MockContext<Op extends OperationId> {
  params: ParamsOf<Op>;
  query: QueryOf<Op>;
  body: BodyOf<Op>;
  user: User | null;
  store: Fixtures;
  now: Date;
}

export type MockHandler<Op extends OperationId> = (ctx: MockContext<Op>) => ResponseOf<Op>;
export type MockHandlers = { [Op in OperationId]: MockHandler<Op> };

/** Throw from a handler to return an error response. */
export class MockHttpError extends Error {
  constructor(
    readonly status: ErrorStatus,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new MockHttpError(404, `${what} not found.`);
export const forbidden = (message = "You do not have permission to do this.") => new MockHttpError(403, message);
export const conflict = (message: string, reason?: string) => new MockHttpError(409, message, reason ? { reason } : undefined);

export const ok = <T,>(data: T) => ({ success: true as const, data });

export function paginate<T>(items: T[], page: number, limit: number): { success: true; data: T[]; pagination: Pagination } {
  const scenarioEmpty = getMockScenario() === "empty";
  const all = scenarioEmpty ? [] : items;
  const total = all.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    success: true,
    data: all.slice(start, start + limit),
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && total > 0 },
  };
}

export const isStaff = (user: User | null) => user?.role === "EDITOR" || user?.role === "ADMIN";

export function toUserSummary(user: User): UserSummary {
  return { id: user.id, name: user.name, affiliation: user.affiliation, avatarUrl: user.avatarUrl };
}

/** Records visible to the caller: PUBLISHED for everyone, or the requested status for staff. */
export function statusFilter<T extends { status: ContentStatus }>(items: T[], status: ContentStatus | undefined, user: User | null): T[] {
  const wanted = status ?? "PUBLISHED";
  if (wanted !== "PUBLISHED" && !isStaff(user)) throw forbidden("The `status` filter requires an EDITOR or ADMIN session.");
  return items.filter((i) => i.status === wanted);
}

/** Detail visibility: published, or owner/staff. Throws 404 otherwise (never reveals drafts). */
export function findVisible<T extends { id: string; slug: string; status: ContentStatus }>(
  items: T[],
  idOrSlug: string,
  user: User | null,
  owners: Record<string, string>,
  label: string,
): T {
  const item = items.find((i) => i.id === idOrSlug || i.slug === idOrSlug);
  if (!item || getMockScenario() === "empty") throw notFound(label);
  if (item.status === "PUBLISHED") return item;
  if (user && (isStaff(user) || owners[item.id] === user.id) && item.status !== "ARCHIVED") return item;
  throw notFound(label);
}

export function findById<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw notFound(label);
  return item;
}

/** Owner may edit while DRAFT/CHANGES_REQUESTED; staff any time. */
export function assertCanEdit(record: { id: string; status: ContentStatus }, user: User | null, owners: Record<string, string>) {
  if (isStaff(user)) return;
  if (user && owners[record.id] === user.id && (record.status === "DRAFT" || record.status === "CHANGES_REQUESTED")) return;
  throw forbidden("Only the owner (while DRAFT or CHANGES_REQUESTED) or an EDITOR/ADMIN can modify this record.");
}

export const textMatch = (q: string | undefined, ...fields: (string | null | undefined)[]) =>
  !q || fields.some((f) => f?.toLowerCase().includes(q.toLowerCase()));

export function yearMatch(year: number | null, q: { year?: number; yearFrom?: number; yearTo?: number }) {
  if (year === null) return q.year === undefined && q.yearFrom === undefined && q.yearTo === undefined;
  if (q.year !== undefined) return year === q.year;
  if (q.yearFrom !== undefined && year < q.yearFrom) return false;
  if (q.yearTo !== undefined && year > q.yearTo) return false;
  return true;
}

export function taxonomyMatch(
  item: { categories?: { slug: string }[]; keywords?: string[] },
  q: { category?: string; keyword?: string },
  slugify: (s: string) => string,
) {
  if (q.category && !item.categories?.some((c) => c.slug === q.category)) return false;
  if (q.keyword && !item.keywords?.some((k) => slugify(k) === q.keyword)) return false;
  return true;
}

export const byDateDesc = <T,>(get: (x: T) => string | null) => (a: T, b: T) => (get(b) ?? "").localeCompare(get(a) ?? "");
export const byDateAsc = <T,>(get: (x: T) => string | null) => (a: T, b: T) => (get(a) ?? "").localeCompare(get(b) ?? "");

let idCounter = 1000;
export const newId = (prefix: string) => `${prefix}_mock_${++idCounter}`;
export const nowIso = () => mockNow().toISOString();

/** Parse a record into a list/summary shape by stripping unknown keys. */
export function summarize<S extends z.ZodObject>(schema: S, record: unknown): z.output<S> {
  return schema.parse(record);
}
