/**
 * Database row → API contract mappers. The ONLY place where Prisma shapes are
 * converted to the shapes in src/contracts. Never return Prisma rows directly.
 */
import type { Prisma, User as UserRow } from "@/generated/prisma/client";
import { AI_DISCLAIMER } from "@/contracts/schemas/ai";
import { excerpt, formatCitation } from "@/lib/citation";
import type {
  ActivitySummary,
  AIOutreachContent,
  AISummaryRef,
  Author,
  CategoryRef,
  Dataset,
  DatasetSummary,
  Expedition,
  ExpeditionSummary,
  FileRef,
  ImageRef,
  InstitutionalActivity,
  MediaAsset,
  MediaAssetSummary,
  OutreachSummary,
  Publication,
  PublicationSummary,
  User,
  UserSummary,
} from "@/types/api";

// ─── Primitives ─────────────────────────────────────────────────────────────

export const iso = (d: Date) => d.toISOString();
export const isoOrNull = (d: Date | null | undefined) => (d ? d.toISOString() : null);
/** @db.Date columns come back as UTC-midnight Dates. */
export const dateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export function imageRef(p: {
  url: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  credit: string | null;
}): ImageRef | null {
  if (!p.url) return null;
  return { url: p.url, alt: p.alt ?? "", width: p.width, height: p.height, credit: p.credit };
}

export const fileDownloadUrl = (id: string) => `/api/v1/files/${id}/download`;

export function toFileRef(f: { id: string; fileName: string; contentType: string; sizeBytes: bigint; accessLevel: FileRef["accessLevel"] }): FileRef {
  return {
    id: f.id,
    fileName: f.fileName,
    contentType: f.contentType,
    sizeBytes: Number(f.sizeBytes),
    accessLevel: f.accessLevel,
    downloadUrl: fileDownloadUrl(f.id),
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function toUser(u: UserRow): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    affiliation: u.affiliation,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    createdAt: iso(u.createdAt),
    lastLoginAt: isoOrNull(u.lastLoginAt),
  };
}

export function toUserSummary(u: Pick<UserRow, "id" | "name" | "affiliation" | "avatarUrl">): UserSummary {
  return { id: u.id, name: u.name, affiliation: u.affiliation, avatarUrl: u.avatarUrl };
}

// ─── Shared selects ─────────────────────────────────────────────────────────

export const taxonomySelect = {
  categories: { select: { id: true, slug: true, name: true }, orderBy: { sortOrder: "asc" } },
  keywords: { select: { label: true }, orderBy: { label: "asc" } },
} as const satisfies Prisma.ExpeditionInclude;

const toCategoryRefs = (cs: { id: string; slug: string; name: string }[]): CategoryRef[] => cs.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
const toKeywords = (ks: { label: string }[]) => ks.map((k) => k.label);

