import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type { ApiResponse, HealthStatus } from "@/types/api";

/** GET /health — throws ApiRequestError (503) when unhealthy. */
export function getHealth(options?: RequestOptions): Promise<ApiResponse<HealthStatus>> {
  return apiRequest("getHealth", {}, { cache: "no-store", ...options });
}
