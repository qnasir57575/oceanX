/**
 * URL query string ⇄ typed API query helpers for list pages.
 *
 * Filters, sort and pagination live in the URL. Page components receive
 * `searchParams` as a plain record; `parseQuery` turns it into a typed query
 * using the *contract's own* Zod schema, so values are coerced and validated
 * exactly like the backend does. Invalid values (e.g. a hand-edited
 * `?region=MARS`) are dropped instead of producing a 422 error page.
 */
import type { z } from "zod";
import { coerceQuery } from "@/contracts/query";

export type RawSearchParams = Record<string, string | string[] | undefined>;
export type QueryUpdates = Record<string, string | number | boolean | null | undefined>;

/** Params that the public site never sends (staff-only). */
const STRIPPED_PARAMS = ["status"];

export function toURLSearchParams(sp: RawSearchParams | URLSearchParams): URLSearchParams {
  if (sp instanceof URLSearchParams) return new URLSearchParams(sp);
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) out.append(key, v);
  }
  return out;
}

/**
 * Parse URL search params into a typed, validated query for `schema`.
 * `overrides` (e.g. a fixed `limit`) always win over the URL.
 * Fields that fail validation are dropped one round at a time.
 */
export function parseQuery<S extends z.ZodObject>(
  schema: S,
  searchParams: RawSearchParams | URLSearchParams,
  overrides: Partial<z.input<S>> = {},
): z.output<S> {
  const raw = coerceQuery(schema, toURLSearchParams(searchParams));
  for (const key of STRIPPED_PARAMS) delete raw[key];
  let candidate: Record<string, unknown> = { ...raw, ...overrides };

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = schema.safeParse(candidate);
    if (result.success) return result.data;
    const badKeys = new Set(
      result.error.issues.map((issue) => issue.path[0]).filter((k): k is string => typeof k === "string"),
    );
    // Never drop an override: if one is invalid that's a programming error.
    for (const key of Object.keys(overrides)) badKeys.delete(key);
    if (badKeys.size === 0) break;
    candidate = Object.fromEntries(Object.entries(candidate).filter(([key]) => !badKeys.has(key)));
  }
  return schema.parse(overrides);
}

/** Read a single string value from raw search params. */
export function getParam(sp: RawSearchParams, key: string): string | undefined {
  const value = sp[key];
  const v = Array.isArray(value) ? value[value.length - 1] : value;
  return v === undefined || v === "" ? undefined : v;
}

/**
 * Build `pathname?query` from current params plus updates.
 * `null`/`undefined`/`""` remove a param. `page=1` is omitted (it's the default).
 * Unless `page` is part of the updates, changing any param resets pagination.
 */
export function buildHref(
  pathname: string,
  current: RawSearchParams | URLSearchParams,
  updates: QueryUpdates = {},
): string {
  const params = toURLSearchParams(current);
  const changesPage = "page" in updates;
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  if (!changesPage && Object.keys(updates).length > 0) params.delete("page");
  if (params.get("page") === "1") params.delete("page");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Number of active (non-pagination, non-sort) filters in the URL. */
export function countActiveFilters(sp: RawSearchParams | URLSearchParams, ignore: string[] = ["page", "sort"]): number {
  const params = toURLSearchParams(sp);
  let count = 0;
  for (const [key, value] of params) if (!ignore.includes(key) && value !== "") count++;
  return count;
}
