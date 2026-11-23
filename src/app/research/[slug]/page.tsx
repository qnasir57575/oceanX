import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getPublication } from "@/lib/api/publications";
import { PageHeader } from "@/components/layout/page-header";
import { DetailBlock, DetailLayout, DetailPageSkeleton } from "@/components/layout/detail";
import { Markdown } from "@/components/ui/markdown";
import { AIDisclaimer } from "@/components/ui/ai-disclaimer";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateTime } from "@/components/ui/date-time";
import { Badge } from "@/components/ui/badge";
import { AccessBadge, RegionBadge } from "@/components/content/badges";
import { CategoryLinks, KeywordLinks } from "@/components/content/taxonomy-links";
import { CitationBlock } from "@/components/content/citation-block";
import { DownloadButton } from "@/components/content/file-list";
import { AuthorList, DoiLink, ExpeditionLink, ExternalLink, RecordRefList } from "@/components/content/record-links";
import { formatAuthors } from "@/components/content/publication-item";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { ACCESS_LEVEL_LABELS, AUDIENCE_LABELS, label, PUBLICATION_TYPE_LABELS, REGION_LABELS } from "@/lib/format/labels";

const loadPublication = cache((slug: string) => getPublication(slug));

export async function generateMetadata({ params }: PageProps<"/research/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(
    loadPublication(slug),
    ({ data }) => ({ title: data.title, description: data.abstractPreview }),
    "Publication",
  );
}

export default function PublicationPage({ params }: PageProps<"/research/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <PublicationDetail params={params} />
    </Suspense>
  );
}

async function PublicationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: p } = await orNotFound(loadPublication(slug));
  const venueLine = [
    p.venue,
    p.volume ? `vol. ${p.volume}` : null,
    p.issue ? `no. ${p.issue}` : null,
    p.pages ? `pp. ${p.pages}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={p.title}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/research", label: "Research" }, { label: p.title }]}
        eyebrow={
          <span className="normal-case">
            {label(PUBLICATION_TYPE_LABELS, p.type)} · {p.year}
          </span>
        }
        description={
          <>
            <span className="block">{formatAuthors(p.authors, 6)}</span>
            {venueLine ? <span className="mt-1 block text-base italic">{venueLine}</span> : null}
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <AccessBadge level={p.accessLevel} />
          {p.hasFullText ? <Badge icon="file">PDF available</Badge> : null}
          <RegionBadge region={p.region} />
        </div>
      </PageHeader>

      <DetailLayout
        main={
          <>
            {p.pdf || p.externalUrl || p.doi ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {p.pdf ? <DownloadButton file={p.pdf} /> : null}
                {p.externalUrl ? <ExternalLink href={p.externalUrl}>View on publisher site</ExternalLink> : null}
                {p.doi ? <ExternalLink href={`https://doi.org/${p.doi}`}>Open via DOI</ExternalLink> : null}
              </div>
            ) : null}

            {p.aiSummary ? (
              <section aria-labelledby="summary-title" className="rounded-lg border border-glacier-100 bg-surface p-6">
                <h2 id="summary-title" className="mb-1 text-2xl font-semibold text-ink">
                  Plain-language summary
                </h2>
                <p className="mb-4 text-sm text-ink-muted">Written for {label(AUDIENCE_LABELS, p.aiSummary.audience).toLowerCase()}.</p>
                <Markdown>{p.aiSummary.text}</Markdown>
                <AIDisclaimer text={p.aiSummary.disclaimer} model={p.aiSummary.model} reviewedAt={p.aiSummary.reviewedAt} className="mt-5" />
              </section>
            ) : null}

            <DetailBlock title="Abstract">
              <p className="max-w-[72ch] leading-relaxed whitespace-pre-line text-ink">{p.abstract}</p>
            </DetailBlock>

            <DetailBlock title="Authors">
              <AuthorList authors={p.authors} />
            </DetailBlock>

            {p.datasets.length > 0 ? (
              <DetailBlock title="Linked datasets">
                <RecordRefList items={p.datasets} basePath="/datasets" />
              </DetailBlock>
            ) : null}

            <CitationBlock citation={p.citation} />
          </>
        }
        aside={
          <>
            <FactsCard title="Publication details">
              <MetaList
                items={[
                  { label: "Type", value: label(PUBLICATION_TYPE_LABELS, p.type) },
                  { label: "Published", value: p.publicationDate ? <DateTime value={p.publicationDate} style="long" /> : String(p.year) },
                  { label: "Venue", value: p.venue },
                  { label: "Volume / issue / pages", value: [p.volume, p.issue, p.pages].some(Boolean) ? [p.volume && `Vol. ${p.volume}`, p.issue && `No. ${p.issue}`, p.pages && `pp. ${p.pages}`].filter(Boolean).join(" · ") : null },
                  { label: "Publisher", value: p.publisher },
                  { label: "DOI", value: p.doi ? <DoiLink doi={p.doi} /> : null },
                  { label: "Region", value: p.region ? label(REGION_LABELS, p.region) : null },
                  { label: "Access", value: label(ACCESS_LEVEL_LABELS, p.accessLevel) },
                  { label: "Expedition", value: p.expedition ? <ExpeditionLink expedition={p.expedition} /> : null },
                ]}
              />
            </FactsCard>
            {p.categories.length > 0 ? (
              <FactsCard title="Research topics">
                <CategoryLinks categories={p.categories} />
              </FactsCard>
            ) : null}
            {p.keywords.length > 0 ? (
              <FactsCard title="Keywords">
                <KeywordLinks keywords={p.keywords} />
              </FactsCard>
            ) : null}
          </>
        }
      />
    </>
  );
}
