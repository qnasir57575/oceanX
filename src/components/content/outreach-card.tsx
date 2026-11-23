import type { OutreachSummary } from "@/types/api";
import { CardMeta, CardShell, CardTitle } from "@/components/content/card";
import { AIBadge } from "@/components/ui/ai-disclaimer";
import { Badge } from "@/components/ui/badge";
import { DateTime } from "@/components/ui/date-time";
import { AI_KIND_LABELS, AUDIENCE_LABELS, label } from "@/lib/format/labels";

export function OutreachCard({ item: o, headingLevel = "h3" }: { item: OutreachSummary; headingLevel?: "h2" | "h3" | "h4" }) {
  return (
    <CardShell>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{label(AI_KIND_LABELS, o.kind)}</Badge>
          {o.isAIGenerated ? <AIBadge /> : null}
        </div>
        <CardTitle href={`/learn/${o.slug}`} as={headingLevel}>
          {o.title}
        </CardTitle>
        <p className="line-clamp-3 text-[0.9375rem] text-ink-muted">{o.excerpt}</p>
        <CardMeta className="mt-auto pt-2">
          <span>For {label(AUDIENCE_LABELS, o.audience).toLowerCase()}</span>
          {o.publishedAt ? <DateTime value={o.publishedAt} /> : null}
        </CardMeta>
      </div>
    </CardShell>
  );
}