const meta = (r: { status: ExpeditionSummary["status"]; publishedAt: Date | null; createdAt: Date; updatedAt: Date }) => ({
  status: r.status,
  publishedAt: isoOrNull(r.publishedAt),
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const expeditionRef = (e: { id: string; slug: string; title: string; year: number } | null) =>
  e ? { id: e.id, slug: e.slug, title: e.title, year: e.year } : null;

// ─── Expeditions ────────────────────────────────────────────────────────────

export const expeditionSummaryInclude = taxonomySelect;
type ExpeditionRow = Prisma.ExpeditionGetPayload<{ include: typeof expeditionSummaryInclude }>;

export function toExpeditionSummary(e: ExpeditionRow): ExpeditionSummary {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    region: e.region,
    phase: e.phase,
    year: e.year,
    startDate: dateOnly(e.startDate),
    endDate: dateOnly(e.endDate),
    station: e.station,
    vessel: e.vessel,
    coverImage: imageRef({ url: e.coverImageUrl, alt: e.coverImageAlt, width: e.coverImageWidth, height: e.coverImageHeight, credit: e.coverImageCredit }),
    categories: toCategoryRefs(e.categories),
    keywords: toKeywords(e.keywords),
    ...meta(e),
  };
}

export function toExpedition(e: ExpeditionRow, counts: Expedition["counts"]): Expedition {
  return {
    ...toExpeditionSummary(e),
    description: e.description,
    objectives: e.objectives,
    leadInstitution: e.leadInstitution,
    chiefScientist: e.chiefScientist,
    participantCount: e.participantCount,
    location: e.latitude !== null && e.longitude !== null ? { latitude: e.latitude, longitude: e.longitude, label: e.locationLabel } : null,
    counts,
  };
}

// ─── Publications ───────────────────────────────────────────────────────────

export const publicationSummaryInclude = { ...taxonomySelect, pdfFile: { select: { id: true } } } as const satisfies Prisma.PublicationInclude;
export const publicationDetailInclude = {
  ...taxonomySelect,
  pdfFile: true,
  expedition: { select: { id: true, slug: true, title: true, year: true } },
  datasets: { where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } },
} as const satisfies Prisma.PublicationInclude;

type PublicationSummaryRow = Prisma.PublicationGetPayload<{ include: typeof publicationSummaryInclude }>;
type PublicationDetailRow = Prisma.PublicationGetPayload<{ include: typeof publicationDetailInclude }>;

export function parseAuthors(json: Prisma.JsonValue): Author[] {
  if (!Array.isArray(json)) return [];
  return json.map((a) => {
    const o = (a ?? {}) as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      affiliation: typeof o.affiliation === "string" ? o.affiliation : null,
      orcid: typeof o.orcid === "string" ? o.orcid : null,
    };
  });
}

export function toPublicationSummary(p: PublicationSummaryRow | PublicationDetailRow): PublicationSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    abstractPreview: excerpt(p.abstract, 220),
    authors: parseAuthors(p.authors),
    type: p.type,
    year: p.year,
    venue: p.venue,
    doi: p.doi,
    region: p.region,
    accessLevel: p.accessLevel,
    hasFullText: Boolean(p.pdfFile),
    categories: toCategoryRefs(p.categories),
    keywords: toKeywords(p.keywords),
    ...meta(p),
  };
}

export function toPublication(p: PublicationDetailRow, aiSummary: AISummaryRef | null): Publication {
  const summary = toPublicationSummary(p);
  return {
    ...summary,
    abstract: p.abstract,
    publicationDate: dateOnly(p.publicationDate),
    volume: p.volume,
    issue: p.issue,
    pages: p.pages,
    publisher: p.publisher,
    externalUrl: p.externalUrl,
    pdf: p.pdfFile && p.pdfFile.status === "READY" ? toFileRef(p.pdfFile) : null,
    expedition: expeditionRef(p.expedition),
    datasets: p.datasets.map((d) => ({ id: d.id, slug: d.slug, title: d.title })),
    citation: formatCitation({
      title: p.title,
      authors: summary.authors,
      year: p.year,
      venue: p.venue,
      volume: p.volume,
      issue: p.issue,
      pages: p.pages,
      publisher: p.publisher,
      doi: p.doi,
      slug: p.slug,
      kind: "publication",
    }),
    aiSummary,
  };
}

// ─── Datasets ───────────────────────────────────────────────────────────────

export const datasetSummaryInclude = {
  ...taxonomySelect,
  files: { where: { status: "READY" }, select: { sizeBytes: true } },
} as const satisfies Prisma.DatasetInclude;
export const datasetDetailInclude = {
  ...taxonomySelect,
  files: { where: { status: "READY" }, orderBy: { fileName: "asc" } },
  expedition: { select: { id: true, slug: true, title: true, year: true } },
  publications: { where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true, year: true }, orderBy: { year: "desc" } },
  owner: { select: { name: true } },
} as const satisfies Prisma.DatasetInclude;

