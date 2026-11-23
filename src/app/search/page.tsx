import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { search } from "@/lib/api/search";
import { getKeywords } from "@/lib/api/taxonomy";
import { SearchQuerySchema } from "@/contracts/schemas/search";
import type { FacetBucket, SearchQuery, SearchResponse, SearchResultType } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { RowListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Icon } from "@/components/icons";
import { ActiveFilters, ListLayout, type ActiveFilter } from "@/components/filters/results";
import { SearchResultItem } from "@/components/content/search-result-item";
import { buildHref, getParam, parseQuery, type RawSearchParams } from "@/lib/ui/query";
import { categoryName } from "@/lib/ui/data";
import { formatNumber, plural } from "@/lib/format/number";
import { label, REGION_LABELS, SEARCH_TYPE_LABELS } from "@/lib/format/labels";
import { cn } from "@/lib/ui/cn";

export const metadata: Metadata = {
  title: "Search",
  description: "Search expeditions, publications, datasets, media, news and learning material.",
  robots: { index: false },
};

const PATH = "/search";
const LIMIT = 10;
const MIN_QUERY = 2;

function readQuery(sp: RawSearchParams): SearchQuery | null {
  const q = getParam(sp, "q")?.trim();
  if (!q || q.length < MIN_QUERY) return null;
  return parseQuery(SearchQuerySchema, sp, { q: q.slice(0, 200), limit: LIMIT });
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader title="Search the portal" breadcrumbs={[{ href: "/", label: "Home" }, { label: "Search" }]}>
        <Suspense fallback={<Skeleton className="h-14 max-w-2xl bg-white/15" />}>
          <HeaderSearchBox searchParams={searchParams} />
        </Suspense>
      </PageHeader>
      <Container className="py-10">
        <SectionBoundary subject="search results">
          <Suspense fallback={<SearchSkeleton />}>
            <SearchBody searchParams={searchParams} />
          </Suspense>
        </SectionBoundary>
      </Container>
    </>
  );
}

