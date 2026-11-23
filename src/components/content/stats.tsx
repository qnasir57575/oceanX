/**
 * Portal statistics: a KPI row of stat tiles and a ranked single-hue bar list
 * (expeditions per region). Every value is printed as text, so nothing relies
 * on the bar length or colour alone, and the list doubles as the table view.
 */
import Link from "next/link";
import type { PortalStats } from "@/types/api";
import { Icon, type IconName } from "@/components/icons";
import { Skeleton, LoadingRegion } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format/number";
import { label, REGION_LABELS } from "@/lib/format/labels";
import { cn } from "@/lib/ui/cn";

function compact(n: number): string {
  return n >= 10_000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n) : formatNumber(n);
}

const TILES: Array<{ key: keyof Omit<PortalStats, "byRegion" | "lastUpdatedAt">; label: string; href: string; icon: IconName }> = [
  { key: "expeditions", label: "Expeditions", href: "/expeditions", icon: "ship" },
  { key: "publications", label: "Publications", href: "/research", icon: "book" },
  { key: "datasets", label: "Datasets", href: "/datasets", icon: "database" },
  { key: "mediaAssets", label: "Media items", href: "/gallery", icon: "image" },
  { key: "activities", label: "News and events", href: "/news", icon: "calendar" },
];

export function StatTiles({ stats, className }: { stats: PortalStats; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {TILES.map((t) => (
        <li key={t.key}>
          <Link
            href={t.href}
            className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-shadow hover:shadow-md"
          >
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              <Icon name={t.icon} size={16} />
              {t.label}
            </span>
            <span className="mt-2 font-sans text-3xl font-semibold text-ink tabular-nums">{compact(stats[t.key])}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StatTilesSkeleton() {
  return (
    <LoadingRegion label="Loading statistics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((t) => (
          <div key={t.key} className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Ranked horizontal bars, one hue, value at the tip. */
export function RegionBars({ byRegion, title = "Published expeditions by region" }: { byRegion: PortalStats["byRegion"]; title?: string }) {
  const rows = [...byRegion].sort((a, b) => b.expeditions - a.expeditions);
  const max = Math.max(1, ...rows.map((r) => r.expeditions));
  return (
    <figure className="rounded-lg border border-line bg-surface p-5">
      <figcaption className="mb-4 font-sans text-sm font-semibold text-polar-900">{title}</figcaption>
      {rows.every((r) => r.expeditions === 0) ? (
        <p className="text-sm text-ink-muted">No published expeditions yet.</p>
      ) : (
        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.region} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3">
              <dt className="truncate text-sm text-ink">
                <Link href={`/expeditions?region=${r.region}`} className="underline-offset-2 hover:text-glacier-700 hover:underline">
                  {label(REGION_LABELS, r.region)}
                </Link>
              </dt>
              <dd className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="block h-3 rounded-r-[4px] bg-glacier-700"
                  style={{ width: `${(r.expeditions / max) * 85}%`, minWidth: r.expeditions > 0 ? 4 : 0 }}
                />
                <span className="text-sm font-medium text-ink tabular-nums">{formatNumber(r.expeditions)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </figure>
  );
}
