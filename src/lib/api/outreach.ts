import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type { AIOutreachContent, ApiResponse, ListOutreachQuery, OutreachSummary, PaginatedResponse } from "@/types/api";

/** GET /outreach — published, human-reviewed AI-assisted outreach content. */
export function getOutreachList(query?: ListOutreachQuery, options?: RequestOptions): Promise<PaginatedResponse<OutreachSummary>> {
  return apiRequest("listOutreach", { query }, options);
}

/** GET /outreach/{idOrSlug} */
export function getOutreachItem(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<AIOutreachContent>> {
  return apiRequest("getOutreach", { params: { id: idOrSlug } }, options);
}