type DatasetSummaryRow = Prisma.DatasetGetPayload<{ include: typeof datasetSummaryInclude }>;
type DatasetDetailRow = Prisma.DatasetGetPayload<{ include: typeof datasetDetailInclude }>;

export function toDatasetSummary(d: DatasetSummaryRow | DatasetDetailRow): DatasetSummary {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    summary: d.summary,
    region: d.region,
    parameters: d.parameters,
    formats: d.formats,
    temporalCoverage: { start: dateOnly(d.temporalStart), end: dateOnly(d.temporalEnd) },
    accessLevel: d.accessLevel,
    license: d.license,
    doi: d.doi,
    version: d.version,
    fileCount: d.files.length,
    totalSizeBytes: d.files.reduce((s, f) => s + Number(f.sizeBytes), 0),
    downloadCount: d.downloadCount,
    categories: toCategoryRefs(d.categories),
    keywords: toKeywords(d.keywords),
    ...meta(d),
  };
}

export function toDataset(d: DatasetDetailRow): Dataset {
  const hasBox = d.bboxWest !== null && d.bboxSouth !== null && d.bboxEast !== null && d.bboxNorth !== null;
  return {
    ...toDatasetSummary(d),
    description: d.description,
    spatialCoverage: hasBox ? { west: d.bboxWest!, south: d.bboxSouth!, east: d.bboxEast!, north: d.bboxNorth! } : null,
    files: d.files.map(toFileRef),
    expedition: expeditionRef(d.expedition),
    relatedPublications: d.publications.map((p) => ({ id: p.id, slug: p.slug, title: p.title, year: p.year })),
    contact: d.contactName ? { name: d.contactName, email: d.contactEmail, organization: d.contactOrganization } : null,
    citation: formatCitation({
      title: d.title,
      authors: [{ name: d.owner?.name ?? "OceanX Data Repository" }],
      year: (d.publishedAt ?? d.createdAt).getUTCFullYear(),
      version: d.version,
      publisher: d.contactOrganization,
      doi: d.doi,
      slug: d.slug,
      kind: "dataset",
    }),
  };
}

// ─── Media ──────────────────────────────────────────────────────────────────

export const mediaSummaryInclude = {} as const satisfies Prisma.MediaAssetInclude;
export const mediaDetailInclude = {
  ...taxonomySelect,
  expedition: { select: { id: true, slug: true, title: true, year: true } },
} as const satisfies Prisma.MediaAssetInclude;

type MediaRow = Prisma.MediaAssetGetPayload<object>;
type MediaDetailRow = Prisma.MediaAssetGetPayload<{ include: typeof mediaDetailInclude }>;

export function toMediaSummary(m: MediaRow): MediaAssetSummary {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    type: m.type,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    altText: m.altText,
    width: m.width,
    height: m.height,
    durationSeconds: m.durationSeconds,
    region: m.region,
    credit: m.credit,
    license: m.license,
    capturedAt: dateOnly(m.capturedAt),
    featured: m.featured,
    ...meta(m),
  };
}

export function toMedia(m: MediaDetailRow): MediaAsset {
  return {
    ...toMediaSummary(m),
    description: m.description,
    embedUrl: m.embedUrl,
    expedition: expeditionRef(m.expedition),
    location: m.latitude !== null && m.longitude !== null ? { latitude: m.latitude, longitude: m.longitude, label: m.locationLabel } : null,
    categories: toCategoryRefs(m.categories),
    keywords: toKeywords(m.keywords),
  };
}

// ─── Activities ─────────────────────────────────────────────────────────────

export const activitySummaryInclude = { categories: taxonomySelect.categories } as const satisfies Prisma.ActivityInclude;
export const activityDetailInclude = {
  ...taxonomySelect,
  attachments: { where: { status: "READY" }, orderBy: { fileName: "asc" } },
} as const satisfies Prisma.ActivityInclude;

