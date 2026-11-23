import type { ErrorStatus } from "@/contracts/primitives";

/** Throw from services/handlers to return a contract error response. */
export class HttpError extends Error {
  constructor(
    readonly status: ErrorStatus,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthenticated = (message = "You need to log in to do this.", reason?: string) =>
  new HttpError(401, message, reason ? { reason } : undefined);
export const forbidden = (message = "You do not have permission to do this.", reason?: string) =>
  new HttpError(403, message, reason ? { reason } : undefined);
export const notFound = (what: string) => new HttpError(404, `${what} not found.`);
export const conflict = (message: string, reason?: string) => new HttpError(409, message, reason ? { reason } : undefined);
export const badRequest = (message: string, reason?: string) => new HttpError(400, message, reason ? { reason } : undefined);
