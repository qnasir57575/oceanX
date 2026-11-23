/**
 * Fixed-window in-memory rate limiter.
 * Limitation: counters are per server instance. Replace with Redis (or similar)
 * before running multiple instances.
 */
import { HttpError } from "./errors";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(key: string, limit: number, windowSeconds: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new HttpError(429, "Too many requests. Please wait and try again.", { retryAfterSeconds });
  }
  if (buckets.size > 50_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
