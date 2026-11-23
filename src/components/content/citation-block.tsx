"use client";

import { useState } from "react";
import type { Citation } from "@/types/api";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/ui/cn";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("failed");
          }
          setTimeout(() => setState("idle"), 2500);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-2.5 py-1 text-xs font-medium text-polar-900 hover:bg-polar-50"
      >
        <Icon name={state === "copied" ? "check" : "copy"} size={14} />
        {state === "copied" ? "Copied" : `Copy ${label}`}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? `${label} citation copied to clipboard` : state === "failed" ? "Copy failed. Select the text to copy it." : ""}
      </span>
    </>
  );
}

/** APA and BibTeX citations from the API, with copy buttons. */
export function CitationBlock({ citation, className }: { citation: Citation; className?: string }) {
  return (
    <section aria-labelledby="cite-title" className={cn("rounded-lg border border-line bg-surface p-5", className)}>
      <h2 id="cite-title" className="mb-4 font-sans text-sm font-semibold text-polar-900">
        Cite this record
      </h2>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-sans text-xs font-semibold tracking-wide text-ink-muted uppercase">APA</h3>
            <CopyButton text={citation.apa} label="APA" />
          </div>
          <p className="text-[0.9375rem] break-words text-ink">{citation.apa}</p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-sans text-xs font-semibold tracking-wide text-ink-muted uppercase">BibTeX</h3>
            <CopyButton text={citation.bibtex} label="BibTeX" />
          </div>
          <pre
            tabIndex={0}
            aria-label="BibTeX entry"
            className="overflow-x-auto rounded-md bg-polar-50 p-3 font-mono text-xs leading-relaxed whitespace-pre text-ink"
          >
            {citation.bibtex}
          </pre>
        </div>
      </div>
    </section>
  );
}