type ActivitySummaryRow = Prisma.ActivityGetPayload<{ include: typeof activitySummaryInclude }>;
type ActivityDetailRow = Prisma.ActivityGetPayload<{ include: typeof activityDetailInclude }>;

export function toActivitySummary(a: ActivitySummaryRow | ActivityDetailRow): ActivitySummary {
  return {
    id: a.id,
    slug: a.slug,
    type: a.type,
    title: a.title,
    summary: a.summary,
    coverImage: imageRef({ url: a.coverImageUrl, alt: a.coverImageAlt, width: a.coverImageWidth, height: a.coverImageHeight, credit: a.coverImageCredit }),
    startsAt: isoOrNull(a.startsAt),
    endsAt: isoOrNull(a.endsAt),
    location: a.location,
    isOnline: a.isOnline,
    region: a.region,
    categories: toCategoryRefs(a.categories),
    ...meta(a),
  };
}

export function toActivity(a: ActivityDetailRow): InstitutionalActivity {
  return {
    ...toActivitySummary(a),
    body: a.body,
    registrationUrl: a.registrationUrl,
    externalUrl: a.externalUrl,
    attachments: a.attachments.map(toFileRef),
    keywords: toKeywords(a.keywords),
  };
}

// ─── AI content ─────────────────────────────────────────────────────────────

export const aiContentInclude = {
  generatedBy: { select: { id: true, name: true, affiliation: true, avatarUrl: true } },
  reviewedBy: { select: { id: true, name: true, affiliation: true, avatarUrl: true } },
} as const satisfies Prisma.AIContentInclude;
type AIRow = Prisma.AIContentGetPayload<{ include: typeof aiContentInclude }>;

export type AISourceInput = { type: AIOutreachContent["sources"][number]["type"]; id: string };
export type ResolvedSources = Map<string, { slug: string; title: string }>;

export function parseAISources(json: Prisma.JsonValue): AISourceInput[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((s) => (s ?? {}) as Record<string, unknown>)
    .filter((s) => typeof s.type === "string" && typeof s.id === "string")
    .map((s) => ({ type: s.type as AISourceInput["type"], id: s.id as string }));
}

export function toAIContent(a: AIRow, sources: ResolvedSources): AIOutreachContent {
  return {
    id: a.id,
    slug: a.slug,
    kind: a.kind,
    title: a.title,
    body: a.body,
    audience: a.audience,
    language: a.language,
    sources: parseAISources(a.sources)
      .filter((s) => sources.has(`${s.type}:${s.id}`))
      .map((s) => ({ type: s.type, id: s.id, ...sources.get(`${s.type}:${s.id}`)! })),
    status: a.status,
    isAIGenerated: true,
    disclaimer: AI_DISCLAIMER,
    model: a.model,
    generatedBy: a.generatedBy ? toUserSummary(a.generatedBy) : null,
    reviewedBy: a.reviewedBy ? toUserSummary(a.reviewedBy) : null,
    reviewedAt: isoOrNull(a.reviewedAt),
    publishedAt: isoOrNull(a.publishedAt),
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

export function toOutreachSummary(a: Pick<AIRow, "id" | "slug" | "kind" | "title" | "body" | "audience" | "language" | "publishedAt">): OutreachSummary {
  return {
    id: a.id,
    slug: a.slug,
    kind: a.kind,
    title: a.title,
    audience: a.audience,
    language: a.language,
    isAIGenerated: true,
    publishedAt: isoOrNull(a.publishedAt),
    excerpt: excerpt(a.body, 240),
  };
}

export function toAISummaryRef(a: Pick<AIRow, "id" | "body" | "audience" | "language" | "model" | "reviewedAt">): AISummaryRef {
  return {
    id: a.id,
    text: a.body,
    audience: a.audience,
    language: a.language,
    model: a.model,
    reviewedAt: isoOrNull(a.reviewedAt),
    disclaimer: AI_DISCLAIMER,
  };
}
