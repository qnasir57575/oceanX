import { ExpeditionSummarySchema } from "@/contracts/schemas/expeditions";
import { PublicationSummarySchema } from "@/contracts/schemas/publications";
import { DatasetSummarySchema } from "@/contracts/schemas/datasets";
import { MediaAssetSummarySchema } from "@/contracts/schemas/media";
import { ActivitySummarySchema } from "@/contracts/schemas/activities";
import { excerpt, formatCitation } from "@/lib/citation";
import { slugify } from "@/lib/slug";
import type {
  CategoryRef,
  Dataset,
  Expedition,
  ImageRef,
  InstitutionalActivity,
  MediaAsset,
  Publication,
  User,
} from "@/types/api";
import type { Fixtures } from "../data/fixtures";
import {
  MockHttpError,
  assertCanEdit,
  byDateAsc,
  byDateDesc,
  conflict,
  findById,
  findVisible,
  forbidden,
  isStaff,
  newId,
  nowIso,
  ok,
  paginate,
  statusFilter,
  summarize,
  taxonomyMatch,
  textMatch,
  yearMatch,
  type MockHandler,
} from "./helpers";

// ─── Shared mapping helpers ─────────────────────────────────────────────────

function categoryRefs(store: Fixtures, ids: string[] | undefined): CategoryRef[] | undefined {
  if (!ids) return undefined;
  return ids.map((id) => {
    const c = store.categories.find((x) => x.id === id);
    if (!c) throw new MockHttpError(422, "Unknown category.", { fieldErrors: { categoryIds: [`Unknown category ${id}`] } });
    return { id: c.id, slug: c.slug, name: c.name };
  });
}

function imageRef(input: { url: string; alt: string; width?: number | null; height?: number | null; credit?: string | null } | null | undefined): ImageRef | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  return { url: input.url, alt: input.alt, width: input.width ?? null, height: input.height ?? null, credit: input.credit ?? null };
}

function uniqueSlug(items: { id: string; slug: string }[], desired: string, selfId?: string): string {
  const taken = (s: string) => items.some((i) => i.slug === s && i.id !== selfId);
  if (!taken(desired)) return desired;
  throw conflict(`The slug "${desired}" is already in use.`, "SLUG_TAKEN");
}

/** Remove undefined values so partial updates only touch provided fields. */
function defined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function applyStatus<T extends { status: string; publishedAt: string | null }>(record: T, status: T["status"] | undefined, user: User | null) {
  if (status === undefined) return;
  if (!isStaff(user)) throw forbidden("Only EDITOR/ADMIN can change `status` directly. Use POST /submissions.");
  record.status = status;
  if (status === "PUBLISHED" && !record.publishedAt) record.publishedAt = nowIso();
}

function archive(store: Fixtures, record: { id: string; status: string }, user: User | null) {
  if (!isStaff(user) && !(user && store.owners[record.id] === user.id && record.status === "DRAFT")) {
    throw forbidden("Only EDITOR/ADMIN, or the owner of a DRAFT, can archive this record.");
  }
  record.status = "ARCHIVED";
  return ok({ id: record.id, deleted: true as const });
}

// ─── Expeditions ────────────────────────────────────────────────────────────

function withCounts(store: Fixtures, e: Expedition): Expedition {
  const pub = (xs: { status: string; expedition: { id: string } | null }[]) =>
    xs.filter((x) => x.status === "PUBLISHED" && x.expedition?.id === e.id).length;
  return { ...e, counts: { publications: pub(store.publications), datasets: pub(store.datasets), media: pub(store.media) } };
}

export const listExpeditions: MockHandler<"listExpeditions"> = ({ query: q, store, user }) => {
  const items = statusFilter(store.expeditions, q.status, user)
    .filter((e) => (!q.region || e.region === q.region) && (!q.phase || e.phase === q.phase))
    .filter((e) => yearMatch(e.year, q) && taxonomyMatch(e, q, slugify) && textMatch(q.q, e.title, e.summary))
    .sort(
      q.sort === "title"
        ? (a, b) => a.title.localeCompare(b.title)
        : q.sort === "startDate"
          ? byDateDesc((e) => e.startDate)
          : q.sort === "oldest"
            ? (a, b) => a.year - b.year || (a.startDate ?? "").localeCompare(b.startDate ?? "")
            : (a, b) => b.year - a.year || (b.startDate ?? "").localeCompare(a.startDate ?? ""),
    );
  return paginate(items.map((e) => summarize(ExpeditionSummarySchema, e)), q.page, q.limit);
};

