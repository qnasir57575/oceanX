/**
 * Typed HTTP client for the OceanX API.
 *
 * Frontend code should normally use the domain functions in src/lib/api/*
 * (e.g. `getExpeditions`) rather than calling `apiRequest` directly.
 *
 * - Base URL: NEXT_PUBLIC_API_BASE_URL (default "/api/v1", same origin).
 * - Auth: httpOnly session cookie, sent automatically (`credentials: "include"`).
 *   No tokens are read, stored or sent by JavaScript.
 * - Errors: every failure throws `ApiRequestError` with a stable `code`.
 * - Mock mode: NEXT_PUBLIC_USE_MOCK_API=true (development only) routes every
 *   request to src/mocks without changing any calling code.
 */
import type { ApiError, ErrorCode, ErrorResponse } from "@/types/api";
import type { BodyInputOf, OperationId, QueryInputOf, ResponseOf } from "@/contracts/registry";
import { serializeQuery } from "@/contracts/query";
import { ROUTES } from "@/lib/api/routes.generated";

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * True only in development/test with NEXT_PUBLIC_USE_MOCK_API=true.
 * Both values are inlined at build time, so in production this is the constant
 * `false` and the mock code path is unreachable (next.config.ts also refuses to
 * build with the flag set).
 */
export const MOCK_API_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const VALIDATE_RESPONSES =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_VALIDATE_API_RESPONSES !== "false";

/** Resolved API base URL, without trailing slash. */
export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/+$/, "");
  if (/^https?:\/\//.test(configured)) return configured;
  if (typeof window !== "undefined") return configured; // relative URL is fine in the browser
  // Server side (Server Components, route handlers): fetch needs an absolute URL.
  return serverOrigin().replace(/\/+$/, "") + configured;
}

/**
 * Origin the server uses to call its own API:
 *   1. API_INTERNAL_ORIGIN, if set
 *   2. on Vercel production: the stable production domain
 *   3. on Vercel previews: this deployment's URL
 *   4. local: http://localhost:<PORT>
 */
