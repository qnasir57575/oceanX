/**
 * The mock API must honour the same contract as the backend:
 * every endpoint's example request succeeds and matches its response schema,
 * and pagination, filtering, empty/error scenarios and auth behave like the API.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPath, endpointList, getEndpointDefinition, type OperationId } from "@/contracts/registry";
import { serializeQuery } from "@/contracts/query";
import { ApiRequestError } from "@/lib/api-client";
import { mockTransport } from "@/mocks/transport";
import { resetMockStore, setMockClock, setMockScenario, setMockSessionUser } from "@/mocks/store";

const call = (operationId: OperationId, opts: { params?: Record<string, string>; query?: Record<string, unknown>; body?: unknown } = {}) => {
  const e = getEndpointDefinition(operationId);
  return mockTransport({ operationId, method: e.method, path: buildPath(e.path, opts.params), queryString: serializeQuery(opts.query), body: opts.body, noDelay: true });
};

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiRequestError);
  expect((err as ApiRequestError).status).toBe(status);
  expect((err as ApiRequestError).code).toBe(code);
  return err as ApiRequestError;
}

beforeEach(() => {
  resetMockStore();
  setMockClock(new Date("2026-01-15T12:00:00.000Z"));
});
afterEach(() => setMockScenario(null));

describe("every endpoint has a working, contract-conformant mock", () => {
  const withSchema = endpointList.filter((e) => e.response.schema && e.operationId !== "putUploadContent" && e.operationId !== "completeUpload");
  it.each(withSchema.map((e) => [e.operationId, e] as const))("%s", async (_op, e) => {
    const asMember = ["getSession", "changePassword", "updateMyProfile", "logout"].includes(e.operationId);
    setMockSessionUser(asMember ? "member" : e.operationId === "withdrawSubmission" ? "researcher" : e.auth === "REQUIRED" ? (e.roles && !e.roles.includes("ADMIN") ? e.roles[0]!.toLowerCase() : "admin") : null);
    const res = await mockTransport({
      operationId: e.operationId as OperationId,
      method: e.method,
      path: buildPath(e.path, e.example?.params),
      queryString: serializeQuery(e.example?.query),
      body: e.example?.body,
      noDelay: true,
    });
    const parsed = e.response.schema!.parse(res);
    expect(parsed).toEqual(res); // no undocumented fields
  });
});

describe("pagination & filtering", () => {
  it("paginates consistently", async () => {
    const p1 = (await call("listMediaAssets", { query: { limit: 5, page: 1 } })) as { data: { id: string }[]; pagination: { total: number; hasNextPage: boolean } };
    const p2 = (await call("listMediaAssets", { query: { limit: 5, page: 2 } })) as { data: { id: string }[] };
    expect(p1.data).toHaveLength(5);
    expect(p1.pagination.hasNextPage).toBe(true);
    expect(p2.data.map((m) => m.id)).not.toEqual(expect.arrayContaining(p1.data.map((m) => m.id)));
  });

  it("filters by region and hides drafts", async () => {
    const res = (await call("listExpeditions", { query: { region: "ARCTIC" } })) as { data: { region: string; id: string }[] };
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((e) => e.region === "ARCTIC")).toBe(true);
    expect(res.data.map((e) => e.id)).not.toContain("exp_demo_09");
  });

  it("validates query parameters like the API (422)", async () => {
    const err = await expectApiError(call("listExpeditions", { query: { limit: 500 } }), 422, "VALIDATION_ERROR");
    expect(err.fieldErrors.limit).toBeDefined();
  });

  it("404 for unknown detail records", async () => {
    await expectApiError(call("getDataset", { params: { id: "nope" } }), 404, "NOT_FOUND");
  });
});

describe("scenarios", () => {
  it("empty → lists are empty, details 404", async () => {
    setMockScenario("empty");
    const res = (await call("listPublications")) as { data: unknown[]; pagination: { total: number } };
    expect(res.data).toEqual([]);
    expect(res.pagination.total).toBe(0);
    await expectApiError(call("getPublication", { params: { id: "pub_demo_01" } }), 404, "NOT_FOUND");
  });

  it("error → 500 INTERNAL_ERROR", async () => {
    setMockScenario("error");
    await expectApiError(call("getHomePageData"), 500, "INTERNAL_ERROR");
  });

  it("unauthenticated → protected endpoints 401", async () => {
    setMockSessionUser("admin");
    setMockScenario("unauthenticated");
    await expectApiError(call("getAdminDashboard"), 401, "UNAUTHENTICATED");
  });
});

describe("auth & workflow", () => {
  it("login/logout drives the mock session", async () => {
    await expectApiError(call("login", { body: { email: "member@demo.oceanx.local", password: "wrong-password" } }), 401, "UNAUTHENTICATED");
    await call("login", { body: { email: "member@demo.oceanx.local", password: "demo-password-123" } });
    const s = (await call("getSession")) as { data: { user: { role: string } | null } };
    expect(s.data.user?.role).toBe("MEMBER");
    await call("logout");
    const after = (await call("getSession")) as { data: { user: unknown } };
    expect(after.data.user).toBeNull();
  });

  it("enforces roles (403)", async () => {
    setMockSessionUser("member");
    await expectApiError(call("createExpedition", { body: getEndpointDefinition("createExpedition").example!.body }), 403, "FORBIDDEN");
  });

  it("submission → approval publishes the record", async () => {
    setMockSessionUser("researcher");
    await expectApiError(call("getExpedition", { params: { id: "nonexistent" } }), 404, "NOT_FOUND");
    const sub = (await call("createSubmission", { body: { contentType: "EXPEDITION", contentId: "exp_demo_09" } })) as { data: { id: string } };
    setMockSessionUser("editor");
    await call("reviewSubmission", { params: { id: sub.data.id }, body: { decision: "APPROVE" } });
    setMockSessionUser(null);
    const exp = (await call("getExpedition", { params: { id: "exp_demo_09" } })) as { data: { status: string } };
    expect(exp.data.status).toBe("PUBLISHED");
  });

  it("upload flow: ticket → content → complete", async () => {
    setMockSessionUser("researcher");
    const ticket = (await call("createUpload", { body: { fileName: "a.png", contentType: "image/png", sizeBytes: 100, purpose: "COVER_IMAGE" } })) as { data: { fileId: string; uploadUrl: string } };
    await expectApiError(call("completeUpload", { params: { id: ticket.data.fileId } }), 409, "CONFLICT");
    await call("putUploadContent", { params: { id: ticket.data.fileId } });
    const file = (await call("completeUpload", { params: { id: ticket.data.fileId } })) as { data: { status: string } };
    expect(file.data.status).toBe("READY");
    await expectApiError(
      call("createUpload", { body: { fileName: "huge.png", contentType: "image/png", sizeBytes: 999_000_000, purpose: "COVER_IMAGE" } }),
      413,
      "PAYLOAD_TOO_LARGE",
    );
  });
});
