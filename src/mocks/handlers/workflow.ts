import { OutreachSummarySchema, AI_DISCLAIMER } from "@/contracts/schemas/ai";
import { UPLOAD_LIMITS } from "@/contracts/schemas/files";
import { excerpt } from "@/lib/citation";
import { slugify } from "@/lib/slug";
import type { AIOutreachContent, AISourceRef, ContentType, FileAsset, Submission, User } from "@/types/api";
import type { Fixtures } from "../data/fixtures";
import {
  MockHttpError,
  conflict,
  findById,
  forbidden,
  isStaff,
  newId,
  notFound,
  nowIso,
  ok,
  paginate,
  summarize,
  textMatch,
  toUserSummary,
  type MockHandler,
} from "./helpers";

// ─── Files ──────────────────────────────────────────────────────────────────

export const createUpload: MockHandler<"createUpload"> = ({ body, store, user, now }) => {
  if (user!.role === "MEMBER" && body.purpose !== "AVATAR") throw forbidden("Members may only upload avatars.");
  const limit = UPLOAD_LIMITS[body.purpose];
  if (body.sizeBytes > limit.maxBytes) {
    throw new MockHttpError(413, `File exceeds the ${Math.round(limit.maxBytes / 1048576)} MB limit for ${body.purpose}.`, { maxSizeBytes: limit.maxBytes });
  }
  if (!limit.contentTypes.includes(body.contentType)) {
    throw new MockHttpError(422, "This file type is not allowed for this purpose.", { fieldErrors: { contentType: [`Allowed: ${limit.contentTypes.join(", ")}`] } });
  }
  const id = newId("file");
  const file: FileAsset = {
    id,
    fileName: body.fileName,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
    purpose: body.purpose,
    accessLevel: body.accessLevel ?? "OPEN",
    status: "PENDING",
    checksumSha256: body.checksumSha256 ?? null,
    downloadUrl: `/api/v1/files/${id}/download`,
    downloadCount: 0,
    uploadedBy: toUserSummary(user!),
    createdAt: nowIso(),
  };
  store.files.push(file);
  return ok({
    fileId: id,
    method: "PUT" as const,
    uploadUrl: `/api/v1/uploads/${id}/content`,
    headers: { "Content-Type": body.contentType },
    expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
    maxSizeBytes: limit.maxBytes,
  });
};

const uploaded = new Set<string>();

function ownUpload(store: Fixtures, id: string, user: User | null) {
  const file = store.files.find((f) => f.id === id);
  if (!file) throw notFound("Upload");
  if (file.uploadedBy?.id !== user?.id) throw forbidden("This upload belongs to another user.");
  if (file.status === "READY") throw conflict("Upload already completed.", "ALREADY_COMPLETED");
  return file;
}

export const putUploadContent: MockHandler<"putUploadContent"> = ({ params, store, user }) => {
  const file = ownUpload(store, params.id, user);
  uploaded.add(file.id);
  return ok({ fileId: file.id, receivedBytes: file.sizeBytes });
};

export const completeUpload: MockHandler<"completeUpload"> = ({ params, store, user }) => {
  const file = ownUpload(store, params.id, user);
  if (!uploaded.has(file.id)) throw conflict("File bytes have not been uploaded yet.", "NOT_UPLOADED");
  file.status = "READY";
  return ok(file);
};

function assertFileAccess(file: FileAsset, user: User | null) {
  if (file.accessLevel === "REGISTERED" && !user) throw new MockHttpError(401, "Log in to access this file.");
  if (file.accessLevel === "RESTRICTED" && !(isStaff(user) || file.uploadedBy?.id === user?.id)) {
    throw forbidden("This file is restricted. Contact the data custodian.");
  }
}

export const getFile: MockHandler<"getFile"> = ({ params, store, user }) => {
  const file = findById(store.files, params.id, "File");
  assertFileAccess(file, user);
  return ok(file);
};

/** Mock downloads cannot redirect; the transport returns the file record instead. */
export const downloadFile: MockHandler<"downloadFile"> = ({ params, store, user }) => {
  const file = findById(store.files, params.id, "File");
  if (file.status !== "READY") throw notFound("File");
  assertFileAccess(file, user);
  file.downloadCount += 1;
  return undefined as never;
};

export const deleteFile: MockHandler<"deleteFile"> = ({ params, store, user }) => {
  const file = findById(store.files, params.id, "File");
  if (user!.role !== "ADMIN" && file.uploadedBy?.id !== user!.id) throw forbidden("Only the owner or an ADMIN can delete this file.");
  const attached = [...store.datasets, ...store.publications.map((p) => ({ status: p.status, files: p.pdf ? [p.pdf] : [] }))].some(
    (r) => r.status === "PUBLISHED" && r.files.some((f) => f.id === file.id),
  );
  if (attached) throw conflict("File is attached to published content.", "FILE_IN_USE");
  store.files.splice(store.files.indexOf(file), 1);
  return ok({ id: file.id, deleted: true as const });
};

