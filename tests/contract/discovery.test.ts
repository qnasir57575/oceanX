import { beforeAll, describe, expect, it } from "vitest";
import { callRoute, expectContract, expectError, seed } from "./helpers";

beforeAll(seed);

describe("getHomePageData", () => {
  it("returns every homepage section", async () => {
    const body = expectContract("getHomePageData", await callRoute("getHomePageData")) as {
      data: { featuredExpeditions: unknown[]; latestPublications: unknown[]; featuredMedia: unknown[]; upcomingEvents: unknown[]; featuredOutreach: unknown[]; stats: { expeditions: number } };
    };
    expect(body.data.featuredExpeditions.length).toBeLessThanOrEqual(3);
    expect(body.data.latestPublications.length).toBeLessThanOrEqual(4);
    expect(body.data.featuredMedia.length).toBeGreaterThan(0);
    expect(body.data.upcomingEvents.length).toBeGreaterThan(0);
    expect(body.data.featuredOutreach.length).toBeGreaterThan(0);
    expect(body.data.stats.expeditions).toBe(8);
  });
});

describe("getPortalStats", () => {
  it("counts only published records, with all four regions", async () => {
    const body = expectContract("getPortalStats", await callRoute("getPortalStats")) as {
      data: { expeditions: number; publications: number; byRegion: { region: string; expeditions: number }[] };
    };
    expect(body.data.expeditions).toBe(8);
    expect(body.data.publications).toBe(14);
    expect(body.data.byRegion.map((r) => r.region).sort()).toEqual(["ANTARCTICA", "ARCTIC", "HIMALAYA", "SOUTHERN_OCEAN"]);
  });
});

describe("search", () => {
  it("returns ranked results with facets", async () => {
    const body = expectContract("search", await callRoute("search", { query: { q: "ice" } })) as {
      data: { type: string; score: number }[];
      pagination: { total: number };
      meta: { query: string; facets: { types: { value: string; count: number }[] } };
    };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.query).toBe("ice");
    const scores = body.data.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(body.meta.facets.types.reduce((s, b) => s + b.count, 0)).toBe(body.pagination.total);
  });

  it("filters by types (comma-separated) while keeping type facet counts", async () => {
    const body = expectContract("search", await callRoute("search", { rawQuery: "?q=demo&types=DATASET,PUBLICATION&limit=50" })) as {
      data: { type: string }[];
      meta: { facets: { types: { value: string }[] } };
    };
    expect(body.data.every((r) => r.type === "DATASET" || r.type === "PUBLICATION")).toBe(true);
    expect(body.meta.facets.types.map((t) => t.value)).toEqual(expect.arrayContaining(["EXPEDITION"]));
  });

  it("empty results are 200 with total 0", async () => {
    const body = expectContract("search", await callRoute("search", { query: { q: "zzzznotfound" } })) as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("422 when q is missing or too short", async () => {
    expectError("search", await callRoute("search"), 422);
    expectError("search", await callRoute("search", { query: { q: "a" } }), 422);
    expectError("search", await callRoute("search", { rawQuery: "?q=ice&types=BOGUS" }), 422);
  });
});

describe("getSearchSuggestions", () => {
  it("suggests keywords, categories and titles", async () => {
    const body = expectContract("getSearchSuggestions", await callRoute("getSearchSuggestions", { query: { q: "gla", limit: 10 } })) as {
      data: { kind: string }[];
    };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  it("422 without q", async () => {
    expectError("getSearchSuggestions", await callRoute("getSearchSuggestions"), 422);
  });
});

describe("taxonomy", () => {
  it("listCategories without and with counts", async () => {
    const plain = expectContract("listCategories", await callRoute("listCategories")) as { data: { counts: unknown }[] };
    expect(plain.data.length).toBe(10);
    expect(plain.data.every((c) => c.counts === null)).toBe(true);
    const counted = expectContract("listCategories", await callRoute("listCategories", { query: { withCounts: true } })) as {
      data: { counts: { expeditions: number } | null }[];
    };
    expect(counted.data.every((c) => c.counts !== null)).toBe(true);
  });

  it("listCategories by parentId", async () => {
    const body = expectContract("listCategories", await callRoute("listCategories", { query: { parentId: "cat_oceanography" } })) as { data: { id: string }[] };
    expect(body.data.map((c) => c.id)).toEqual(["cat_ocean_biology"]);
  });

  it("getCategory by slug includes counts; 404 when unknown", async () => {
    const body = expectContract("getCategory", await callRoute("getCategory", { params: { id: "glaciology" } })) as { data: { counts: { expeditions: number } } };
    expect(body.data.counts.expeditions).toBeGreaterThan(0);
    expectError("getCategory", await callRoute("getCategory", { params: { id: "nope" } }), 404);
  });

  it("listKeywords sorted by usage, with search", async () => {
    const body = expectContract("listKeywords", await callRoute("listKeywords", { query: { limit: 50 } })) as { data: { usageCount: number }[] };
    const counts = body.data.map((k) => k.usageCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    const q = expectContract("listKeywords", await callRoute("listKeywords", { query: { q: "ice" } })) as { data: { label: string }[] };
    expect(q.data.every((k) => k.label.includes("ice"))).toBe(true);
  });
});

describe("outreach", () => {
  it("listOutreach returns only published items", async () => {
    const body = expectContract("listOutreach", await callRoute("listOutreach")) as { data: { id: string }[]; pagination: { total: number } };
    expect(body.pagination.total).toBe(3);
    expect(body.data.map((o) => o.id)).not.toContain("ai_demo_02");
    const students = expectContract("listOutreach", await callRoute("listOutreach", { query: { audience: "STUDENTS" } })) as { data: unknown[] };
    expect(students.data.length).toBe(2);
    const bySource = expectContract("listOutreach", await callRoute("listOutreach", { query: { sourceType: "EXPEDITION", sourceId: "exp_demo_01" } })) as { data: { id: string }[] };
    expect(bySource.data.map((o) => o.id)).toEqual(["ai_demo_01"]);
  });

  it("getOutreach resolves sources; drafts are 404", async () => {
    const body = expectContract("getOutreach", await callRoute("getOutreach", { params: { id: "ai_demo_04" } })) as { data: { sources: unknown[]; isAIGenerated: boolean } };
    expect(body.data.sources).toHaveLength(2);
    expect(body.data.isAIGenerated).toBe(true);
    expectError("getOutreach", await callRoute("getOutreach", { params: { id: "ai_demo_02" } }), 404);
  });
});

describe("fallback for unimplemented endpoints", () => {
  it("returns the JSON error envelope and names the endpoint status", async () => {
    const mod = await import("@/app/api/v1/[...path]/route");
    const res = await mod.POST(new Request("http://localhost:3000/api/v1/ai/summaries", { method: "POST" }));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toMatch(/PLANNED/);
  });
});
