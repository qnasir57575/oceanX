/**
 * Date formatting. API timestamps are ISO 8601 UTC; calendar dates are
 * `YYYY-MM-DD`. Formatting happens with Intl in the user's locale (see
 * components/ui/date-time.tsx, which renders on the client).
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type DateStyle = "long" | "medium" | "short" | "monthYear" | "dateTime" | "time";

const OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { year: "numeric", month: "long", day: "numeric" },
  medium: { year: "numeric", month: "short", day: "numeric" },
  short: { month: "short", day: "numeric" },
  monthYear: { year: "numeric", month: "short" },
  dateTime: { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" },
  time: { hour: "numeric", minute: "2-digit" },
};

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

/**
 * Format an ISO timestamp or calendar date.
 * Calendar dates are formatted in UTC so `2025-01-01` never shifts a day.
 */
export function formatDate(value: string, style: DateStyle = "medium", locale?: string, timeZone?: string): string {
  const dateOnly = isDateOnly(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = { ...OPTIONS[style] };
  if (dateOnly) {
    options.timeZone = "UTC";
    delete options.hour;
    delete options.minute;
    delete options.timeZoneName;
  } else if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** "12 Jan 2025 – 3 Mar 2025", or a single date when only one end is known. */
export function formatDateRange(
  start: string | null,
  end: string | null,
  style: DateStyle = "medium",
  locale?: string,
  timeZone?: string,
): string | null {
  if (!start && !end) return null;
  if (start && end) {
    const a = formatDate(start, style, locale, timeZone);
    const b = formatDate(end, style, locale, timeZone);
    return a === b ? a : `${a} – ${b}`;
  }
  if (start) return `From ${formatDate(start, style, locale, timeZone)}`;
  return `Until ${formatDate(end as string, style, locale, timeZone)}`;
}
