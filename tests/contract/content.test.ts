import { beforeAll, describe, expect, it } from "vitest";
import type { OperationId } from "@/contracts/registry";
import { callRoute, expectContract, expectError, loginAs, seed } from "./helpers";

beforeAll(seed);

type Page = { data: Array<Record<string, unknown> & { id: string; slug: string; status: string }>; pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } };

const domains: {
  list: OperationId;
  get: OperationId;
  label: string;
  filter: { query: Record<string, unknown>; check: (item: Record<string, unknown>) => boolean };
  draftId?: string;
}[] = [
  { list: "listExpeditions", get: "getExpedition", label: "expeditions", filter: { query: { region: "ANTARCTICA" }, check: (i) => i.region === "ANTARCTICA" }, draftId: "exp_demo_09" },
  { list: "listPublications", get: "getPublication", label: "publications", filter: { query: { type: "JOURNAL_ARTICLE" }, check: (i) => i.type === "JOURNAL_ARTICLE" }, draftId: "pub_demo_15" },
  { list: "listDatasets", get: "getDataset", label: "datasets", filter: { query: { accessLevel: "OPEN" }, check: (i) => i.accessLevel === "OPEN" } },
  { list: "listMediaAssets", get: "getMediaAsset", label: "media", filter: { query: { type: "VIDEO" }, check: (i) => i.type === "VIDEO" }, draftId: "med_demo_21" },
  { list: "listActivities", get: "getActivity", label: "activities", filter: { query: { type: "NEWS" }, check: (i) => i.type === "NEWS" } },
];

describe.each(domains)("$label", ({ list, get, filter, draftId }) => {
  it(`${list}: default list returns only PUBLISHED records`, async () => {
    const body = expectContract(list, await callRoute(list)) as Page;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((i) => i.status === "PUBLISHED")).toBe(true);
    if (draftId) expect(body.data.map((i) => i.id)).not.toContain(draftId);
  });

  it(`${list}: pagination`, async () => {
    const p1 = expectContract(list, await callRoute(list, { query: { page: 1, limit: 2 } })) as Page;
    const p2 = expectContract(list, await callRoute(list, { query: { page: 2, limit: 2 } })) as Page;
    expect(p1.data).toHaveLength(2);
    expect(p1.pagination).toMatchObject({ page: 1, limit: 2, hasPreviousPage: false, totalPages: Math.ceil(p1.pagination.total / 2) });
    expect(p1.pagination.hasNextPage).toBe(p1.pagination.total > 2);
    expect(p2.pagination.hasPreviousPage).toBe(true);
    expect(p2.data.map((i) => i.id)).not.toEqual(expect.arrayContaining(p1.data.map((i) => i.id)));
    const beyond = expectContract(list, await callRoute(list, { query: { page: 999, limit: 2 } })) as Page;
    expect(beyond.data).toEqual([]);
  });

  it(`${list}: filter`, async () => {
    const body = expectContract(list, await callRoute(list, { query: filter.query })) as Page;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every(filter.check)).toBe(true);
  });

  it(`${list}: 422 for invalid query parameters`, async () => {
    const err = expectError(list, await callRoute(list, { rawQuery: "?limit=1000&page=0" }), 422);
    expect(Object.keys(err.details?.fieldErrors ?? {})).toEqual(expect.arrayContaining(["limit", "page"]));
  });

  it(`${list}: status filter is staff-only`, async () => {
    expectError(list, await callRoute(list, { query: { status: "DRAFT" } }), 403);
    const editor = await loginAs("editor");
    const body = expectContract(list, await callRoute(list, { query: { status: "PUBLISHED" }, cookie: editor })) as Page;
    expect(body.data.length).toBeGreaterThan(0);
  });

  it(`${get}: by id and by slug`, async () => {
    const first = (expectContract(list, await callRoute(list, { query: { limit: 1 } })) as Page).data[0]!;
    const byId = expectContract(get, await callRoute(get, { params: { id: first.id } })) as { data: { id: string } };
    const bySlug = expectContract(get, await callRoute(get, { params: { id: first.slug } })) as { data: { id: string } };
    expect(byId.data.id).toBe(first.id);
    expect(bySlug.data.id).toBe(first.id);
  });

  it(`${get}: 404 for an unknown record`, async () => {
    expectError(get, await callRoute(get, { params: { id: "does-not-exist" } }), 404);
  });

  if (draftId) {
    it(`${get}: unpublished records are 404 for the public but visible to staff`, async () => {
      expectError(get, await callRoute(get, { params: { id: draftId } }), 404);
      const editor = await loginAs("editor");
      expectContract(get, await callRoute(get, { params: { id: draftId }, cookie: editor }));
    });
  }
});

