/**
 * Shared primitives for the OceanX API contract.
 *
 * Everything in src/contracts is the SINGLE SOURCE OF TRUTH for the API:
 *  - the backend validates requests/responses with these schemas,
 *  - src/types/api.ts derives TypeScript types from them,
 *  - the mock API validates inputs with them,
 *  - docs/openapi.yaml and docs/API_DOCUMENTATION.md are generated from them.
 *
 * Changing anything here is a CONTRACT CHANGE. See CLAUDE.md → "API contract rules".
 */
import { z } from "zod";

// ─── Scalars ────────────────────────────────────────────────────────────────

export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .meta({ description: "Opaque record identifier. Do not parse or construct IDs on the client." });

export const SlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase letters, numbers and hyphens")
  .meta({ description: "URL-safe unique slug, e.g. `antarctic-coastal-survey-2025`." });

/** ID or slug — detail endpoints accept either. */
export const IdOrSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .meta({ description: "Record ID or slug." });

export const DateTimeSchema = z.iso
  .datetime()
  .meta({ description: "ISO 8601 UTC timestamp, e.g. `2025-11-02T09:30:00.000Z`." });

export const DateSchema = z.iso
  .date()
  .meta({ description: "Calendar date `YYYY-MM-DD`." });

export const LanguageSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Must be a BCP 47 language tag such as `en` or `hi`")
  .meta({ description: "BCP 47 language tag, e.g. `en`, `hi`." });

export const UrlSchema = z.url().max(2048);

/** URL or app-relative path (e.g. `/demo/expedition-1.svg`, `/api/v1/files/f_1/download`). */
export const UrlOrPathSchema = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^(https?:\/\/|\/)/, "Must be an absolute http(s) URL or a path starting with /")
  .meta({ description: "Absolute http(s) URL or a path relative to the site origin." });

// ─── Domain enums ───────────────────────────────────────────────────────────

export const PolarRegionSchema = z
  .enum(["ANTARCTICA", "ARCTIC", "HIMALAYA", "SOUTHERN_OCEAN"])
  .meta({ id: "PolarRegion", description: "Polar / cryosphere region." });

export const UserRoleSchema = z
  .enum(["ADMIN", "EDITOR", "RESEARCHER", "MEMBER"])
  .meta({
    id: "UserRole",
    description:
      "ADMIN: full access incl. users. EDITOR: manage & approve content, AI tools. " +
      "RESEARCHER: submit content for review. MEMBER: registered public user (e.g. REGISTERED dataset downloads).",
  });

export const ContentStatusSchema = z
  .enum(["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"])
  .meta({
    id: "ContentStatus",
    description: "Editorial workflow status. Public endpoints only ever return PUBLISHED records.",
  });

export const AccessLevelSchema = z
  .enum(["OPEN", "REGISTERED", "RESTRICTED"])
  .meta({
    id: "AccessLevel",
    description:
      "OPEN: anyone may download. REGISTERED: any logged-in user. RESTRICTED: staff/owner only (contact data custodian).",
  });

export const ContentTypeSchema = z
  .enum(["EXPEDITION", "PUBLICATION", "DATASET", "MEDIA", "ACTIVITY"])
  .meta({ id: "ContentType", description: "Kinds of editorial content that go through the review workflow." });

// ─── Pagination ─────────────────────────────────────────────────────────────

export const PAGINATION_DEFAULT_LIMIT = 12;
export const PAGINATION_MAX_LIMIT = 100;

export const PageQuerySchema = z
  .number()
  .int()
  .min(1)
  .default(1)
  .meta({ description: "1-based page number." });

export const limitQuery = (defaultLimit = PAGINATION_DEFAULT_LIMIT, max = PAGINATION_MAX_LIMIT) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .default(defaultLimit)
    .meta({ description: `Items per page (1–${max}).` });

export const PaginationSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0).meta({ description: "Total matching records across all pages." }),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  })
  .meta({ id: "Pagination" });

/** Free-text search parameter shared by list endpoints. */
export const SearchTextQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .meta({ description: "Case-insensitive text search over title and summary fields." });

// ─── Response envelopes ─────────────────────────────────────────────────────

export function successResponse<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data });
}

export function paginatedResponse<T extends z.ZodType>(item: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(item),
    pagination: PaginationSchema,
  });
}

export const DeletedSchema = z
  .object({ id: IdSchema, deleted: z.literal(true) })
  .meta({ id: "Deleted" });

// ─── Errors ─────────────────────────────────────────────────────────────────

export const ErrorCodeSchema = z
  .enum([
    "BAD_REQUEST",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "PAYLOAD_TOO_LARGE",
    "VALIDATION_ERROR",
    "RATE_LIMITED",
    "INTERNAL_ERROR",
    "SERVICE_UNAVAILABLE",
  ])
  .meta({ id: "ErrorCode" });

/** HTTP status → machine-readable error code. One code per status. */
export const ERROR_STATUS_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  503: "SERVICE_UNAVAILABLE",
} as const satisfies Record<number, z.infer<typeof ErrorCodeSchema>>;

export type ErrorStatus = keyof typeof ERROR_STATUS_CODES;

export const ApiErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    message: z.string().meta({ description: "Human-readable message. Safe to show to users." }),
    details: z
      .object({
        fieldErrors: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .meta({ description: "422 only. Field path → messages, e.g. `{ \"limit\": [\"Too big\"] }`." }),
        formErrors: z.array(z.string()).optional().meta({ description: "422 only. Errors not tied to a field." }),
        retryAfterSeconds: z.number().int().optional().meta({ description: "429 only. Also sent as `Retry-After`." }),
        maxSizeBytes: z.number().int().optional().meta({ description: "413 only." }),
        reason: z.string().optional().meta({ description: "Optional machine-readable sub-reason, e.g. `EMAIL_TAKEN`." }),
      })
      .optional(),
    requestId: z.string().meta({ description: "Correlation ID. Include it when reporting a problem." }),
  })
  .meta({ id: "ApiError" });

export const ErrorResponseSchema = z
  .object({ success: z.literal(false), error: ApiErrorSchema })
  .meta({ id: "ErrorResponse" });
