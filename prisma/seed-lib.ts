/**
 * Loads the demo fixtures (src/mocks/data/fixtures.ts) into the database, so the
 * live backend and the mock API serve the same demonstration data.
 * Used by `npm run db:seed` and by the contract tests.
 */
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { createFixtures, DEMO_PASSWORD } from "../src/mocks/data/fixtures";
import { hashPassword } from "../src/server/auth/password";
import { slugify } from "../src/lib/slug";

const TABLES = [
  "AuditLog",
  "ReviewEvent",
  "Submission",
  "AIContent",
  "Session",
  "PasswordResetToken",
  "MediaAsset",
  "Activity",
  "Dataset",
  "Publication",
  "Expedition",
  "FileAsset",
  "Keyword",
  "Category",
  "User",
];

export async function resetDatabase(prisma: PrismaClient) {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

const d = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

export async function seedDemoData(prisma: PrismaClient, now = new Date()) {
  const fx = createFixtures(now);
  await resetDatabase(prisma);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await prisma.user.createMany({
    data: fx.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      affiliation: u.affiliation,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      createdAt: new Date(u.createdAt),
      passwordHash,
    })),
  });

  // Parents before children.
  const categories = [...fx.categories].sort((a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)));
  for (const c of categories) {
    await prisma.category.create({
      data: { id: c.id, slug: c.slug, name: c.name, description: c.description, parentId: c.parentId, sortOrder: c.sortOrder },
    });
  }
  await prisma.keyword.createMany({ data: fx.keywords.map((k) => ({ id: k.id, slug: k.slug, label: k.label })) });

  await prisma.fileAsset.createMany({
    data: fx.files.map((f) => ({
      id: f.id,
      storageKey: `demo/${f.id}/${f.fileName}`,
      fileName: f.fileName,
      contentType: f.contentType,
      sizeBytes: BigInt(f.sizeBytes),
      checksumSha256: f.checksumSha256,
      purpose: f.purpose,
      accessLevel: f.accessLevel,
      status: f.status,
      downloadCount: f.downloadCount,
      uploadedById: f.uploadedBy?.id ?? null,
      createdAt: new Date(f.createdAt),
      completedAt: new Date(f.createdAt),
    })),
  });

  const taxonomy = (cats: { id: string }[], keywords: string[]) => ({
    categories: { connect: cats.map((c) => ({ id: c.id })) },
    keywords: {
      connectOrCreate: keywords.map((label) => ({ where: { slug: slugify(label) }, create: { slug: slugify(label), label } })),
    },
  });

  for (const e of fx.expeditions) {
    await prisma.expedition.create({
      data: {
        id: e.id,
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        description: e.description,
        region: e.region,
        phase: e.phase,
        year: e.year,
        startDate: d(e.startDate),
        endDate: d(e.endDate),
        station: e.station,
        vessel: e.vessel,
        leadInstitution: e.leadInstitution,
        chiefScientist: e.chiefScientist,
        participantCount: e.participantCount,
        objectives: e.objectives,
        latitude: e.location?.latitude ?? null,
        longitude: e.location?.longitude ?? null,
        locationLabel: e.location?.label ?? null,
        coverImageUrl: e.coverImage?.url ?? null,
        coverImageAlt: e.coverImage?.alt ?? null,
        coverImageWidth: e.coverImage?.width ?? null,
        coverImageHeight: e.coverImage?.height ?? null,
        coverImageCredit: e.coverImage?.credit ?? null,
        status: e.status,
        publishedAt: d(e.publishedAt),
        ownerId: fx.owners[e.id] ?? null,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        ...taxonomy(e.categories, e.keywords),
      },
    });
  }

  for (const p of fx.publications) {
    await prisma.publication.create({
      data: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        abstract: p.abstract,
        authors: p.authors,
        authorsText: p.authors.map((a) => a.name.toLowerCase()).join(" | "),
        type: p.type,
        year: p.year,
        publicationDate: d(p.publicationDate),
        venue: p.venue,
        volume: p.volume,
        issue: p.issue,
        pages: p.pages,
        publisher: p.publisher,
        doi: p.doi,
        externalUrl: p.externalUrl,
        accessLevel: p.accessLevel,
        region: p.region,
        pdfFileId: p.pdf?.id ?? null,
        expeditionId: p.expedition?.id ?? null,
        status: p.status,
        publishedAt: d(p.publishedAt),
        ownerId: fx.owners[p.id] ?? null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        ...taxonomy(p.categories, p.keywords),
      },
    });
  }

  for (const ds of fx.datasets) {
    const linkedPubs = new Set([
      ...ds.relatedPublications.map((p) => p.id),
      ...fx.publications.filter((p) => p.datasets.some((x) => x.id === ds.id)).map((p) => p.id),
    ]);
    await prisma.dataset.create({
      data: {
        id: ds.id,
        slug: ds.slug,
        title: ds.title,
        summary: ds.summary,
        description: ds.description,
        region: ds.region,
        parameters: ds.parameters,
        formats: ds.formats,
        temporalStart: d(ds.temporalCoverage.start),
        temporalEnd: d(ds.temporalCoverage.end),
        bboxWest: ds.spatialCoverage?.west ?? null,
        bboxSouth: ds.spatialCoverage?.south ?? null,
        bboxEast: ds.spatialCoverage?.east ?? null,
        bboxNorth: ds.spatialCoverage?.north ?? null,
        license: ds.license,
        doi: ds.doi,
        version: ds.version,
        accessLevel: ds.accessLevel,
        downloadCount: ds.downloadCount,
        contactName: ds.contact?.name ?? null,
        contactEmail: ds.contact?.email ?? null,
        contactOrganization: ds.contact?.organization ?? null,
        expeditionId: ds.expedition?.id ?? null,
        status: ds.status,
        publishedAt: d(ds.publishedAt),
        ownerId: fx.owners[ds.id] ?? null,
        createdAt: new Date(ds.createdAt),
        updatedAt: new Date(ds.updatedAt),
        files: { connect: ds.files.map((f) => ({ id: f.id })) },
        publications: { connect: [...linkedPubs].map((id) => ({ id })) },
        ...taxonomy(ds.categories, ds.keywords),
      },
    });
  }

  for (const m of fx.media) {
    await prisma.mediaAsset.create({
      data: {
        id: m.id,
        slug: m.slug,
        title: m.title,
        type: m.type,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        embedUrl: m.embedUrl,
        altText: m.altText,
        description: m.description,
        width: m.width,
        height: m.height,
        durationSeconds: m.durationSeconds,
        credit: m.credit,
        license: m.license,
        capturedAt: d(m.capturedAt),
        latitude: m.location?.latitude ?? null,
        longitude: m.location?.longitude ?? null,
        locationLabel: m.location?.label ?? null,
        featured: m.featured,
        region: m.region,
        expeditionId: m.expedition?.id ?? null,
        status: m.status,
        publishedAt: d(m.publishedAt),
        ownerId: fx.owners[m.id] ?? null,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
        ...taxonomy(m.categories, m.keywords),
      },
    });
  }

  for (const a of fx.activities) {
    await prisma.activity.create({
      data: {
        id: a.id,
        slug: a.slug,
        type: a.type,
        title: a.title,
        summary: a.summary,
        body: a.body,
        coverImageUrl: a.coverImage?.url ?? null,
        coverImageAlt: a.coverImage?.alt ?? null,
        coverImageWidth: a.coverImage?.width ?? null,
        coverImageHeight: a.coverImage?.height ?? null,
        coverImageCredit: a.coverImage?.credit ?? null,
        startsAt: d(a.startsAt),
        endsAt: d(a.endsAt),
        location: a.location,
        isOnline: a.isOnline,
        registrationUrl: a.registrationUrl,
        externalUrl: a.externalUrl,
        region: a.region,
        status: a.status,
        publishedAt: d(a.publishedAt),
        ownerId: fx.owners[a.id] ?? null,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
        attachments: { connect: a.attachments.map((f) => ({ id: f.id })) },
        ...taxonomy(a.categories, a.keywords),
      },
    });
  }

  await prisma.aIContent.createMany({
    data: fx.aiContent.map((c) => ({
      id: c.id,
      slug: c.slug,
      kind: c.kind,
      title: c.title,
      body: c.body,
      audience: c.audience,
      language: c.language,
      sources: c.sources.map((s) => ({ type: s.type, id: s.id })),
      status: c.status,
      model: c.model,
      generatedById: c.generatedBy?.id ?? null,
      reviewedById: c.reviewedBy?.id ?? null,
      reviewedAt: d(c.reviewedAt),
      publishedAt: d(c.publishedAt),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    })),
  });

  for (const s of fx.submissions) {
    await prisma.submission.create({
      data: {
        id: s.id,
        contentType: s.contentType,
        contentId: s.contentId,
        status: s.status,
        message: s.message,
        submittedById: s.submittedBy.id,
        submittedAt: new Date(s.submittedAt),
        reviewedById: s.reviewedBy?.id ?? null,
        reviewedAt: d(s.reviewedAt),
        reviewComment: s.reviewComment,
        events: {
          create: s.history.map((h) => ({ id: h.id, action: h.action, actorId: h.actor.id, comment: h.comment, createdAt: new Date(h.createdAt) })),
        },
      },
    });
  }

  await prisma.auditLog.createMany({
    data: fx.auditLogs.map((l) => ({
      id: l.id,
      actorId: l.actor?.id ?? null,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      metadata: (l.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: l.ipAddress,
      createdAt: new Date(l.createdAt),
    })),
  });

  return {
    users: fx.users.length,
    expeditions: fx.expeditions.length,
    publications: fx.publications.length,
    datasets: fx.datasets.length,
    media: fx.media.length,
    activities: fx.activities.length,
    files: fx.files.length,
  };
}
