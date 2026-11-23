"use client";

/**
 * Component-level error boundary for a data section (Next 16 `catchError`).
 * Wrap each independently-fetched section so one failure doesn't blank the
 * whole page. "Try again" uses `retry()`, which re-fetches Server Components.
 * `notFound()` / `redirect()` pass straight through to Next.js.
 */
import { catchError, type ErrorInfo } from "next/error";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { describeError } from "@/lib/ui/errors";

interface SectionBoundaryProps {
  /** What failed to load, e.g. "expeditions" → "We couldn't load expeditions." */
  subject?: string;
  compact?: boolean;
  className?: string;
}

function SectionErrorFallback({ subject, compact, className }: SectionBoundaryProps, { error, retry }: ErrorInfo) {
  const d = describeError(error, subject);
  return (
    <ErrorState
      title={d.title}
      message={d.message}
      reference={d.reference}
      debug={d.debug}
      compact={compact}
      headingLevel={compact ? "h3" : "h2"}
      className={className}
      action={
        d.retryable ? (
          <Button variant="secondary" onClick={() => retry()}>
            <Icon name="refresh" size={18} />
            Try again
          </Button>
        ) : null
      }
    />
  );
}

export const SectionBoundary = catchError(SectionErrorFallback);
