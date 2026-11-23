/** Citation formatting shared by the backend and the mock API. Pure functions. */
import type { Author, Citation } from "@/types/api";

interface CitableWork {
  title: string;
  authors: Pick<Author, "name">[];
  year: number;
  venue?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  publisher?: string | null;
  doi?: string | null;
  version?: string | null;
  slug: string;
  kind: "publication" | "dataset";
}

function apaName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts.pop()!;
  return `${last}, ${parts.map((p) => `${p[0]}.`).join(" ")}`;
}

function apaAuthors(authors: Pick<Author, "name">[]): string {
  const names = authors.map((a) => apaName(a.name));
  if (names.length === 0) return "Anonymous";
  if (names.length === 1) return names[0];
  if (names.length <= 20) return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  return `${names.slice(0, 19).join(", ")}, … ${names[names.length - 1]}`;
}

export function formatCitation(work: CitableWork): Citation {
  const doiUrl = work.doi ? ` https://doi.org/${work.doi}` : "";
  let apa = `${apaAuthors(work.authors)} (${work.year}). ${work.title}.`;
  if (work.kind === "dataset") {
    apa += `${work.version ? ` (Version ${work.version})` : ""} [Data set].${work.publisher ? ` ${work.publisher}.` : ""}`;
  } else if (work.venue) {
    apa += ` ${work.venue}`;
    if (work.volume) apa += `, ${work.volume}${work.issue ? `(${work.issue})` : ""}`;
    if (work.pages) apa += `, ${work.pages}`;
    apa += ".";
  }
  apa += doiUrl;

  const key = `${work.authors[0]?.name.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") || "anon"}${work.year}${work.slug
    .split("-")
    .slice(0, 2)
    .join("")}`;
  const entryType = work.kind === "dataset" ? "dataset" : work.venue ? "article" : "misc";
  const fields: [string, string | null | undefined][] = [
    ["title", `{${work.title}}`],
    ["author", work.authors.map((a) => a.name).join(" and ")],
    ["year", String(work.year)],
    [work.kind === "dataset" ? "publisher" : "journal", work.kind === "dataset" ? work.publisher : work.venue],
    ["volume", work.volume],
    ["number", work.issue],
    ["pages", work.pages],
    ["version", work.version],
    ["doi", work.doi],
  ];
  const bibtex =
    `@${entryType}{${key},\n` +
    fields
      .filter(([, v]) => v)
      .map(([k, v]) => `  ${k} = {${String(v).replace(/^\{|\}$/g, "")}}`)
      .join(",\n") +
    "\n}";
  return { apa, bibtex };
}

/** First ~maxLength characters of plain text, cut at a word boundary. */
export function excerpt(text: string, maxLength = 300): string {
  const plain = text
    .replace(/[#*_>`~\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), maxLength - 40)).trim()}…`;
}