export const getExpedition: MockHandler<"getExpedition"> = ({ params, store, user }) =>
  ok(withCounts(store, findVisible(store.expeditions, params.id, user, store.owners, "Expedition")));

export const createExpedition: MockHandler<"createExpedition"> = ({ body, store, user }) => {
  const now = nowIso();
  const id = newId("exp");
  const { categoryIds, keywords, coverImage, location, slug, phase, ...rest } = body;
  const record: Expedition = {
    station: null,
    vessel: null,
    startDate: null,
    endDate: null,
    leadInstitution: null,
    chiefScientist: null,
    participantCount: null,
    objectives: [],
    ...defined(rest),
    title: body.title,
    summary: body.summary,
    description: body.description,
    region: body.region,
    year: body.year,
    id,
    slug: uniqueSlug(store.expeditions, slug ?? slugify(body.title)),
    phase: phase ?? "PLANNED",
    coverImage: imageRef(coverImage) ?? null,
    location: location ? { latitude: location.latitude, longitude: location.longitude, label: location.label ?? null } : null,
    categories: categoryRefs(store, categoryIds) ?? [],
    keywords: keywords ?? [],
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    counts: { publications: 0, datasets: 0, media: 0 },
  };
  store.expeditions.push(record);
  store.owners[id] = user!.id;
  return ok(record);
};

export const updateExpedition: MockHandler<"updateExpedition"> = ({ params, body, store, user }) => {
  const record = findById(store.expeditions, params.id, "Expedition");
  assertCanEdit(record, user, store.owners);
  const { categoryIds, keywords, coverImage, location, slug, status, ...rest } = body;
  Object.assign(record, defined(rest), defined({
    slug: slug ? uniqueSlug(store.expeditions, slug, record.id) : undefined,
    categories: categoryRefs(store, categoryIds),
    keywords,
    coverImage: imageRef(coverImage),
    location: location === undefined ? undefined : location && { latitude: location.latitude, longitude: location.longitude, label: location.label ?? null },
  }));
  applyStatus(record, status, user);
  record.updatedAt = nowIso();
  return ok(withCounts(store, record));
};

export const deleteExpedition: MockHandler<"deleteExpedition"> = ({ params, store, user }) =>
  archive(store, findById(store.expeditions, params.id, "Expedition"), user);

// ─── Publications ───────────────────────────────────────────────────────────

