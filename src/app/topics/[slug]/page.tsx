import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";
import { getCategories, getCategory } from "@/lib/api/taxonomy";
import { getExpeditions } from "@/lib/api/expeditions";
import { getPublications } from "@/lib/api/publications";
import { getDatasets } from "@/lib/api/datasets";
import type { ResearchCategory } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { DetailPageSkeleton, RelatedSection } from "@/components/layout/detail";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton, RowListSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { ExpeditionCard } from "@/components/content/expedition-card";
import { PublicationList } from "@/components/content/publication-item";
import { DatasetCard } from "@/components/content/dataset-card";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { formatNumber } from "@/lib/format/number";

const loadCategory = cache((slug: string) => getCategory(slug));

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(
    loadCategory(slug),
    ({ data }) => ({ title: data.name, description: data.description ?? `Research records about ${data.name}.` }),
    "Research topic",
  );
}

export default function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <TopicDetail params={params} />
    </Suspense>
  );
}

async function Subtopics({ category }: { category: ResearchCategory }) {
  let all: ResearchCategory[] = [];
  try {
    all = (await getCategories()).data;
  } catch {
    return null; // non-essential
  }
  const parent = category.parentId ? all.find((c) => c.id === category.parentId) : null;
  const children = all.filter((c) => c.parentId === category.id);
  if (!parent && children.length === 0) return null;
  return (
    <nav aria-label="Related topics" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {parent ? (
        <span>
          Part of{" "}
          <Link href={`/topics/${parent.slug}`} className="font-medium text-white underline underline-offset-2">
            {parent.name}
          </Link>
        </span>
      ) : null}
      {children.length > 0 ? (
        <span className="flex flex-wrap items-center gap-2">
          Subtopics:
          {children.map((c) => (
            <Link key={c.id} href={`/topics/${c.slug}`} className="rounded-full border border-white/30 px-2.5 py-0.5 text-white hover:bg-white/10">
              {c.name}
            </Link>
          ))}
        </span>
      ) : null}
    </nav>
  );
}

async function TopicDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: c } = await orNotFound(loadCategory(slug));
  const counts = c.counts ?? { expeditions: 0, publications: 0, datasets: 0, media: 0, activities: 0 };
  const total = counts.expeditions + counts.publications + counts.datasets + counts.media + counts.activities;
  const q = `category=${encodeURIComponent(c.slug)}`;

  return (
    <>
      <PageHeader
        title={c.name}
        eyebrow="Research topic"
        description={c.description}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/topics", label: "Research topics" }, { label: c.name }]}
      >
        <Suspense fallback={null}>
          <Subtopics category={c} />
        </Suspense>
      </PageHeader>

      <Container className="space-y-14 py-10">
        {total === 0 ? (
          <EmptyState
            icon="compass"
            title="Nothing published under this topic yet"
            action={
              <ButtonLink href="/topics" variant="secondary">
                Browse all topics
              </ButtonLink>
            }
          />
        ) : null}

        {counts.expeditions > 0 ? (
          <RelatedSection title="Expeditions" href={`/expeditions?${q}`} linkLabel={`All ${formatNumber(counts.expeditions)} expeditions`}>
            <SectionBoundary subject="expeditions" compact>
              <Suspense fallback={<CardGridSkeleton count={Math.min(3, counts.expeditions)} label="Loading expeditions" />}>
                <TopicExpeditions slug={c.slug} />
              </Suspense>
            </SectionBoundary>
          </RelatedSection>
        ) : null}

        {counts.publications > 0 ? (
          <RelatedSection title="Publications" href={`/research?${q}`} linkLabel={`All ${formatNumber(counts.publications)} publications`}>
            <SectionBoundary subject="publications" compact>
              <Suspense fallback={<RowListSkeleton count={Math.min(5, counts.publications)} label="Loading publications" />}>
                <TopicPublications slug={c.slug} />
              </Suspense>
            </SectionBoundary>
          </RelatedSection>
        ) : null}

        {counts.datasets > 0 ? (
          <RelatedSection title="Datasets" href={`/datasets?${q}`} linkLabel={`All ${formatNumber(counts.datasets)} datasets`}>
            <SectionBoundary subject="datasets" compact>
              <Suspense fallback={<CardGridSkeleton count={Math.min(4, counts.datasets)} withImage={false} className="lg:grid-cols-2" label="Loading datasets" />}>
                <TopicDatasets slug={c.slug} />
              </Suspense>
            </SectionBoundary>
          </RelatedSection>
        ) : null}

        {counts.media > 0 || counts.activities > 0 ? (
          <section aria-label="More from this topic" className="flex flex-wrap gap-3">
            {counts.media > 0 ? (
              <ButtonLink href={`/gallery?${q}`} variant="secondary">
                View {formatNumber(counts.media)} media items
              </ButtonLink>
            ) : null}
            {counts.activities > 0 ? (
              <ButtonLink href={`/news?${q}`} variant="secondary">
                View {formatNumber(counts.activities)} news and events
              </ButtonLink>
            ) : null}
          </section>
        ) : null}
      </Container>
    </>
  );
}

async function TopicExpeditions({ slug }: { slug: string }) {
  const { data } = await getExpeditions({ category: slug, limit: 3 });
  if (data.length === 0) return <p className="text-ink-muted">No published expeditions yet.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((e, i) => (
        <li key={e.id}>
          <ExpeditionCard expedition={e} priority={i === 0} />
        </li>
      ))}
    </ul>
  );
}

async function TopicPublications({ slug }: { slug: string }) {
  const { data } = await getPublications({ category: slug, limit: 5 });
  if (data.length === 0) return <p className="text-ink-muted">No published publications yet.</p>;
  return <PublicationList publications={data} />;
}

async function TopicDatasets({ slug }: { slug: string }) {
  const { data } = await getDatasets({ category: slug, limit: 4 });
  if (data.length === 0) return <p className="text-ink-muted">No published datasets yet.</p>;
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {data.map((d) => (
        <li key={d.id}>
          <DatasetCard dataset={d} />
        </li>
      ))}
    </ul>
  );
}
