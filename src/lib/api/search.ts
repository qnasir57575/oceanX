import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type { ApiResponse, SearchQuery, SearchResponse, SearchResult, SearchSuggestion, SuggestQuery } from "@/types/api";

/** GET /search — unified, faceted search across all public content. */
export function search(query: SearchQuery, options?: RequestOptions): Promise<SearchResponse> {
  return apiRequest("search", { query }, options);
}

/** GET /search/suggest — type-ahead suggestions. Debounce and pass `signal`. */
export function getSearchSuggestions(query: SuggestQuery, options?: RequestOptions): Promise<ApiResponse<SearchSuggestion[]>> {
  return apiRequest("getSearchSuggestions", { query }, options);
}

const RESULT_ROUTES: Record<SearchResult["type"], string> = {
  EXPEDITION: "/expeditions",
  PUBLICATION: "/research",
  DATASET: "/datasets",
  MEDIA: "/gallery",
  ACTIVITY: "/news",
  OUTREACH: "/learn",
};

/** Frontend page link for a search result, e.g. `/datasets/demo-sea-ice-extent`. */
export function searchResultHref(result: Pick<SearchResult, "type" | "slug">): string {
  return `${RESULT_ROUTES[result.type]}/${encodeURIComponent(result.slug)}`;
}
