import { z } from "zod";
import {
  DateSchema,
  DateTimeSchema,
  IdSchema,
  PageQuerySchema,
  PolarRegionSchema,
  SearchTextQuerySchema,
  SlugSchema,
  UrlSchema,
  limitQuery,
} from "../primitives";
import { CategoryRefSchema, FileRefSchema, ImageInputSchema, ImageRefSchema, contentMetaShape } from "./refs";
import { taxonomyInputShape } from "./taxonomy";
import { StatusUpdateSchema, listFilterShape, slugInput } from "./content-common";

export const ActivityTypeSchema = z
  .enum(["NEWS", "EVENT", "PRESS_RELEASE", "OUTREACH_PROGRAM", "WORKSHOP", "ANNOUNCEMENT"])
  .meta({ id: "ActivityType", description: "Institutional news and activities." });

export const ActivitySummarySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    type: ActivityTypeSchema,
    title: z.string(),
    summary: z.string(),
    coverImage: ImageRefSchema.nullable(),
    startsAt: DateTimeSchema.nullable().meta({ description: "Events/workshops/programmes only." }),
    endsAt: DateTimeSchema.nullable(),
    location: z.string().nullable().meta({ description: "Venue name / city, or `Online`." }),
    isOnline: z.boolean(),
    region: PolarRegionSchema.nullable(),
    categories: z.array(CategoryRefSchema),
    ...contentMetaShape,
  })
  .meta({ id: "ActivitySummary" });

export const InstitutionalActivitySchema = ActivitySummarySchema.extend({
  body: z.string().meta({ description: "Markdown." }),
  registrationUrl: UrlSchema.nullable(),
  externalUrl: UrlSchema.nullable(),
  attachments: z.array(FileRefSchema),
  keywords: z.array(z.string()),
}).meta({ id: "InstitutionalActivity" });

export const ListActivitiesQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(),
  q: SearchTextQuerySchema.optional(),
  type: ActivityTypeSchema.optional(),
  upcoming: z
    .boolean()
    .optional()
    .meta({ description: "`true`: only items with `startsAt` in the future, sorted soonest first." }),
  from: DateSchema.optional().meta({ description: "`startsAt` (or `publishedAt` for news) on/after this date." }),
  to: DateSchema.optional().meta({ description: "`startsAt` (or `publishedAt` for news) on/before this date." }),
  ...listFilterShape,
  sort: z.enum(["newest", "oldest", "startsAt"]).default("newest").meta({ description: "`newest` = by publishedAt." }),
});

const ActivityInputSchema = z.object({
  type: ActivityTypeSchema,
  title: z.string().trim().min(3).max(200),
  slug: slugInput,
  summary: z.string().trim().min(10).max(500),
  body: z.string().trim().min(10).max(50_000),
  coverImage: ImageInputSchema.nullable().optional(),
  startsAt: DateTimeSchema.nullable().optional(),
  endsAt: DateTimeSchema.nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  isOnline: z.boolean().optional(),
  registrationUrl: UrlSchema.nullable().optional(),
  externalUrl: UrlSchema.nullable().optional(),
  region: PolarRegionSchema.nullable().optional(),
  attachmentFileIds: z.array(IdSchema).max(20).optional(),
  ...taxonomyInputShape,
});

const timesInOrder = (v: { startsAt?: string | null; endsAt?: string | null }) =>
  !v.startsAt || !v.endsAt || v.startsAt <= v.endsAt;
const timesInOrderError = { message: "endsAt must be on or after startsAt", path: ["endsAt"] };

export const CreateActivityRequestSchema = ActivityInputSchema.refine(timesInOrder, timesInOrderError).meta({
  id: "CreateActivityRequest",
});

export const UpdateActivityRequestSchema = ActivityInputSchema.partial()
  .extend({ status: StatusUpdateSchema })
  .refine(timesInOrder, timesInOrderError)
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateActivityRequest" });
