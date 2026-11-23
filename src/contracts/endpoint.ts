import { z } from "zod";
import type { ErrorStatus } from "./primitives";
import { IdOrSlugSchema, IdSchema } from "./primitives";
import type { UserRole } from "./schemas/roles";

export type EndpointStatus = "IMPLEMENTED" | "IN_PROGRESS" | "PLANNED" | "DEPRECATED";
export type AuthRequirement = "PUBLIC" | "OPTIONAL" | "REQUIRED";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const API_TAGS = [
  "System",
  "Auth",
  "Users",
  "Home",
  "Expeditions",
  "Publications",
  "Datasets",
  "Media",
  "Activities",
  "Search",
  "Files",
  "Submissions",
  "AI",
  "Outreach",
  "Taxonomy",
  "Admin",
] as const;
export type ApiTag = (typeof API_TAGS)[number];

/** Files in src/lib/api/ that expose typed client functions. */
export const CLIENT_MODULES = [
  "system",
  "auth",
  "admin",
  "home",
  "expeditions",
  "publications",
  "datasets",
  "media",
  "activities",
  "search",
  "files",
  "submissions",
  "ai",
  "outreach",
  "taxonomy",
] as const;
export type ClientModule = (typeof CLIENT_MODULES)[number];

export interface EndpointDefinition {
  /** Stable identifier; also the key in the registry and the OpenAPI operationId. */
  operationId: string;
  method: HttpMethod;
  /** Path relative to /api/v1, OpenAPI style: `/expeditions/{id}`. */
  path: `/${string}`;
  tag: ApiTag;
  summary: string;
  /** Purpose and behaviour. Markdown allowed. */
  description: string;
  status: EndpointStatus;
  auth: AuthRequirement;
  /** Allowed roles when auth is REQUIRED. Omitted = any logged-in user. */
  roles?: readonly UserRole[];
  rateLimit?: { limit: number; windowSeconds: number; scope: "ip" | "user" };
  request?: {
    params?: z.ZodObject;
    query?: z.ZodObject;
    body?: z.ZodType;
    /** Defaults to application/json when body is set. */
    bodyContentType?: "application/json" | "application/octet-stream";
  };
  response: {
    status: 200 | 201 | 202 | 302;
    description: string;
    /** JSON body schema (always the full envelope). Omit for redirects / binary. */
    schema?: z.ZodType;
    /** Defaults to application/json. */
    contentType?: string;
    /** Documented response headers, e.g. Set-Cookie. */
    headers?: Readonly<Record<string, string>>;
  };
  /** Error statuses this endpoint can return, with the reason. 500 is always possible. */
  errors: Readonly<Partial<Record<ErrorStatus, string>>>;
  frontend: {
    /** Pages / components that call this endpoint. */
    pages: readonly string[];
    /** Who builds the UI that calls it. */
    owner: "public-frontend" | "backend-admin";
    /** When the UI should call it. */
    when: string;
    /** Caching guidance. */
    caching: string;
    /** Loading, pagination, filtering, upload notes. */
    notes?: readonly string[];
  };
  /** Typed client function in src/lib/api/<module>.ts. */
  client: { module: ClientModule; fn: string };
  /** Example request used for docs and mock-generated response examples. */
  example?: {
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
  };
  deprecated?: { since: string; replacement?: string; removal?: string };
}

/** Identity helper that keeps literal types (for typed handlers and clients). */
export function defineEndpoint<const E extends EndpointDefinition>(endpoint: E): E {
  return endpoint;
}

// ─── Shared building blocks ─────────────────────────────────────────────────

export const IdParams = z.object({ id: IdSchema.meta({ description: "Record ID." }) });
export const IdOrSlugParams = z.object({ id: IdOrSlugSchema.meta({ description: "Record ID or slug." }) });

export const E = {
  badJson: "Malformed JSON body or wrong Content-Type.",
  unauthenticated: "Not logged in, or the session expired.",
  forbiddenRole: "Logged in, but your role is not allowed to do this (or the request came from a disallowed Origin).",
  invalidQuery: "A query parameter is missing, malformed or out of range.",
  invalidBody: "The request body failed validation (see `error.details.fieldErrors`).",
  rateLimited: "Too many requests. Wait `Retry-After` seconds.",
  server: "Unexpected server error. Retry later; report the `requestId` if it persists.",
} as const;

/** Error reasons common to public list endpoints. */
export const publicListErrors = {
  403: "`status` filter used without an EDITOR/ADMIN session.",
  422: E.invalidQuery,
  500: E.server,
} as const;

export const writeErrors = {
  400: E.badJson,
  401: E.unauthenticated,
  403: E.forbiddenRole,
  422: E.invalidBody,
  500: E.server,
} as const;

/** Frontend page names used in the docs. Keep in sync with docs/FRONTEND_HANDOFF.md. */
export const PAGES = {
  home: "Home (`/`)",
  about: "About & Statistics (`/about`)",
  header: "Global header (search box, user menu)",
  expeditions: "Expedition Explorer (`/expeditions`)",
  expeditionDetail: "Expedition Detail (`/expeditions/[slug]`)",
  research: "Research Publications (`/research`)",
  publicationDetail: "Publication Detail (`/research/[slug]`)",
  datasets: "Data Repository (`/datasets`)",
  datasetDetail: "Dataset Detail (`/datasets/[slug]`)",
  gallery: "Media Gallery (`/gallery`)",
  mediaDetail: "Media Detail (`/gallery/[slug]`)",
  news: "News & Events (`/news`)",
  newsDetail: "News / Event Detail (`/news/[slug]`)",
  search: "Search Results (`/search`)",
  topics: "Research Topics (`/topics`, `/topics/[slug]`)",
  learn: "Learn / Outreach (`/learn`)",
  learnDetail: "Outreach Detail (`/learn/[slug]`)",
  login: "Login (`/login`)",
  register: "Register (`/register`)",
  account: "My Account (`/account`)",
  forgotPassword: "Forgot / Reset Password (`/forgot-password`, `/reset-password`)",
  adminDashboard: "Admin Dashboard (`/admin`)",
  adminUsers: "Admin › Users (`/admin/users`)",
  adminContent: "Admin › Content editors (`/admin/<type>/new`, `/admin/<type>/[id]`)",
  adminReview: "Admin › Review queue (`/admin/submissions`)",
  adminAI: "Admin › AI Studio (`/admin/ai`)",
  adminTaxonomy: "Admin › Categories & Keywords (`/admin/taxonomy`)",
  adminAudit: "Admin › Audit log (`/admin/audit`)",
  contributor: "Contributor workspace (`/dashboard`)",
  system: "Monitoring / deployment checks",
} as const;
