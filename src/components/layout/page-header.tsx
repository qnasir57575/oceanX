import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/ui/cn";

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items, onDark = false }: { items: Crumb[]; onDark?: boolean }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn("flex flex-wrap items-center gap-1 text-sm", onDark ? "text-polar-200" : "text-ink-muted")}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cn("underline-offset-2 hover:underline", onDark ? "hover:text-white" : "hover:text-ink")}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate">
                  {item.label}
                </span>
              )}
              {!last ? <Icon name="chevron-right" size={14} className="shrink-0" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Dark "polar" page header with contour texture. Holds the page's single <h1>.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  children,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-contours on-dark text-white", className)}>
      <Container className="py-10 sm:py-14">
        {breadcrumbs ? (
          <div className="mb-5">
            <Breadcrumbs items={breadcrumbs} onDark />
          </div>
        ) : null}
        {eyebrow ? <div className="mb-3 text-sm font-medium tracking-wide text-glacier-300 uppercase">{eyebrow}</div> : null}
        <h1 className="max-w-4xl text-3xl leading-tight font-semibold sm:text-4xl lg:text-5xl">{title}</h1>
        {description ? <div className="mt-4 max-w-3xl text-lg text-polar-200">{description}</div> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </Container>
    </header>
  );
}

/** Section heading with optional "see all" link. */
export function SectionHeading({
  title,
  id,
  href,
  linkLabel = "View all",
  description,
}: {
  title: string;
  id?: string;
  href?: string;
  linkLabel?: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 id={id} className="text-2xl font-semibold text-ink sm:text-3xl">
          {title}
        </h2>
        {description ? <p className="mt-1 text-ink-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-glacier-700 underline-offset-2 hover:underline"
        >
          {linkLabel}
          <span className="sr-only">: {title}</span>
          <Icon name="arrow-right" size={16} />
        </Link>
      ) : null}
    </div>
  );
}
