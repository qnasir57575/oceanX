import type { Metadata } from "next";
import { Suspense } from "react";
import { getActivities } from "@/lib/api/activities";
import { ActivityTypeSchema, ListActivitiesQuerySchema } from "@/contracts/schemas/activities";
import { PolarRegionSchema } from "@/contracts/primitives";
import type { ListActivitiesQuery } from "@/types/api";
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
import { ActivityCard } from "@/components/content/activity-card";
import { countActiveFilters, parseQuery, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import { enumOptions, sortOptions } from "@/lib/ui/options";
import { categoryName, loadCategoryOptions } from "@/lib/ui/data";
import { formatDate } from "@/lib/format/date";
import { ACTIVITY_TYPE_LABELS, label, REGION_LABELS } from "@/lib/format/labels";

export const metadata: Metadata = {
  title: "News & events",
  description: "News, press releases, announcements, events, workshops and outreach programmes.",
};

const PATH = "/news";
const LIMIT = 12;

const toQuery = (sp: RawSearchParams): ListActivitiesQuery => parseQuery(ListActivitiesQuerySchema, sp, { limit: LIMIT });

const gridSkeleton = <CardGridSkeleton count={LIMIT} className="lg:grid-cols-2 xl:grid-cols-3" label="Loading news and events" />;

export default function NewsPage({ searchParams }: PageProps<"/news">) {
  return (
    <>
      <PageHeader
        title="News & events"
        description="Announcements, press releases, public events, workshops and outreach programmes."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "News & events" }]}
      />
      <Container className="py-10">
        <ListLayout
          filters={
            <Suspense fallback={<FiltersSkeleton fields={5} />}>
              <NewsFilters searchParams={searchParams} />
            </Suspense>
          }
        >
          <SectionBoundary subject="news and events">
            <Suspense fallback={gridSkeleton}>
              <ResultsKeyed searchParams={searchParams} />
            </Suspense>
          </SectionBoundary>
        </ListLayout>
      </Container>
    </>
  );
}

async function NewsFilters({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
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
      <CheckboxField name="upcoming" label="Upcoming events only" checked={query.upcoming === true} />
      <SelectField name="type" label="Type" value={query.type} options={enumOptions(ActivityTypeSchema.options, ACTIVITY_TYPE_LABELS)} allLabel="All types" />
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
      <fieldset>
        <legend className="text-sm font-medium text-ink">Date</legend>
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

async function Results({ sp, query }: { sp: RawSearchParams; query: ListActivitiesQuery }) {
  const { data, pagination } = await getActivities(query);
  const active: ActiveFilter[] = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.upcoming && { key: "upcoming", label: "Upcoming" },
    query.type && { key: "type", label: label(ACTIVITY_TYPE_LABELS, query.type) },
    query.region && { key: "region", label: label(REGION_LABELS, query.region) },
    query.category && { key: "category", label: `Topic: ${await categoryName(query.category)}` },
    query.keyword && { key: "keyword", label: `Keyword: ${query.keyword}` },
    query.from && { key: "from", label: `From ${formatDate(query.from, "medium", "en-IN")}` },
    query.to && { key: "to", label: `To ${formatDate(query.to, "medium", "en-IN")}` },
  ].filter((f): f is ActiveFilter => Boolean(f));

  return (
    <>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} />
      <ResultsToolbar
        pagination={pagination}
        noun="item"
        action={PATH}
        searchParams={sp}
        sortOptions={sortOptions(ListActivitiesQuerySchema)}
        sort={query.sort ?? "newest"}
      />
      {data.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={active.length > 0 ? "Nothing matches these filters" : "No news or events yet"}
          description={
            query.upcoming ? "There are no upcoming events right now. Check back soon." : active.length > 0 ? "Try removing a filter." : "Announcements and events will appear here."
          }
          action={active.length > 0 ? <ButtonLink href={PATH} variant="secondary">Clear all filters</ButtonLink> : null}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((a, i) => (
            <li key={a.id}>
              <ActivityCard activity={a} headingLevel="h2" priority={i < 3} />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="News pages" />
    </>
  );
}
