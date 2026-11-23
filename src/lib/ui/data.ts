/**
 * Request-scoped (React `cache`) loaders for data several Server Components
 * on one page need — e.g. categories for both the filter form and the
 * active-filter chips. Not persistent caching ("use cache" is not used for
 * API calls, see API_DOCUMENTATION §3.8).
 */
import { cache } from "react";
import { getCategories } from "@/lib/api/taxonomy";
import type { ResearchCategory } from "@/types/api";

/** Categories for filters; empty list if the request fails (filters degrade gracefully). */
export const loadCategoryOptions = cache(async (): Promise<ResearchCategory[]> => {
  try {
    return (await getCategories()).data;
  } catch {
    return [];
  }
});

export async function categoryName(slug: string): Promise<string> {
  const categories = await loadCategoryOptions();
  return categories.find((c) => c.slug === slug)?.name ?? slug;
}
