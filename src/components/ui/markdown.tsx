/**
 * Sanitised Markdown renderer for API fields documented as Markdown
 * (descriptions, bodies, AI text).
 *
 * Safety: react-markdown never renders raw HTML (no rehype-raw), and
 * rehype-sanitize (GitHub schema) strips anything unsafe from the tree as a
 * second layer — e.g. `javascript:` links. Headings are shifted down one level
 * (`#` → <h2>) so API content never competes with the page's <h1>.
 */
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/ui/cn";

const isExternal = (href?: string) => !!href && /^https?:\/\//.test(href);

const components: Components = {
  h1: ({ node: _n, ...props }) => <h2 {...props} />,
  h2: ({ node: _n, ...props }) => <h3 {...props} />,
  h3: ({ node: _n, ...props }) => <h4 {...props} />,
  h4: ({ node: _n, ...props }) => <h5 {...props} />,
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

export function Markdown({ children, className }: { children: string | null | undefined; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
