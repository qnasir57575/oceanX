import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateMediaAssetRequest,
  Deleted,
  ListMediaQuery,
  MediaAsset,
  MediaAssetSummary,
  PaginatedResponse,
  UpdateMediaAssetRequest,
} from "@/types/api";

/** GET /media — paginated gallery (default 24 per page). */
export function getMediaAssets(query?: ListMediaQuery, options?: RequestOptions): Promise<PaginatedResponse<MediaAssetSummary>> {
  return apiRequest("listMediaAssets", { query }, options);
}

/** GET /media/{idOrSlug} — full media record. */
export function getMediaAsset(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<MediaAsset>> {
  return apiRequest("getMediaAsset", { params: { id: idOrSlug } }, options);
}

/** POST /media — create a DRAFT. */
export function createMediaAsset(body: CreateMediaAssetRequest, options?: RequestOptions): Promise<ApiResponse<MediaAsset>> {
  return apiRequest("createMediaAsset", { body }, options);
}

/** PATCH /media/{id} — partial update. */
export function updateMediaAsset(
  id: string,
  body: UpdateMediaAssetRequest,
  options?: RequestOptions,
): Promise<ApiResponse<MediaAsset>> {
  return apiRequest("updateMediaAsset", { params: { id }, body }, options);
}

/** DELETE /media/{id} — archive. */
export function deleteMediaAsset(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteMediaAsset", { params: { id } }, options);
}
