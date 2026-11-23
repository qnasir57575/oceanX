import type { MediaAssetSummary } from "@/types/api";
import { CardShell, CardTitle } from "@/components/content/card";
import { mediaIcon } from "@/components/content/badges";
import { ApiImageCover } from "@/components/ui/api-image";
import { Icon } from "@/components/icons";
import { formatDuration, formatDurationLong } from "@/lib/format/number";
import { label, MEDIA_TYPE_LABELS } from "@/lib/format/labels";

export function MediaTile({
  media: m,
  headingLevel = "h3",
  priority = false,
}: {
  media: MediaAssetSummary;
  headingLevel?: "h2" | "h3" | "h4";
  priority?: boolean;
}) {
  return (
    <CardShell>
      <div className="relative">
        <ApiImageCover
          image={{ url: m.thumbnailUrl, alt: m.altText, width: m.width, height: m.height }}
          aspect="aspect-[4/3]"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
        />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-polar-950/85 px-2 py-0.5 text-xs font-medium text-white">
          <Icon name={mediaIcon(m.type)} size={14} />
          {label(MEDIA_TYPE_LABELS, m.type)}
        </span>
        {m.durationSeconds ? (
          <span className="absolute right-2 bottom-2 rounded bg-polar-950/85 px-1.5 py-0.5 font-mono text-xs text-white">
            <span aria-hidden="true">{formatDuration(m.durationSeconds)}</span>
            <span className="sr-only">Duration {formatDurationLong(m.durationSeconds)}</span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <CardTitle href={`/gallery/${m.slug}`} as={headingLevel} className="text-base">
          {m.title}
        </CardTitle>
        {m.credit ? <p className="mt-auto pt-1 text-xs text-ink-muted">Credit: {m.credit}</p> : null}
      </div>
    </CardShell>
  );
}
