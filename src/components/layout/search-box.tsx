"use client";

/**
 * Global search box with type-ahead suggestions (ARIA 1.2 combobox pattern).
 *
 * - Debounced `getSearchSuggestions()` with AbortController cancellation.
 * - ↑/↓ move through suggestions, Enter opens one (or submits the query),
 *   Escape closes the list (or clears the input when already closed).
 * - Submitting goes to /search?q=… (the search API needs ≥ 2 characters).
 */
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchSuggestions, searchResultHref } from "@/lib/api/search";
import { isApiRequestError } from "@/lib/api-client";
import type { SearchSuggestion } from "@/types/api";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/ui/cn";
import { label, SEARCH_TYPE_LABELS } from "@/lib/format/labels";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export function suggestionHref(s: SearchSuggestion): string {
  if (s.kind === "TITLE" && s.resultType && s.slug) return searchResultHref({ type: s.resultType, slug: s.slug });
  if (s.kind === "CATEGORY" && s.slug) return `/topics/${encodeURIComponent(s.slug)}`;
  return `/search?q=${encodeURIComponent(s.text)}`;
}

function suggestionHint(s: SearchSuggestion): string {
  if (s.kind === "TITLE") return s.resultType ? label(SEARCH_TYPE_LABELS, s.resultType) : "Record";
  if (s.kind === "CATEGORY") return "Topic";
  return "Keyword";
}

export function SearchBox({
  defaultValue = "",
  size = "md",
  className,
  label: inputLabel = "Search the portal",
  formLabel = "Search the portal",
  onNavigate,
}: {
  defaultValue?: string;
  size?: "md" | "lg";
  className?: string;
  label?: string;
  /** Accessible name of the search landmark; must be unique on the page. */
  formLabel?: string;
  /** Called after navigating (e.g. to close the mobile menu). */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const hintId = `${baseId}-hint`;

  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);

  function cancelPending() {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  }

  function requestSuggestions(value: string) {
    cancelPending();
    const text = value.trim();
    if (text.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      const c = new AbortController();
      controller.current = c;
      getSearchSuggestions({ q: text.slice(0, 100), limit: 8 }, { signal: c.signal })
        .then((res) => {
          setItems(res.data);
          setActive(-1);
          setOpen(res.data.length > 0);
        })
        .catch((e) => {
          // Suggestions are an enhancement: fail quietly (full search still works).
          if (!(isApiRequestError(e) && e.isAborted)) {
            setItems([]);
            setOpen(false);
          }
        });
    }, DEBOUNCE_MS);
  }

  function go(href: string) {
    cancelPending();
    setOpen(false);
    setActive(-1);
    router.push(href);
    onNavigate?.();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (text.length < MIN_QUERY) {
      setHint(`Enter at least ${MIN_QUERY} characters to search.`);
      return;
    }
    setHint(null);
    go(`/search?q=${encodeURIComponent(text)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (items.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      if (items.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault();
      go(suggestionHref(items[active]));
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      } else if (q) {
        e.preventDefault();
        cancelPending();
        setQ("");
        setItems([]);
      }
    }
  }

  const expanded = open && items.length > 0;
  const activeId = expanded && active >= 0 ? `${listId}-${active}` : undefined;

  return (
    <form role="search" aria-label={formLabel} onSubmit={submit} className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        {inputLabel}
      </label>
      <div className="relative">
        <Icon
          name="search"
          size={size === "lg" ? 22 : 18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
        />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-describedby={hint ? hintId : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={200}
          placeholder="Search expeditions, research, data…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHint(null);
            requestSuggestions(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          onBlur={() => setOpen(false)}
          className={cn(
            "w-full rounded-md border border-line-strong bg-white pr-12 text-ink placeholder:text-ink-muted",
            "focus:border-glacier-700",
            "[&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "h-14 pl-11 text-lg" : "h-10 pl-9 text-[0.9375rem]",
          )}
        />
        <button
          type="submit"
          className={cn(
            "absolute top-1/2 right-1 -translate-y-1/2 rounded-md bg-glacier-700 text-white hover:bg-glacier-800",
            size === "lg" ? "h-11 px-4 text-sm font-medium" : "h-8 px-2.5",
          )}
        >
          {size === "lg" ? "Search" : <Icon name="arrow-right" size={16} title="Search" />}
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-md border border-line bg-white py-1 text-ink shadow-lg"
      >
        {items.map((s, i) => (
          <li
            key={`${s.kind}-${s.text}-${i}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault() /* keep focus in the input */}
            onClick={() => go(suggestionHref(s))}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
              i === active ? "bg-glacier-50" : "",
            )}
          >
            <span className="truncate">{s.text}</span>
            <span className="shrink-0 text-xs text-ink-muted">{suggestionHint(s)}</span>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {expanded ? `${items.length} suggestion${items.length === 1 ? "" : "s"} available. Use up and down arrows to browse.` : ""}
      </p>
      {hint ? (
        <p id={hintId} role="alert" className="absolute top-full left-0 z-50 mt-1 rounded-md bg-white px-3 py-2 text-sm text-danger shadow-lg">
          {hint}
        </p>
      ) : null}
    </form>
  );
}
