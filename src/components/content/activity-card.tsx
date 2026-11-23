import type { ActivitySummary } from "@/types/api";
import { CardMeta, CardShell, CardTitle } from "@/components/content/card";
import { ActivityTypeBadge } from "@/components/content/badges";
import { ApiImageCover } from "@/components/ui/api-image";
import { DateTime } from "@/components/ui/date-time";
import { Icon } from "@/components/icons";

/** When/where line: event time + venue for events, publish date for news. */
export function ActivityWhen({ activity: a }: { activity: ActivitySummary }) {
  return (
    <CardMeta>
      {a.startsAt ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar" size={16} />
          <DateTime value={a.startsAt} style="dateTime" />
        </span>
      ) : a.publishedAt ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar" size={16} />
          <span className="sr-only">Published </span>
          <DateTime value={a.publishedAt} style="medium" />
        </span>
      ) : null}
      {a.location || a.isOnline ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon name={a.isOnline ? "globe" : "map-pin"} size={16} />
          {a.location ?? "Online"}
        </span>
      ) : null}
    </CardMeta>
  );
}

export function ActivityCard({
  activity: a,
  headingLevel = "h3",
  withImage = true,
}: {
  activity: ActivitySummary;
  headingLevel?: "h2" | "h3" | "h4";
  withImage?: boolean;
}) {
  return (
    <CardShell>
      {withImage && a.coverImage ? <ApiImageCover image={a.coverImage} /> : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <ActivityTypeBadge type={a.type} />
        </div>
        <CardTitle href={`/news/${a.slug}`} as={headingLevel}>
          {a.title}
        </CardTitle>
        <p className="line-clamp-3 text-[0.9375rem] text-ink-muted">{a.summary}</p>
        <div className="mt-auto pt-2">
          <ActivityWhen activity={a} />
        </div>
      </div>
    </CardShell>
  );
}
