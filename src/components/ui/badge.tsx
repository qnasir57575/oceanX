import { cn } from "@/lib/ui/cn";
import { Icon, type IconName } from "@/components/icons";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "antarctica"
  | "arctic"
  | "himalaya"
  | "ocean";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-polar-50 text-polar-900 ring-polar-200",
  info: "bg-glacier-50 text-glacier-800 ring-glacier-100",
  success: "bg-success-bg text-success ring-success/20",
  warning: "bg-warning-bg text-warning ring-warning/20",
  danger: "bg-danger-bg text-danger ring-danger/20",
  antarctica: "bg-region-antarctica-bg text-region-antarctica ring-region-antarctica/15",
  arctic: "bg-region-arctic-bg text-region-arctic ring-region-arctic/15",
  himalaya: "bg-region-himalaya-bg text-region-himalaya ring-region-himalaya/15",
  ocean: "bg-region-ocean-bg text-region-ocean ring-region-ocean/15",
};

/** Small status/label pill. Always carries a text label (never colour alone). */
export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}
