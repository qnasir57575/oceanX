"use client";

/**
 * <time> that formats an API date in the viewer's locale and time zone.
 * The server renders a stable UTC/en-IN version; the browser re-formats on
 * hydration (hence suppressHydrationWarning — the text may legitimately differ).
 */
import { useSyncExternalStore } from "react";
import { formatDate, formatDateRange, type DateStyle } from "@/lib/format/date";

const subscribe = () => () => {};
/** true in the browser after hydration, false during SSR/prerender. */
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const SERVER_LOCALE = "en-IN";
const SERVER_TZ = "UTC";

export function DateTime({
  value,
  style = "medium",
  className,
}: {
  value: string;
  style?: DateStyle;
  className?: string;
}) {
  const client = useIsClient();
  const text = client ? formatDate(value, style) : formatDate(value, style, SERVER_LOCALE, SERVER_TZ);
  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

/** Event time range; the end shows only the time when it's on the same day. */
export function DateTimeRange({ start, end, className }: { start: string; end: string | null; className?: string }) {
  const client = useIsClient();
  const locale = client ? undefined : SERVER_LOCALE;
  const tz = client ? undefined : SERVER_TZ;
  const a = formatDate(start, "dateTime", locale, tz);
  let text = a;
  if (end) {
    const sameDay = formatDate(start, "medium", locale, tz) === formatDate(end, "medium", locale, tz);
    text = `${a} – ${sameDay ? formatDate(end, "time", locale, tz) : formatDate(end, "dateTime", locale, tz)}`;
  }
  return (
    <time dateTime={start} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

export function DateRange({
  start,
  end,
  style = "medium",
  className,
}: {
  start: string | null;
  end: string | null;
  style?: DateStyle;
  className?: string;
}) {
  const client = useIsClient();
  const text = client
    ? formatDateRange(start, end, style)
    : formatDateRange(start, end, style, SERVER_LOCALE, SERVER_TZ);
  if (!text) return null;
  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
