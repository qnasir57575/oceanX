import type { Metadata } from "next";
import { Suspense } from "react";
import { getExpeditions } from "@/lib/api/expeditions";
import { ExpeditionPhaseSchema, ListExpeditionsQuerySchema } from "@/contracts/schemas/expeditions";
import { PolarRegionSchema } from "@/contracts/primitives";
import type { ListExpeditionsQuery } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filters/filter-form";
import { SelectField, TextField } from "@/components/filters/fields";
import { ActiveFilters, FiltersSkeleton, ListLayout, ResultsToolbar, type ActiveFilter } from "@/components/filters/results";
import { ExpeditionCard } from "@/components/content/expedition-card";
import { parseQuery, toURLSearchParams, countActiveFilters, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions, sortOptions } from "@/lib/ui/options";
import { categoryName, loadCategoryOptions } from "@/lib/ui/data";
import { label, PHASE_LABELS, REGION_LABELS } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "Expeditions",
  description: "Browse polar and high-altitude field expeditions by region, status, year and topic.",
};

const PATH = "/expeditions";
const LIMIT = 12;

function toQuery(sp: RawSearchParams): ListExpeditionsQuery {
  return parseQuery(ListExpeditionsQuerySchema, sp, { limit: LIMIT });
}

export default function ExpeditionsPage({ searchParams }: PageProps<"/expeditions">) {
  return (
    <>
      <PageHeader
        title="Expedition explorer"
        description="Field campaigns across Antarctica, the Arctic, the Southern Ocean and the Himalaya. Filter by region, status, year or research topic."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Expeditions" }]}
      />
      <Container className="py-10">
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton />}>
              <ExpeditionFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="expeditions">
            <Suspense fallback={<CardGridSkeleton count={LIMIT} className="lg:grid-cols-2 xl:grid-cols-3" label="Loading expeditions" />}>
              <ExpeditionResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function ExpeditionFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  const categories = await loadCategoryOptions();
  return (
    <FilterForm
      key={toURLSearchParams(sp).toString()}
      action={PATH}
      activeCount={countActiveFilters(sp)}
      preserve={{ sort: query.sort === "newest" ? undefined : query.sort }}
    >
      <TextField name="q" label="Keyword" type="search" value={query.q} placeholder="Title or summary" />
      <SelectField name="region" label="Region" value={query.region} options={enumOptions(PolarRegionSchema.options, REGION_LABELS)} allLabel="All regions" />
      <SelectField name="phase" label="Status" value={query.phase} options={enumOptions(ExpeditionPhaseSchema.options, PHASE_LABELS)} allLabel="Any status" />
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

/** Re-keys the inner Suspense on every query change so the skeleton shows while loading. */
async function ExpeditionResultsKeyed({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = toQuery(sp);
  return (
    <Suspense
      key={JSON.stringify(query)}
      fallback={<CardGridSkeleton count={LIMIT} className="lg:grid-cols-2 xl:grid-cols-3" label="Loading expeditions" />}
    >
      <ExpeditionResults sp={sp} query={query} />
    </Suspense>
  );
}

async function ExpeditionResults({ sp, query }: { sp: RawSearchParams; query: ListExpeditionsQuery }) {
  const { data, pagination } = await getExpeditions(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.region && { key: "region", label: label(REGION_LABELS, query.region) },
    query.phase && { key: "phase", label: label(PHASE_LABELS, query.phase) },
    query.category && { key: "category", label: `Topic: ${await categoryName(query.category)}` },
    query.year && { key: "year", label: `Year ${query.year}` },
    query.yearFrom && { key: "yearFrom", label: `From ${query.yearFrom}` },
    query.yearTo && { key: "yearTo", label: `To ${query.yearTo}` },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar
        pagination={pagination}
        noun="expedition"
        action={PATH}
        searchParams={sp}
        sortOptions={sortOptions(ListExpeditionsQuerySchema)}
        sort={query.sort ?? "newest"}
      />
      {data.length === 0 ? (
        <EmptyState
          icon="ship"
          title={active.length > 0 ? "No expeditions match these filters" : "No expeditions yet"}
          description={active.length > 0 ? "Try removing a filter or broadening the year range." : "Published expeditions will appear here."}
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((e, i) => (
            <li key={e.id}>
              <ExpeditionCard expedition={e} priority={i < 3} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Expedition pages" />
    </>
  );
}