describe("domain specifics", () => {
  it("getExpedition includes related counts", async () => {
    const body = expectContract("getExpedition", await callRoute("getExpedition", { params: { id: "demo-antarctic-coastal-ice-survey" } })) as {
      data: { counts: { publications: number; datasets: number; media: number } };
    };
    expect(body.data.counts.publications).toBeGreaterThan(0);
    expect(body.data.counts.datasets).toBeGreaterThan(0);
  });

  it("draft is visible to its owner (researcher)", async () => {
    const researcher = await loginAs("researcher");
    expectContract("getExpedition", await callRoute("getExpedition", { params: { id: "exp_demo_09" }, cookie: researcher }));
  });

  it("listPublications filters by expedition, author and year range", async () => {
    const byExp = expectContract("listPublications", await callRoute("listPublications", { query: { expeditionId: "exp_demo_01" } })) as Page;
    expect(byExp.data.length).toBeGreaterThan(0);
    const byAuthor = expectContract("listPublications", await callRoute("listPublications", { query: { author: "author z" } })) as Page;
    expect(byAuthor.data.length).toBeGreaterThan(0);
    const range = expectContract("listPublications", await callRoute("listPublications", { query: { yearFrom: 2022, yearTo: 2023 } })) as Page;
    expect(range.data.every((p) => (p.year as number) >= 2022 && (p.year as number) <= 2023)).toBe(true);
  });

  it("getPublication includes citation and the published AI summary", async () => {
    const body = expectContract("getPublication", await callRoute("getPublication", { params: { id: "pub_demo_01" } })) as {
      data: { citation: { apa: string; bibtex: string }; aiSummary: { disclaimer: string } | null; pdf: unknown };
    };
    expect(body.data.citation.apa).toContain("2019");
    expect(body.data.citation.bibtex).toMatch(/^@article\{/);
    expect(body.data.aiSummary?.disclaimer).toBeTruthy();
  });

  it("listDatasets filters by format (case-insensitive) and parameter", async () => {
    const nc = expectContract("listDatasets", await callRoute("listDatasets", { query: { format: "netcdf" } })) as Page;
    expect(nc.data.length).toBeGreaterThan(0);
    expect(nc.data.every((d) => (d.formats as string[]).includes("NetCDF"))).toBe(true);
    const param = expectContract("listDatasets", await callRoute("listDatasets", { query: { parameter: "temperature" } })) as Page;
    expect(param.data.length).toBeGreaterThan(0);
  });

  it("getDataset returns files with download URLs and a spatial box", async () => {
    const body = expectContract("getDataset", await callRoute("getDataset", { params: { id: "ds_demo_01" } })) as {
      data: { files: { downloadUrl: string }[]; spatialCoverage: unknown; fileCount: number };
    };
    expect(body.data.files.length).toBe(body.data.fileCount);
    expect(body.data.files[0]!.downloadUrl).toMatch(/^\/api\/v1\/files\/.+\/download$/);
    expect(body.data.spatialCoverage).not.toBeNull();
  });

  it("listMediaAssets featured filter (boolean query param)", async () => {
    const body = expectContract("listMediaAssets", await callRoute("listMediaAssets", { rawQuery: "?featured=true" })) as Page;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((m) => m.featured === true)).toBe(true);
    expectError("listMediaAssets", await callRoute("listMediaAssets", { rawQuery: "?featured=yes" }), 422);
  });

  it("listActivities upcoming=true returns only future items, soonest first", async () => {
    const body = expectContract("listActivities", await callRoute("listActivities", { query: { upcoming: true } })) as Page;
    const now = new Date().toISOString();
    expect(body.data.length).toBeGreaterThan(0);
    const starts = body.data.map((a) => a.startsAt as string);
    expect(starts.every((s) => s > now)).toBe(true);
    expect([...starts].sort()).toEqual(starts);
  });
});
