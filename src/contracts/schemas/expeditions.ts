import { z } from "zod";
import {
  DateSchema,
  IdSchema,
  PageQuerySchema,
  PolarRegionSchema,
  SearchTextQuerySchema,
  SlugSchema,
  limitQuery,
} from "../primitives";
import {
  CategoryRefSchema,
  GeoPointInputSchema,
  GeoPointSchema,
  ImageInputSchema,
  ImageRefSchema,
  contentMetaShape,
} from "./refs";
import { taxonomyInputShape } from "./taxonomy";
import { StatusUpdateSchema, YearSchema, listFilterShape, slugInput, yearRangeShape } from "./content-common";

export const ExpeditionPhaseSchema = z
  .enum(["PLANNED", "ONGOING", "COMPLETED"])
  .meta({ id: "ExpeditionPhase", description: "Field status of the expedition (not the editorial status)." });

export const ExpeditionSummarySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    title: z.string(),
    summary: z.string().meta({ description: "1–3 sentence plain-text summary for cards." }),
    region: PolarRegionSchema,
    phase: ExpeditionPhaseSchema,
    year: z.number().int(),
    startDate: DateSchema.nullable(),
    endDate: DateSchema.nullable(),
    station: z.string().nullable().meta({ description: "Research station / base name." }),
    vessel: z.string().nullable().meta({ description: "Research vessel, if any." }),
    coverImage: ImageRefSchema.nullable(),
    categories: z.array(CategoryRefSchema),
    keywords: z.array(z.string()),
    ...contentMetaShape,
  })
  .meta({ id: "ExpeditionSummary" });

export const ExpeditionSchema = ExpeditionSummarySchema.extend({
  description: z.string().meta({ description: "Long description in Markdown." }),
  objectives: z.array(z.string()),
  leadInstitution: z.string().nullable(),
  chiefScientist: z.string().nullable(),
  participantCount: z.number().int().min(0).nullable(),
  location: GeoPointSchema.nullable(),
  counts: z
    .object({
      publications: z.number().int().min(0),
      datasets: z.number().int().min(0),
      media: z.number().int().min(0),
    })
    .meta({
      description:
        "Published related records. Fetch them with `?expeditionId=` on the publications/datasets/media list endpoints.",
    }),
}).meta({ id: "Expedition" });

export const ListExpeditionsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(),
  q: SearchTextQuerySchema.optional(),
  phase: ExpeditionPhaseSchema.optional(),
  ...listFilterShape,
  ...yearRangeShape,
  sort: z
    .enum(["newest", "oldest", "title", "startDate"])
    .default("newest")
    .meta({ description: "`newest`/`oldest` sort by year then start date." }),
});

const ExpeditionInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugInput,
  summary: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(50_000),
  region: PolarRegionSchema,
  phase: ExpeditionPhaseSchema.optional().meta({ description: "Defaults to PLANNED on create." }),
  year: YearSchema,
  startDate: DateSchema.nullable().optional(),
  endDate: DateSchema.nullable().optional(),
  station: z.string().trim().max(200).nullable().optional(),
  vessel: z.string().trim().max(200).nullable().optional(),
  leadInstitution: z.string().trim().max(200).nullable().optional(),
  chiefScientist: z.string().trim().max(200).nullable().optional(),
  participantCount: z.number().int().min(0).max(10_000).nullable().optional(),
  objectives: z.array(z.string().trim().min(3).max(500)).max(20).optional(),
  location: GeoPointInputSchema.nullable().optional(),
  coverImage: ImageInputSchema.nullable().optional(),
  ...taxonomyInputShape,
});

const datesInOrder = (v: { startDate?: string | null; endDate?: string | null }) =>
  !v.startDate || !v.endDate || v.startDate <= v.endDate;
const datesInOrderError = { message: "endDate must be on or after startDate", path: ["endDate"] };

export const CreateExpeditionRequestSchema = ExpeditionInputSchema.refine(datesInOrder, datesInOrderError).meta({
  id: "CreateExpeditionRequest",
});

export const UpdateExpeditionRequestSchema = ExpeditionInputSchema.partial()
  .extend({ status: StatusUpdateSchema })
  .refine(datesInOrder, datesInOrderError)
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateExpeditionRequest" });

export const ExpeditionIdFilterSchema = IdSchema.optional().meta({ description: "Only records linked to this expedition (ID)." });