// ─── Submissions ────────────────────────────────────────────────────────────

function contentCollection(store: Fixtures, type: ContentType) {
  return { EXPEDITION: store.expeditions, PUBLICATION: store.publications, DATASET: store.datasets, MEDIA: store.media, ACTIVITY: store.activities }[type] as {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  }[];
}

function event(action: Submission["history"][number]["action"], user: User, comment: string | null) {
  return { id: newId("rev"), action, actor: toUserSummary(user), comment, createdAt: nowIso() };
}

export const createSubmission: MockHandler<"createSubmission"> = ({ body, store, user }) => {
  const record = contentCollection(store, body.contentType).find((r) => r.id === body.contentId);
  if (!record) throw notFound("Content record");
  if (!isStaff(user) && store.owners[record.id] !== user!.id) throw forbidden("Only the owner can submit this record.");
  if (record.status === "PENDING_REVIEW") throw conflict("This record is already awaiting review.", "ALREADY_PENDING");
  if (record.status === "PUBLISHED") throw conflict("This record is already published.", "ALREADY_PUBLISHED");
  if (record.status === "ARCHIVED") throw conflict("Archived records cannot be submitted.", "ARCHIVED");
  record.status = "PENDING_REVIEW";
  const sub: Submission = {
    id: newId("sub"),
    contentType: body.contentType,
    contentId: record.id,
    contentTitle: record.title,
    contentSlug: record.slug,
    status: "PENDING",
    message: body.message ?? null,
    submittedBy: toUserSummary(user!),
    submittedAt: nowIso(),
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: null,
    history: [event("SUBMITTED", user!, body.message ?? null)],
  };
  store.submissions.push(sub);
  return ok(sub);
};

export const listSubmissions: MockHandler<"listSubmissions"> = ({ query: q, store, user }) => {
  const mine = q.mine || !isStaff(user);
  const items = store.submissions
    .filter((s) => (!mine || s.submittedBy.id === user!.id) && (!q.status || s.status === q.status) && (!q.contentType || s.contentType === q.contentType))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return paginate(items, q.page, q.limit);
};

export const getSubmission: MockHandler<"getSubmission"> = ({ params, store, user }) => {
  const sub = findById(store.submissions, params.id, "Submission");
  if (!isStaff(user) && sub.submittedBy.id !== user!.id) throw forbidden("You can only view your own submissions.");
  return ok(sub);
};

export const reviewSubmission: MockHandler<"reviewSubmission"> = ({ params, body, store, user }) => {
  const sub = findById(store.submissions, params.id, "Submission");
  if (sub.status !== "PENDING") throw conflict("Only PENDING submissions can be reviewed.", "NOT_PENDING");
  if (user!.role === "EDITOR" && sub.submittedBy.id === user!.id) throw forbidden("Editors cannot review their own submissions.");
  const record = contentCollection(store, sub.contentType).find((r) => r.id === sub.contentId);
  const map = { APPROVE: ["APPROVED", "PUBLISHED"], REJECT: ["REJECTED", "REJECTED"], REQUEST_CHANGES: ["CHANGES_REQUESTED", "CHANGES_REQUESTED"] } as const;
  const [subStatus, contentStatus] = map[body.decision];
  sub.status = subStatus;
  sub.reviewedBy = toUserSummary(user!);
  sub.reviewedAt = nowIso();
  sub.reviewComment = body.comment ?? null;
  sub.history.push(event(subStatus, user!, body.comment ?? null));
  if (record) {
    record.status = contentStatus;
    if (contentStatus === "PUBLISHED") record.publishedAt = nowIso();
  }
  return ok(sub);
};

export const withdrawSubmission: MockHandler<"withdrawSubmission"> = ({ params, store, user }) => {
  const sub = findById(store.submissions, params.id, "Submission");
  if (sub.submittedBy.id !== user!.id) throw forbidden("Only the submitter can withdraw.");
  if (sub.status !== "PENDING") throw conflict("Only PENDING submissions can be withdrawn.", "NOT_PENDING");
  sub.status = "WITHDRAWN";
  sub.history.push(event("WITHDRAWN", user!, null));
  const record = contentCollection(store, sub.contentType).find((r) => r.id === sub.contentId);
  if (record) record.status = "DRAFT";
  return ok(sub);
};

// ─── AI ─────────────────────────────────────────────────────────────────────

