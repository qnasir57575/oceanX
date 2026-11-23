/**
 * Contract-test helpers: invoke the REAL Next.js route handlers in-process with
 * real Request objects and assert the responses against src/contracts.
 */
import { expect } from "vitest";
import { getEndpointDefinition, buildPath, type OperationId } from "@/contracts/registry";
import { serializeQuery } from "@/contracts/query";
import { ErrorResponseSchema, ERROR_STATUS_CODES, type ErrorStatus } from "@/contracts/primitives";
import { prisma } from "@/server/db";
import { resetRateLimits } from "@/server/http/rate-limit";
import { seedDemoData } from "../../prisma/seed-lib";

export const ORIGIN = "http://localhost:3000";
export const DEMO_PASSWORD = "demo-password-123";

/** `/expeditions/{id}` → `src/app/api/v1/expeditions/[id]/route.ts` module specifier. */
export function routeModulePath(apiPath: string): string {
  const segments = apiPath.split("/").filter(Boolean).map((s) => s.replace(/^\{(\w+)\}$/, "[$1]"));
  return `@/app/api/v1/${segments.join("/")}/route`;
}

type RouteFn = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export interface CallOptions {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  /** Raw query string (for testing invalid input). Overrides `query`. */
  rawQuery?: string;
  body?: unknown;
  /** Raw body text (for malformed JSON tests). */
  rawBody?: string;
  cookie?: string;
  headers?: Record<string, string>;
}

export interface CallResult {
  status: number;
  headers: Headers;
  body: unknown;
}

export async function callRoute(operationId: OperationId, opts: CallOptions = {}): Promise<CallResult> {
  const endpoint = getEndpointDefinition(operationId);
  const mod = (await import(/* @vite-ignore */ routeModulePath(endpoint.path))) as Record<string, RouteFn | undefined>;
  const handler = mod[endpoint.method];
  if (!handler) throw new Error(`Route module for ${operationId} does not export ${endpoint.method}`);

  const params = opts.params ?? {};
  const qs = opts.rawQuery !== undefined ? opts.rawQuery : serializeQuery(opts.query);
  const url = `${ORIGIN}/api/v1${buildPath(endpoint.path, params)}${qs}`;
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (opts.cookie) headers.cookie = opts.cookie;
  let body: string | undefined;
  if (opts.rawBody !== undefined) body = opts.rawBody;
  else if (opts.body !== undefined) body = JSON.stringify(opts.body);
  if (body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await handler(new Request(url, { method: endpoint.method, headers, body }), { params: Promise.resolve(params) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

/**
 * Assert a success response: status from the contract, body matches the schema
 * EXACTLY (parsing must not strip or add anything — no undocumented fields).
 */
export function expectContract(operationId: OperationId, res: CallResult) {
  const endpoint = getEndpointDefinition(operationId);
  if (res.status !== endpoint.response.status) {
    throw new Error(`${operationId}: expected status ${endpoint.response.status}, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  expect(res.headers.get("x-request-id")).toMatch(/^req_/);
  const schema = endpoint.response.schema!;
  const parsed = schema.safeParse(res.body);
  if (!parsed.success) throw new Error(`${operationId}: response violates contract: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  expect(parsed.data, `${operationId}: response has fields not in the contract`).toEqual(res.body);
  return res.body as never;
}

/** Assert an error response with the standard envelope; the status must be documented for the endpoint. */
export function expectError(operationId: OperationId, res: CallResult, status: ErrorStatus) {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  const endpoint = getEndpointDefinition(operationId);
  expect(Object.keys(endpoint.errors), `${operationId} returned ${status}, which is not documented in its contract`).toContain(String(status));
  const parsed = ErrorResponseSchema.parse(res.body);
  expect(parsed.error.code).toBe(ERROR_STATUS_CODES[status]);
  expect(parsed.error.requestId).toBe(res.headers.get("x-request-id"));
  return parsed.error;
}

export async function seed() {
  resetRateLimits();
  await seedDemoData(prisma);
}

/** Log in as a demo user and return the Cookie header value. */
export async function loginAs(role: "admin" | "editor" | "researcher" | "member"): Promise<string> {
  const res = await callRoute("login", { body: { email: `${role}@demo.oceanx.local`, password: DEMO_PASSWORD } });
  if (res.status !== 200) throw new Error(`login as ${role} failed: ${JSON.stringify(res.body)}`);
  return cookieFrom(res);
}

export function cookieFrom(res: CallResult): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No Set-Cookie header");
  return setCookie.split(";")[0]!;
}
