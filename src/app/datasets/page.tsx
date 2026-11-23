import type { Metadata } from "next";
import { Suspense } from "react";
import { getDatasets } from "@/lib/api/datasets";
import { ListDatasetsQuerySchema } from "@/contracts/schemas/datasets";
import { AccessLevelSchema, PolarRegionSchema } from "@/contracts/primitives";
import type { ListDatasetsQuery } from "@/types/api";
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
import { DatasetCard } from "@/components/content/dataset-card";
import { countActiveFilters, parseQuery, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions, sortOptions } from "@/lib/ui/options";
import { categoryName, loadCategoryOptions } from "@/lib/ui/data";
import { formatDate } from "@/lib/format/date";
import { ACCESS_LEVEL_LABELS, label, REGION_LABELS } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "Data repository",
  description: "Find scientific datasets by region, parameter, file format, access level and time period.",
};

const PATH = "/datasets";
const LIMIT = 12;

const toQuery = (sp: RawSearchParams): ListDatasetsQuery => parseQuery(ListDatasetsQuerySchema, sp, { limit: LIMIT });

const gridSkeleton = <CardGridSkeleton count={LIMIT} withImage={false} className="lg:grid-cols-2" label="Loading datasets" />;

export default function DatasetsPage({ searchParams }: PageProps<"/datasets">) {
  return (
    <>
      <PageHeader
        title="Data repository"
        description="Scientific datasets with documentation, coverage, licences and downloadable files. Filter by measured parameter, format, access level or time period."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Data repository" }]}
      />
      <Container className="py-10">
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton fields={7} />}>
              <DatasetFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="datasets">
            <Suspense fallback={gridSkeleton}>
              <ResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function DatasetFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
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
      <TextField name="q" label="Keyword" type="search" value={query.q} placeholder="Title, summary or parameter" />
      <SelectField name="region" label="Region" value={query.region} options={enumOptions(PolarRegionSchema.options, REGION_LABELS)} allLabel="All regions" />
      <SelectField name="accessLevel" label="Access" value={query.accessLevel} options={enumOptions(AccessLevelSchema.options, ACCESS_LEVEL_LABELS)} allLabel="Any access level" />
      <TextField name="parameter" label="Measured parameter" value={query.parameter} placeholder="e.g. temperature" />
      <TextField name="format" label="File format" value={query.format} placeholder="e.g. NetCDF, CSV" />
      {categories.length > 0 ? (
        <SelectField
          name="category"
          label="Research topic"
          value={query.category}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          allLabel="All topics"
        />
      ) : null}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Time coverage</legend>
        <div className="grid grid-cols-1 gap-3">
          <TextField name="from" label="From" type="date" value={query.from} />
          <TextField name="to" label="To" type="date" value={query.to} />
        </div>
      </fieldset>
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

async function Results({ sp, query }: { sp: RawSearchParams; query: ListDatasetsQuery }) {
  const { data, pagination } = await getDatasets(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.region && { key: "region", label: label(REGION_LABELS, query.region) },
    query.accessLevel && { key: "accessLevel", label: label(ACCESS_LEVEL_LABELS, query.accessLevel) },
    query.parameter && { key: "parameter", label: `Parameter: ${query.parameter}` },
    query.format && { key: "format", label: `Format: ${query.format}` },
    query.category && { key: "category", label: `Topic: ${await categoryName(query.category)}` },
    query.keyword && { key: "keyword", label: `Keyword: ${query.keyword}` },
    query.expeditionId && { key: "expeditionId", label: "From one expedition" },
    query.from && { key: "from", label: `From ${formatDate(query.from, "medium", "en-IN")}` },
    query.to && { key: "to", label: `To ${formatDate(query.to, "medium", "en-IN")}` },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar
        pagination={pagination}
        noun="dataset"
        action={PATH}
        searchParams={sp}
        sortOptions={sortOptions(ListDatasetsQuerySchema)}
        sort={query.sort ?? "newest"}
      />
      {data.length === 0 ? (
        <EmptyState
          icon="database"
          title={active.length > 0 ? "No datasets match these filters" : "No datasets yet"}
          description={active.length > 0 ? "Try a broader parameter or time range, or remove a filter." : "Published datasets will appear here."}
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {data.map((d) => (
            <li key={d.id}>
              <DatasetCard dataset={d} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Dataset pages" />
    </>
  );
}
