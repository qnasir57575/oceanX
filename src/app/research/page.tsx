import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublications } from "@/lib/api/publications";
import { ListPublicationsQuerySchema, PublicationTypeSchema } from "@/contracts/schemas/publications";
import { PolarRegionSchema } from "@/contracts/primitives";
import type { ListPublicationsQuery } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { RowListSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filters/filter-form";
import { SelectField, TextField } from "@/components/filters/fields";
import { ActiveFilters, FiltersSkeleton, ListLayout, ResultsToolbar, type ActiveFilter } from "@/components/filters/results";
import { PublicationList } from "@/components/content/publication-item";
import { countActiveFilters, parseQuery, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions, sortOptions } from "@/lib/ui/options";
import { categoryName, loadCategoryOptions } from "@/lib/ui/data";
import { label, PUBLICATION_TYPE_LABELS, REGION_LABELS } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "Research publications",
  description: "Search journal articles, reports, theses and other research outputs by type, region, author, year and topic.",
};

const PATH = "/research";
const LIMIT = 12;

const toQuery = (sp: RawSearchParams): ListPublicationsQuery => parseQuery(ListPublicationsQuerySchema, sp, { limit: LIMIT });

export default function ResearchPage({ searchParams }: PageProps<"/research">) {
  return (
    <>
      <PageHeader
        title="Research publications"
        description="Journal articles, conference papers, reports, theses and data papers. Search by title, abstract or author and narrow the list with filters."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Research" }]}
      />
      <Container className="py-10">
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton fields={6} />}>
              <PublicationFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="publications">
            <Suspense fallback={<RowListSkeleton count={LIMIT} label="Loading publications" />}>
              <ResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function PublicationFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  const categories = await loadCategoryOptions();
  return (
    <FilterForm
      key={toURLSearchParams(sp).toString()}
      action={PATH}
      activeCount={countActiveFilters(sp)}
      preserve={{ sort: query.sort === "newest" ? undefined : query.sort, expeditionId: query.expeditionId }}
    >
      <TextField name="q" label="Keyword" type="search" value={query.q} placeholder="Title, abstract or author" />
      <TextField name="author" label="Author name" value={query.author} placeholder="e.g. surname" hint="At least 2 characters." />
      <SelectField name="type" label="Publication type" value={query.type} options={enumOptions(PublicationTypeSchema.options, PUBLICATION_TYPE_LABELS)} allLabel="All types" />
      <SelectField name="region" label="Region" value={query.region} options={enumOptions(PolarRegionSchema.options, REGION_LABELS)} allLabel="All regions" />
      {categories.length > 0 ? (
        <SelectField
          name="category"
          label="Research topic"
          value={query.category}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          allLabel="All topics"
        />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <TextField name="yearFrom" label="From year" type="number" inputMode="numeric" min={1900} max={2100} value={query.yearFrom} />
        <TextField name="yearTo" label="To year" type="number" inputMode="numeric" min={1900} max={2100} value={query.yearTo} />
      </div>
    </FilterForm>
  );
}

async function ResultsKeyed({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  return (
    <Suspense key={JSON.stringify(query)} fallback={<RowListSkeleton count={LIMIT} label="Loading publications" />}>
      <Results sp={sp} query={query} />
    </Suspense>
  );
}

async function Results({ sp, query }: { sp: RawSearchParams; query: ListPublicationsQuery }) {
  const { data, pagination } = await getPublications(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.author && { key: "author", label: `Author: ${query.author}` },
    query.type && { key: "type", label: label(PUBLICATION_TYPE_LABELS, query.type) },
    query.region && { key: "region", label: label(REGION_LABELS, query.region) },
    query.category && { key: "category", label: `Topic: ${await categoryName(query.category)}` },
    query.keyword && { key: "keyword", label: `Keyword: ${query.keyword}` },
    query.expeditionId && { key: "expeditionId", label: "From one expedition" },
    query.year && { key: "year", label: `Year ${query.year}` },
    query.yearFrom && { key: "yearFrom", label: `From ${query.yearFrom}` },
    query.yearTo && { key: "yearTo", label: `To ${query.yearTo}` },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar
        pagination={pagination}
        noun="publication"
        action={PATH}
        searchParams={sp}
        sortOptions={sortOptions(ListPublicationsQuerySchema)}
        sort={query.sort ?? "newest"}
      />
      {data.length === 0 ? (
        <EmptyState
          icon="book"
          title={active.length > 0 ? "No publications match these filters" : "No publications yet"}
          description={active.length > 0 ? "Try different keywords or remove a filter." : "Published research will appear here."}
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <PublicationList publications={data} headingLevel="h2" />
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Publication pages" />
    </>
  );
}
