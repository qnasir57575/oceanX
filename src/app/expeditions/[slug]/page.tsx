import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getExpedition } from "@/lib/api/expeditions";
import { getPublications } from "@/lib/api/publications";
import { getDatasets } from "@/lib/api/datasets";
import { getMediaAssets } from "@/lib/api/media";
import type { Expedition } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { DetailBlock, DetailLayout, DetailPageSkeleton, RelatedSection } from "@/components/layout/detail";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton, RowListSkeleton } from "@/components/ui/skeleton";
import { ApiImage, ImageCredit } from "@/components/ui/api-image";
import { Markdown } from "@/components/ui/markdown";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateRange, DateTime } from "@/components/ui/date-time";
import { PhaseBadge, RegionBadge } from "@/components/content/badges";
import { CategoryLinks, KeywordLinks } from "@/components/content/taxonomy-links";
import { PublicationList } from "@/components/content/publication-item";
import { DatasetCard } from "@/components/content/dataset-card";
import { MediaTile } from "@/components/content/media-tile";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { formatCoordinates, formatNumber } from "@/lib/format/number";
import { label, PHASE_LABELS, REGION_LABELS } from "@/lib/format/labels";

const loadExpedition = cache((slug: string) => getExpedition(slug));

export async function generateMetadata({ params }: PageProps<"/expeditions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(
    loadExpedition(slug),
    ({ data }) => ({
      title: data.title,
      description: data.summary,
      openGraph: data.coverImage ? { images: [{ url: data.coverImage.url, alt: data.coverImage.alt }] } : undefined,
    }),
    "Expedition",
  );
}

export default function ExpeditionPage({ params }: PageProps<"/expeditions/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <ExpeditionDetail params={params} />
    </Suspense>
  );
}

async function ExpeditionDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: e } = await orNotFound(loadExpedition(slug));

  return (
    <>
      <PageHeader
        title={e.title}
        description={e.summary}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/expeditions", label: "Expeditions" }, { label: e.title }]}
        eyebrow={
          <span className="flex flex-wrap gap-2 normal-case">
            <RegionBadge region={e.region} />
            <PhaseBadge phase={e.phase} />
          </span>
        }
      />
      <DetailLayout
        main={
          <>
            {e.coverImage ? (
              <figure>
                <ApiImage image={e.coverImage} priority className="rounded-lg" />
                <ImageCredit credit={e.coverImage.credit} />
              </figure>
            ) : null}
            <section aria-label="Description">
              <Markdown>{e.description}</Markdown>
            </section>
            {e.objectives.length > 0 ? (
              <DetailBlock title="Objectives">
                <ol className="list-decimal space-y-2 pl-6 text-ink marker:text-ink-muted">
                  {e.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
              </DetailBlock>
            ) : null}
            <RelatedRecords expedition={e} />
          </>
        }
        aside={
          <>
            <FactsCard title="Expedition details">
              <MetaList
                items={[
                  {
                    label: "Dates",
                    value: e.startDate || e.endDate ? <DateRange start={e.startDate} end={e.endDate} style="long" /> : String(e.year),
                  },
                  { label: "Region", value: label(REGION_LABELS, e.region) },
                  { label: "Status", value: label(PHASE_LABELS, e.phase) },
                  { label: "Research station", value: e.station },
                  { label: "Research vessel", value: e.vessel },
                  { label: "Lead institution", value: e.leadInstitution },
                  { label: "Chief scientist", value: e.chiefScientist },
                  { label: "Participants", value: e.participantCount !== null ? formatNumber(e.participantCount) : null },
                  {
                    label: "Location",
                    value: e.location ? (
                      <>
                        {e.location.label ? <span className="block">{e.location.label}</span> : null}
                        <span className="font-mono text-sm">{formatCoordinates(e.location.latitude, e.location.longitude)}</span>
                      </>
                    ) : null,
                  },
                  { label: "Published", value: e.publishedAt ? <DateTime value={e.publishedAt} style="long" /> : null },
                ]}
              />
            </FactsCard>
            {e.categories.length > 0 ? (
              <FactsCard title="Research topics">
                <CategoryLinks categories={e.categories} />
              </FactsCard>
            ) : null}
            {e.keywords.length > 0 ? (
              <FactsCard title="Keywords">
                <KeywordLinks keywords={e.keywords} />
              </FactsCard>
            ) : null}
          </>
        }
      />
    </>
  );
}

function RelatedRecords({ expedition: e }: { expedition: Expedition }) {
  const filter = `expeditionId=${encodeURIComponent(e.id)}`;
  return (
    <>
      {e.counts.publications > 0 ? (
        <RelatedSection
          title="Publications from this expedition"
          href={e.counts.publications > 5 ? `/research?${filter}` : undefined}
          linkLabel={`All ${formatNumber(e.counts.publications)} publications`}
        >
          <SectionBoundary subject="related publications" compact>
            <Suspense fallback={<RowListSkeleton count={Math.min(5, e.counts.publications)} label="Loading publications" />}>
              <RelatedPublications expeditionId={e.id} />
            </Suspense>
          </SectionBoundary>
        </RelatedSection>
      ) : null}
      {e.counts.datasets > 0 ? (
        <RelatedSection
          title="Datasets"
          href={e.counts.datasets > 4 ? `/datasets?${filter}` : undefined}
          linkLabel={`All ${formatNumber(e.counts.datasets)} datasets`}
        >
          <SectionBoundary subject="related datasets" compact>
            <Suspense fallback={<CardGridSkeleton count={Math.min(4, e.counts.datasets)} withImage={false} className="lg:grid-cols-2" label="Loading datasets" />}>
              <RelatedDatasets expeditionId={e.id} />
            </Suspense>
          </SectionBoundary>
        </RelatedSection>
      ) : null}
      {e.counts.media > 0 ? (
        <RelatedSection
          title="Photos and media"
          href={e.counts.media > 6 ? `/gallery?${filter}` : undefined}
          linkLabel={`All ${formatNumber(e.counts.media)} media items`}
        >
          <SectionBoundary subject="related media" compact>
            <Suspense fallback={<CardGridSkeleton count={Math.min(6, e.counts.media)} label="Loading media" />}>
              <RelatedMedia expeditionId={e.id} />
            </Suspense>
          </SectionBoundary>
        </RelatedSection>
      ) : null}
    </>
  );
}

async function RelatedPublications({ expeditionId }: { expeditionId: string }) {
  const { data } = await getPublications({ expeditionId, limit: 5 });
  if (data.length === 0) return <p className="text-ink-muted">No published publications yet.</p>;
  return <PublicationList publications={data} />;
}

async function RelatedDatasets({ expeditionId }: { expeditionId: string }) {
  const { data } = await getDatasets({ expeditionId, limit: 4 });
  if (data.length === 0) return <p className="text-ink-muted">No published datasets yet.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {data.map((d) => (
        <li key={d.id}>
          <DatasetCard dataset={d} />
        </li>
      ))}
    </ul>
  );
}

async function RelatedMedia({ expeditionId }: { expeditionId: string }) {
  const { data } = await getMediaAssets({ expeditionId, limit: 6 });
  if (data.length === 0) return <p className="text-ink-muted">No published media yet.</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {data.map((m) => (
        <li key={m.id}>
          <MediaTile media={m} />
        </li>
      ))}
    </ul>
  );
}
