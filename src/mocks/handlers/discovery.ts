import { ExpeditionSummarySchema } from "@/contracts/schemas/expeditions";
import { PublicationSummarySchema } from "@/contracts/schemas/publications";
import { MediaAssetSummarySchema } from "@/contracts/schemas/media";
import { ActivitySummarySchema } from "@/contracts/schemas/activities";
import { OutreachSummarySchema } from "@/contracts/schemas/ai";
import { excerpt } from "@/lib/citation";
import { slugify } from "@/lib/slug";
import type { FacetBucket, PolarRegion, PortalStats, ResearchCategory, SearchResult, SearchSuggestion } from "@/types/api";
import type { Fixtures } from "../data/fixtures";
import { getMockScenario } from "../store";
import { conflict, findById, newId, notFound, ok, paginate, summarize, type MockHandler } from "./helpers";

const published = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "PUBLISHED");

function stats(store: Fixtures): PortalStats {
  const empty = getMockScenario() === "empty";
  const n = <T extends { status: string }>(xs: T[]) => (empty ? 0 : published(xs).length);
  const regions: PolarRegion[] = ["ANTARCTICA", "ARCTIC", "HIMALAYA", "SOUTHERN_OCEAN"];
  const dates = [...store.expeditions, ...store.publications, ...store.datasets, ...store.media, ...store.activities]
    .filter((x) => x.status === "PUBLISHED" && x.publishedAt)
    .map((x) => x.publishedAt!)
    .sort();
  return {
    expeditions: n(store.expeditions),
    publications: n(store.publications),
    datasets: n(store.datasets),
    mediaAssets: n(store.media),
    activities: n(store.activities),
    byRegion: regions.map((region) => ({ region, expeditions: empty ? 0 : published(store.expeditions).filter((e) => e.region === region).length })),
    lastUpdatedAt: empty ? null : (dates.at(-1) ?? null),
  };
}

export const getPortalStats: MockHandler<"getPortalStats"> = ({ store }) => ok(stats(store));

