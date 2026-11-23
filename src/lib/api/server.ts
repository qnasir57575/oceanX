/**
 * Server Components only. Forwards the browser's cookies so that API calls made
 * during server rendering act as the logged-in user.
 *
 *   import { withRequestCookies } from "@/lib/api/server";
 *   const { data } = await getSession(await withRequestCookies());
 *
 * Do not import this file from Client Components ("use client").
 */
import { cookies } from "next/headers";
import type { RequestOptions } from "@/lib/api-client";

export async function withRequestCookies(options: RequestOptions = {}): Promise<RequestOptions> {
  const cookieHeader = (await cookies()).toString();
  return {
    ...options,
    cache: options.cache ?? "no-store",
    headers: { ...options.headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
  };
}
