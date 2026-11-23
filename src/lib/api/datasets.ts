import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateDatasetRequest,
  Dataset,
  DatasetSummary,
  Deleted,
  ListDatasetsQuery,
  PaginatedResponse,
  UpdateDatasetRequest,
} from "@/types/api";

/** GET /datasets — paginated, filterable list of published datasets. */
export function getDatasets(query?: ListDatasetsQuery, options?: RequestOptions): Promise<PaginatedResponse<DatasetSummary>> {
  return apiRequest("listDatasets", { query }, options);
}

/** GET /datasets/{idOrSlug} — full dataset incl. files (`files[].downloadUrl`). */
export function getDataset(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<Dataset>> {
  return apiRequest("getDataset", { params: { id: idOrSlug } }, options);
}

/** POST /datasets — create a DRAFT. Upload files first with `uploadFile()`. */
export function createDataset(body: CreateDatasetRequest, options?: RequestOptions): Promise<ApiResponse<Dataset>> {
  return apiRequest("createDataset", { body }, options);
}

/** PATCH /datasets/{id} — partial update. */
export function updateDataset(id: string, body: UpdateDatasetRequest, options?: RequestOptions): Promise<ApiResponse<Dataset>> {
  return apiRequest("updateDataset", { params: { id }, body }, options);
}

/** DELETE /datasets/{id} — archive. */
export function deleteDataset(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteDataset", { params: { id } }, options);
}