export const listPublications: MockHandler<"listPublications"> = ({ query: q, store, user }) => {
  const items = statusFilter(store.publications, q.status, user)
    .filter((p) => (!q.region || p.region === q.region) && (!q.type || p.type === q.type))
    .filter((p) => !q.expeditionId || p.expedition?.id === q.expeditionId)
    .filter((p) => !q.author || p.authors.some((a) => a.name.toLowerCase().includes(q.author!.toLowerCase())))
    .filter((p) => yearMatch(p.year, q) && taxonomyMatch(p, q, slugify))
    .filter((p) => textMatch(q.q, p.title, p.abstract, ...p.authors.map((a) => a.name)))
    .sort(q.sort === "title" ? (a, b) => a.title.localeCompare(b.title) : q.sort === "oldest" ? (a, b) => a.year - b.year : (a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return paginate(items.map((p) => summarize(PublicationSummarySchema, p)), q.page, q.limit);
};

export const getPublication: MockHandler<"getPublication"> = ({ params, store, user }) =>
  ok(findVisible(store.publications, params.id, user, store.owners, "Publication"));

function publicationCitation(p: Publication) {
  return formatCitation({ ...p, kind: "publication" });
}

export const createPublication: MockHandler<"createPublication"> = ({ body, store, user }) => {
  if (body.doi && store.publications.some((p) => p.doi === body.doi)) throw conflict("A publication with this DOI already exists.", "DOI_TAKEN");
  const now = nowIso();
  const id = newId("pub");
  const pdfFile = body.pdfFileId ? findById(store.files, body.pdfFileId, "File") : null;
  const expedition = body.expeditionId ? findById(store.expeditions, body.expeditionId, "Expedition") : null;
  const authors = body.authors.map((a) => ({ name: a.name, affiliation: a.affiliation ?? null, orcid: a.orcid ?? null }));
  const record: Publication = {
    id,
    slug: uniqueSlug(store.publications, body.slug ?? slugify(body.title)),
    title: body.title,
    abstract: body.abstract,
    abstractPreview: excerpt(body.abstract, 220),
    authors,
    type: body.type,
    year: body.year,
    venue: body.venue ?? null,
    doi: body.doi ?? null,
    region: body.region ?? null,
    accessLevel: body.accessLevel ?? "OPEN",
    hasFullText: Boolean(pdfFile),
    categories: categoryRefs(store, body.categoryIds) ?? [],
    keywords: body.keywords ?? [],
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    publicationDate: body.publicationDate ?? null,
    volume: body.volume ?? null,
    issue: body.issue ?? null,
    pages: body.pages ?? null,
    publisher: body.publisher ?? null,
    externalUrl: body.externalUrl ?? null,
    pdf: pdfFile && { id: pdfFile.id, fileName: pdfFile.fileName, contentType: pdfFile.contentType, sizeBytes: pdfFile.sizeBytes, accessLevel: pdfFile.accessLevel, downloadUrl: pdfFile.downloadUrl },
    expedition: expedition && { id: expedition.id, slug: expedition.slug, title: expedition.title, year: expedition.year },
    datasets: (body.datasetIds ?? []).map((dsId) => {
      const d = findById(store.datasets, dsId, "Dataset");
      return { id: d.id, slug: d.slug, title: d.title };
    }),
    citation: { apa: "", bibtex: "" },
    aiSummary: null,
  };
  record.citation = publicationCitation(record);
  store.publications.push(record);
  store.owners[id] = user!.id;
  return ok(record);
};

export const updatePublication: MockHandler<"updatePublication"> = ({ params, body, store, user }) => {
  const record = findById(store.publications, params.id, "Publication");
  assertCanEdit(record, user, store.owners);
  const { categoryIds, keywords, slug, status, authors, pdfFileId, expeditionId, datasetIds, ...rest } = body;
  if (rest.doi && store.publications.some((p) => p.doi === rest.doi && p.id !== record.id)) throw conflict("A publication with this DOI already exists.", "DOI_TAKEN");
  Object.assign(record, defined(rest), defined({
    slug: slug ? uniqueSlug(store.publications, slug, record.id) : undefined,
    categories: categoryRefs(store, categoryIds),
    keywords,
    authors: authors?.map((a) => ({ name: a.name, affiliation: a.affiliation ?? null, orcid: a.orcid ?? null })),
    abstractPreview: rest.abstract ? excerpt(rest.abstract, 220) : undefined,
  }));
  if (pdfFileId !== undefined) {
    const f = pdfFileId ? findById(store.files, pdfFileId, "File") : null;
    record.pdf = f && { id: f.id, fileName: f.fileName, contentType: f.contentType, sizeBytes: f.sizeBytes, accessLevel: f.accessLevel, downloadUrl: f.downloadUrl };
    record.hasFullText = Boolean(f);
  }
  if (expeditionId !== undefined) {
    const e = expeditionId ? findById(store.expeditions, expeditionId, "Expedition") : null;
    record.expedition = e && { id: e.id, slug: e.slug, title: e.title, year: e.year };
  }
  if (datasetIds) record.datasets = datasetIds.map((dsId) => { const d = findById(store.datasets, dsId, "Dataset"); return { id: d.id, slug: d.slug, title: d.title }; });
  applyStatus(record, status, user);
  record.citation = publicationCitation(record);
  record.updatedAt = nowIso();
  return ok(record);
};

export const deletePublication: MockHandler<"deletePublication"> = ({ params, store, user }) =>
  archive(store, findById(store.publications, params.id, "Publication"), user);

// ─── Datasets ───────────────────────────────────────────────────────────────

const overlaps = (cov: { start: string | null; end: string | null }, from?: string, to?: string) =>
  (!from || !cov.end || cov.end >= from) && (!to || !cov.start || cov.start <= to);

export const listDatasets: MockHandler<"listDatasets"> = ({ query: q, store, user }) => {
  const items = statusFilter(store.datasets, q.status, user)
    .filter((d) => (!q.region || d.region === q.region) && (!q.accessLevel || d.accessLevel === q.accessLevel))
    .filter((d) => !q.expeditionId || d.expedition?.id === q.expeditionId)
    .filter((d) => !q.format || d.formats.some((f) => f.toLowerCase() === q.format!.toLowerCase()))
    .filter((d) => !q.parameter || d.parameters.some((p) => p.toLowerCase().includes(q.parameter!.toLowerCase())))
    .filter((d) => overlaps(d.temporalCoverage, q.from, q.to) && taxonomyMatch(d, q, slugify))
    .filter((d) => textMatch(q.q, d.title, d.summary, ...d.parameters))
    .sort(
      q.sort === "title" ? (a, b) => a.title.localeCompare(b.title)
        : q.sort === "downloads" ? (a, b) => b.downloadCount - a.downloadCount
          : q.sort === "oldest" ? byDateAsc((d) => d.publishedAt)
            : byDateDesc((d) => d.publishedAt),
    );
  return paginate(items.map((d) => summarize(DatasetSummarySchema, d)), q.page, q.limit);
};

export const getDataset: MockHandler<"getDataset"> = ({ params, store, user }) =>
  ok(findVisible(store.datasets, params.id, user, store.owners, "Dataset"));

function datasetFiles(store: Fixtures, ids: string[]) {
  return ids.map((id) => {
    const f = findById(store.files, id, "File");
    return { id: f.id, fileName: f.fileName, contentType: f.contentType, sizeBytes: f.sizeBytes, accessLevel: f.accessLevel, downloadUrl: f.downloadUrl };
  });
}

export const createDataset: MockHandler<"createDataset"> = ({ body, store, user }) => {
  const now = nowIso();
  const id = newId("ds");
  const files = datasetFiles(store, body.fileIds ?? []);
  const expedition = body.expeditionId ? findById(store.expeditions, body.expeditionId, "Expedition") : null;
  const record: Dataset = {
    id,
    slug: uniqueSlug(store.datasets, body.slug ?? slugify(body.title)),
    title: body.title,
    summary: body.summary,
    description: body.description,
    region: body.region,
    parameters: body.parameters ?? [],
    formats: body.formats ?? [],
    temporalCoverage: body.temporalCoverage ?? { start: null, end: null },
    spatialCoverage: body.spatialCoverage ?? null,
    accessLevel: body.accessLevel ?? "OPEN",
    license: body.license,
    doi: body.doi ?? null,
    version: body.version ?? null,
    fileCount: files.length,
    totalSizeBytes: files.reduce((s, f) => s + f.sizeBytes, 0),
    downloadCount: 0,
    categories: categoryRefs(store, body.categoryIds) ?? [],
    keywords: body.keywords ?? [],
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    files,
    expedition: expedition && { id: expedition.id, slug: expedition.slug, title: expedition.title, year: expedition.year },
    relatedPublications: (body.publicationIds ?? []).map((pid) => { const p = findById(store.publications, pid, "Publication"); return { id: p.id, slug: p.slug, title: p.title, year: p.year }; }),
    contact: body.contact ? { name: body.contact.name, email: body.contact.email ?? null, organization: body.contact.organization ?? null } : null,
    citation: { apa: "", bibtex: "" },
  };
  record.citation = formatCitation({ title: record.title, authors: [{ name: user!.name }], year: new Date(now).getUTCFullYear(), version: record.version, doi: record.doi, slug: record.slug, kind: "dataset" });
  store.datasets.push(record);
  store.owners[id] = user!.id;
  return ok(record);
};

export const updateDataset: MockHandler<"updateDataset"> = ({ params, body, store, user }) => {
  const record = findById(store.datasets, params.id, "Dataset");
  assertCanEdit(record, user, store.owners);
  const { categoryIds, keywords, slug, status, fileIds, expeditionId, publicationIds, contact, ...rest } = body;
  Object.assign(record, defined(rest), defined({
    slug: slug ? uniqueSlug(store.datasets, slug, record.id) : undefined,
    categories: categoryRefs(store, categoryIds),
    keywords,
    contact: contact === undefined ? undefined : contact && { name: contact.name, email: contact.email ?? null, organization: contact.organization ?? null },
  }));
  if (fileIds) {
    record.files = datasetFiles(store, fileIds);
    record.fileCount = record.files.length;
    record.totalSizeBytes = record.files.reduce((s, f) => s + f.sizeBytes, 0);
  }
  if (expeditionId !== undefined) {
    const e = expeditionId ? findById(store.expeditions, expeditionId, "Expedition") : null;
    record.expedition = e && { id: e.id, slug: e.slug, title: e.title, year: e.year };
  }
  if (publicationIds) record.relatedPublications = publicationIds.map((pid) => { const p = findById(store.publications, pid, "Publication"); return { id: p.id, slug: p.slug, title: p.title, year: p.year }; });
  applyStatus(record, status, user);
  record.updatedAt = nowIso();
  return ok(record);
};

export const deleteDataset: MockHandler<"deleteDataset"> = ({ params, store, user }) =>
  archive(store, findById(store.datasets, params.id, "Dataset"), user);

// ─── Media ──────────────────────────────────────────────────────────────────

export const listMediaAssets: MockHandler<"listMediaAssets"> = ({ query: q, store, user }) => {
  const items = statusFilter(store.media, q.status, user)
    .filter((m) => (!q.region || m.region === q.region) && (!q.type || m.type === q.type))
    .filter((m) => q.featured === undefined || m.featured === q.featured)
    .filter((m) => !q.expeditionId || m.expedition?.id === q.expeditionId)
    .filter((m) => taxonomyMatch(m, q, slugify) && textMatch(q.q, m.title, m.description, m.altText))
    .sort(q.sort === "capturedAt" ? byDateDesc((m) => m.capturedAt) : q.sort === "oldest" ? byDateAsc((m) => m.publishedAt) : byDateDesc((m) => m.publishedAt));
  return paginate(items.map((m) => summarize(MediaAssetSummarySchema, m)), q.page, q.limit);
};

export const getMediaAsset: MockHandler<"getMediaAsset"> = ({ params, store, user }) =>
  ok(findVisible(store.media, params.id, user, store.owners, "Media asset"));

export const createMediaAsset: MockHandler<"createMediaAsset"> = ({ body, store, user }) => {
  if (body.featured && !isStaff(user)) throw forbidden("Only EDITOR/ADMIN can feature media.");
  const now = nowIso();
  const id = newId("med");
  const file = body.fileId ? findById(store.files, body.fileId, "File") : null;
  const thumb = body.thumbnailFileId ? findById(store.files, body.thumbnailFileId, "File").downloadUrl : null;
  const expedition = body.expeditionId ? findById(store.expeditions, body.expeditionId, "Expedition") : null;
  const url = file?.downloadUrl ?? body.externalUrl!;
  const record: MediaAsset = {
    id,
    slug: uniqueSlug(store.media, body.slug ?? slugify(body.title)),
    title: body.title,
    type: body.type,
    url,
    thumbnailUrl: thumb ?? (body.type === "IMAGE" ? url : "/demo/polar-1.svg"),
    altText: body.altText,
    width: null,
    height: null,
    durationSeconds: null,
    region: body.region ?? null,
    credit: body.credit ?? null,
    license: body.license ?? null,
    capturedAt: body.capturedAt ?? null,
    featured: body.featured ?? false,
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    description: body.description ?? null,
    embedUrl: body.embedUrl ?? null,
    expedition: expedition && { id: expedition.id, slug: expedition.slug, title: expedition.title, year: expedition.year },
    location: body.location ? { latitude: body.location.latitude, longitude: body.location.longitude, label: body.location.label ?? null } : null,
    categories: categoryRefs(store, body.categoryIds) ?? [],
    keywords: body.keywords ?? [],
  };
  store.media.push(record);
  store.owners[id] = user!.id;
  return ok(record);
};

export const updateMediaAsset: MockHandler<"updateMediaAsset"> = ({ params, body, store, user }) => {
  const record = findById(store.media, params.id, "Media asset");
  assertCanEdit(record, user, store.owners);
  if (body.featured !== undefined && !isStaff(user)) throw forbidden("Only EDITOR/ADMIN can feature media.");
  const { categoryIds, keywords, slug, status, location, fileId, thumbnailFileId, expeditionId, externalUrl, ...rest } = body;
  Object.assign(record, defined(rest), defined({
    slug: slug ? uniqueSlug(store.media, slug, record.id) : undefined,
    categories: categoryRefs(store, categoryIds),
    keywords,
    url: fileId ? findById(store.files, fileId, "File").downloadUrl : (externalUrl ?? undefined),
    thumbnailUrl: thumbnailFileId ? findById(store.files, thumbnailFileId, "File").downloadUrl : undefined,
    location: location === undefined ? undefined : location && { latitude: location.latitude, longitude: location.longitude, label: location.label ?? null },
  }));
  if (expeditionId !== undefined) {
    const e = expeditionId ? findById(store.expeditions, expeditionId, "Expedition") : null;
    record.expedition = e && { id: e.id, slug: e.slug, title: e.title, year: e.year };
  }
  applyStatus(record, status, user);
  record.updatedAt = nowIso();
  return ok(record);
};

export const deleteMediaAsset: MockHandler<"deleteMediaAsset"> = ({ params, store, user }) =>
  archive(store, findById(store.media, params.id, "Media asset"), user);

// ─── Activities ─────────────────────────────────────────────────────────────

const activityDate = (a: InstitutionalActivity) => a.startsAt ?? a.publishedAt;

export const listActivities: MockHandler<"listActivities"> = ({ query: q, store, user, now }) => {
  const nowIsoStr = now.toISOString();
  let items = statusFilter(store.activities, q.status, user)
    .filter((a) => (!q.region || a.region === q.region) && (!q.type || a.type === q.type))
    .filter((a) => q.upcoming === undefined || (q.upcoming ? Boolean(a.startsAt && a.startsAt > nowIsoStr) : !(a.startsAt && a.startsAt > nowIsoStr)))
    .filter((a) => {
      const d = activityDate(a)?.slice(0, 10);
      return (!q.from || (d && d >= q.from)) && (!q.to || (d && d <= q.to));
    })
    .filter((a) => taxonomyMatch(a, q, slugify) && textMatch(q.q, a.title, a.summary));
  items = items.sort(
    q.upcoming || q.sort === "startsAt" ? byDateAsc(activityDate) : q.sort === "oldest" ? byDateAsc((a) => a.publishedAt) : byDateDesc((a) => a.publishedAt),
  );
  return paginate(items.map((a) => summarize(ActivitySummarySchema, a)), q.page, q.limit);
};

export const getActivity: MockHandler<"getActivity"> = ({ params, store, user }) =>
  ok(findVisible(store.activities, params.id, user, store.owners, "Activity"));

export const createActivity: MockHandler<"createActivity"> = ({ body, store, user }) => {
  const now = nowIso();
  const id = newId("act");
  const record: InstitutionalActivity = {
    id,
    slug: uniqueSlug(store.activities, body.slug ?? slugify(body.title)),
    type: body.type,
    title: body.title,
    summary: body.summary,
    body: body.body,
    coverImage: imageRef(body.coverImage) ?? null,
    startsAt: body.startsAt ?? null,
    endsAt: body.endsAt ?? null,
    location: body.location ?? null,
    isOnline: body.isOnline ?? false,
    region: body.region ?? null,
    categories: categoryRefs(store, body.categoryIds) ?? [],
    keywords: body.keywords ?? [],
    registrationUrl: body.registrationUrl ?? null,
    externalUrl: body.externalUrl ?? null,
    attachments: datasetFiles(store, body.attachmentFileIds ?? []),
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  store.activities.push(record);
  store.owners[id] = user!.id;
  return ok(record);
};

export const updateActivity: MockHandler<"updateActivity"> = ({ params, body, store, user }) => {
  const record = findById(store.activities, params.id, "Activity");
  const { categoryIds, keywords, slug, status, coverImage, attachmentFileIds, ...rest } = body;
  Object.assign(record, defined(rest), defined({
    slug: slug ? uniqueSlug(store.activities, slug, record.id) : undefined,
    categories: categoryRefs(store, categoryIds),
    keywords,
    coverImage: imageRef(coverImage),
    attachments: attachmentFileIds ? datasetFiles(store, attachmentFileIds) : undefined,
  }));
  applyStatus(record, status, user);
  record.updatedAt = nowIso();
  return ok(record);
};

export const deleteActivity: MockHandler<"deleteActivity"> = ({ params, store }) => {
  const record = findById(store.activities, params.id, "Activity");
  record.status = "ARCHIVED";
  return ok({ id: record.id, deleted: true as const });
};

