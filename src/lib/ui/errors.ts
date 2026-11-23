/**
 * Turn any thrown value into user-facing error copy.
 *
 * - Errors thrown in Client Components arrive as `ApiRequestError`, so we can
 *   branch on `code` (API_DOCUMENTATION §3.2).
 * - Errors thrown in Server Components reach error boundaries as a plain
 *   `Error` with a generic message and a `digest` in production, so we show
 *   generic copy plus the digest as a reference.
 */
import { isApiRequestError } from "@/lib/api-client";

export interface ErrorDescription {
  title: string;
  message: string;
  /** requestId or digest to quote in bug reports. */
  reference: string | null;
  /** Whether "Try again" is likely to help. */
  retryable: boolean;
  /** Original message, shown only in development. */
  debug: string | null;
}

const DEV = process.env.NODE_ENV === "development";

export function describeError(error: unknown, subject = "this content"): ErrorDescription {
  const debug = DEV && error instanceof Error ? error.message : null;

  if (isApiRequestError(error)) {
    const base = { reference: error.requestId, debug };
    switch (error.code) {
      case "NETWORK_ERROR":
        return { ...base, title: "You appear to be offline", message: "We couldn't reach the server. Check your connection and try again.", retryable: true };
      case "TIMEOUT":
        return { ...base, title: "This is taking too long", message: `Loading ${subject} timed out. Please try again.`, retryable: true };
      case "RATE_LIMITED": {
        const wait = error.details?.retryAfterSeconds;
        return {
          ...base,
          title: "Too many requests",
          message: wait ? `Please wait ${wait} seconds and try again.` : "Please wait a moment and try again.",
          retryable: true,
        };
      }
      case "SERVICE_UNAVAILABLE":
        return { ...base, title: "Temporarily unavailable", message: "A service the portal depends on is down. Please try again later.", retryable: true };
      case "FORBIDDEN":
        return { ...base, title: "You don't have access", message: "Your account isn't allowed to view this.", retryable: false };
      case "UNAUTHENTICATED":
        return { ...base, title: "Please log in", message: "You need to be logged in to view this.", retryable: false };
      case "NOT_FOUND":
        return { ...base, title: "Not found", message: `We couldn't find ${subject}.`, retryable: false };
      default:
        return { ...base, title: "Something went wrong", message: `We couldn't load ${subject}. Please try again.`, retryable: true };
    }
  }

  const digest =
    error && typeof error === "object" && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return {
    title: "Something went wrong",
    message: `We couldn't load ${subject}. Please try again.`,
    reference: digest,
    retryable: true,
    debug,
  };
}
