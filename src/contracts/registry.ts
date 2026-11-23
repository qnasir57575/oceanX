/**
 * The API endpoint registry — every endpoint of /api/v1, implemented or not.
 *
 * Consumers:
 *  - src/server/http/route.ts      (backend: validation, auth, response checks)
 *  - src/mocks/transport.ts        (mock API: routing + validation)
 *  - scripts/generate-api-docs.ts  (docs/openapi.yaml + docs/API_DOCUMENTATION.md)
 *  - tests/unit/contract-drift.test.ts (registry ↔ routes ↔ client ↔ docs)
 */
import type { z } from "zod";
import type { EndpointDefinition, HttpMethod } from "./endpoint";
import { adminEndpoints, authEndpoints, systemEndpoints, userEndpoints } from "./endpoints/auth";
import {
  activityEndpoints,
  datasetEndpoints,
  expeditionEndpoints,
  mediaEndpoints,
  publicationEndpoints,
} from "./endpoints/content";
import { homeEndpoints, searchEndpoints, taxonomyEndpoints } from "./endpoints/discovery";
import { aiEndpoints, fileEndpoints, outreachEndpoints, submissionEndpoints } from "./endpoints/workflow";

export const API_VERSION = "1.0.0";
export const API_BASE_PATH = "/api/v1";

export const endpoints = {
  ...systemEndpoints,
  ...authEndpoints,
  ...userEndpoints,
  ...homeEndpoints,
  ...expeditionEndpoints,
  ...publicationEndpoints,
  ...datasetEndpoints,
  ...mediaEndpoints,
  ...activityEndpoints,
  ...searchEndpoints,
  ...taxonomyEndpoints,
  ...outreachEndpoints,
  ...fileEndpoints,
  ...submissionEndpoints,
  ...aiEndpoints,
  ...adminEndpoints,
} as const;

export type Endpoints = typeof endpoints;
export type OperationId = keyof Endpoints;

export const endpointList: readonly EndpointDefinition[] = Object.values(endpoints);

export function getEndpoint<Op extends OperationId>(operationId: Op): Endpoints[Op] {
  const endpoint = endpoints[operationId];
  if (!endpoint) throw new Error(`Unknown operationId: ${String(operationId)}`);
  return endpoint;
}

/** Same as getEndpoint, widened to EndpointDefinition (for generic runtime code). */
export function getEndpointDefinition(operationId: OperationId): EndpointDefinition {
  return getEndpoint(operationId);
}

// ─── Type helpers ───────────────────────────────────────────────────────────

type Req<Op extends OperationId> = Endpoints[Op] extends { request: infer R } ? R : object;

/** Parsed (server-side) query type. */
export type QueryOf<Op extends OperationId> = Req<Op> extends { query: infer Q extends z.ZodType } ? z.output<Q> : undefined;
/** Query type accepted by client functions (defaults optional). */
export type QueryInputOf<Op extends OperationId> = Req<Op> extends { query: infer Q extends z.ZodType } ? z.input<Q> : undefined;
export type ParamsOf<Op extends OperationId> = Req<Op> extends { params: infer P extends z.ZodType } ? z.output<P> : undefined;
export type BodyOf<Op extends OperationId> = Req<Op> extends { body: infer B extends z.ZodType } ? z.output<B> : undefined;
export type BodyInputOf<Op extends OperationId> = Req<Op> extends { body: infer B extends z.ZodType } ? z.input<B> : undefined;
/** Full JSON response body (envelope) for the success status. */
export type ResponseOf<Op extends OperationId> = Endpoints[Op]["response"] extends { schema: infer S extends z.ZodType }
  ? z.output<S>
  : never;

// ─── Path matching ──────────────────────────────────────────────────────────

interface CompiledRoute {
  endpoint: EndpointDefinition;
  regex: RegExp;
  paramNames: string[];
  staticSegments: number;
}

const compiled: CompiledRoute[] = endpointList
  .map((endpoint) => {
    const paramNames: string[] = [];
    const segments = endpoint.path.split("/").filter(Boolean);
    const pattern = segments
      .map((seg) => {
        const m = /^\{(\w+)\}$/.exec(seg);
        if (m) {
          paramNames.push(m[1]);
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return {
      endpoint,
      regex: new RegExp(`^/${pattern}/?$`),
      paramNames,
      staticSegments: segments.length - paramNames.length,
    };
  })
  // Prefer routes with more static segments: /search/suggest before /search/{x}.
  .sort((a, b) => b.staticSegments - a.staticSegments);

/** Resolve `GET /expeditions/abc` → endpoint + params. Path is relative to /api/v1. */
export function matchEndpoint(
  method: string,
  path: string,
): { endpoint: EndpointDefinition; params: Record<string, string> } | { endpoint: null; methodNotAllowed: boolean } {
  let pathMatched = false;
  for (const route of compiled) {
    const m = route.regex.exec(path);
    if (!m) continue;
    pathMatched = true;
    if (route.endpoint.method !== (method.toUpperCase() as HttpMethod)) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(m[i + 1])));
    return { endpoint: route.endpoint, params };
  }
  return { endpoint: null, methodNotAllowed: pathMatched };
}

/** Build a concrete path from a template: buildPath('/expeditions/{id}', { id: 'x' }). */
export function buildPath(template: string, params: Record<string, string> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === "") throw new Error(`Missing path parameter "${name}" for ${template}`);
    return encodeURIComponent(value);
  });
}