export const getHomePageData: MockHandler<"getHomePageData"> = ({ store, now }) => {
  const empty = getMockScenario() === "empty";
  const take = <T,>(xs: T[], k: number) => (empty ? [] : xs.slice(0, k));
  const nowStr = now.toISOString();
  const acts = published(store.activities);
  return ok({
    stats: stats(store),
    featuredExpeditions: take(
      published(store.expeditions).sort((a, b) => b.year - a.year),
      3,
    ).map((e) => summarize(ExpeditionSummarySchema, e)),
    latestPublications: take(
      published(store.publications).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
      4,
    ).map((p) => summarize(PublicationSummarySchema, p)),
    featuredMedia: take(published(store.media).filter((m) => m.featured), 8).map((m) => summarize(MediaAssetSummarySchema, m)),
    latestNews: take(
      acts.filter((a) => ["NEWS", "PRESS_RELEASE", "ANNOUNCEMENT"].includes(a.type)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
      4,
    ).map((a) => summarize(ActivitySummarySchema, a)),
    upcomingEvents: take(
      acts.filter((a) => a.startsAt && a.startsAt > nowStr).sort((a, b) => a.startsAt!.localeCompare(b.startsAt!)),
      3,
    ).map((a) => summarize(ActivitySummarySchema, a)),
    featuredOutreach: take(published(store.aiContent), 3).map((a) => summarize(OutreachSummarySchema, { ...a, excerpt: excerpt(a.body, 240) })),
  });
};

// ─── Search ─────────────────────────────────────────────────────────────────

function searchIndex(store: Fixtures): (SearchResult & { haystack: string; categories: string[] })[] {
  const yearOf = (iso: string | null) => (iso ? Number(iso.slice(0, 4)) : null);
  return [
    ...published(store.expeditions).map((e) => ({ type: "EXPEDITION" as const, id: e.id, slug: e.slug, title: e.title, snippet: excerpt(e.summary, 240), thumbnailUrl: e.coverImage?.url ?? null, region: e.region, year: e.year, publishedAt: e.publishedAt, score: 0, haystack: `${e.title} ${e.summary} ${e.keywords.join(" ")}`, categories: e.categories.map((c) => c.slug) })),
    ...published(store.publications).map((p) => ({ type: "PUBLICATION" as const, id: p.id, slug: p.slug, title: p.title, snippet: excerpt(p.abstract, 240), thumbnailUrl: null, region: p.region, year: p.year, publishedAt: p.publishedAt, score: 0, haystack: `${p.title} ${p.abstract} ${p.authors.map((a) => a.name).join(" ")} ${p.keywords.join(" ")}`, categories: p.categories.map((c) => c.slug) })),
    ...published(store.datasets).map((d) => ({ type: "DATASET" as const, id: d.id, slug: d.slug, title: d.title, snippet: excerpt(d.summary, 240), thumbnailUrl: null, region: d.region, year: yearOf(d.publishedAt), publishedAt: d.publishedAt, score: 0, haystack: `${d.title} ${d.summary} ${d.parameters.join(" ")} ${d.keywords.join(" ")}`, categories: d.categories.map((c) => c.slug) })),
    ...published(store.media).map((m) => ({ type: "MEDIA" as const, id: m.id, slug: m.slug, title: m.title, snippet: excerpt(m.description ?? m.altText, 240), thumbnailUrl: m.thumbnailUrl, region: m.region, year: yearOf(m.capturedAt), publishedAt: m.publishedAt, score: 0, haystack: `${m.title} ${m.altText} ${m.keywords.join(" ")}`, categories: m.categories.map((c) => c.slug) })),
    ...published(store.activities).map((a) => ({ type: "ACTIVITY" as const, id: a.id, slug: a.slug, title: a.title, snippet: excerpt(a.summary, 240), thumbnailUrl: a.coverImage?.url ?? null, region: a.region, year: yearOf(a.startsAt ?? a.publishedAt), publishedAt: a.publishedAt, score: 0, haystack: `${a.title} ${a.summary}`, categories: a.categories.map((c) => c.slug) })),
    ...published(store.aiContent).map((o) => ({ type: "OUTREACH" as const, id: o.id, slug: o.slug, title: o.title, snippet: excerpt(o.body, 240), thumbnailUrl: null, region: null, year: yearOf(o.publishedAt), publishedAt: o.publishedAt, score: 0, haystack: `${o.title} ${o.body}`, categories: [] })),
  ];
}

const facet = (values: (string | number | null)[]): FacetBucket[] => {
  const counts = new Map<string, number>();
  for (const v of values) if (v !== null) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

export const search: MockHandler<"search"> = ({ query: q, store }) => {
  const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (getMockScenario() === "empty" ? [] : searchIndex(store))
    .map((r) => {
      const hay = r.haystack.toLowerCase();
      const title = r.title.toLowerCase();
      const score = terms.reduce((s, t) => s + (title.includes(t) ? 3 : 0) + (hay.includes(t) ? 1 : 0), 0);
      return { ...r, score };
    })
    .filter((r) => terms.every((t) => r.haystack.toLowerCase().includes(t)))
    .filter((r) => (!q.region || r.region === q.region) && (!q.category || r.categories.includes(q.category)))
    .filter((r) => (q.yearFrom === undefined || (r.year ?? 0) >= q.yearFrom) && (q.yearTo === undefined || (r.year ?? 9999) <= q.yearTo));
  const typed = q.types ? matches.filter((r) => q.types!.includes(r.type)) : matches;
  const sorted = typed.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const page = paginate(
    sorted.map(({ haystack: _h, categories: _c, ...r }) => ({ ...r, score: Math.round((r.score / Math.max(1, terms.length * 4)) * 100) / 100 })),
    q.page,
    q.limit,
  );
  return {
    ...page,
    meta: {
      query: q.q,
      tookMs: 1,
      facets: { types: facet(matches.map((r) => r.type)), regions: facet(typed.map((r) => r.region)), years: facet(typed.map((r) => r.year)) },
    },
  };
};

export const getSearchSuggestions: MockHandler<"getSearchSuggestions"> = ({ query: q, store }) => {
  if (getMockScenario() === "empty") return ok([]);
  const needle = q.q.toLowerCase();
  const out: SearchSuggestion[] = [];
  for (const k of store.keywords) if (k.label.includes(needle)) out.push({ text: k.label, kind: "KEYWORD", resultType: null, slug: null });
  for (const c of store.categories) if (c.name.toLowerCase().includes(needle)) out.push({ text: c.name, kind: "CATEGORY", resultType: null, slug: c.slug });
  for (const r of searchIndex(store)) if (r.title.toLowerCase().includes(needle)) out.push({ text: r.title, kind: "TITLE", resultType: r.type, slug: r.slug });
  return ok(out.slice(0, q.limit));
};

// ─── Taxonomy ───────────────────────────────────────────────────────────────

function withCategoryCounts(store: Fixtures, c: ResearchCategory): ResearchCategory {
  const n = (xs: { status: string; categories: { id: string }[] }[]) => published(xs).filter((x) => x.categories.some((y) => y.id === c.id)).length;
  return {
    ...c,
    counts: { expeditions: n(store.expeditions), publications: n(store.publications), datasets: n(store.datasets), media: n(store.media), activities: n(store.activities) },
  };
}

export const listCategories: MockHandler<"listCategories"> = ({ query: q, store }) => {
  const items = store.categories
    .filter((c) => !q.parentId || c.parentId === q.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => (q.withCounts ? withCategoryCounts(store, c) : { ...c, counts: null }));
  return ok(getMockScenario() === "empty" ? [] : items);
};

export const getCategory: MockHandler<"getCategory"> = ({ params, store }) => {
  const c = store.categories.find((x) => x.id === params.id || x.slug === params.id);
  if (!c) throw notFound("Category");
  return ok(withCategoryCounts(store, c));
};

export const createCategory: MockHandler<"createCategory"> = ({ body, store }) => {
  const slug = body.slug ?? slugify(body.name);
  if (store.categories.some((c) => c.slug === slug)) throw conflict(`The slug "${slug}" is already in use.`, "SLUG_TAKEN");
  if (body.parentId) {
    const parent = findById(store.categories, body.parentId, "Parent category");
    if (parent.parentId) throw conflict("Categories can only be nested two levels deep.", "TOO_DEEP");
  }
  const c: ResearchCategory = { id: newId("cat"), slug, name: body.name, description: body.description ?? null, parentId: body.parentId ?? null, sortOrder: body.sortOrder ?? store.categories.length + 1, counts: null };
  store.categories.push(c);
  return ok(withCategoryCounts(store, c));
};

export const updateCategory: MockHandler<"updateCategory"> = ({ params, body, store }) => {
  const c = findById(store.categories, params.id, "Category");
  if (body.slug && store.categories.some((x) => x.slug === body.slug && x.id !== c.id)) throw conflict("Slug already in use.", "SLUG_TAKEN");
  Object.assign(c, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
  return ok(withCategoryCounts(store, c));
};

export const deleteCategory: MockHandler<"deleteCategory"> = ({ params, store }) => {
  const c = findById(store.categories, params.id, "Category");
  if (store.categories.some((x) => x.parentId === c.id)) throw conflict("Delete or move the child categories first.", "HAS_CHILDREN");
  store.categories.splice(store.categories.indexOf(c), 1);
  return ok({ id: c.id, deleted: true as const });
};

export const listKeywords: MockHandler<"listKeywords"> = ({ query: q, store }) =>
  paginate(store.keywords.filter((k) => !q.q || k.label.includes(q.q.toLowerCase())), q.page, q.limit);

export const createKeyword: MockHandler<"createKeyword"> = ({ body, store }) => {
  const slug = slugify(body.label);
  if (store.keywords.some((k) => k.slug === slug)) throw conflict("Keyword already exists.", "KEYWORD_EXISTS");
  const k = { id: newId("kw"), slug, label: body.label.toLowerCase(), usageCount: 0 };
  store.keywords.push(k);
  return ok(k);
};

export const deleteKeyword: MockHandler<"deleteKeyword"> = ({ params, store }) => {
  const k = findById(store.keywords, params.id, "Keyword");
  store.keywords.splice(store.keywords.indexOf(k), 1);
  return ok({ id: k.id, deleted: true as const });
};
