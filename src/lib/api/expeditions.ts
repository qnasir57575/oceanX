import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateExpeditionRequest,
  Deleted,
  Expedition,
  ExpeditionSummary,
  ListExpeditionsQuery,
  PaginatedResponse,
  UpdateExpeditionRequest,
} from "@/types/api";

/** GET /expeditions — paginated, filterable list of published expeditions. */
export function getExpeditions(
  query?: ListExpeditionsQuery,
  options?: RequestOptions,
): Promise<PaginatedResponse<ExpeditionSummary>> {
  return apiRequest("listExpeditions", { query }, options);
}

/** GET /expeditions/{idOrSlug} — full expedition record. */
export function getExpedition(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<Expedition>> {
  return apiRequest("getExpedition", { params: { id: idOrSlug } }, options);
}

/** POST /expeditions — create a DRAFT (RESEARCHER/EDITOR/ADMIN). */
export function createExpedition(body: CreateExpeditionRequest, options?: RequestOptions): Promise<ApiResponse<Expedition>> {
  return apiRequest("createExpedition", { body }, options);
}

/** PATCH /expeditions/{id} — partial update. */
export function updateExpedition(
  id: string,
  body: UpdateExpeditionRequest,
  options?: RequestOptions,
): Promise<ApiResponse<Expedition>> {
  return apiRequest("updateExpedition", { params: { id }, body }, options);
}

/** DELETE /expeditions/{id} — archive. */
export function deleteExpedition(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteExpedition", { params: { id } }, options);
}
