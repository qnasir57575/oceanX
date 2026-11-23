/**
 * Numbered pagination rendered as plain links (works without JS, keeps
 * `page` in the URL). Built from the API's `pagination` object.
 */
import Link from "next/link";
import type { Pagination as PaginationData } from "@/types/api";
import { buildHref, type RawSearchParams } from "@/lib/ui/query";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/ui/cn";
import { formatNumber } from "@/lib/format/number";
import { pageWindow } from "@/lib/ui/pagination";

const itemBase =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";

export function Pagination({
  pagination,
  pathname,
  searchParams,
  label = "Pagination",
}: {
  pagination: PaginationData;
  pathname: string;
  searchParams: RawSearchParams;
  label?: string;
}) {
  const { page, totalPages, total, limit } = pagination;
  if (totalPages <= 1) return null;
  const href = (p: number) => buildHref(pathname, searchParams, { page: p });
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav aria-label={label} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-ink-muted">
        Showing {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {pagination.hasPreviousPage ? (
            <Link href={href(page - 1)} className={cn(itemBase, "text-glacier-700 hover:bg-glacier-50")} rel="prev">
              <Icon name="chevron-left" size={18} />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </Link>
          ) : (
            <span className={cn(itemBase, "text-ink-muted/60")} aria-disabled="true">
              <Icon name="chevron-left" size={18} />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-ink-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  itemBase,
                  p === page ? "bg-polar-900 text-white" : "text-ink hover:bg-polar-50",
                )}
              >
                <span className="sr-only">Page </span>
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {pagination.hasNextPage ? (
            <Link href={href(page + 1)} className={cn(itemBase, "text-glacier-700 hover:bg-glacier-50")} rel="next">
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <Icon name="chevron-right" size={18} />
            </Link>
          ) : (
            <span className={cn(itemBase, "text-ink-muted/60")} aria-disabled="true">
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <Icon name="chevron-right" size={18} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
