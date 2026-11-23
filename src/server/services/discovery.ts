/** Homepage, statistics, search, taxonomy and public outreach read services. */
import type { Prisma } from "@/generated/prisma/client";
import type { QueryOf } from "@/contracts/registry";
import type { FacetBucket, PolarRegion, PortalStats, ResearchCategory, SearchResult, SearchSuggestion } from "@/types/api";
import { excerpt } from "@/lib/citation";
import { prisma } from "@/server/db";
import { notFound } from "@/server/http/errors";
import {
  activitySummaryInclude,
  aiContentInclude,
  expeditionSummaryInclude,
  parseAISources,
  publicationSummaryInclude,
  toActivitySummary,
  toAIContent,
  toExpeditionSummary,
  toMediaSummary,
  toOutreachSummary,
  toPublicationSummary,
  type ResolvedSources,
} from "@/server/mappers";
import { idOrSlug, pageArgs, pagination, PUBLISHED, textWhere } from "./query";

const REGIONS: PolarRegion[] = ["ANTARCTICA", "ARCTIC", "HIMALAYA", "SOUTHERN_OCEAN"];

// ─── Stats & home ───────────────────────────────────────────────────────────

export async function getPortalStats(): Promise<PortalStats> {
  const [expeditions, publications, datasets, mediaAssets, activities, byRegion, latest] = await Promise.all([
    prisma.expedition.count({ where: PUBLISHED }),
    prisma.publication.count({ where: PUBLISHED }),
    prisma.dataset.count({ where: PUBLISHED }),
    prisma.mediaAsset.count({ where: PUBLISHED }),
    prisma.activity.count({ where: PUBLISHED }),
    prisma.expedition.groupBy({ by: ["region"], where: PUBLISHED, _count: { _all: true }, orderBy: { region: "asc" } }),
    Promise.all([
      prisma.expedition.aggregate({ where: PUBLISHED, _max: { publishedAt: true } }),
      prisma.publication.aggregate({ where: PUBLISHED, _max: { publishedAt: true } }),
      prisma.dataset.aggregate({ where: PUBLISHED, _max: { publishedAt: true } }),
      prisma.mediaAsset.aggregate({ where: PUBLISHED, _max: { publishedAt: true } }),
      prisma.activity.aggregate({ where: PUBLISHED, _max: { publishedAt: true } }),
    ]),
  ]);
  const counts = new Map(byRegion.map((r) => [r.region, typeof r._count === "object" ? (r._count._all ?? 0) : 0]));
  const lastUpdated = latest
    .map((a) => a._max.publishedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    expeditions,
    publications,
    datasets,
    mediaAssets,
    activities,
    byRegion: REGIONS.map((region) => ({ region, expeditions: counts.get(region) ?? 0 })),
    lastUpdatedAt: lastUpdated ? lastUpdated.toISOString() : null,
  };
}

export async function getHomePageData() {
  const now = new Date();
  const [stats, expeditions, publications, media, news, events, outreach] = await Promise.all([
    getPortalStats(),
    prisma.expedition.findMany({ where: PUBLISHED, orderBy: [{ year: "desc" }, { id: "asc" }], take: 3, include: expeditionSummaryInclude }),
    prisma.publication.findMany({ where: PUBLISHED, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 4, include: publicationSummaryInclude }),
    prisma.mediaAsset.findMany({ where: { ...PUBLISHED, featured: true }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 8 }),
    prisma.activity.findMany({
      where: { ...PUBLISHED, type: { in: ["NEWS", "PRESS_RELEASE", "ANNOUNCEMENT"] } },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      take: 4,
      include: activitySummaryInclude,
    }),
    prisma.activity.findMany({
      where: { ...PUBLISHED, startsAt: { gt: now } },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 3,
      include: activitySummaryInclude,
    }),
    prisma.aIContent.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 3 }),
  ]);
  return {
    success: true as const,
    data: {
      stats,
      featuredExpeditions: expeditions.map(toExpeditionSummary),
      latestPublications: publications.map(toPublicationSummary),
      featuredMedia: media.map(toMediaSummary),
      latestNews: news.map(toActivitySummary),
      upcomingEvents: events.map(toActivitySummary),
      featuredOutreach: outreach.map(toOutreachSummary),
    },
  };
}

// ─── Search ─────────────────────────────────────────────────────────────────
// Phase 1: case-insensitive term matching across tables with in-memory ranking.
// Planned: PostgreSQL full-text search (tsvector + GIN) once content volume grows.

