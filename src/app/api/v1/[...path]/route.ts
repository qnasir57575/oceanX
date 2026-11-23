/**
 * Fallback for /api/v1 paths without a route handler: returns the standard JSON
 * error envelope instead of an HTML page. If the path belongs to an endpoint in
 * the contract that is not implemented yet, the message says so.
 */
import { randomUUID } from "node:crypto";
import { matchEndpoint } from "@/contracts/registry";

function notImplemented(request: Request): Response {
  const requestId = `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const path = new URL(request.url).pathname.replace(/^\/api\/v1/, "") || "/";
  const match = matchEndpoint(request.method, path);
  const message = match.endpoint
    ? `${request.method} /api/v1${match.endpoint.path} is ${match.endpoint.status} and not served by the backend yet. Use the mock API (NEXT_PUBLIC_USE_MOCK_API=true).`
    : `No API endpoint matches ${request.method} /api/v1${path}. See docs/API_DOCUMENTATION.md.`;
  return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message, requestId } }), {
    status: 404,
    headers: { "Content-Type": "application/json", "X-Request-Id": requestId, "Cache-Control": "no-store" },
  });
}

export const GET = notImplemented;
export const POST = notImplemented;
export const PUT = notImplemented;
export const PATCH = notImplemented;
export const DELETE = notImplemented;
