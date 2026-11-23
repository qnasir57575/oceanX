import Link from "next/link";
import type { Author, DatasetRef, ExpeditionRef, PublicationRef } from "@/types/api";
import { Icon } from "@/components/icons";

/** Authors with affiliation and ORCID iD links. */
export function AuthorList({ authors }: { authors: Author[] }) {
  if (authors.length === 0) return null;
  return (
    <ul className="space-y-2">
      {authors.map((a, i) => (
        <li key={`${a.name}-${i}`} className="text-[0.9375rem]">
          <span className="font-medium text-ink">{a.name}</span>
          {a.orcid ? (
            <a
              href={`https://orcid.org/${a.orcid}`}
              rel="noopener noreferrer"
              target="_blank"
              className="ml-2 font-mono text-xs text-glacier-700 underline underline-offset-2"
            >
              ORCID {a.orcid}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          {a.affiliation ? <span className="block text-sm text-ink-muted">{a.affiliation}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" className={className ?? "inline-flex items-center gap-1 text-glacier-700 underline underline-offset-2"}>
      {children}
      <Icon name="external" size={14} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function DoiLink({ doi }: { doi: string }) {
  return (
    <ExternalLink href={`https://doi.org/${doi}`} className="inline-flex items-center gap-1 font-mono text-sm break-all text-glacier-700 underline underline-offset-2">
      {doi}
    </ExternalLink>
  );
}

export function ExpeditionLink({ expedition }: { expedition: ExpeditionRef }) {
  return (
    <Link href={`/expeditions/${expedition.slug}`} className="text-glacier-700 underline underline-offset-2 hover:text-glacier-800">
      {expedition.title} ({expedition.year})
    </Link>
  );
}

/** Simple list of linked records (datasets / publications). */
export function RecordRefList({
  items,
  basePath,
}: {
  items: Array<DatasetRef | PublicationRef>;
  basePath: "/datasets" | "/research";
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.id} className="flex gap-2">
          <Icon name={basePath === "/datasets" ? "database" : "book"} size={18} className="mt-0.5 shrink-0 text-polar-800" />
          <Link href={`${basePath}/${r.slug}`} className="text-glacier-700 underline underline-offset-2 hover:text-glacier-800">
            {r.title}
            {"year" in r ? ` (${r.year})` : ""}
          </Link>
        </li>
      ))}
    </ul>
  );
}
