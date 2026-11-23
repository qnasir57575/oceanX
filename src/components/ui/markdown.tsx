/**
 * Sanitised Markdown renderer for API fields documented as Markdown
 * (descriptions, bodies, AI text).
 *
 * Safety: react-markdown never renders raw HTML (`skipHtml`, no rehype-raw),
 * and rehype-sanitize (GitHub schema) strips anything unsafe from the tree
 * as a second layer — e.g. `javascript:` links.
 *
 * Headings: the document's highest heading is mapped to `baseLevel` (h2 by
 * default) so API content never competes with the page's <h1> and never
 * skips a level.
 */
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/ui/cn";

const isExternal = (href?: string) => !!href && /^https?:\/\//.test(href);

type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6";
const HEADING_TAGS: HeadingTag[] = ["h2", "h3", "h4", "h5", "h6"];

/** Smallest ATX heading level used in the source (1–6), or null. */
function topHeadingLevel(markdown: string): number | null {
  let min: number | null = null;
  for (const m of markdown.matchAll(/^ {0,3}(#{1,6})[ \t]/gm)) min = Math.min(min ?? 6, m[1].length);
  return min;
}

function headingComponents(offset: number): Components {
  const make = (level: number) => {
    const Tag = HEADING_TAGS[Math.min(Math.max(level + offset, 2), 6) - 2];
    const Heading: NonNullable<Components["h1"]> = ({ node: _n, ...props }) => <Tag {...props} />;
    return Heading;
  };
  return { h1: make(1), h2: make(2), h3: make(3), h4: make(4), h5: make(5), h6: make(6) };
}

const baseComponents: Components = {
  a: ({ node: _n, href, children, ...props }) =>
    isExternal(href) ? (
      <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  // Images inside Markdown: keep alt text, lazy-load, never stretch layout.
  img: ({ node: _n, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary Markdown image URLs; dimensions unknown
    <img alt={alt ?? ""} loading="lazy" className="h-auto max-w-full rounded-md" {...props} />
  ),
};

export function Markdown({
  children,
  className,
  baseLevel = 2,
}: {
  children?: string | null;
  className?: string;
  /** Heading level the document's top heading renders as (2 = <h2>). */
  baseLevel?: 2 | 3 | 4;
}) {
  if (!children) return null;
  const top = topHeadingLevel(children) ?? 1;
  const components = { ...baseComponents, ...headingComponents(baseLevel - top) };
  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
