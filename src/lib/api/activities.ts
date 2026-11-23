import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ActivitySummary,
  ApiResponse,
  CreateActivityRequest,
  Deleted,
  InstitutionalActivity,
  ListActivitiesQuery,
  PaginatedResponse,
  UpdateActivityRequest,
} from "@/types/api";

/** GET /activities — news, events, press releases, outreach programmes. */
export function getActivities(
  query?: ListActivitiesQuery,
  options?: RequestOptions,
): Promise<PaginatedResponse<ActivitySummary>> {
  return apiRequest("listActivities", { query }, options);
}

/** GET /activities/{idOrSlug} — full news item / event. */
export function getActivity(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<InstitutionalActivity>> {
  return apiRequest("getActivity", { params: { id: idOrSlug } }, options);
}

/** POST /activities — create a DRAFT (EDITOR/ADMIN). */
export function createActivity(
  body: CreateActivityRequest,
  options?: RequestOptions,
): Promise<ApiResponse<InstitutionalActivity>> {
  return apiRequest("createActivity", { body }, options);
}

/** PATCH /activities/{id} — partial update (EDITOR/ADMIN). */
export function updateActivity(
  id: string,
  body: UpdateActivityRequest,
  options?: RequestOptions,
): Promise<ApiResponse<InstitutionalActivity>> {
  return apiRequest("updateActivity", { params: { id }, body }, options);
}

/** DELETE /activities/{id} — archive (EDITOR/ADMIN). */
export function deleteActivity(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteActivity", { params: { id } }, options);
}
