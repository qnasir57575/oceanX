import type { Metadata } from "next";
import { Suspense } from "react";
import { getOutreachList } from "@/lib/api/outreach";
import { AIContentKindSchema, AudienceSchema, ListOutreachQuerySchema } from "@/contracts/schemas/ai";
import type { ListOutreachQuery } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { Alert, EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filters/filter-form";
import { SelectField, TextField } from "@/components/filters/fields";
import { ActiveFilters, FiltersSkeleton, ListLayout, ResultsToolbar, type ActiveFilter } from "@/components/filters/results";
import { OutreachCard } from "@/components/content/outreach-card";
import { countActiveFilters, parseQuery, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions } from "@/lib/ui/options";
import { AI_KIND_LABELS, AUDIENCE_LABELS, label } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "Learn",
  description: "Plain-language explainers, summaries and learning material about polar science.",
};

const PATH = "/learn";
const LIMIT = 12;

const toQuery = (sp: RawSearchParams): ListOutreachQuery => parseQuery(ListOutreachQuerySchema, sp, { limit: LIMIT });

const gridSkeleton = <CardGridSkeleton count={LIMIT} withImage={false} className="lg:grid-cols-2 xl:grid-cols-3" label="Loading learning material" />;

export default function LearnPage({ searchParams }: PageProps<"/learn">) {
  return (
    <>
      <PageHeader
        title="Learn about polar science"
        description="Explainers, summaries, quizzes and FAQs for students, educators and the public, each linked to the research records it is based on."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Learn" }]}
      />
      <Container className="py-10">
        <Alert tone="info" title="About this material" className="mb-8">
          Pieces marked “AI-assisted” were drafted with AI from published records and reviewed by portal staff before publication. Each
          piece links to its sources.
        </Alert>
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton fields={3} />}>
              <LearnFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="learning material">
            <Suspense fallback={gridSkeleton}>
              <ResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function LearnFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  return (
    <FilterForm key={toURLSearchParams(sp).toString()} action={PATH} activeCount={countActiveFilters(sp)}>
      <TextField name="q" label="Keyword" type="search" value={query.q} placeholder="Title or text" />
      <SelectField name="kind" label="Format" value={query.kind} options={enumOptions(AIContentKindSchema.options, AI_KIND_LABELS)} allLabel="All formats" />
      <SelectField name="audience" label="Audience" value={query.audience} options={enumOptions(AudienceSchema.options, AUDIENCE_LABELS)} allLabel="Everyone" />
    </FilterForm>
  );
}

async function ResultsKeyed({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  return (
    <Suspense key={JSON.stringify(query)} fallback={gridSkeleton}>
      <Results sp={sp} query={query} />
    </Suspense>
  );
}

async function Results({ sp, query }: { sp: RawSearchParams; query: ListOutreachQuery }) {
  const { data, pagination } = await getOutreachList(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.kind && { key: "kind", label: label(AI_KIND_LABELS, query.kind) },
    query.audience && { key: "audience", label: `For ${label(AUDIENCE_LABELS, query.audience).toLowerCase()}` },
    query.sourceId && { key: "sourceId", label: "From one record" },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar pagination={pagination} noun="item" action={PATH} searchParams={sp} sortOptions={[]} sort="newest" />
      {data.length === 0 ? (
        <EmptyState
          icon="compass"
          title={active.length > 0 ? "Nothing matches these filters" : "No learning material yet"}
          description={active.length > 0 ? "Try another format or audience." : "Explainers and summaries will appear here."}
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((o) => (
            <li key={o.id}>
              <OutreachCard item={o} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Learning material pages" />
    </>
  );
}
