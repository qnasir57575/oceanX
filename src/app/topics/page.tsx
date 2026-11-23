import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCategories, getKeywords } from "@/lib/api/taxonomy";
import type { ResearchCategory } from "@/types/api";
import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton, LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { formatNumber } from "@/lib/format/number";
import { countSummary } from "@/lib/format/counts";

export const metadata: Metadata = {
  title: "Research topics",
  description: "Browse expeditions, publications, datasets and media by research topic and keyword.",
};

export default function TopicsPage() {
  return (
    <>
      <PageHeader
        title="Research topics"
        description="Explore the portal by scientific theme. Each topic gathers related expeditions, publications, datasets and media."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Research topics" }]}
      />
      <Container className="space-y-14 py-10">
        <SectionBoundary subject="research topics">
          <Suspense fallback={<CardGridSkeleton count={9} withImage={false} label="Loading topics" />}>
            <TopicGrid />
          </Suspense>
        </SectionBoundary>
        <section aria-labelledby="keywords-title">
          <SectionHeading title="Keywords" id="keywords-title" description="Frequently used keywords. Select one to search for it." />
          <SectionBoundary subject="keywords" compact>
            <Suspense fallback={<KeywordsSkeleton />}>
              <KeywordCloud />
            </Suspense>
          </SectionBoundary>
        </section>
      </Container>
    </>
  );
}

function TopicCard({ category, subtopics }: { category: ResearchCategory; subtopics: ResearchCategory[] }) {
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md has-[a[data-card-link]:focus-visible]:outline-3 has-[a[data-card-link]:focus-visible]:outline-offset-2 has-[a[data-card-link]:focus-visible]:outline-glacier-700">
      <h2 className="font-serif text-lg font-semibold text-ink">
        <Link
          href={`/topics/${category.slug}`}
          data-card-link=""
          className="after:absolute after:inset-0 group-hover:text-glacier-700 focus-visible:outline-none"
        >
          {category.name}
        </Link>
      </h2>
      {category.description ? <p className="mt-2 text-[0.9375rem] text-ink-muted">{category.description}</p> : null}
      <p className="mt-auto pt-4 text-sm text-ink">{countSummary(category.counts)}</p>
      {subtopics.length > 0 ? (
        <ul className="relative z-[2] mt-3 flex flex-wrap gap-2 border-t border-line pt-3" aria-label={`Subtopics of ${category.name}`}>
          {subtopics.map((s) => (
            <li key={s.id}>
              <Link href={`/topics/${s.slug}`} className="text-sm text-glacier-700 underline underline-offset-2 hover:text-glacier-800">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

async function TopicGrid() {
  const { data } = await getCategories({ withCounts: true });
  if (data.length === 0) {
    return <EmptyState icon="compass" title="No research topics yet" description="Topics will appear here once they are set up." />;
  }
  const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const topLevel = sorted.filter((c) => !c.parentId || !data.some((p) => p.id === c.parentId));
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {topLevel.map((c) => (
        <li key={c.id}>
          <TopicCard category={c} subtopics={sorted.filter((s) => s.parentId === c.id)} />
        </li>
      ))}
    </ul>
  );
}

async function KeywordCloud() {
  const { data } = await getKeywords({ limit: 40 });
  if (data.length === 0) return <p className="text-ink-muted">No keywords yet.</p>;
  const sorted = [...data].sort((a, b) => b.usageCount - a.usageCount || a.label.localeCompare(b.label));
  return (
    <ul className="flex flex-wrap gap-2">
      {sorted.map((k) => (
        <li key={k.id}>
          <Link
            href={`/search?q=${encodeURIComponent(k.label)}`}
            className="inline-flex items-center gap-2 rounded-full border border-line-strong/50 bg-surface px-3 py-1.5 text-sm text-ink hover:border-glacier-700 hover:text-glacier-700"
          >
            {k.label}
            <span className="text-xs text-ink-muted">
              {formatNumber(k.usageCount)}
              <span className="sr-only"> records</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function KeywordsSkeleton() {
  return (
    <LoadingRegion label="Loading keywords">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 16 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