type Candidate = SearchResult & { haystack: string };
const SEARCH_CAP_PER_TYPE = 200;

function termsWhere(terms: string[], fields: string[]) {
  return { AND: terms.map((t) => textWhere(t, fields)) };
}

async function searchCandidates(q: QueryOf<"search">, terms: string[]): Promise<Candidate[]> {
  const want = (t: SearchResult["type"]) => !q.types || q.types.includes(t);
  const region = q.region ? { region: q.region } : {};
  const category = q.category ? { categories: { some: { slug: q.category } } } : {};
  const yearRange = (from?: number, to?: number) =>
    from === undefined && to === undefined ? {} : { gte: from ?? 1900, lte: to ?? 2100 };
  const pubDateRange =
    q.yearFrom === undefined && q.yearTo === undefined
      ? {}
      : { publishedAt: { gte: new Date(`${q.yearFrom ?? 1900}-01-01T00:00:00Z`), lte: new Date(`${q.yearTo ?? 2100}-12-31T23:59:59Z`) } };
  const yearOf = (d: Date | null) => (d ? d.getUTCFullYear() : null);
  const year = yearRange(q.yearFrom, q.yearTo);
  const take = SEARCH_CAP_PER_TYPE;

  const [exp, pub, ds, med, act, out] = await Promise.all([
    want("EXPEDITION")
      ? prisma.expedition.findMany({ where: { ...PUBLISHED, ...region, ...category, ...(Object.keys(year).length ? { year } : {}), ...termsWhere(terms, ["title", "summary", "description"]) }, take })
      : [],
    want("PUBLICATION")
      ? prisma.publication.findMany({ where: { ...PUBLISHED, ...region, ...category, ...(Object.keys(year).length ? { year } : {}), ...termsWhere(terms, ["title", "abstract", "authorsText"]) }, take })
      : [],
    want("DATASET")
      ? prisma.dataset.findMany({ where: { ...PUBLISHED, ...region, ...category, ...pubDateRange, ...termsWhere(terms, ["title", "summary", "description"]) }, take })
      : [],
    want("MEDIA")
      ? prisma.mediaAsset.findMany({ where: { ...PUBLISHED, ...region, ...category, ...pubDateRange, ...termsWhere(terms, ["title", "altText", "description"]) }, take })
      : [],
    want("ACTIVITY")
      ? prisma.activity.findMany({ where: { ...PUBLISHED, ...region, ...category, ...pubDateRange, ...termsWhere(terms, ["title", "summary", "body"]) }, take })
      : [],
    want("OUTREACH") && !q.region && !q.category
      ? prisma.aIContent.findMany({ where: { status: "PUBLISHED", ...pubDateRange, ...termsWhere(terms, ["title", "body"]) }, take })
      : [],
  ]);

  return [
    ...exp.map((e) => ({ type: "EXPEDITION" as const, id: e.id, slug: e.slug, title: e.title, snippet: excerpt(e.summary, 240), thumbnailUrl: e.coverImageUrl, region: e.region, year: e.year, publishedAt: e.publishedAt?.toISOString() ?? null, score: 0, haystack: `${e.title} ${e.summary}` })),
    ...pub.map((p) => ({ type: "PUBLICATION" as const, id: p.id, slug: p.slug, title: p.title, snippet: excerpt(p.abstract, 240), thumbnailUrl: null, region: p.region, year: p.year, publishedAt: p.publishedAt?.toISOString() ?? null, score: 0, haystack: `${p.title} ${p.abstract}` })),
    ...ds.map((d) => ({ type: "DATASET" as const, id: d.id, slug: d.slug, title: d.title, snippet: excerpt(d.summary, 240), thumbnailUrl: null, region: d.region, year: yearOf(d.publishedAt), publishedAt: d.publishedAt?.toISOString() ?? null, score: 0, haystack: `${d.title} ${d.summary}` })),
    ...med.map((m) => ({ type: "MEDIA" as const, id: m.id, slug: m.slug, title: m.title, snippet: excerpt(m.description ?? m.altText, 240), thumbnailUrl: m.thumbnailUrl, region: m.region, year: yearOf(m.capturedAt), publishedAt: m.publishedAt?.toISOString() ?? null, score: 0, haystack: `${m.title} ${m.altText}` })),
    ...act.map((a) => ({ type: "ACTIVITY" as const, id: a.id, slug: a.slug, title: a.title, snippet: excerpt(a.summary, 240), thumbnailUrl: a.coverImageUrl, region: a.region, year: yearOf(a.startsAt ?? a.publishedAt), publishedAt: a.publishedAt?.toISOString() ?? null, score: 0, haystack: `${a.title} ${a.summary}` })),
    ...out.map((o) => ({ type: "OUTREACH" as const, id: o.id, slug: o.slug, title: o.title, snippet: excerpt(o.body, 240), thumbnailUrl: null, region: null, year: yearOf(o.publishedAt), publishedAt: o.publishedAt?.toISOString() ?? null, score: 0, haystack: `${o.title} ${o.body}` })),
  ];
}

