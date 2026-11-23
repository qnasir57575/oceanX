/**
 * Human-readable labels for API enum values.
 * Maps are typed with `Record<Enum, string>` so the compiler flags any enum
 * value added to the contract. `label()` falls back to a humanised value for
 * response-only enums that gain values in a backwards-compatible release.
 */
import type {
  AccessLevel,
  ActivityType,
  AIContentKind,
  Audience,
  ExpeditionPhase,
  MediaType,
  PolarRegion,
  PublicationType,
  SearchResultType,
  UserRole,
} from "@/types/api";

/** "SOUTHERN_OCEAN" → "Southern ocean". */
export function humanize(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function label<T extends string>(map: Record<T, string>, value: T | string | null | undefined): string {
  if (!value) return "";
  return (map as Record<string, string>)[value] ?? humanize(value);
}

export const REGION_LABELS: Record<PolarRegion, string> = {
  ANTARCTICA: "Antarctica",
  ARCTIC: "Arctic",
  HIMALAYA: "Himalaya",
  SOUTHERN_OCEAN: "Southern Ocean",
};

export const PHASE_LABELS: Record<ExpeditionPhase, string> = {
  PLANNED: "Planned",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  JOURNAL_ARTICLE: "Journal article",
  CONFERENCE_PAPER: "Conference paper",
  REPORT: "Report",
  THESIS: "Thesis",
  BOOK_CHAPTER: "Book chapter",
  TECHNICAL_NOTE: "Technical note",
  DATA_PAPER: "Data paper",
  OTHER: "Other",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  AUDIO: "Audio",
  DOCUMENT: "Document",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  NEWS: "News",
  EVENT: "Event",
  PRESS_RELEASE: "Press release",
  OUTREACH_PROGRAM: "Outreach programme",
  WORKSHOP: "Workshop",
  ANNOUNCEMENT: "Announcement",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  OPEN: "Open access",
  REGISTERED: "Registered users",
  RESTRICTED: "Restricted",
};

export const ACCESS_LEVEL_DESCRIPTIONS: Record<AccessLevel, string> = {
  OPEN: "Anyone can download these files.",
  REGISTERED: "Log in with a free account to download these files.",
  RESTRICTED: "Access is limited. Contact the data custodian to request access.",
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  GENERAL_PUBLIC: "General public",
  STUDENTS: "Students",
  EDUCATORS: "Educators",
  POLICY_MAKERS: "Policy makers",
  RESEARCHERS: "Researchers",
};

export const AI_KIND_LABELS: Record<AIContentKind, string> = {
  RESEARCH_SUMMARY: "Research summary",
  SOCIAL_POST: "Social post",
  NEWSLETTER: "Newsletter",
  PRESS_RELEASE: "Press release",
  EXPLAINER: "Explainer",
  QUIZ: "Quiz",
  FAQ: "FAQ",
};

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  EXPEDITION: "Expedition",
  PUBLICATION: "Publication",
  DATASET: "Dataset",
  MEDIA: "Media",
  ACTIVITY: "News & events",
  OUTREACH: "Learn",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  RESEARCHER: "Researcher",
  MEMBER: "Member",
};
