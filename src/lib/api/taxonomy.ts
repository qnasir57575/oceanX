import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateCategoryRequest,
  CreateKeywordRequest,
  Deleted,
  Keyword,
  ListCategoriesQuery,
  ListKeywordsQuery,
  PaginatedResponse,
  ResearchCategory,
  UpdateCategoryRequest,
} from "@/types/api";

/** GET /categories — flat list; build the tree from `parentId`. */
export function getCategories(query?: ListCategoriesQuery, options?: RequestOptions): Promise<ApiResponse<ResearchCategory[]>> {
  return apiRequest("listCategories", { query }, options);
}

/** GET /categories/{idOrSlug} — includes counts. */
export function getCategory(idOrSlug: string, options?: RequestOptions): Promise<ApiResponse<ResearchCategory>> {
  return apiRequest("getCategory", { params: { id: idOrSlug } }, options);
}

/** POST /categories (EDITOR/ADMIN) */
export function createCategory(body: CreateCategoryRequest, options?: RequestOptions): Promise<ApiResponse<ResearchCategory>> {
  return apiRequest("createCategory", { body }, options);
}

/** PATCH /categories/{id} (EDITOR/ADMIN) */
export function updateCategory(
  id: string,
  body: UpdateCategoryRequest,
  options?: RequestOptions,
): Promise<ApiResponse<ResearchCategory>> {
  return apiRequest("updateCategory", { params: { id }, body }, options);
}

/** DELETE /categories/{id} (ADMIN) */
export function deleteCategory(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteCategory", { params: { id } }, options);
}

/** GET /keywords — most used first; `q` for autocomplete. */
export function getKeywords(query?: ListKeywordsQuery, options?: RequestOptions): Promise<PaginatedResponse<Keyword>> {
  return apiRequest("listKeywords", { query }, options);
}

/** POST /keywords (EDITOR/ADMIN) */
export function createKeyword(body: CreateKeywordRequest, options?: RequestOptions): Promise<ApiResponse<Keyword>> {
  return apiRequest("createKeyword", { body }, options);
}

/** DELETE /keywords/{id} (ADMIN) */
export function deleteKeyword(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteKeyword", { params: { id } }, options);
}
