import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getDataset } from "@/lib/api/datasets";
import type { BoundingBox } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { DetailBlock, DetailLayout, DetailPageSkeleton } from "@/components/layout/detail";
import { Markdown } from "@/components/ui/markdown";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateRange, DateTime } from "@/components/ui/date-time";
import { Alert } from "@/components/ui/states";
import { AccessBadge, RegionBadge } from "@/components/content/badges";
import { CategoryLinks, KeywordLinks } from "@/components/content/taxonomy-links";
import { CitationBlock } from "@/components/content/citation-block";
import { FileList } from "@/components/content/file-list";
import { DoiLink, ExpeditionLink, RecordRefList } from "@/components/content/record-links";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { formatBytes, formatNumber, plural } from "@/lib/format/number";
import { label, REGION_LABELS } from "@/lib/format/labels";

const loadDataset = cache((slug: string) => getDataset(slug));

export async function generateMetadata({ params }: PageProps<"/datasets/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(loadDataset(slug), ({ data }) => ({ title: data.title, description: data.summary }), "Dataset");
}

export default function DatasetPage({ params }: PageProps<"/datasets/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DatasetDetail params={params} />
    </Suspense>
  );
}

function coord(value: number, pos: string, neg: string) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? pos : neg}`;
}

function BoundingBoxText({ box }: { box: BoundingBox }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
      <dt className="text-ink-muted">North</dt>
      <dd>{coord(box.north, "N", "S")}</dd>
      <dt className="text-ink-muted">South</dt>
      <dd>{coord(box.south, "N", "S")}</dd>
      <dt className="text-ink-muted">West</dt>
      <dd>{coord(box.west, "E", "W")}</dd>
      <dt className="text-ink-muted">East</dt>
      <dd>{coord(box.east, "E", "W")}</dd>
    </dl>
  );
}

async function DatasetDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: d } = await orNotFound(loadDataset(slug));

  return (
    <>
      <PageHeader
        title={d.title}
        description={d.summary}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/datasets", label: "Data repository" }, { label: d.title }]}
        eyebrow={
          <span className="flex flex-wrap gap-2 normal-case">
            <RegionBadge region={d.region} />
            <AccessBadge level={d.accessLevel} />
          </span>
        }
      />
      <DetailLayout
        main={
          <>
            <DetailBlock title={`Files (${formatNumber(d.fileCount)})`}>
              <FileList files={d.files} accessLevel={d.accessLevel} />
              <p className="mt-3 text-sm text-ink-muted">
                {plural(d.fileCount, "file")}, {formatBytes(d.totalSizeBytes)} in total · downloaded {plural(d.downloadCount, "time")}
              </p>
              {d.accessLevel === "RESTRICTED" ? (
                <Alert tone="warning" title="Restricted access" className="mt-4">
                  {d.contact ? (
                    <>
                      Contact the data custodian, {d.contact.name}
                      {d.contact.organization ? ` (${d.contact.organization})` : ""}
                      {d.contact.email ? (
                        <>
                          , at{" "}
                          <a href={`mailto:${d.contact.email}`} className="text-glacier-700 underline underline-offset-2">
                            {d.contact.email}
                          </a>
                        </>
                      ) : null}{" "}
                      to request access.
                    </>
                  ) : (
                    "Contact the portal team to request access to these files."
                  )}
                </Alert>
              ) : null}
            </DetailBlock>

            <section aria-label="Description">
              <Markdown>{d.description}</Markdown>
            </section>

            {d.parameters.length > 0 ? (
              <DetailBlock title="Measured parameters">
                <ul className="flex flex-wrap gap-2">
                  {d.parameters.map((p) => (
                    <li key={p} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink">
                      {p}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            ) : null}

            {d.relatedPublications.length > 0 ? (
              <DetailBlock title="Related publications">
                <RecordRefList items={d.relatedPublications} basePath="/research" />
              </DetailBlock>
            ) : null}

            <CitationBlock citation={d.citation} />
          </>
        }
        aside={
          <>
            <FactsCard title="Dataset details">
              <MetaList
                items={[
                  {
                    label: "Temporal coverage",
                    value:
                      d.temporalCoverage.start || d.temporalCoverage.end ? (
                        <DateRange start={d.temporalCoverage.start} end={d.temporalCoverage.end} style="long" />
                      ) : null,
                  },
                  { label: "Region", value: label(REGION_LABELS, d.region) },
                  { label: "Spatial coverage", value: d.spatialCoverage ? <BoundingBoxText box={d.spatialCoverage} /> : null },
                  { label: "Formats", value: d.formats.length ? <span className="font-mono text-sm">{d.formats.join(", ")}</span> : null },
                  { label: "Licence", value: d.license },
                  { label: "Version", value: d.version },
                  { label: "DOI", value: d.doi ? <DoiLink doi={d.doi} /> : null },
                  { label: "Expedition", value: d.expedition ? <ExpeditionLink expedition={d.expedition} /> : null },
                  { label: "Published", value: d.publishedAt ? <DateTime value={d.publishedAt} style="long" /> : null },
                ]}
              />
            </FactsCard>
            {d.contact ? (
              <FactsCard title="Data custodian">
                <p className="font-medium text-ink">{d.contact.name}</p>
                {d.contact.organization ? <p className="text-sm text-ink-muted">{d.contact.organization}</p> : null}
                {d.contact.email ? (
                  <a href={`mailto:${d.contact.email}`} className="mt-1 inline-block text-sm break-all text-glacier-700 underline underline-offset-2">
                    {d.contact.email}
                  </a>
                ) : null}
              </FactsCard>
            ) : null}
            {d.categories.length > 0 ? (
              <FactsCard title="Research topics">
                <CategoryLinks categories={d.categories} />
              </FactsCard>
            ) : null}
            {d.keywords.length > 0 ? (
              <FactsCard title="Keywords">
                <KeywordLinks keywords={d.keywords} />
              </FactsCard>
            ) : null}
          </>
        }
      />
    </>
  );
}
