/**
 * Validate a post-login redirect target (`?next=`). Only same-site relative
 * paths are allowed, so `/login?next=https://evil.example` can't be abused
 * as an open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/account"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  // Don't bounce back into the auth pages themselves.
  if (/^\/(login|register|forgot-password|reset-password)(\/|\?|$)/.test(next)) return fallback;
  return next;
}

/** `/login?next=<path>` for a protected page. */
export function loginHref(next?: string): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
