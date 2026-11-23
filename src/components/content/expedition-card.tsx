import type { ExpeditionSummary } from "@/types/api";
import { CardMeta, CardShell, CardTitle } from "@/components/content/card";
import { PhaseBadge, RegionBadge } from "@/components/content/badges";
import { ApiImageCover } from "@/components/ui/api-image";
import { DateRange } from "@/components/ui/date-time";
import { Icon } from "@/components/icons";

export function ExpeditionCard({
  expedition: e,
  headingLevel = "h3",
  priority = false,
}: {
  expedition: ExpeditionSummary;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
}) {
  return (
    <CardShell>
      {e.coverImage ? (
        <ApiImageCover image={e.coverImage} priority={priority} />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-polar-50 text-polar-200" aria-hidden="true">
          <Icon name="ship" size={40} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <RegionBadge region={e.region} />
          <PhaseBadge phase={e.phase} />
        </div>
        <CardTitle href={`/expeditions/${e.slug}`} as={headingLevel}>
          {e.title}
        </CardTitle>
        <p className="line-clamp-3 text-[0.9375rem] text-ink-muted">{e.summary}</p>
        <CardMeta className="mt-auto pt-2">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={16} />
            {e.startDate || e.endDate ? <DateRange start={e.startDate} end={e.endDate} style="monthYear" /> : e.year}
          </span>
          {e.station || e.vessel ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name={e.vessel ? "ship" : "map-pin"} size={16} />
              {e.vessel ?? e.station}
            </span>
          ) : null}
        </CardMeta>
      </div>
    </CardShell>
  );
}
