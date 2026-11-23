import { cn } from "@/lib/ui/cn";

export interface MetaItem {
  label: string;
  value: React.ReactNode;
}

/**
 * Definition list for record facts (DOI, licence, coverage…).
 * Items whose value is null/undefined/""/[] are skipped automatically.
 */
export function MetaList({ items, className }: { items: MetaItem[]; className?: string }) {
  const visible = items.filter(
    ({ value }) => value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0),
  );
  if (visible.length === 0) return null;
  return (
    <dl className={cn("space-y-4", className)}>
      {visible.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
          <dd className="mt-1 text-[0.9375rem] break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Bordered aside card used on detail pages. */
export function FactsCard({
  title = "Record details",
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("rounded-lg border border-line bg-surface p-5", className)}>
      <h2 className="mb-4 font-sans text-sm font-semibold text-polar-900">{title}</h2>
      {children}
    </section>
  );
}
