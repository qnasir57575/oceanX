/**
 * Results header (count + sort), active-filter chips and the list-page grid.
 */
import Link from "next/link";
import type { Pagination } from "@/types/api";
import { SortControl } from "@/components/filters/sort-control";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { buildHref, toURLSearchParams, type RawSearchParams } from "@/lib/ui/query";
import type { Option } from "@/lib/ui/options";
import { plural } from "@/lib/format/number";

export interface ActiveFilter {
  key: string;
  label: string;
}

export function ResultsToolbar({
  pagination,
  noun,
  pluralNoun,
  action,
  searchParams,
  sortOptions,
  sort,
}: {
  pagination: Pagination;
  noun: string;
  pluralNoun?: string;
  action: string;
  searchParams: RawSearchParams;
  sortOptions: Option[];
  sort: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted" role="status">
        <span className="font-semibold text-ink">{plural(pagination.total, noun, pluralNoun)}</span>
        {pagination.totalPages > 1 ? ` · page ${pagination.page} of ${pagination.totalPages}` : null}
      </p>
      <SortControl action={action} current={toURLSearchParams(searchParams).toString()} options={sortOptions} value={sort} />
    </div>
  );
}

/** Removable chips for the filters currently in the URL. */
export function ActiveFilters({
  filters,
  action,
  searchParams,
}: {
  filters: ActiveFilter[];
  action: string;
  searchParams: RawSearchParams;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-muted">Filtered by:</span>
      <ul className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <li key={f.key}>
            <Link
              href={buildHref(action, searchParams, { [f.key]: null })}
              scroll={false}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong/60 bg-surface py-1 pr-2 pl-3 text-sm text-ink hover:bg-polar-50"
            >
              {f.label}
              <Icon name="close" size={14} />
              <span className="sr-only">(remove filter)</span>
            </Link>
          </li>
        ))}
      </ul>
      {filters.length > 1 ? (
        <Link href={action} scroll={false} className="text-sm font-medium text-glacier-700 underline-offset-2 hover:underline">
          Clear all
        </Link>
      ) : null}
    </div>
  );
}

/** Placeholder for the filter panel while its options load (desktop only). */
export function FiltersSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="hidden space-y-5 rounded-lg border border-line bg-surface p-5 lg:block" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Two-column list page body: filters sidebar + results. */
export function ListLayout({ filters, children }: { filters: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div>{filters}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
