import type { Metadata } from "next";
import { Suspense } from "react";
import { getMediaAssets } from "@/lib/api/media";
import { ListMediaQuerySchema, MediaTypeSchema } from "@/contracts/schemas/media";
import { PolarRegionSchema } from "@/contracts/primitives";
import type { ListMediaQuery } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filters/filter-form";
import { CheckboxField, SelectField, TextField } from "@/components/filters/fields";
import { ActiveFilters, FiltersSkeleton, ListLayout, ResultsToolbar, type ActiveFilter } from "@/components/filters/results";
import { MediaTile } from "@/components/content/media-tile";
import { countActiveFilters, parseQuery, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions, sortOptions } from "@/lib/ui/options";
import { categoryName, expeditionTitle, loadCategoryOptions } from "@/lib/ui/data";
import { label, MEDIA_TYPE_LABELS, REGION_LABELS } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "Media gallery",
  description: "Photographs, video, audio and documents from polar fieldwork.",
};

const PATH = "/gallery";
const LIMIT = 24;

const toQuery = (sp: RawSearchParams): ListMediaQuery => parseQuery(ListMediaQuerySchema, sp, { limit: LIMIT });

const gridSkeleton = (
  <CardGridSkeleton count={12} className="grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" label="Loading media" />
);

export default function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  return (
    <>
      <PageHeader
        title="Media gallery"
        description="Photographs, video, audio and documents from the field. Every item shows its credit and licence."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Media gallery" }]}
      />
      <Container className="py-10">
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton fields={4} />}>
              <MediaFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="the gallery">
            <Suspense fallback={gridSkeleton}>
              <ResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function MediaFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
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
      <TextField name="q" label="Keyword" type="search" value={query.q} placeholder="Title or description" />
      <SelectField name="type" label="Media type" value={query.type} options={enumOptions(MediaTypeSchema.options, MEDIA_TYPE_LABELS)} allLabel="All media" />
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
      <CheckboxField name="featured" label="Featured only" checked={query.featured === true} />
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

async function Results({ sp, query }: { sp: RawSearchParams; query: ListMediaQuery }) {
  const { data, pagination } = await getMediaAssets(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.type && { key: "type", label: label(MEDIA_TYPE_LABELS, query.type) },
    query.region && { key: "region", label: label(REGION_LABELS, query.region) },
    query.category && { key: "category", label: `Topic: ${await categoryName(query.category)}` },
    query.keyword && { key: "keyword", label: `Keyword: ${query.keyword}` },
    query.featured && { key: "featured", label: "Featured" },
    query.expeditionId && { key: "expeditionId", label: `Expedition: ${(await expeditionTitle(query.expeditionId)) ?? "selected expedition"}` },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar
        pagination={pagination}
        noun="item"
        action={PATH}
        searchParams={sp}
        sortOptions={sortOptions(ListMediaQuerySchema)}
        sort={query.sort ?? "newest"}
      />
      {data.length === 0 ? (
        <EmptyState
          icon="image"
          title={active.length > 0 ? "No media match these filters" : "No media yet"}
          description={active.length > 0 ? "Try another media type or remove a filter." : "Published photos, video and audio will appear here."}
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {data.map((m, i) => (
            <li key={m.id}>
              <MediaTile media={m} headingLevel="h2" priority={i < 4} />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Gallery pages" />
    </>
  );
}
