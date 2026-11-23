import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePublicationRequest,
  Deleted,
  ListPublicationsQuery,
  PaginatedResponse,
  Publication,
  PublicationSummary,
  UpdatePublicationRequest,
} from "@/types/api";

/** GET /publications — paginated, filterable list of published research publications. */
export function getPublications(
  query?: ListPublicationsQuery,
  options?: RequestOptions,
): Promise<PaginatedResponse<PublicationSummary>> {
  return apiRequest("listPublications", { query }, options);
}

/** GET /publications/{idOrSlug} — full publication with citation, PDF and AI summary. */
export function getPublication(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<Publication>> {
  return apiRequest("getPublication", { params: { id: idOrSlug } }, options);
}

/** POST /publications — create a DRAFT. */
export function createPublication(body: CreatePublicationRequest, options?: RequestOptions): Promise<ApiResponse<Publication>> {
  return apiRequest("createPublication", { body }, options);
}

/** PATCH /publications/{id} — partial update. */
export function updatePublication(
  id: string,
  body: UpdatePublicationRequest,
  options?: RequestOptions,
): Promise<ApiResponse<Publication>> {
  return apiRequest("updatePublication", { params: { id }, body }, options);
}

/** DELETE /publications/{id} — archive. */
export function deletePublication(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deletePublication", { params: { id } }, options);
}
