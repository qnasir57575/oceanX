/**
 * Card shell with a "stretched link": the title link covers the whole card,
 * so the card is one tab stop with a meaningful accessible name, and the
 * focus ring is drawn on the card.
 */
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

export function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow",
        "hover:shadow-md has-[a[data-card-link]:focus-visible]:outline-3 has-[a[data-card-link]:focus-visible]:outline-offset-2 has-[a[data-card-link]:focus-visible]:outline-glacier-700",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function CardTitle({
  href,
  children,
  as: Tag = "h3",
  className,
}: {
  href: string;
  children: React.ReactNode;
  as?: "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <Tag className={cn("font-serif text-lg leading-snug font-semibold text-ink", className)}>
      <Link
        href={href}
        data-card-link=""
        className="after:absolute after:inset-0 after:z-[1] group-hover:text-glacier-700 focus-visible:outline-none"
      >
        {children}
      </Link>
    </Tag>
  );
}

/** Small icon + text metadata line used in cards. */
export function CardMeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted", className)}>{children}</div>;
}
