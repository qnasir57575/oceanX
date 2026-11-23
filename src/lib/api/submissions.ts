import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSubmissionRequest,
  ListSubmissionsQuery,
  PaginatedResponse,
  ReviewSubmissionRequest,
  Submission,
} from "@/types/api";

/** GET /submissions — review queue (staff) or own submissions (researcher). */
export function getSubmissions(query?: ListSubmissionsQuery, options?: RequestOptions): Promise<PaginatedResponse<Submission>> {
  return apiRequest("listSubmissions", { query }, options);
}

/** GET /submissions/{id} */
export function getSubmission(id: string, options?: RequestOptions): Promise<ApiResponse<Submission>> {
  return apiRequest("getSubmission", { params: { id } }, options);
}

/** POST /submissions — submit a draft for review. */
export function createSubmission(body: CreateSubmissionRequest, options?: RequestOptions): Promise<ApiResponse<Submission>> {
  return apiRequest("createSubmission", { body }, options);
}

/** POST /submissions/{id}/review — APPROVE | REJECT | REQUEST_CHANGES (EDITOR/ADMIN). */
export function reviewSubmission(
  id: string,
  body: ReviewSubmissionRequest,
  options?: RequestOptions,
): Promise<ApiResponse<Submission>> {
  return apiRequest("reviewSubmission", { params: { id }, body }, options);
}

/** POST /submissions/{id}/withdraw */
export function withdrawSubmission(id: string, options?: RequestOptions): Promise<ApiResponse<Submission>> {
  return apiRequest("withdrawSubmission", { params: { id } }, options);
}
