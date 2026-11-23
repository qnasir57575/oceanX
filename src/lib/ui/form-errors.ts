/**
 * Map an API failure to form UI state: a message for the error summary and
 * per-field messages (from 422 `details.fieldErrors`).
 */
import { isApiRequestError } from "@/lib/api-client";

export interface FormError {
  message: string;
  fieldErrors: Record<string, string>;
  /** `details.reason`, e.g. EMAIL_TAKEN, INVALID_TOKEN. */
  reason: string | null;
  code: string | null;
}

export function toFormError(error: unknown, messages: Partial<Record<string, string>> = {}): FormError {
  if (!isApiRequestError(error)) {
    return { message: "Something went wrong. Please try again.", fieldErrors: {}, reason: null, code: null };
  }
  const reason = error.details?.reason ?? null;
  const fieldErrors: Record<string, string> = {};
  for (const [field, msgs] of Object.entries(error.fieldErrors)) if (msgs[0]) fieldErrors[field] = msgs[0];

  const custom = (reason && messages[`reason:${reason}`]) || messages[error.code];
  let message: string;
  if (custom) message = custom;
  else if (error.code === "VALIDATION_ERROR") {
    const formErrors = error.details?.formErrors ?? [];
    message = formErrors.length ? formErrors.join(" ") : "Please correct the highlighted fields.";
  } else if (error.code === "RATE_LIMITED") {
    const wait = error.details?.retryAfterSeconds;
    message = wait ? `Too many attempts. Please wait ${wait} seconds and try again.` : "Too many attempts. Please wait a moment and try again.";
  } else if (error.code === "NETWORK_ERROR") message = "We couldn't reach the server. Check your connection and try again.";
  else if (error.code === "TIMEOUT") message = "The request timed out. Please try again.";
  else if (error.code === "INTERNAL_ERROR" || error.code === "SERVICE_UNAVAILABLE" || error.code === "INVALID_RESPONSE")
    message = `Something went wrong on our side. Please try again.${error.requestId ? ` (Reference: ${error.requestId})` : ""}`;
  else message = error.message || "Something went wrong. Please try again.";

  return { message, fieldErrors, reason, code: error.code };
}
