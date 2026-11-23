import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  AIOutreachContent,
  ApiResponse,
  Deleted,
  GenerateOutreachRequest,
  GenerateSummaryRequest,
  ListAIContentQuery,
  PaginatedResponse,
  UpdateAIContentRequest,
} from "@/types/api";

const AI_TIMEOUT_MS = 120_000;

/** POST /ai/summaries — draft a plain-language summary (EDITOR/ADMIN). */
export function generateResearchSummary(
  body: GenerateSummaryRequest,
  options?: RequestOptions,
): Promise<ApiResponse<AIOutreachContent>> {
  return apiRequest("generateResearchSummary", { body }, { timeoutMs: AI_TIMEOUT_MS, ...options });
}

/** POST /ai/outreach — draft outreach content (EDITOR/ADMIN). */
export function generateOutreachContent(
  body: GenerateOutreachRequest,
  options?: RequestOptions,
): Promise<ApiResponse<AIOutreachContent>> {
  return apiRequest("generateOutreachContent", { body }, { timeoutMs: AI_TIMEOUT_MS, ...options });
}

/** GET /ai/content */
export function getAIContentList(
  query?: ListAIContentQuery,
  options?: RequestOptions,
): Promise<PaginatedResponse<AIOutreachContent>> {
  return apiRequest("listAIContent", { query }, options);
}

/** GET /ai/content/{id} */
export function getAIContent(id: string, options?: RequestOptions): Promise<ApiResponse<AIOutreachContent>> {
  return apiRequest("getAIContent", { params: { id } }, options);
}

/** PATCH /ai/content/{id} — edit / publish / reject. */
export function updateAIContent(
  id: string,
  body: UpdateAIContentRequest,
  options?: RequestOptions,
): Promise<ApiResponse<AIOutreachContent>> {
  return apiRequest("updateAIContent", { params: { id }, body }, options);
}

/** DELETE /ai/content/{id} */
export function deleteAIContent(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteAIContent", { params: { id } }, options);
}
