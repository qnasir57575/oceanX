import { cn } from "@/lib/ui/cn";

/** A single placeholder block. Decorative: wrap groups in <LoadingRegion>. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-shimmer rounded-md bg-polar-100", className)} />;
}

/** Announces loading to assistive tech while rendering skeleton children. */
export function LoadingRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Generic card skeleton matching the content cards (image + text lines). */
export function CardSkeleton({ withImage = true, className }: { withImage?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface", className)}>
      {withImage ? <Skeleton className="aspect-[16/9] w-full rounded-none" /> : null}
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Responsive grid of card skeletons — use `count = limit` of the request. */
export function CardGridSkeleton({
  count = 6,
  withImage = true,
  label = "Loading results",
  className,
}: {
  count?: number;
  withImage?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: count }, (_, i) => (
          <CardSkeleton key={i} withImage={withImage} />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Skeleton for list-row layouts (publications, search results). */
export function RowListSkeleton({ count = 6, label = "Loading results" }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Skeleton for a detail page: header block + body + aside. */
export function DetailSkeleton() {
  return (
    <LoadingRegion label="Loading record">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