function aiSource(store: Fixtures, type: AISourceRef["type"], id: string): AISourceRef {
  const rec = contentCollection(store, type).find((r) => r.id === id);
  if (!rec || rec.status !== "PUBLISHED") throw notFound("Published source record");
  return { type, id: rec.id, slug: rec.slug, title: rec.title };
}

function draft(store: Fixtures, user: User, init: Pick<AIOutreachContent, "kind" | "title" | "body" | "audience" | "language" | "sources">): AIOutreachContent {
  const now = nowIso();
  const item: AIOutreachContent = {
    ...init,
    id: newId("ai"),
    slug: `${slugify(init.title)}-${store.aiContent.length + 1}`,
    status: "DRAFT",
    isAIGenerated: true,
    disclaimer: AI_DISCLAIMER,
    model: "mock-model",
    generatedBy: toUserSummary(user),
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  store.aiContent.push(item);
  return item;
}

export const generateResearchSummary: MockHandler<"generateResearchSummary"> = ({ body, store, user }) => {
  const source = aiSource(store, body.sourceType, body.sourceId);
  return ok(
    draft(store, user!, {
      kind: "RESEARCH_SUMMARY",
      title: `Summary: ${source.title}`,
      body: `**Mock AI draft (${body.length.toLowerCase()}, ${body.audience.toLowerCase().replace("_", " ")}).** This placeholder text stands in for a generated plain-language summary of “${source.title}”. No model was called.`,
      audience: body.audience,
      language: body.language,
      sources: [source],
    }),
  );
};

export const generateOutreachContent: MockHandler<"generateOutreachContent"> = ({ body, store, user }) => {
  const sources = body.sources.map((s) => aiSource(store, s.type, s.id));
  return ok(
    draft(store, user!, {
      kind: body.kind,
      title: `${body.kind.replace("_", " ")}: ${sources[0].title}`,
      body: `**Mock AI draft (${body.tone.toLowerCase()}, ≤${body.maxWords} words).** Placeholder ${body.kind.toLowerCase().replace("_", " ")} based on ${sources.length} source record(s). No model was called.`,
      audience: body.audience,
      language: body.language,
      sources,
    }),
  );
};

export const listAIContent: MockHandler<"listAIContent"> = ({ query: q, store }) =>
  paginate(
    store.aiContent
      .filter((a) => (!q.kind || a.kind === q.kind) && (!q.status || a.status === q.status))
      .filter((a) => (!q.sourceType || a.sources.some((s) => s.type === q.sourceType)) && (!q.sourceId || a.sources.some((s) => s.id === q.sourceId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    q.page,
    q.limit,
  );

export const getAIContent: MockHandler<"getAIContent"> = ({ params, store }) => ok(findById(store.aiContent, params.id, "AI content"));

export const updateAIContent: MockHandler<"updateAIContent"> = ({ params, body, store, user }) => {
  const item = findById(store.aiContent, params.id, "AI content");
  if (body.title) item.title = body.title;
  if (body.body) item.body = body.body;
  if (body.status) {
    item.status = body.status;
    if (body.status === "PUBLISHED") {
      item.reviewedBy = toUserSummary(user!);
      item.reviewedAt = nowIso();
      item.publishedAt = item.publishedAt ?? nowIso();
    }
  }
  item.updatedAt = nowIso();
  return ok(item);
};

export const deleteAIContent: MockHandler<"deleteAIContent"> = ({ params, store }) => {
  const item = findById(store.aiContent, params.id, "AI content");
  store.aiContent.splice(store.aiContent.indexOf(item), 1);
  return ok({ id: item.id, deleted: true as const });
};

export const listOutreach: MockHandler<"listOutreach"> = ({ query: q, store }) =>
  paginate(
    store.aiContent
      .filter((a) => a.status === "PUBLISHED")
      .filter((a) => (!q.kind || a.kind === q.kind) && (!q.audience || a.audience === q.audience) && (!q.language || a.language === q.language))
      .filter((a) => (!q.sourceType || a.sources.some((s) => s.type === q.sourceType)) && (!q.sourceId || a.sources.some((s) => s.id === q.sourceId)))
      .filter((a) => textMatch(q.q, a.title, a.body))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .map((a) => summarize(OutreachSummarySchema, { ...a, excerpt: excerpt(a.body, 240) })),
    q.page,
    q.limit,
  );

export const getOutreach: MockHandler<"getOutreach"> = ({ params, store }) => {
  const item = store.aiContent.find((a) => (a.id === params.id || a.slug === params.id) && a.status === "PUBLISHED");
  if (!item) throw notFound("Outreach content");
  return ok(item);
};
