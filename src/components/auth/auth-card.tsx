import { Skeleton, LoadingRegion } from "@/components/ui/skeleton";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-xl sm:p-8">
      <h1 className="text-3xl font-semibold text-ink">{title}</h1>
      {description ? <p className="mt-2 text-ink-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 border-t border-line pt-5 text-sm text-ink-muted">{footer}</div> : null}
    </div>
  );
}

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <LoadingRegion label="Loading form">
      <div className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-32" />
      </div>
    </LoadingRegion>
  );
}
