import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  AdminDashboard,
  AdminUpdateUserRequest,
  ApiResponse,
  AuditLogEntry,
  CreateUserRequest,
  ListAuditLogsQuery,
  ListUsersQuery,
  PaginatedResponse,
  User,
} from "@/types/api";

/** GET /admin/users (ADMIN) */
export function listUsers(query?: ListUsersQuery, options?: RequestOptions): Promise<PaginatedResponse<User>> {
  return apiRequest("listUsers", { query }, options);
}

/** POST /admin/users (ADMIN) */
export function createUser(body: CreateUserRequest, options?: RequestOptions): Promise<ApiResponse<User>> {
  return apiRequest("createUser", { body }, options);
}

/** GET /admin/users/{id} (ADMIN) */
export function getUser(id: string, options?: RequestOptions): Promise<ApiResponse<User>> {
  return apiRequest("getUser", { params: { id } }, options);
}

/** PATCH /admin/users/{id} (ADMIN) */
export function updateUser(id: string, body: AdminUpdateUserRequest, options?: RequestOptions): Promise<ApiResponse<User>> {
  return apiRequest("updateUser", { params: { id }, body }, options);
}

/** GET /admin/dashboard (EDITOR/ADMIN) */
export function getAdminDashboard(options?: RequestOptions): Promise<ApiResponse<AdminDashboard>> {
  return apiRequest("getAdminDashboard", {}, { cache: "no-store", ...options });
}

/** GET /admin/audit-logs (ADMIN) */
export function listAuditLogs(query?: ListAuditLogsQuery, options?: RequestOptions): Promise<PaginatedResponse<AuditLogEntry>> {
  return apiRequest("listAuditLogs", { query }, options);
}
