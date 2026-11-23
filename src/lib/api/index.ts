/**
 * Barrel export for all typed API functions:
 *   import { getExpeditions, search } from "@/lib/api";
 * Per-domain imports (`@/lib/api/expeditions`) work too.
 */
export * from "./system";
export * from "./auth";
export * from "./home";
export * from "./expeditions";
export * from "./publications";
export * from "./datasets";
export * from "./media";
export * from "./activities";
export * from "./search";
export * from "./taxonomy";
export * from "./outreach";
export * from "./files";
export * from "./submissions";
export * from "./ai";
export * from "./admin";
export { ApiRequestError, isApiRequestError, getApiBaseUrl, MOCK_API_ENABLED, type RequestOptions } from "@/lib/api-client";
