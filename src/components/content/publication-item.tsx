import type { Author, PublicationSummary } from "@/types/api";
import { CardTitle } from "@/components/content/card";
import { AccessBadge, RegionBadge } from "@/components/content/badges";
import { Badge } from "@/components/ui/badge";
import { label, PUBLICATION_TYPE_LABELS } from "@/lib/format/labels";

export function formatAuthors(authors: Author[], max = 3): string {
  if (authors.length === 0) return "";
  const names = authors.slice(0, max).map((a) => a.name);
  return authors.length > max ? `${names.join(", ")} et al.` : names.join(", ");
}

/** Publication row for list layouts (research page, related lists). */
export function PublicationItem({
  publication: p,
  headingLevel = "h3",
  compact = false,
}: {
  publication: PublicationSummary;
  headingLevel?: "h2" | "h3" | "h4";
  compact?: boolean;
}) {
  return (
    <article className="group relative p-5 has-[a[data-card-link]:focus-visible]:outline-3 has-[a[data-card-link]:focus-visible]:-outline-offset-3 has-[a[data-card-link]:focus-visible]:outline-glacier-700 hover:bg-polar-50/60">
      <p className="mb-1.5 text-sm text-ink-muted">
        <span className="font-medium text-polar-900">{label(PUBLICATION_TYPE_LABELS, p.type)}</span> · {p.year}
        {p.venue ? <> · {p.venue}</> : null}
      </p>
      <CardTitle href={`/research/${p.slug}`} as={headingLevel} className="text-[1.0625rem]">
        {p.title}
      </CardTitle>
      {p.authors.length > 0 ? <p className="mt-1 text-sm text-ink">{formatAuthors(p.authors)}</p> : null}
      {!compact ? <p className="mt-2 line-clamp-2 text-[0.9375rem] text-ink-muted">{p.abstractPreview}</p> : null}
      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AccessBadge level={p.accessLevel} />
          {p.hasFullText ? <Badge icon="file">PDF available</Badge> : null}
          <RegionBadge region={p.region} />
          {p.doi ? <span className="font-mono text-xs text-ink-muted">doi:{p.doi}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export function PublicationList({
  publications,
  headingLevel,
  compact,
}: {
  publications: PublicationSummary[];
  headingLevel?: "h2" | "h3" | "h4";
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {publications.map((p) => (
        <li key={p.id}>
          <PublicationItem publication={p} headingLevel={headingLevel} compact={compact} />
        </li>
      ))}
    </ul>
  );
}
