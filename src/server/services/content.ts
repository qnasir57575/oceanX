/** Read services for expeditions, publications, datasets, media and activities. */
import type { Prisma, User as UserRow } from "@/generated/prisma/client";
import type { QueryOf } from "@/contracts/registry";
import { prisma } from "@/server/db";
import {
  activityDetailInclude,
  activitySummaryInclude,
  aiContentInclude,
  datasetDetailInclude,
  datasetSummaryInclude,
  expeditionSummaryInclude,
  mediaDetailInclude,
  publicationDetailInclude,
  publicationSummaryInclude,
  toActivity,
  toActivitySummary,
  toAISummaryRef,
  toDataset,
  toDatasetSummary,
  toExpedition,
  toExpeditionSummary,
  toMedia,
  toMediaSummary,
  toPublication,
  toPublicationSummary,
} from "@/server/mappers";
import { assertVisible, idOrSlug, pageArgs, pagination, PUBLISHED, statusWhere, taxonomyWhere, textWhere, yearWhere } from "./query";

const page = <T>(data: T[], q: { page: number; limit: number }, total: number) => ({
  success: true as const,
  data,
  pagination: pagination(q.page, q.limit, total),
});

// ─── Expeditions ────────────────────────────────────────────────────────────

export async function listExpeditions(q: QueryOf<"listExpeditions">, user: UserRow | null) {
  const where: Prisma.ExpeditionWhereInput = {
    ...statusWhere(q.status, user),
    ...(q.region ? { region: q.region } : {}),
    ...(q.phase ? { phase: q.phase } : {}),
    ...yearWhere(q),
    ...taxonomyWhere(q),
    ...textWhere(q.q, ["title", "summary"]),
  };
  const orderBy: Prisma.ExpeditionOrderByWithRelationInput[] =
    q.sort === "title"
      ? [{ title: "asc" }]
      : q.sort === "startDate"
        ? [{ startDate: { sort: "desc", nulls: "last" } }, { id: "asc" }]
        : q.sort === "oldest"
          ? [{ year: "asc" }, { startDate: { sort: "asc", nulls: "last" } }, { id: "asc" }]
          : [{ year: "desc" }, { startDate: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.expedition.findMany({ where, orderBy, include: expeditionSummaryInclude, ...pageArgs(q.page, q.limit) }),
    prisma.expedition.count({ where }),
  ]);
  return page(rows.map(toExpeditionSummary), q, total);
}

export async function getExpedition(idOrSlugValue: string, user: UserRow | null) {
  const row = assertVisible(
    await prisma.expedition.findFirst({ where: idOrSlug(idOrSlugValue), include: expeditionSummaryInclude }),
    user,
    "Expedition",
  );
  const [publications, datasets, media] = await Promise.all([
    prisma.publication.count({ where: { expeditionId: row.id, ...PUBLISHED } }),
    prisma.dataset.count({ where: { expeditionId: row.id, ...PUBLISHED } }),
    prisma.mediaAsset.count({ where: { expeditionId: row.id, ...PUBLISHED } }),
  ]);
  return { success: true as const, data: toExpedition(row, { publications, datasets, media }) };
}

// ─── Publications ───────────────────────────────────────────────────────────

export async function listPublications(q: QueryOf<"listPublications">, user: UserRow | null) {
  const where: Prisma.PublicationWhereInput = {
    ...statusWhere(q.status, user),
    ...(q.region ? { region: q.region } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.expeditionId ? { expeditionId: q.expeditionId } : {}),
    ...(q.author ? { authorsText: { contains: q.author.toLowerCase() } } : {}),
    ...yearWhere(q),
    ...taxonomyWhere(q),
    ...textWhere(q.q, ["title", "abstract", "authorsText"]),
  };
  const orderBy: Prisma.PublicationOrderByWithRelationInput[] =
    q.sort === "title" ? [{ title: "asc" }] : q.sort === "oldest" ? [{ year: "asc" }, { title: "asc" }] : [{ year: "desc" }, { title: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.publication.findMany({ where, orderBy, include: publicationSummaryInclude, ...pageArgs(q.page, q.limit) }),
    prisma.publication.count({ where }),
  ]);
  return page(rows.map(toPublicationSummary), q, total);
}

export async function getPublication(idOrSlugValue: string, user: UserRow | null) {
  const row = assertVisible(
    await prisma.publication.findFirst({ where: idOrSlug(idOrSlugValue), include: publicationDetailInclude }),
    user,
    "Publication",
  );
  // Published AI research summary whose sources include this publication.
  const summary = await prisma.aIContent.findFirst({
    where: { kind: "RESEARCH_SUMMARY", status: "PUBLISHED", sources: { array_contains: [{ type: "PUBLICATION", id: row.id }] } },
    include: aiContentInclude,
    orderBy: { publishedAt: "desc" },
  });
  return { success: true as const, data: toPublication(row, summary ? toAISummaryRef(summary) : null) };
}

// ─── Datasets ───────────────────────────────────────────────────────────────

