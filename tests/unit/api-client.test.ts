/**
 * The shared client used by the frontend: mock switching, URL/query building,
 * cookie credentials and error mapping.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadClient(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  return {
    api: await import("@/lib/api"),
    client: await import("@/lib/api-client"),
  };
}

describe("mock mode", () => {
  it("routes domain functions to the mock API when NEXT_PUBLIC_USE_MOCK_API=true", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { api } = await loadClient({ NODE_ENV: "development", NEXT_PUBLIC_USE_MOCK_API: "true", NEXT_PUBLIC_MOCK_DELAY_MS: "0" });
    const res = await api.getExpeditions({ region: "ARCTIC", limit: 2 });
    expect(res.success).toBe(true);
    expect(res.data.every((e) => e.region === "ARCTIC")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mock errors are the same ApiRequestError class the real client throws", async () => {
    const { api, client } = await loadClient({ NODE_ENV: "development", NEXT_PUBLIC_USE_MOCK_API: "true", NEXT_PUBLIC_MOCK_DELAY_MS: "0" });
    const err = await api.getExpedition("does-not-exist").catch((e: unknown) => e);
    expect(client.isApiRequestError(err)).toBe(true);
    expect((err as InstanceType<typeof client.ApiRequestError>).isNotFound).toBe(true);
  });

  it("is never enabled in production, even if the flag is set", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })));
    vi.stubGlobal("fetch", fetchSpy);
    const { api, client } = await loadClient({ NODE_ENV: "production", NEXT_PUBLIC_USE_MOCK_API: "true" });
    expect(client.MOCK_API_ENABLED).toBe(false);
    await api.getExpeditions();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe("live mode", () => {
  const env = { NODE_ENV: "test", NEXT_PUBLIC_USE_MOCK_API: "false", NEXT_PUBLIC_API_BASE_URL: "/api/v1", API_INTERNAL_ORIGIN: "http://localhost:3000" };

  it("builds the URL, serializes typed query values and sends cookies", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ success: true, data: [], pagination: { page: 2, limit: 5, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: true }, meta: { query: "ice", tookMs: 1, facets: { types: [], regions: [], years: [] } } })));
    vi.stubGlobal("fetch", fetchSpy);
    const { api } = await loadClient(env);
    await api.search({ q: "sea ice", types: ["DATASET", "PUBLICATION"], page: 2, limit: 5 });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/v1/search?q=sea+ice&types=DATASET%2CPUBLICATION&page=2&limit=5");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("encodes path params and sends JSON bodies", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ success: true, data: {} })));
    vi.stubGlobal("fetch", fetchSpy);
    const { api } = await loadClient(env);
    await api.login({ email: "a@b.co", password: "x" });
    await api.getExpedition("slug with spaces").catch(() => undefined);
    const [loginUrl, loginInit] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(loginUrl).toBe("http://localhost:3000/api/v1/auth/login");
    expect(loginInit.method).toBe("POST");
    expect((loginInit.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(loginInit.body as string)).toEqual({ email: "a@b.co", password: "x" });
    expect((fetchSpy.mock.calls[1] as unknown as [string])[0]).toBe("http://localhost:3000/api/v1/expeditions/slug%20with%20spaces");
  });

  it("maps error envelopes to ApiRequestError with code, fieldErrors and requestId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Request validation failed.", details: { fieldErrors: { limit: ["Too big"] } }, requestId: "req_abc" } }),
          { status: 422, headers: { "x-request-id": "req_abc" } },
        ),
      ),
    );
    const { api, client } = await loadClient(env);
    const err = (await api.getExpeditions({ limit: 1000 }).catch((e: unknown) => e)) as InstanceType<typeof client.ApiRequestError>;
    expect(err).toBeInstanceOf(client.ApiRequestError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.isValidationError).toBe(true);
    expect(err.fieldErrors).toEqual({ limit: ["Too big"] });
    expect(err.requestId).toBe("req_abc");
    expect(err.operationId).toBe("listExpeditions");
  });

  it("network failures, aborts and timeouts get client error codes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const { api } = await loadClient(env);
    await expect(api.getPortalStats()).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });

    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))))));
    const controller = new AbortController();
    const pending = api.getPortalStats({ signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED", isAborted: true });
    await expect(api.getPortalStats({ timeoutMs: 10 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("download URLs are links, not requests", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { api } = await loadClient(env);
    expect(api.getFileDownloadUrl("file_demo_01")).toBe("http://localhost:3000/api/v1/files/file_demo_01/download");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("server-side origin on Vercel", () => {
  const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ success: true, data: {} })));
  const base = { NODE_ENV: "production", NEXT_PUBLIC_USE_MOCK_API: "false", NEXT_PUBLIC_API_BASE_URL: "", API_INTERNAL_ORIGIN: "" };

  it("uses the production domain in Vercel production", async () => {
    const { client } = await loadClient({ ...base, VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "oceanx.vercel.app", VERCEL_URL: "oceanx-abc123.vercel.app" });
    expect(client.getApiBaseUrl()).toBe("https://oceanx.vercel.app/api/v1");
  });

  it("uses the deployment URL on previews and sends the protection-bypass secret", async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal("fetch", fetchSpy);
    const { api, client } = await loadClient({ ...base, VERCEL_ENV: "preview", VERCEL_URL: "oceanx-git-x.vercel.app", VERCEL_AUTOMATION_BYPASS_SECRET: "s3cret" });
    expect(client.getApiBaseUrl()).toBe("https://oceanx-git-x.vercel.app/api/v1");
    await api.getPortalStats();
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-vercel-protection-bypass"]).toBe("s3cret");
  });

  it("never sends the bypass secret to an external API host", async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal("fetch", fetchSpy);
    const { api } = await loadClient({ ...base, NEXT_PUBLIC_API_BASE_URL: "https://api.example.org/api/v1", VERCEL_AUTOMATION_BYPASS_SECRET: "s3cret" });
    await api.getPortalStats();
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.org/api/v1/stats");
    expect((init.headers as Record<string, string>)["x-vercel-protection-bypass"]).toBeUndefined();
  });

  it("API_INTERNAL_ORIGIN overrides Vercel detection", async () => {
    const { client } = await loadClient({ ...base, API_INTERNAL_ORIGIN: "https://portal.example.org", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "oceanx.vercel.app" });
    expect(client.getApiBaseUrl()).toBe("https://portal.example.org/api/v1");
  });
});
