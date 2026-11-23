import { apiRequest, type RequestOptions } from "@/lib/api-client";
import type {
  ApiResponse,
  AuthResult,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  Session,
  UpdateProfileRequest,
  User,
} from "@/types/api";

/**
 * Authentication uses an httpOnly session cookie set by the server.
 * These functions never return or store a token — the browser handles the cookie.
 */

/** POST /auth/register — create a MEMBER account and log in. */
export function register(body: RegisterRequest, options?: RequestOptions): Promise<ApiResponse<AuthResult>> {
  return apiRequest("register", { body }, options);
}

/** POST /auth/login — sets the session cookie. */
export function login(body: LoginRequest, options?: RequestOptions): Promise<ApiResponse<AuthResult>> {
  return apiRequest("login", { body }, options);
}

/** POST /auth/logout — clears the session cookie (idempotent). */
export function logout(options?: RequestOptions): Promise<ApiResponse<{ loggedOut: true }>> {
  return apiRequest("logout", {}, options);
}

/** GET /auth/session — `data.user` is null when logged out. Never throws 401. */
export function getSession(options?: RequestOptions): Promise<ApiResponse<Session>> {
  return apiRequest("getSession", {}, { cache: "no-store", ...options });
}

/** POST /auth/password/change */
export function changePassword(body: ChangePasswordRequest, options?: RequestOptions): Promise<ApiResponse<{ changed: true }>> {
  return apiRequest("changePassword", { body }, options);
}

/** POST /auth/password/forgot — always resolves (202) when the input is valid. */
export function forgotPassword(body: ForgotPasswordRequest, options?: RequestOptions): Promise<ApiResponse<{ accepted: true }>> {
  return apiRequest("forgotPassword", { body }, options);
}

/** POST /auth/password/reset */
export function resetPassword(body: ResetPasswordRequest, options?: RequestOptions): Promise<ApiResponse<{ reset: true }>> {
  return apiRequest("resetPassword", { body }, options);
}

/** PATCH /users/me — update own profile. */
export function updateMyProfile(body: UpdateProfileRequest, options?: RequestOptions): Promise<ApiResponse<User>> {
  return apiRequest("updateMyProfile", { body }, options);
}
