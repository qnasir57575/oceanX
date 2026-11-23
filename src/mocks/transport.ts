/**
 * Mock transport: answers apiRequest() calls in-process when
 * NEXT_PUBLIC_USE_MOCK_API=true (development only).
 *
 * It behaves like the real backend because it uses the SAME contract:
 *   - path params, query and body are validated with the registry schemas (422)
 *   - auth/roles from the registry are enforced (401/403)
 *   - responses are validated against the response schema
 *   - errors are thrown as the same ApiRequestError the real client throws
 */
import { z } from "zod";
import { ApiRequestError } from "@/lib/api-client";
import { coerceQuery } from "@/contracts/query";
import { getEndpointDefinition, type OperationId } from "@/contracts/registry";
import { ERROR_STATUS_CODES, type ErrorStatus } from "@/contracts/primitives";
import { mockHandlers } from "./handlers";
import { MockHttpError, type MockContext } from "./handlers/helpers";
import { getMockScenario, getMockSessionUser, getStore, mockNow } from "./store";

export interface MockRequest {
  operationId: OperationId;
  method: string;
  /** Concrete path relative to the API base, e.g. `/expeditions/abc`. */
  path: string;
  /** Serialized query string including `?`, or "". */
  queryString: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip artificial latency (tests, docs generation). */
  noDelay?: boolean;
}

let requestCounter = 0;

function fail(operationId: string, status: ErrorStatus, message: string, details?: Record<string, unknown>): never {
  throw new ApiRequestError({
    status,
    code: ERROR_STATUS_CODES[status],
    message,
    details,
    requestId: `req_mock_${++requestCounter}`,
    operationId,
  });
}

function delayMs(): number {
  if (getMockScenario() === "slow") return 2500;
  const n = Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? 300);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sleep(ms: number, signal?: AbortSignal, operationId = "unknown") {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiRequestError({ status: 0, code: "ABORTED", message: "The request was cancelled.", operationId }));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new ApiRequestError({ status: 0, code: "ABORTED", message: "The request was cancelled.", operationId }));
      },
      { once: true },
    );
  });
}

function validationDetails(error: z.ZodError) {
  const flat = z.flattenError(error);
  return { fieldErrors: flat.fieldErrors as Record<string, string[]>, formErrors: flat.formErrors };
}

/** Extract `{ id: ... }` path params by matching the concrete path against the template. */
function extractParams(template: string, path: string): Record<string, string> {
  const t = template.split("/");
  const p = path.split("?")[0].split("/");
  const params: Record<string, string> = {};
  t.forEach((seg, i) => {
    const m = /^\{(\w+)\}$/.exec(seg);
    if (m && p[i] !== undefined) params[m[1]] = decodeURIComponent(p[i]);
  });
  return params;
}

export async function mockTransport(req: MockRequest): Promise<unknown> {
  const { operationId } = req;
  const endpoint = getEndpointDefinition(operationId);

  if (!req.noDelay) await sleep(delayMs(), req.signal, operationId);
  if (getMockScenario() === "error") fail(operationId, 500, "Simulated server error (NEXT_PUBLIC_MOCK_SCENARIO=error).");

  const request = endpoint.request;

  // Path params
  const rawParams = extractParams(endpoint.path, req.path);
  const params = request?.params ? request.params.safeParse(rawParams) : { success: true as const, data: undefined };
  if (!params.success) fail(operationId, 422, "Invalid path parameter.", validationDetails(params.error));

  // Query
  let query: unknown = undefined;
  if (request?.query) {
    const parsed = request.query.safeParse(coerceQuery(request.query, new URLSearchParams(req.queryString)));
    if (!parsed.success) fail(operationId, 422, "Request validation failed.", validationDetails(parsed.error));
    query = parsed.data;
  }

  // Auth (before body validation, like the real backend)
  const user = getMockSessionUser();
  if (endpoint.auth === "REQUIRED") {
    if (!user) fail(operationId, 401, "You need to log in to do this.");
    if (endpoint.roles && !endpoint.roles.includes(user.role)) fail(operationId, 403, "Your role is not allowed to do this.");
  }

  // Body
  let body: unknown = undefined;
  if (request?.body && request.bodyContentType !== "application/octet-stream") {
    const parsed = request.body.safeParse(req.body);
    if (!parsed.success) fail(operationId, 422, "Request validation failed.", validationDetails(parsed.error));
    body = parsed.data;
  }

  const handler = mockHandlers[operationId] as (ctx: MockContext<OperationId>) => unknown;
  let result: unknown;
  try {
    result = handler({
      params: params.data as never,
      query: query as never,
      body: body as never,
      user,
      store: getStore(),
      now: mockNow(),
    });
  } catch (error) {
    if (error instanceof MockHttpError) fail(operationId, error.status, error.message, error.details);
    throw error;
  }

  const schema = endpoint.response.schema;
  if (schema) {
    const check = schema.safeParse(result);
    if (!check.success) {
      const message = `[mock] Handler for "${operationId}" returned data that violates the contract.`;
      if (process.env.NODE_ENV === "test") throw new Error(`${message}\n${JSON.stringify(check.error.issues, null, 2)}`);
      console.error(message, check.error.issues);
    }
  }
  // Return a copy so UI code can never mutate the mock store by accident.
  return structuredClone(result);
}
