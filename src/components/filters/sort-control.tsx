"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/ui/options";

/** Sort dropdown above results. Keeps all other params, resets page. */
export function SortControl({
  action,
  current,
  options,
  value,
  defaultValue = "newest",
}: {
  action: string;
  /** Current query string (without "?"), from the server. */
  current: string;
  options: Option[];
  value: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  if (options.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm whitespace-nowrap text-ink-muted">
        Sort by
      </label>
      <select
        id={id}
        value={value}
        aria-busy={pending}
        onChange={(e) => {
          const params = new URLSearchParams(current);
          params.delete("page");
          if (e.target.value === defaultValue) params.delete("sort");
          else params.set("sort", e.target.value);
          const qs = params.toString();
          startTransition(() => router.push(qs ? `${action}?${qs}` : action, { scroll: false }));
        }}
        className="h-10 rounded-md border border-line-strong bg-white px-3 text-sm text-ink focus:border-glacier-700"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
