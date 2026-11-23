import type { DatasetSummary } from "@/types/api";
import { CardMeta, CardShell, CardTitle } from "@/components/content/card";
import { AccessBadge, RegionBadge } from "@/components/content/badges";
import { DateRange } from "@/components/ui/date-time";
import { Icon } from "@/components/icons";
import { formatBytes, formatNumber, plural } from "@/lib/format/number";

export function DatasetCard({ dataset: d, headingLevel = "h3" }: { dataset: DatasetSummary; headingLevel?: "h2" | "h3" | "h4" }) {
  return (
    <CardShell>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <RegionBadge region={d.region} />
          <AccessBadge level={d.accessLevel} />
        </div>
        <CardTitle href={`/datasets/${d.slug}`} as={headingLevel}>
          {d.title}
        </CardTitle>
        <p className="line-clamp-3 text-[0.9375rem] text-ink-muted">{d.summary}</p>
        {d.parameters.length > 0 ? (
          <p className="text-sm text-ink">
            <span className="sr-only">Parameters: </span>
            {d.parameters.slice(0, 3).join(" · ")}
            {d.parameters.length > 3 ? ` · +${d.parameters.length - 3} more` : ""}
          </p>
        ) : null}
        <CardMeta className="mt-auto pt-2">
          {d.temporalCoverage.start || d.temporalCoverage.end ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={16} />
              <span className="sr-only">Temporal coverage: </span>
              <DateRange start={d.temporalCoverage.start} end={d.temporalCoverage.end} style="monthYear" />
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Icon name="file" size={16} />
            {plural(d.fileCount, "file")} · {formatBytes(d.totalSizeBytes)}
          </span>
          {d.formats.length > 0 ? <span className="font-mono text-xs">{d.formats.join(", ")}</span> : null}
          <span className="inline-flex items-center gap-1.5">
            <Icon name="download" size={16} />
            {formatNumber(d.downloadCount)}
            <span className="sr-only"> downloads</span>
          </span>
        </CardMeta>
      </div>
    </CardShell>
  );
}
