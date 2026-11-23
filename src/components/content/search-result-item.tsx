import type { SearchResult } from "@/types/api";
import { searchResultHref } from "@/lib/api/search";
import { CardTitle } from "@/components/content/card";
import { RegionBadge } from "@/components/content/badges";
import { ApiImageCover } from "@/components/ui/api-image";
import { Badge } from "@/components/ui/badge";
import { label, SEARCH_TYPE_LABELS } from "@/lib/format/labels";

export function SearchResultItem({ result: r }: { result: SearchResult }) {
  return (
    <article className="group relative flex gap-4 p-5 has-[a[data-card-link]:focus-visible]:outline-3 has-[a[data-card-link]:focus-visible]:-outline-offset-3 has-[a[data-card-link]:focus-visible]:outline-glacier-700 hover:bg-polar-50/60">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="info">{label(SEARCH_TYPE_LABELS, r.type)}</Badge>
          <RegionBadge region={r.region} />
          {r.year ? <span className="text-sm text-ink-muted">{r.year}</span> : null}
        </div>
        <CardTitle href={searchResultHref(r)} as="h2" className="text-[1.0625rem]">
          {r.title}
        </CardTitle>
        <p className="mt-1.5 line-clamp-3 text-[0.9375rem] text-ink-muted">{r.snippet}</p>
      </div>
      {r.thumbnailUrl ? (
        <ApiImageCover
          image={{ url: r.thumbnailUrl, alt: "" }}
          aspect="aspect-[4/3]"
          sizes="128px"
          className="hidden w-32 shrink-0 rounded-md sm:block"
        />
      ) : null}
    </article>
  );
}
