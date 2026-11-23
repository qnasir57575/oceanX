import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/ui/cn";

/** Friendly "nothing here" state with an optional action (e.g. clear filters). */
export function EmptyState({
  title,
  description,
  icon = "search",
  action,
  className,
  compact = false,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: IconName;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-line-strong/50 bg-surface text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-polar-50 text-polar-800">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

/** Error state. `action` is usually a retry button (see SectionBoundary / error.tsx). */
export function ErrorState({
  title,
  message,
  reference,
  debug,
  action,
  className,
  compact = false,
  headingLevel: Heading = "h3",
}: {
  title: string;
  message: string;
  reference?: string | null;
  debug?: string | null;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  headingLevel?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-lg border border-danger/25 bg-danger-bg/50 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <Icon name="alert" size={24} />
      </span>
      <Heading className="font-serif text-lg font-semibold text-ink">{title}</Heading>
      <p className="mt-2 max-w-md text-ink-muted">{message}</p>
      {reference ? (
        <p className="mt-2 text-xs text-ink-muted">
          Reference: <code className="font-mono">{reference}</code>
        </p>
      ) : null}
      {debug ? (
        <details className="mt-3 max-w-md text-left text-xs text-ink-muted">
          <summary className="cursor-pointer">Developer details</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono">{debug}</pre>
        </details>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_TONES: Record<AlertTone, { box: string; icon: IconName }> = {
  info: { box: "border-glacier-100 bg-glacier-50 text-glacier-800", icon: "info" },
  success: { box: "border-success/25 bg-success-bg text-success", icon: "check" },
  warning: { box: "border-warning/25 bg-warning-bg text-warning", icon: "alert" },
  danger: { box: "border-danger/25 bg-danger-bg text-danger", icon: "alert" },
};

/** Inline message box. Use `live` for messages that appear after an action. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = false,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  live?: boolean;
}) {
  const t = ALERT_TONES[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-md border p-4 text-sm", t.box, className)}
    >
      <Icon name={t.icon} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink">{children}</div> : null}
      </div>
    </div>
  );
}
