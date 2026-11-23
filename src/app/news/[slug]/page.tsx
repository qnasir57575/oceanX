import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getActivity } from "@/lib/api/activities";
import { PageHeader } from "@/components/layout/page-header";
import { DetailBlock, DetailLayout, DetailPageSkeleton } from "@/components/layout/detail";
import { Markdown } from "@/components/ui/markdown";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateTime, DateTimeRange } from "@/components/ui/date-time";
import { ApiImage, ImageCredit } from "@/components/ui/api-image";
import { ActivityTypeBadge, RegionBadge } from "@/components/content/badges";
import { CategoryLinks, KeywordLinks } from "@/components/content/taxonomy-links";
import { FileList } from "@/components/content/file-list";
import { ExternalLink } from "@/components/content/record-links";
import { Icon } from "@/components/icons";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { ACTIVITY_TYPE_LABELS, label, REGION_LABELS } from "@/lib/format/labels";

const loadActivity = cache((slug: string) => getActivity(slug));

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(loadActivity(slug), ({ data }) => ({ title: data.title, description: data.summary }), "News");
}

export default function ActivityPage({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <ActivityDetail params={params} />
    </Suspense>
  );
}

async function ActivityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: a } = await orNotFound(loadActivity(slug));
  const isEvent = Boolean(a.startsAt);

  return (
    <>
      <PageHeader
        title={a.title}
        description={a.summary}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/news", label: "News & events" }, { label: a.title }]}
        eyebrow={
          <span className="flex flex-wrap gap-2 normal-case">
            <ActivityTypeBadge type={a.type} />
            <RegionBadge region={a.region} />
          </span>
        }
      />
      <DetailLayout
        main={
          <>
            {isEvent ? (
              <section aria-label="Event details" className="rounded-lg border border-glacier-100 bg-glacier-50 p-5">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <Icon name="calendar" size={22} className="mt-0.5 shrink-0 text-glacier-800" />
                    <div>
                      <dt className="text-sm font-semibold text-glacier-800">When</dt>
                      <dd className="text-ink">
                        <DateTimeRange start={a.startsAt!} end={a.endsAt} />
                      </dd>
                    </div>
                  </div>
                  {a.location || a.isOnline ? (
                    <div className="flex gap-3">
                      <Icon name={a.isOnline ? "globe" : "map-pin"} size={22} className="mt-0.5 shrink-0 text-glacier-800" />
                      <div>
                        <dt className="text-sm font-semibold text-glacier-800">Where</dt>
                        <dd className="text-ink">{a.location ?? "Online"}</dd>
                      </div>
                    </div>
                  ) : null}
                </dl>
                {a.registrationUrl ? (
                  <ExternalLink
                    href={a.registrationUrl}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-glacier-700 px-4 font-medium text-white hover:bg-glacier-800"
                  >
                    Register for this event
                  </ExternalLink>
                ) : null}
              </section>
            ) : null}

            {a.coverImage ? (
              <figure>
                <ApiImage image={a.coverImage} priority className="rounded-lg" />
                <ImageCredit credit={a.coverImage.credit} />
              </figure>
            ) : null}

            <section aria-label="Article">
              <Markdown>{a.body}</Markdown>
            </section>

            {a.externalUrl ? (
              <p>
                <ExternalLink href={a.externalUrl}>Read more on the original site</ExternalLink>
              </p>
            ) : null}

            {a.attachments.length > 0 ? (
              <DetailBlock title="Attachments">
                <FileList files={a.attachments} />
              </DetailBlock>
            ) : null}
          </>
        }
        aside={
          <>
            <FactsCard title="Details">
              <MetaList
                items={[
                  { label: "Type", value: label(ACTIVITY_TYPE_LABELS, a.type) },
                  { label: "Published", value: a.publishedAt ? <DateTime value={a.publishedAt} style="long" /> : null },
                  { label: "Region", value: a.region ? label(REGION_LABELS, a.region) : null },
                ]}
              />
            </FactsCard>
            {a.categories.length > 0 ? (
              <FactsCard title="Research topics">
                <CategoryLinks categories={a.categories} />
              </FactsCard>
            ) : null}
            {a.keywords.length > 0 ? (
              <FactsCard title="Keywords">
                <KeywordLinks keywords={a.keywords} />
              </FactsCard>
            ) : null}
          </>
        }
      />
    </>
  );
}