const facet = (values: (string | number | null)[]): FacetBucket[] => {
  const counts = new Map<string, number>();
  for (const v of values) if (v !== null) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

export async function search(q: QueryOf<"search">) {
  const started = Date.now();
  const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  // Facet `types` counts ignore the `types` filter so the UI can show counts for every tab.
  const all = await searchCandidates({ ...q, types: undefined }, terms);
  const ranked = all.map((r) => {
    const title = r.title.toLowerCase();
    const hay = r.haystack.toLowerCase();
    const raw = terms.reduce((s, t) => s + (title.includes(t) ? 3 : 0) + (hay.includes(t) ? 1 : 0), 0);
    return { ...r, score: Math.round((raw / Math.max(1, terms.length * 4)) * 100) / 100 };
  });
  const typed = q.types ? ranked.filter((r) => q.types!.includes(r.type)) : ranked;
  typed.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const start = (q.page - 1) * q.limit;
  return {
    success: true as const,
    data: typed.slice(start, start + q.limit).map(({ haystack: _h, ...r }) => r),
    pagination: pagination(q.page, q.limit, typed.length),
    meta: {
      query: q.q,
      tookMs: Date.now() - started,
      facets: { types: facet(ranked.map((r) => r.type)), regions: facet(typed.map((r) => r.region)), years: facet(typed.map((r) => r.year)) },
    },
  };
}

export async function getSearchSuggestions(q: QueryOf<"getSearchSuggestions">) {
  const contains = { contains: q.q, mode: "insensitive" as const };
  const [keywords, categories, expeditions, publications, datasets] = await Promise.all([
    prisma.keyword.findMany({ where: { label: contains }, take: q.limit, orderBy: { label: "asc" } }),
    prisma.category.findMany({ where: { name: contains }, take: q.limit, orderBy: { sortOrder: "asc" } }),
    prisma.expedition.findMany({ where: { ...PUBLISHED, title: contains }, take: q.limit, select: { title: true, slug: true }, orderBy: { title: "asc" } }),
    prisma.publication.findMany({ where: { ...PUBLISHED, title: contains }, take: q.limit, select: { title: true, slug: true }, orderBy: { title: "asc" } }),
    prisma.dataset.findMany({ where: { ...PUBLISHED, title: contains }, take: q.limit, select: { title: true, slug: true }, orderBy: { title: "asc" } }),
  ]);
  const out: SearchSuggestion[] = [
    ...keywords.map((k) => ({ text: k.label, kind: "KEYWORD" as const, resultType: null, slug: null })),
    ...categories.map((c) => ({ text: c.name, kind: "CATEGORY" as const, resultType: null, slug: c.slug })),
    ...expeditions.map((e) => ({ text: e.title, kind: "TITLE" as const, resultType: "EXPEDITION" as const, slug: e.slug })),
    ...publications.map((p) => ({ text: p.title, kind: "TITLE" as const, resultType: "PUBLICATION" as const, slug: p.slug })),
    ...datasets.map((d) => ({ text: d.title, kind: "TITLE" as const, resultType: "DATASET" as const, slug: d.slug })),
  ];
  return { success: true as const, data: out.slice(0, q.limit) };
}

// ─── Taxonomy ───────────────────────────────────────────────────────────────

const publishedCounts = {
  _count: {
    select: {
      expeditions: { where: PUBLISHED },
      publications: { where: PUBLISHED },
      datasets: { where: PUBLISHED },
      media: { where: PUBLISHED },
      activities: { where: PUBLISHED },
    },
  },
} as const satisfies Prisma.CategoryInclude;

type CategoryRow = Prisma.CategoryGetPayload<object> & { _count?: Prisma.CategoryGetPayload<{ include: typeof publishedCounts }>["_count"] };

function toCategory(c: CategoryRow): ResearchCategory {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
    counts: c._count
      ? { expeditions: c._count.expeditions, publications: c._count.publications, datasets: c._count.datasets, media: c._count.media, activities: c._count.activities }
      : null,
  };
}

