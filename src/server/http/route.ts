/**
 * defineRoute — the ONLY way to implement an API route handler.
 *
 *   // src/app/api/v1/expeditions/route.ts
 *   export const GET = defineRoute("listExpeditions", async ({ query, user }) => listExpeditions(query, user));
 *
 * Everything below is driven by the endpoint's entry in src/contracts/registry.ts:
 *   1. CSRF Origin check for state-changing methods            → 403
 *   2. session resolution (httpOnly cookie)
 *   3. rate limiting                                           → 429
 *   4. auth requirement and allowed roles                      → 401 / 403
 *   5. path params, query and JSON body validation             → 400 / 413 / 422
 *   6. the handler (typed from the contract)
 *   7. response envelope + status from the contract; in dev/test the response
 *      is validated against the contract schema (test: throws → contract tests fail)
 *   8. consistent error envelope with requestId for every failure
 */
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { User as UserRow } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { ERROR_STATUS_CODES } from "@/contracts/primitives";
import { coerceQuery } from "@/contracts/query";
import {
  getEndpointDefinition,
  type BodyOf,
  type Endpoints,
  type OperationId,
  type ParamsOf,
  type QueryOf,
  type ResponseOf,
} from "@/contracts/registry";
import { resolveSession } from "@/server/auth/session";
import { HttpError } from "./errors";
import { enforceRateLimit } from "./rate-limit";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_JSON_BYTES = 1024 * 1024; // 1 MB for JSON bodies

type AuthedUser<Op extends OperationId> = Endpoints[Op]["auth"] extends "REQUIRED" ? UserRow : UserRow | null;

export interface RouteContext<Op extends OperationId> {
  request: Request;
  params: ParamsOf<Op>;
  query: QueryOf<Op>;
  body: BodyOf<Op>;
  user: AuthedUser<Op>;
  sessionId: string | null;
  requestId: string;
  ip: string | null;
  /** Append a Set-Cookie header to the response. */
  setCookie(cookie: string): void;
}

export type RouteHandler<Op extends OperationId> = (ctx: RouteContext<Op>) => Promise<ResponseOf<Op> | Response>;

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return request.headers.get("x-real-ip");
}

function assertAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, server-to-server)
  const allowed = new Set<string>([new URL(request.url).origin]);
  if (process.env.APP_ORIGIN) allowed.add(process.env.APP_ORIGIN.replace(/\/+$/, ""));
  if (!allowed.has(origin)) throw new HttpError(403, "Cross-origin request rejected.", { reason: "ORIGIN_NOT_ALLOWED" });
}

function validationError(error: z.ZodError): HttpError {
  const flat = z.flattenError(error);
  return new HttpError(422, "Request validation failed.", {
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
    formErrors: flat.formErrors,
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new HttpError(400, "Content-Type must be application/json.", { reason: "UNSUPPORTED_CONTENT_TYPE" });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new HttpError(413, "Request body is too large.", { maxSizeBytes: MAX_JSON_BYTES });
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new HttpError(413, "Request body is too large.", { maxSizeBytes: MAX_JSON_BYTES });
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.", { reason: "INVALID_JSON" });
  }
}

export function errorResponse(error: unknown, requestId: string, operationId: string): Response {
  let status: keyof typeof ERROR_STATUS_CODES = 500;
  let message = "An unexpected error occurred.";
  let details: Record<string, unknown> | undefined;

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    status = 409;
    message = "A record with these unique values already exists.";
    details = { reason: "UNIQUE_CONSTRAINT" };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    status = 404;
    message = "Record not found.";
  } else {
    console.error(`[api] ${operationId} ${requestId} unhandled error`, error);
  }

  const headers = new Headers({ "Content-Type": "application/json", "X-Request-Id": requestId, "Cache-Control": "no-store" });
  if (status === 429 && typeof details?.retryAfterSeconds === "number") headers.set("Retry-After", String(details.retryAfterSeconds));
  return new Response(
    JSON.stringify({ success: false, error: { code: ERROR_STATUS_CODES[status], message, ...(details ? { details } : {}), requestId } }),
    { status, headers },
  );
}

