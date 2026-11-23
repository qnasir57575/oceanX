import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";
import { getOutreachItem } from "@/lib/api/outreach";
import { searchResultHref } from "@/lib/api/search";
import { PageHeader } from "@/components/layout/page-header";
import { DetailBlock, DetailLayout, DetailPageSkeleton } from "@/components/layout/detail";
import { Markdown } from "@/components/ui/markdown";
import { AIDisclaimer, AIBadge } from "@/components/ui/ai-disclaimer";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateTime } from "@/components/ui/date-time";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { AI_KIND_LABELS, AUDIENCE_LABELS, label, SEARCH_TYPE_LABELS } from "@/lib/format/labels";

const loadItem = cache((slug: string) => getOutreachItem(slug));

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(loadItem(slug), ({ data }) => ({ title: data.title }), "Learn");
}

export default function LearnItemPage({ params }: PageProps<"/learn/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <LearnDetail params={params} />
    </Suspense>
  );
}

const languageName = (tag: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
};

async function LearnDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: o } = await orNotFound(loadItem(slug));

  return (
    <>
      <PageHeader
        title={o.title}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/learn", label: "Learn" }, { label: o.title }]}
        eyebrow={
          <span className="flex flex-wrap gap-2 normal-case">
            <Badge tone="info">{label(AI_KIND_LABELS, o.kind)}</Badge>
            {o.isAIGenerated ? <AIBadge /> : null}
          </span>
        }
        description={`For ${label(AUDIENCE_LABELS, o.audience).toLowerCase()}`}
      />
      <DetailLayout
        main={
          <>
            {o.isAIGenerated ? <AIDisclaimer text={o.disclaimer} model={o.model} reviewedAt={o.reviewedAt} /> : null}
            <article lang={o.language} aria-label={o.title}>
              <Markdown>{o.body}</Markdown>
            </article>
            <DetailBlock title="Sources">
              <p className="mb-3 text-sm text-ink-muted">This material is based on the following published records.</p>
              <ul className="space-y-3">
                {o.sources.map((s) => (
                  <li key={`${s.type}-${s.id}`} className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
                    <Icon name="book" size={18} className="mt-0.5 shrink-0 text-polar-800" />
                    <div>
                      <Link href={searchResultHref({ type: s.type, slug: s.slug })} className="font-medium text-glacier-700 underline underline-offset-2">
                        {s.title}
                      </Link>
                      <p className="text-xs text-ink-muted">{label(SEARCH_TYPE_LABELS, s.type)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </DetailBlock>
          </>
        }
        aside={
          <FactsCard title="About this piece">
            <MetaList
              items={[
                { label: "Format", value: label(AI_KIND_LABELS, o.kind) },
                { label: "Audience", value: label(AUDIENCE_LABELS, o.audience) },
                { label: "Language", value: languageName(o.language) },
                { label: "Reviewed by", value: o.reviewedBy?.name },
                { label: "Published", value: o.publishedAt ? <DateTime value={o.publishedAt} style="long" /> : null },
              ]}
            />
          </FactsCard>
        }
      />
    </>
  );
}
