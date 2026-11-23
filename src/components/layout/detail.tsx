/**
 * Building blocks for record detail pages: two-column body, header skeleton,
 * and "related records" sections that load independently.
 */
import { Container } from "@/components/ui/container";
import { DetailSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/layout/page-header";
import { cn } from "@/lib/ui/cn";

export function DetailLayout({ main, aside, className }: { main: React.ReactNode; aside: React.ReactNode; className?: string }) {
  return (
    <Container className={cn("py-10", className)}>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">{main}</div>
        <aside className="space-y-6 lg:sticky lg:top-24">{aside}</aside>
      </div>
    </Container>
  );
}

/** Full-page skeleton for detail routes: dark header band + body. */
export function DetailPageSkeleton() {
  return (
    <>
      <div className="bg-contours" aria-hidden="true">
        <Container className="space-y-4 py-10 sm:py-14">
          <Skeleton className="h-4 w-48 bg-white/15" />
          <Skeleton className="h-6 w-40 bg-white/15" />
          <Skeleton className="h-10 w-3/4 bg-white/15" />
          <Skeleton className="h-5 w-2/3 bg-white/15" />
        </Container>
      </div>
      <Container className="py-10">
        <DetailSkeleton />
      </Container>
    </>
  );
}

export function RelatedSection({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionHeading title={title} href={href} linkLabel={linkLabel} />
      {children}
    </section>
  );
}

/** Small titled block inside the main column (e.g. "Objectives"). */
export function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