export async function listDatasets(q: QueryOf<"listDatasets">, user: UserRow | null) {
  // `format` (exact, case-insensitive) and `parameter` (substring, case-insensitive) match
  // elements of text[] columns, which Prisma cannot express — prefilter IDs with SQL.
  const arrayFilters: Prisma.DatasetWhereInput[] = [];
  if (q.format) {
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Dataset" WHERE EXISTS (SELECT 1 FROM unnest(formats) f WHERE lower(f) = lower(${q.format}))`;
    arrayFilters.push({ id: { in: ids.map((r) => r.id) } });
  }
  if (q.parameter) {
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Dataset" WHERE EXISTS (SELECT 1 FROM unnest(parameters) p WHERE p ILIKE ${"%" + q.parameter + "%"})`;
    arrayFilters.push({ id: { in: ids.map((r) => r.id) } });
  }
  const where: Prisma.DatasetWhereInput = {
    ...statusWhere(q.status, user),
    ...(q.region ? { region: q.region } : {}),
    ...(q.accessLevel ? { accessLevel: q.accessLevel } : {}),
    ...(q.expeditionId ? { expeditionId: q.expeditionId } : {}),
    ...taxonomyWhere(q),
    AND: [
      ...arrayFilters,
      ...(q.from ? [{ OR: [{ temporalEnd: null }, { temporalEnd: { gte: new Date(q.from) } }] }] : []),
      ...(q.to ? [{ OR: [{ temporalStart: null }, { temporalStart: { lte: new Date(q.to) } }] }] : []),
      ...(q.q ? [textWhere(q.q, ["title", "summary"])] : []),
    ],
  };
  const orderBy: Prisma.DatasetOrderByWithRelationInput[] =
    q.sort === "title"
      ? [{ title: "asc" }]
      : q.sort === "downloads"
        ? [{ downloadCount: "desc" }, { id: "asc" }]
        : q.sort === "oldest"
          ? [{ publishedAt: { sort: "asc", nulls: "last" } }, { id: "asc" }]
          : [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.dataset.findMany({ where, orderBy, include: datasetSummaryInclude, ...pageArgs(q.page, q.limit) }),
    prisma.dataset.count({ where }),
  ]);
  return page(rows.map(toDatasetSummary), q, total);
}

export async function getDataset(idOrSlugValue: string, user: UserRow | null) {
  const row = assertVisible(await prisma.dataset.findFirst({ where: idOrSlug(idOrSlugValue), include: datasetDetailInclude }), user, "Dataset");
  return { success: true as const, data: toDataset(row) };
}

// ─── Media ──────────────────────────────────────────────────────────────────

export async function listMediaAssets(q: QueryOf<"listMediaAssets">, user: UserRow | null) {
  const where: Prisma.MediaAssetWhereInput = {
    ...statusWhere(q.status, user),
    ...(q.region ? { region: q.region } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.featured !== undefined ? { featured: q.featured } : {}),
    ...(q.expeditionId ? { expeditionId: q.expeditionId } : {}),
    ...taxonomyWhere(q),
    ...textWhere(q.q, ["title", "description", "altText"]),
  };
  const orderBy: Prisma.MediaAssetOrderByWithRelationInput[] =
    q.sort === "capturedAt"
      ? [{ capturedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }]
      : q.sort === "oldest"
        ? [{ publishedAt: { sort: "asc", nulls: "last" } }, { id: "asc" }]
        : [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.mediaAsset.findMany({ where, orderBy, ...pageArgs(q.page, q.limit) }),
    prisma.mediaAsset.count({ where }),
  ]);
  return page(rows.map(toMediaSummary), q, total);
}

export async function getMediaAsset(idOrSlugValue: string, user: UserRow | null) {
  const row = assertVisible(await prisma.mediaAsset.findFirst({ where: idOrSlug(idOrSlugValue), include: mediaDetailInclude }), user, "Media asset");
  return { success: true as const, data: toMedia(row) };
}

// ─── Activities ─────────────────────────────────────────────────────────────

export async function listActivities(q: QueryOf<"listActivities">, user: UserRow | null) {
  const now = new Date();
  const dateRange = (field: "startsAt" | "publishedAt") => ({
    [field]: {
      ...(q.from ? { gte: new Date(`${q.from}T00:00:00.000Z`) } : {}),
      ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999Z`) } : {}),
    },
  });
  const where: Prisma.ActivityWhereInput = {
    ...statusWhere(q.status, user),
    ...(q.region ? { region: q.region } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...taxonomyWhere(q),
    AND: [
      ...(q.upcoming === true ? [{ startsAt: { gt: now } }] : []),
      ...(q.upcoming === false ? [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }] : []),
      ...(q.from || q.to ? [{ OR: [dateRange("startsAt"), { startsAt: null, ...dateRange("publishedAt") }] }] : []),
      ...(q.q ? [textWhere(q.q, ["title", "summary"])] : []),
    ],
  };
  const orderBy: Prisma.ActivityOrderByWithRelationInput[] =
    q.upcoming || q.sort === "startsAt"
      ? [{ startsAt: { sort: "asc", nulls: "last" } }, { id: "asc" }]
      : q.sort === "oldest"
        ? [{ publishedAt: { sort: "asc", nulls: "last" } }, { id: "asc" }]
        : [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  const [rows, total] = await prisma.$transaction([
    prisma.activity.findMany({ where, orderBy, include: activitySummaryInclude, ...pageArgs(q.page, q.limit) }),
    prisma.activity.count({ where }),
  ]);
  return page(rows.map(toActivitySummary), q, total);
}

export async function getActivity(idOrSlugValue: string, user: UserRow | null) {
  const row = assertVisible(await prisma.activity.findFirst({ where: idOrSlug(idOrSlugValue), include: activityDetailInclude }), user, "Activity");
  return { success: true as const, data: toActivity(row) };
}
