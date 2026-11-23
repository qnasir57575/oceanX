/**
 * Public-frontend pure helpers: URL query parsing, href building, safe
 * redirects, pagination window and formatters. No DOM or network needed.
 */
import { describe, expect, it } from "vitest";
import { ListExpeditionsQuerySchema } from "@/contracts/schemas/expeditions";
import { ListMediaQuerySchema } from "@/contracts/schemas/media";
import { SearchQuerySchema } from "@/contracts/schemas/search";
import { buildHref, countActiveFilters, getParam, parseQuery, toURLSearchParams } from "@/lib/ui/query";
import { loginHref, safeNextPath } from "@/lib/ui/safe-redirect";
import { pageWindow } from "@/lib/ui/pagination";
import { formatDate, formatDateRange } from "@/lib/format/date";
import { formatBytes, formatCoordinates, formatDuration, formatDurationLong, plural } from "@/lib/format/number";
import { humanize, label, REGION_LABELS } from "@/lib/format/labels";
import { toFormError } from "@/lib/ui/form-errors";
import { ApiRequestError } from "@/lib/api-client";

describe("parseQuery", () => {
  it("coerces and validates URL params with the contract schema", () => {
    const q = parseQuery(ListExpeditionsQuerySchema, { region: "ARCTIC", page: "2", year: "2024", sort: "title" });
    expect(q).toMatchObject({ region: "ARCTIC", page: 2, year: 2024, sort: "title", limit: 12 });
  });

  it("drops invalid values instead of failing", () => {
    const q = parseQuery(ListExpeditionsQuerySchema, { region: "MARS", page: "-3", sort: "bogus", phase: "ONGOING" });
    expect(q.region).toBeUndefined();
    expect(q.page).toBe(1);
    expect(q.sort).toBe("newest");
    expect(q.phase).toBe("ONGOING");
  });

  it("applies overrides over URL values and strips staff-only status", () => {
    const q = parseQuery(ListExpeditionsQuerySchema, { limit: "100", status: "DRAFT" }, { limit: 9 });
    expect(q.limit).toBe(9);
    expect("status" in q && q.status !== undefined).toBe(false);
  });

  it("parses booleans and arrays", () => {
    expect(parseQuery(ListMediaQuerySchema, { featured: "true" }).featured).toBe(true);
    expect(parseQuery(ListMediaQuerySchema, { featured: "yes" }).featured).toBeUndefined();
    const s = parseQuery(SearchQuerySchema, { q: "ice", types: "PUBLICATION,DATASET" });
    expect(s.types).toEqual(["PUBLICATION", "DATASET"]);
  });

  it("treats empty strings as absent and uses the last repeated value", () => {
    const q = parseQuery(ListExpeditionsQuerySchema, { q: "", region: ["ARCTIC", "ANTARCTICA"] });
    expect(q.q).toBeUndefined();
    expect(q.region).toBe("ANTARCTICA");
  });
});

describe("buildHref", () => {
  it("resets page when a filter changes", () => {
    expect(buildHref("/expeditions", { region: "ARCTIC", page: "3" }, { phase: "ONGOING" })).toBe(
      "/expeditions?region=ARCTIC&phase=ONGOING",
    );
  });

  it("keeps filters when changing page and omits page=1", () => {
    expect(buildHref("/expeditions", { region: "ARCTIC" }, { page: 2 })).toBe("/expeditions?region=ARCTIC&page=2");
    expect(buildHref("/expeditions", { region: "ARCTIC", page: "2" }, { page: 1 })).toBe("/expeditions?region=ARCTIC");
  });

  it("removes params set to null/empty", () => {
    expect(buildHref("/news", { type: "EVENT", q: "x" }, { type: null, q: "" })).toBe("/news");
  });

  it("counts active filters and reads params", () => {
    expect(countActiveFilters({ region: "ARCTIC", page: "2", sort: "title", q: "ice" })).toBe(2);
    expect(getParam({ q: ["a", "b"] }, "q")).toBe("b");
    expect(getParam({ q: "" }, "q")).toBeUndefined();
    expect(toURLSearchParams({ a: ["1", "2"], b: undefined }).toString()).toBe("a=1&a=2");
  });
});

describe("safeNextPath", () => {
  it("allows same-site relative paths", () => {
    expect(safeNextPath("/datasets/demo?x=1")).toBe("/datasets/demo?x=1");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, "/login?next=/x"])(
    "rejects %s",
    (value) => {
      expect(safeNextPath(value as string | null)).toBe("/account");
    },
  );
  it("builds login links", () => {
    expect(loginHref("/account")).toBe("/login?next=%2Faccount");
  });
});

describe("pageWindow", () => {
  it("lists all pages when few", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("inserts gaps around the current page", () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, null, 20]);
    expect(pageWindow(20, 20)).toEqual([1, null, 17, 18, 19, 20]);
  });
});

describe("formatters", () => {
  it("formats calendar dates in UTC without day shifts", () => {
    expect(formatDate("2025-01-01", "long", "en-GB", "America/Los_Angeles")).toBe("1 January 2025");
    expect(formatDateRange("2025-01-01", "2025-02-15", "medium", "en-GB")).toBe("1 Jan 2025 – 15 Feb 2025");
    expect(formatDateRange(null, null)).toBeNull();
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("formats sizes, durations, counts and coordinates", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDurationLong(61)).toBe("1 minute 1 second");
    expect(plural(1, "result")).toBe("1 result");
    expect(plural(3, "result")).toBe("3 results");
    expect(formatCoordinates(-75.1, 123.3)).toBe("75.10° S, 123.30° E");
  });

  it("labels enums with a humanised fallback for unknown values", () => {
    expect(label(REGION_LABELS, "SOUTHERN_OCEAN")).toBe("Southern Ocean");
    expect(label(REGION_LABELS, "NEW_REGION")).toBe("New region");
    expect(humanize("PRESS_RELEASE")).toBe("Press release");
  });
});

describe("toFormError", () => {
  const apiError = (code: string, status: number, details?: Record<string, unknown>, message = "Server message") =>
    new ApiRequestError({ status, code: code as never, message, operationId: "login", details: details as never, requestId: "req_test" });

  it("maps 422 field errors and keeps the first message per field", () => {
    const e = toFormError(apiError("VALIDATION_ERROR", 422, { fieldErrors: { email: ["Invalid email", "x"] }, formErrors: [] }));
    expect(e.fieldErrors).toEqual({ email: "Invalid email" });
    expect(e.message).toBe("Please correct the highlighted fields.");
  });

  it("prefers reason-specific, then code-specific overrides", () => {
    const taken = toFormError(apiError("CONFLICT", 409, { reason: "EMAIL_TAKEN" }), { "reason:EMAIL_TAKEN": "Taken", CONFLICT: "Conflict" });
    expect(taken).toMatchObject({ message: "Taken", reason: "EMAIL_TAKEN" });
    expect(toFormError(apiError("UNAUTHENTICATED", 401), { UNAUTHENTICATED: "Wrong password" }).message).toBe("Wrong password");
  });

  it("explains rate limits and server errors with a reference", () => {
    expect(toFormError(apiError("RATE_LIMITED", 429, { retryAfterSeconds: 30 })).message).toContain("30 seconds");
    expect(toFormError(apiError("INTERNAL_ERROR", 500)).message).toContain("req_test");
    expect(toFormError(new Error("boom")).message).toBe("Something went wrong. Please try again.");
  });
});
