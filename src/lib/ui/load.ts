/**
 * Server Component data helpers.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isApiRequestError } from "@/lib/api-client";

/** Await an API call; render the 404 page when the record doesn't exist (or isn't published). */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (isApiRequestError(error) && error.isNotFound) notFound();
    throw error;
  }
}

/**
 * Metadata for detail pages. Missing records stream the not-found UI after
 * the shell (HTTP status stays 200 under partial prerendering), so mark them
 * noindex here.
 */
export async function recordMetadata<T>(
  request: Promise<T>,
  build: (result: T) => Metadata,
  fallbackTitle: string,
): Promise<Metadata> {
  try {
    return build(await request);
  } catch (error) {
    if (isApiRequestError(error) && error.isNotFound) return { title: "Not found", robots: { index: false } };
    return { title: fallbackTitle };
  }
}

/** Await an optional API call; fall back to `fallback` on any error (for non-essential UI like filter options). */
export async function orFallback<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch {
    return fallback;
  }
}