async function HeaderSearchBox({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const q = getParam(await searchParams, "q") ?? "";
  return <SearchBox key={q} defaultValue={q} size="lg" className="max-w-2xl" label="Search terms" />;
}

function SearchSkeleton() {
  return (
    <ListLayout filters={<Skeleton className="hidden h-80 w-full lg:block" />}>
      <RowListSkeleton count={LIMIT} label="Searching" />
    </ListLayout>
  );
}

async function SearchBody({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = readQuery(sp);
  if (!query) return <SearchLanding tooShort={Boolean(getParam(sp, "q"))} />;
  return (
    <Suspense key={JSON.stringify(query)} fallback={<SearchSkeleton />}>
      <SearchResults sp={sp} query={query} />
    </Suspense>
  );
}

async function SearchLanding({ tooShort }: { tooShort: boolean }) {
  let keywords: Array<{ id: string; label: string; usageCount: number }> = [];
  try {
    keywords = (await getKeywords({ limit: 24 })).data;
  } catch {
    keywords = [];
  }
  const popular = [...keywords].sort((a, b) => b.usageCount - a.usageCount);
  return (
    <div className="space-y-10">
      {tooShort ? (
        <p role="status" className="text-ink-muted">
          Enter at least {MIN_QUERY} characters to search.
        </p>
      ) : (
        <p className="text-ink-muted">Search across expeditions, publications, datasets, media, news and learning material.</p>
      )}
      {popular.length > 0 ? (
        <section aria-labelledby="popular-title">
          <h2 id="popular-title" className="mb-4 text-xl font-semibold text-ink">
            Popular keywords
          </h2>
          <ul className="flex flex-wrap gap-2">
            {popular.map((k) => (
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
        </section>
      ) : null}
      <p>
        <Link href="/topics" className="inline-flex items-center gap-1 font-medium text-glacier-700 underline-offset-2 hover:underline">
          Browse research topics
          <Icon name="arrow-right" size={16} />
        </Link>
      </p>
    </div>
  );
}

function FacetGroup({
  title,
  buckets,
  isActive,
  hrefFor,
  labelFor,
}: {
  title: string;
  buckets: FacetBucket[];
  isActive: (value: string) => boolean;
  hrefFor: (value: string) => string;
  labelFor: (value: string) => string;
}) {
  if (buckets.length === 0) return null;
  return (
    <nav aria-label={`Filter by ${title.toLowerCase()}`}>
      <h3 className="mb-2 font-sans text-sm font-semibold text-ink">{title}</h3>
      <ul className="space-y-1">
        {buckets.map((b) => {
          const active = isActive(b.value);
          return (
            <li key={b.value}>
              <Link
                href={hrefFor(b.value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-polar-900 text-white" : "text-ink hover:bg-polar-50",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex size-4 items-center justify-center rounded border",
                      active ? "border-white bg-white text-polar-900" : "border-line-strong",
                    )}
                  >
                    {active ? <Icon name="check" size={12} /> : null}
                  </span>
                  {labelFor(b.value)}
                  {active ? <span className="sr-only"> (selected, select to remove)</span> : null}
                </span>
                <span className={cn("text-xs tabular-nums", active ? "text-polar-100" : "text-ink-muted")}>{formatNumber(b.count)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Facets({ sp, query, facets }: { sp: RawSearchParams; query: SearchQuery; facets: SearchResponse["meta"]["facets"] }) {
  const types = query.types ?? [];
  const toggleType = (t: string) => {
    const next = types.includes(t as SearchResultType) ? types.filter((x) => x !== t) : [...types, t as SearchResultType];
    return buildHref(PATH, sp, { types: next.length ? next.join(",") : null });
  };
  const singleYear = query.yearFrom && query.yearFrom === query.yearTo ? String(query.yearFrom) : null;
  const years = [...facets.years].sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <section aria-label="Refine results" className="space-y-6 rounded-lg border border-line bg-surface p-5">
      <h2 className="font-sans text-sm font-semibold text-polar-900">Refine results</h2>
      <FacetGroup
        title="Content type"
        buckets={facets.types}
        isActive={(v) => types.includes(v as SearchResultType)}
        hrefFor={toggleType}
        labelFor={(v) => label(SEARCH_TYPE_LABELS, v)}
      />
      <FacetGroup
        title="Region"
        buckets={facets.regions}
        isActive={(v) => query.region === v}
        hrefFor={(v) => buildHref(PATH, sp, { region: query.region === v ? null : v })}
        labelFor={(v) => label(REGION_LABELS, v)}
      />
      <FacetGroup
        title="Year"
        buckets={years}
        isActive={(v) => singleYear === v}
        hrefFor={(v) => buildHref(PATH, sp, singleYear === v ? { yearFrom: null, yearTo: null } : { yearFrom: v, yearTo: v })}
        labelFor={(v) => v}
      />
    </section>
  );
}

async function SearchResults({ sp, query }: { sp: RawSearchParams; query: SearchQuery }) {
  const res = await search(query);
  const { data, pagination, meta } = res;
  const active: ActiveFilter[] = [
    ...(query.types ?? []).length
      ? [{ key: "types", label: (query.types ?? []).map((t) => label(SEARCH_TYPE_LABELS, t)).join(", ") }]
      : [],
    ...(query.region ? [{ key: "region", label: label(REGION_LABELS, query.region) }] : []),
    ...(query.category ? [{ key: "category", label: `Topic: ${await categoryName(query.category)}` }] : []),
    ...(query.yearFrom ? [{ key: "yearFrom", label: `From ${query.yearFrom}` }] : []),
    ...(query.yearTo ? [{ key: "yearTo", label: `To ${query.yearTo}` }] : []),
  ];
  const clearAll = buildHref(PATH, { q: query.q });

  return (
    <ListLayout filters={<Facets sp={sp} query={query} facets={meta.facets} />}>
      <ActiveFilters filters={active} action={PATH} searchParams={sp} clearHref={clearAll} />
      <p role="status" className="mb-5 text-sm text-ink-muted">
        <span className="font-semibold text-ink">{plural(pagination.total, "result")}</span> for “{meta.query}”
        {pagination.totalPages > 1 ? ` · page ${pagination.page} of ${pagination.totalPages}` : null}
      </p>
      {data.length === 0 ? (
        <EmptyState
          title={`No results for “${meta.query}”`}
          description={
            active.length > 0
              ? "Try removing a filter to widen the search."
              : "Check the spelling, try fewer or more general words, or browse research topics."
          }
          action={
            active.length > 0 ? (
              <ButtonLink href={clearAll} variant="secondary">
                Remove all filters
              </ButtonLink>
            ) : (
              <ButtonLink href="/topics" variant="secondary">
                Browse research topics
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {data.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <SearchResultItem result={r} />
            </li>
          ))}
        </ul>
      )}
      <Pagination pagination={pagination} pathname={PATH} searchParams={sp} label="Search result pages" />
    </ListLayout>
  );
}
