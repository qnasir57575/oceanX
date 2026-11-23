import { Icon } from "@/components/icons";
import { DateTime } from "@/components/ui/date-time";
import { cn } from "@/lib/ui/cn";

/**
 * Must be shown wherever AI-generated content appears. The `text` comes from
 * the API (`disclaimer` field) — never hardcode it.
 */
export function AIDisclaimer({
  text,
  model,
  reviewedAt,
  className,
}: {
  text: string;
  model?: string | null;
  reviewedAt?: string | null;
  className?: string;
}) {
  return (
    <aside
      aria-label="About this AI-assisted content"
      className={cn("flex gap-3 rounded-md border border-glacier-100 bg-glacier-50 p-4 text-sm", className)}
    >
      <Icon name="sparkles" size={20} className="mt-0.5 shrink-0 text-glacier-800" />
      <div className="space-y-1">
        <p className="font-semibold text-glacier-800">AI-assisted content</p>
        <p className="text-ink">{text}</p>
        {model || reviewedAt ? (
          <p className="text-xs text-ink-muted">
            {model ? <>Drafted with {model}</> : null}
            {model && reviewedAt ? " · " : null}
            {reviewedAt ? (
              <>
                Reviewed <DateTime value={reviewedAt} />
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/** Compact marker for cards that link to AI-assisted content. */
export function AIBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-glacier-50 px-2.5 py-0.5 text-xs font-medium text-glacier-800 ring-1 ring-inset ring-glacier-100",
        className,
      )}
    >
      <Icon name="sparkles" size={14} />
      AI-assisted
    </span>
  );
}
