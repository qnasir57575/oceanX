import type { CategoryCounts } from "@/types/api";
import { formatNumber } from "@/lib/format/number";

/** "3 expeditions · 5 publications · 2 datasets" for a category. */
export function countSummary(counts: CategoryCounts | null): string | null {
  if (!counts) return null;
  const parts = [
    counts.expeditions && `${formatNumber(counts.expeditions)} expedition${counts.expeditions === 1 ? "" : "s"}`,
    counts.publications && `${formatNumber(counts.publications)} publication${counts.publications === 1 ? "" : "s"}`,
    counts.datasets && `${formatNumber(counts.datasets)} dataset${counts.datasets === 1 ? "" : "s"}`,
    counts.media && `${formatNumber(counts.media)} media`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No published records yet";
}
