import Link from "next/link";
import type { CategoryRef } from "@/types/api";

const chip =
  "inline-flex items-center rounded-full border border-line-strong/50 bg-surface px-3 py-1 text-sm text-ink hover:border-glacier-700 hover:text-glacier-700";

/** Category chips linking to the topic page. */
export function CategoryLinks({ categories }: { categories: CategoryRef[] }) {
  if (categories.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <li key={c.id}>
          <Link href={`/topics/${c.slug}`} className={chip}>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Keyword chips linking to a search for the keyword. */
export function KeywordLinks({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {keywords.map((k) => (
        <li key={k}>
          <Link href={`/search?q=${encodeURIComponent(k)}`} className={chip}>
            #{k}
          </Link>
        </li>
      ))}
    </ul>
  );
}
