"use client";

/**
 * Filter form for list pages. Filters live in the URL:
 * - Without JS it's a plain GET form to the same page.
 * - With JS, changing a <select> applies immediately; text inputs apply on
 *   Enter or "Apply". Empty fields are omitted and `page` is always dropped,
 *   so pagination resets to 1 whenever a filter changes.
 * - On small screens the panel collapses behind a "Filters" toggle.
 */
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export function FilterForm({
  action,
  activeCount,
  preserve = {},
  title = "Filters",
  children,
}: {
  /** Pathname of the list page, e.g. "/expeditions". */
  action: string;
  /** Number of active filters (for the toggle label and "Clear"). */
  activeCount: number;
  /** Params to carry over that aren't fields in this form (e.g. sort). */
  preserve?: Record<string, string | undefined>;
  title?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    for (const [key, value] of Object.entries(preserve)) if (value && !params.has(key)) params.set(key, value);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${action}?${qs}` : action, { scroll: false }));
  }

  return (
    <section aria-label={title} className="lg:sticky lg:top-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={buttonClasses("secondary", "md", "w-full justify-between lg:hidden")}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="filter" size={18} />
          {title}
          {activeCount > 0 ? <span className="rounded-full bg-polar-900 px-2 text-xs text-white">{activeCount}</span> : null}
        </span>
        <Icon name="chevron-down" size={18} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <form
        id={panelId}
        method="get"
        action={action}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
        }}
        onChange={(e) => {
          const t = e.target;
          if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type === "checkbox")) apply(e.currentTarget);
        }}
        className={cn(
          "mt-3 space-y-5 rounded-lg border border-line bg-surface p-5 lg:mt-0 lg:block",
          open ? "block" : "hidden",
          pending && "opacity-70",
        )}
      >
        <h2 className="hidden font-sans text-sm font-semibold text-polar-900 lg:block">{title}</h2>
        {Object.entries(preserve).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}
        {children}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className={buttonClasses("primary", "sm")}>
            Apply filters
          </button>
          {activeCount > 0 ? (
            <Link href={action} scroll={false} className="text-sm font-medium text-glacier-700 underline-offset-2 hover:underline">
              Clear all
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}