function serverOrigin(): string {
  if (process.env.API_INTERNAL_ORIGIN) return process.env.API_INTERNAL_ORIGIN;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Server-to-self requests on protected Vercel preview deployments need the
 * "Protection Bypass for Automation" secret. Only sent when calling our own
 * deployment (relative API base URL), never to an external API host.
 */
function serverOnlyHeaders(): Record<string, string> {
  if (typeof window !== "undefined") return {};
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
  if (!secret || /^https?:\/\//.test(configured)) return {};
  return { "x-vercel-protection-bypass": secret };
}

// ─── Errors ─────────────────────────────────────────────────────────────────

/** Client-side failure codes in addition to the API's ErrorCode values. */
export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "TIMEOUT" | "ABORTED" | "INVALID_RESPONSE";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly details: ApiError["details"];
  readonly requestId: string | null;
  readonly operationId: string;

  constructor(init: {
    status: number;
    code: ClientErrorCode;
    message: string;
    operationId: string;
    details?: ApiError["details"];
    requestId?: string | null;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = "ApiRequestError";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId ?? null;
    this.operationId = init.operationId;
  }

  /** 401 — prompt the user to log in. */
  get isUnauthenticated() {
    return this.code === "UNAUTHENTICATED";
  }
  /** 403 — logged in but not allowed. */
  get isForbidden() {
    return this.code === "FORBIDDEN";
  }
  /** 404 — render a not-found state. */
  get isNotFound() {
    return this.code === "NOT_FOUND";
  }
  /** 422 — show `fieldErrors` next to form inputs. */
  get isValidationError() {
    return this.code === "VALIDATION_ERROR";
  }
  /** The request was cancelled via AbortSignal — usually ignore silently. */
  get isAborted() {
    return this.code === "ABORTED";
  }
  /** Field path → messages, for 422 responses. */
  get fieldErrors(): Record<string, string[]> {
    return this.details?.fieldErrors ?? {};
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

// ─── Request API ────────────────────────────────────────────────────────────

export interface RequestOptions {
  /** Cancel the request (e.g. on unmount, or when a newer search starts). */
  signal?: AbortSignal;
  /** Extra headers, e.g. `{ cookie }` forwarded from a Server Component. */
  headers?: Record<string, string>;
  /** Fetch cache mode (e.g. "no-store" for per-user data). */
  cache?: RequestCache;
  /** Defaults to 20 s. AI generation functions use a longer default. */
  timeoutMs?: number;
}

export interface RequestArgs<Op extends OperationId> {
  params?: Record<string, string>;
  query?: QueryInputOf<Op>;
  body?: BodyInputOf<Op>;
}

function buildPath(template: string, params: Record<string, string> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === "") throw new Error(`Missing path parameter "${name}" for ${template}`);
    return encodeURIComponent(value);
  });
}

/** URL for an operation, e.g. for links: apiUrl("downloadFile", { id }). */
export function apiUrl(operationId: OperationId, params?: Record<string, string>, query?: Record<string, unknown>): string {
  const route = ROUTES[operationId];
  return getApiBaseUrl() + buildPath(route.path, params) + serializeQuery(query);
}

/**
 * Perform a typed request for any operation in the contract registry.
 * Resolves with the full success envelope (`{ success: true, data, ... }`);
 * throws `ApiRequestError` otherwise.
 */
export async function apiRequest<Op extends OperationId>(
  operationId: Op,
  args: RequestArgs<Op> = {},
  options: RequestOptions = {},
): Promise<ResponseOf<Op>> {
  const route = ROUTES[operationId];
  const path = buildPath(route.path, args.params);
  const queryString = serializeQuery(args.query as Record<string, unknown> | undefined);

  if (MOCK_API_ENABLED) {
    const { mockTransport } = await import("@/mocks/transport");
    return (await mockTransport({
      operationId,
      method: route.method,
      path,
      queryString,
      body: args.body,
      signal: options.signal,
    })) as ResponseOf<Op>;
  }

  const headers: Record<string, string> = { Accept: "application/json", ...serverOnlyHeaders(), ...options.headers };
  let body: BodyInit | undefined;
  if (args.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(args.body);
  }

  const response = await fetchWithTimeout(operationId, getApiBaseUrl() + path + queryString, {
    method: route.method,
    headers,
    body,
    credentials: "include",
    cache: options.cache,
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const json = await readJson(operationId, response);
  if (!response.ok) throw toApiRequestError(operationId, response, json);

  if (VALIDATE_RESPONSES) void warnOnContractMismatch(operationId, json);
  return json as ResponseOf<Op>;
}

// ─── Internals ──────────────────────────────────────────────────────────────

interface FetchInit extends RequestInit {
  timeoutMs: number;
}

export async function fetchWithTimeout(operationId: string, url: string, init: FetchInit): Promise<Response> {
  const { timeoutMs, signal: callerSignal, ...rest } = init;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }
  try {
    return await fetch(url, { ...rest, signal: controller.signal } as RequestInit);
  } catch (cause) {
    if (timedOut) {
      throw new ApiRequestError({ status: 0, code: "TIMEOUT", message: "The request timed out.", operationId, cause });
    }
    if (controller.signal.aborted) {
      throw new ApiRequestError({ status: 0, code: "ABORTED", message: "The request was cancelled.", operationId, cause });
    }
    throw new ApiRequestError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection.",
      operationId,
      cause,
    });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}

async function readJson(operationId: string, response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ApiRequestError({
      status: response.status,
      code: response.ok ? "INVALID_RESPONSE" : statusToCode(response.status),
      message: response.ok ? "The server returned an invalid response." : `Request failed with status ${response.status}.`,
      operationId,
      requestId: response.headers.get("x-request-id"),
      cause,
    });
  }
}

function statusToCode(status: number): ClientErrorCode {
  const map: Record<number, ErrorCode> = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    503: "SERVICE_UNAVAILABLE",
  };
  return map[status] ?? "INTERNAL_ERROR";
}

export function toApiRequestError(operationId: string, response: Response, json: unknown): ApiRequestError {
  const err = (json as Partial<ErrorResponse> | null)?.error;
  return new ApiRequestError({
    status: response.status,
    code: err?.code ?? statusToCode(response.status),
    message: err?.message ?? `Request failed with status ${response.status}.`,
    details: err?.details,
    requestId: err?.requestId ?? response.headers.get("x-request-id"),
    operationId,
  });
}

/** Development aid: compare a live response with the contract and warn on drift. */
async function warnOnContractMismatch(operationId: OperationId, json: unknown) {
  try {
    const { getEndpointDefinition } = await import("@/contracts/registry");
    const schema = getEndpointDefinition(operationId).response.schema;
    if (!schema) return;
    const result = schema.safeParse(json);
    if (!result.success) {
      console.warn(
        `[api-contract] Response for "${operationId}" does not match src/contracts. ` +
          "Report it using the template in docs/FRONTEND_HANDOFF.md §14.",
        result.error.issues,
      );
    }
  } catch {
    /* never break the app because of the dev check */
  }
}