export function defineRoute<Op extends OperationId>(operationId: Op, handler: RouteHandler<Op>) {
  const endpoint = getEndpointDefinition(operationId);

  return async function routeHandler(request: Request, context?: NextRouteContext): Promise<Response> {
    const requestId = `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const cookies: string[] = [];
    try {
      if (UNSAFE_METHODS.has(request.method)) assertAllowedOrigin(request);

      const session = await resolveSession(request);
      const user = session?.user ?? null;
      const ip = clientIp(request);

      if (endpoint.rateLimit) {
        const { limit, windowSeconds, scope } = endpoint.rateLimit;
        const who = scope === "user" && user ? `u:${user.id}` : `ip:${ip ?? "unknown"}`;
        enforceRateLimit(`${operationId}:${who}`, limit, windowSeconds);
      }

      if (endpoint.auth === "REQUIRED") {
        if (!user) throw new HttpError(401, "You need to log in to do this.");
        if (endpoint.roles && !endpoint.roles.includes(user.role)) throw new HttpError(403, "Your role is not allowed to do this.");
      }

      const req = endpoint.request;
      let params: unknown = undefined;
      if (req?.params) {
        const raw = context?.params ? await context.params : {};
        const parsed = req.params.safeParse(raw);
        if (!parsed.success) throw validationError(parsed.error);
        params = parsed.data;
      }

      let query: unknown = undefined;
      if (req?.query) {
        const parsed = req.query.safeParse(coerceQuery(req.query, new URL(request.url).searchParams));
        if (!parsed.success) throw validationError(parsed.error);
        query = parsed.data;
      }

      let body: unknown = undefined;
      if (req?.body) {
        const parsed = req.body.safeParse(await readJsonBody(request));
        if (!parsed.success) throw validationError(parsed.error);
        body = parsed.data;
      }

      const result = await handler({
        request,
        params: params as ParamsOf<Op>,
        query: query as QueryOf<Op>,
        body: body as BodyOf<Op>,
        user: user as AuthedUser<Op>,
        sessionId: session?.sessionId ?? null,
        requestId,
        ip,
        setCookie: (c) => cookies.push(c),
      });

      if (result instanceof Response) {
        result.headers.set("X-Request-Id", requestId);
        for (const c of cookies) result.headers.append("Set-Cookie", c);
        return result;
      }

      if (process.env.NODE_ENV !== "production" && endpoint.response.schema) {
        const check = endpoint.response.schema.safeParse(result);
        if (!check.success) {
          const msg = `[api-contract] ${operationId} returned a response that violates src/contracts`;
          if (process.env.NODE_ENV === "test") throw new Error(`${msg}: ${JSON.stringify(check.error.issues)}`);
          console.error(msg, check.error.issues);
        }
      }

      const headers = new Headers({ "Content-Type": "application/json", "X-Request-Id": requestId });
      // Per-user or mutating responses must never be cached by shared caches.
      headers.set("Cache-Control", endpoint.auth === "PUBLIC" && endpoint.method === "GET" ? "public, max-age=0, s-maxage=60" : "private, no-store");
      for (const c of cookies) headers.append("Set-Cookie", c);
      return new Response(JSON.stringify(result), { status: endpoint.response.status, headers });
    } catch (error) {
      // Let Next.js control-flow errors through (e.g. the "needs request-time
      // rendering" bail-out thrown while prerendering at build time).
      unstable_rethrow(error);
      const res = errorResponse(error, requestId, operationId);
      for (const c of cookies) res.headers.append("Set-Cookie", c);
      return res;
    }
  };
}

/**
 * Placeholder for a contract endpoint that shares a path with an implemented one
 * but is not implemented yet (e.g. POST /expeditions next to GET /expeditions).
 * Returns the JSON error envelope instead of an empty 405. Replace it with
 * defineRoute() — and set the registry status to IMPLEMENTED — when you build it.
 */
export function plannedRoute(operationId: OperationId) {
  const endpoint = getEndpointDefinition(operationId);
  return async function plannedHandler(): Promise<Response> {
    const requestId = `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    return errorResponse(
      new HttpError(404, `${endpoint.method} /api/v1${endpoint.path} is ${endpoint.status} and not served by the backend yet. Use the mock API (NEXT_PUBLIC_USE_MOCK_API=true).`),
      requestId,
      operationId,
    );
  };
}
