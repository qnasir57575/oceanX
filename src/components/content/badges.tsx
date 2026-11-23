import type { AccessLevel, ActivityType, ExpeditionPhase, MediaType, PolarRegion } from "@/types/api";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { IconName } from "@/components/icons";
import {
  ACCESS_LEVEL_LABELS,
  ACTIVITY_TYPE_LABELS,
  MEDIA_TYPE_LABELS,
  PHASE_LABELS,
  REGION_LABELS,
  label,
} from "@/lib/format/labels";

const REGION_TONES: Record<PolarRegion, BadgeTone> = {
  ANTARCTICA: "antarctica",
  ARCTIC: "arctic",
  HIMALAYA: "himalaya",
  SOUTHERN_OCEAN: "ocean",
};

export function RegionBadge({ region }: { region: PolarRegion | null | undefined }) {
  if (!region) return null;
  return (
    <Badge tone={REGION_TONES[region] ?? "neutral"} icon="globe">
      <span className="sr-only">Region: </span>
      {label(REGION_LABELS, region)}
    </Badge>
  );
}

const PHASE_TONES: Record<ExpeditionPhase, BadgeTone> = { PLANNED: "neutral", ONGOING: "success", COMPLETED: "info" };

export function PhaseBadge({ phase }: { phase: ExpeditionPhase }) {
  return (
    <Badge tone={PHASE_TONES[phase] ?? "neutral"}>
      <span className="sr-only">Status: </span>
      {label(PHASE_LABELS, phase)}
    </Badge>
  );
}

const ACCESS: Record<AccessLevel, { tone: BadgeTone; icon: IconName }> = {
  OPEN: { tone: "success", icon: "globe" },
  REGISTERED: { tone: "warning", icon: "user" },
  RESTRICTED: { tone: "danger", icon: "lock" },
};

export function AccessBadge({ level }: { level: AccessLevel }) {
  const a = ACCESS[level] ?? { tone: "neutral" as const, icon: "info" as const };
  return (
    <Badge tone={a.tone} icon={a.icon}>
      {label(ACCESS_LEVEL_LABELS, level)}
    </Badge>
  );
}

const MEDIA_ICONS: Record<MediaType, IconName> = { IMAGE: "image", VIDEO: "video", AUDIO: "audio", DOCUMENT: "file" };

export function mediaIcon(type: MediaType): IconName {
  return MEDIA_ICONS[type] ?? "file";
}

export function MediaTypeBadge({ type }: { type: MediaType }) {
  return (
    <Badge tone="neutral" icon={mediaIcon(type)}>
      {label(MEDIA_TYPE_LABELS, type)}
    </Badge>
  );
}

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const tone: BadgeTone = type === "EVENT" || type === "WORKSHOP" || type === "OUTREACH_PROGRAM" ? "info" : "neutral";
  return <Badge tone={tone}>{label(ACTIVITY_TYPE_LABELS, type)}</Badge>;
}