export async function listCategories(q: QueryOf<"listCategories">) {
  const rows = await prisma.category.findMany({
    where: q.parentId ? { parentId: q.parentId } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...(q.withCounts ? { include: publishedCounts } : {}),
  });
  return { success: true as const, data: rows.map(toCategory) };
}

export async function getCategory(idOrSlugValue: string) {
  const row = await prisma.category.findFirst({ where: idOrSlug(idOrSlugValue), include: publishedCounts });
  if (!row) throw notFound("Category");
  return { success: true as const, data: toCategory(row) };
}

export async function listKeywords(q: QueryOf<"listKeywords">) {
  // Keyword sets are small; rank by total published usage in memory.
  const rows = await prisma.keyword.findMany({
    where: q.q ? { label: { contains: q.q, mode: "insensitive" } } : {},
    include: { _count: { select: publishedCounts._count.select } },
  });
  const ranked = rows
    .map((k) => ({
      id: k.id,
      slug: k.slug,
      label: k.label,
      usageCount: k._count.expeditions + k._count.publications + k._count.datasets + k._count.media + k._count.activities,
    }))
    .sort((a, b) => b.usageCount - a.usageCount || a.label.localeCompare(b.label));
  const start = (q.page - 1) * q.limit;
  return { success: true as const, data: ranked.slice(start, start + q.limit), pagination: pagination(q.page, q.limit, ranked.length) };
}

// ─── Public outreach (published AI content) ─────────────────────────────────

async function resolveSources(items: { sources: Prisma.JsonValue }[]): Promise<ResolvedSources> {
  const refs = items.flatMap((i) => parseAISources(i.sources));
  const ids = (type: string) => refs.filter((r) => r.type === type).map((r) => r.id);
  const select = { id: true, slug: true, title: true } as const;
  const [e, p, d, a] = await Promise.all([
    prisma.expedition.findMany({ where: { id: { in: ids("EXPEDITION") }, ...PUBLISHED }, select }),
    prisma.publication.findMany({ where: { id: { in: ids("PUBLICATION") }, ...PUBLISHED }, select }),
    prisma.dataset.findMany({ where: { id: { in: ids("DATASET") }, ...PUBLISHED }, select }),
    prisma.activity.findMany({ where: { id: { in: ids("ACTIVITY") }, ...PUBLISHED }, select }),
  ]);
  const map: ResolvedSources = new Map();
  for (const [type, rows] of [["EXPEDITION", e], ["PUBLICATION", p], ["DATASET", d], ["ACTIVITY", a]] as const) {
    for (const r of rows) map.set(`${type}:${r.id}`, { slug: r.slug, title: r.title });
  }
  return map;
}

export async function listOutreach(q: QueryOf<"listOutreach">) {
  const where: Prisma.AIContentWhereInput = {
    status: "PUBLISHED",
    ...(q.kind ? { kind: q.kind } : {}),
    ...(q.audience ? { audience: q.audience } : {}),
    ...(q.language ? { language: q.language } : {}),
    ...(q.sourceType && q.sourceId ? { sources: { array_contains: [{ type: q.sourceType, id: q.sourceId }] } } : {}),
    ...textWhere(q.q, ["title", "body"]),
  };
  let rows = await prisma.aIContent.findMany({ where, orderBy: [{ publishedAt: "desc" }, { id: "asc" }] });
  // Filters on JSON array elements that Prisma can't express (type-only or id-only).
  if (q.sourceType && !q.sourceId) rows = rows.filter((r) => parseAISources(r.sources).some((s) => s.type === q.sourceType));
  if (q.sourceId && !q.sourceType) rows = rows.filter((r) => parseAISources(r.sources).some((s) => s.id === q.sourceId));
  const { skip, take } = pageArgs(q.page, q.limit);
  return { success: true as const, data: rows.slice(skip, skip + take).map(toOutreachSummary), pagination: pagination(q.page, q.limit, rows.length) };
}

export async function getOutreach(idOrSlugValue: string) {
  const row = await prisma.aIContent.findFirst({ where: { ...idOrSlug(idOrSlugValue), status: "PUBLISHED" }, include: aiContentInclude });
  if (!row) throw notFound("Outreach content");
  return { success: true as const, data: toAIContent(row, await resolveSources([row])) };
}
