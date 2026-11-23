import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type { ApiResponse, HomePageData, PortalStats } from "@/types/api";

/** GET /home — all homepage sections in one request. */
export function getHomePageData(options?: RequestOptions): Promise<ApiResponse<HomePageData>> {
  return apiRequest("getHomePageData", {}, options);
}

/** GET /stats — published content counts. */
export function getPortalStats(options?: RequestOptions): Promise<ApiResponse<PortalStats>> {
  return apiRequest("getPortalStats", {}, options);
}
