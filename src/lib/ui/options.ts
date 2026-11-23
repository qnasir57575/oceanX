/**
 * Select-option builders for filter UIs. Option *values* come from the
 * contract enums (never hand-typed lists); labels are UI copy.
 * Server-side helpers: pass the resulting arrays to client components.
 */
import type { z } from "zod";
import { humanize } from "@/lib/format/labels";

export interface Option {
  value: string;
  label: string;
}

export function enumOptions<T extends string>(values: readonly T[], labels: Record<T, string>): Option[] {
  return values.map((value) => ({ value, label: labels[value] ?? humanize(value) }));
}

export const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title (A–Z)",
  startDate: "Start date",
  downloads: "Most downloaded",
  capturedAt: "Date captured",
  startsAt: "Event date",
};

/** Sort options declared by a list query schema's `sort` field. */
export function sortOptions(schema: z.ZodObject): Option[] {
  const field = schema.shape.sort as unknown as { unwrap?: () => { options?: readonly string[] }; options?: readonly string[] } | undefined;
  const values = field?.unwrap?.().options ?? field?.options ?? [];
  return values.map((value) => ({ value, label: SORT_LABELS[value] ?? humanize(value) }));
}
