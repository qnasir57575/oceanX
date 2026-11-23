import { z } from "zod";
import {
  DateSchema,
  IdSchema,
  PageQuerySchema,
  PolarRegionSchema,
  SearchTextQuerySchema,
  SlugSchema,
  UrlOrPathSchema,
  UrlSchema,
  limitQuery,
} from "../primitives";
import {
  CategoryRefSchema,
  ExpeditionRefSchema,
  GeoPointInputSchema,
  GeoPointSchema,
  contentMetaShape,
} from "./refs";
import { taxonomyInputShape } from "./taxonomy";
import { StatusUpdateSchema, listFilterShape, slugInput } from "./content-common";
import { ExpeditionIdFilterSchema } from "./expeditions";

export const MediaTypeSchema = z.enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]).meta({ id: "MediaType" });

export const MediaAssetSummarySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    title: z.string(),
    type: MediaTypeSchema,
    url: UrlOrPathSchema.meta({ description: "Full-size file (IMAGE/AUDIO/DOCUMENT) or video file / page URL." }),
    thumbnailUrl: UrlOrPathSchema.meta({ description: "Always present. Use for grids." }),
    altText: z.string().meta({ description: "Accessible description. Use as `alt`." }),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    durationSeconds: z.number().int().min(0).nullable().meta({ description: "VIDEO/AUDIO only." }),
    region: PolarRegionSchema.nullable(),
    credit: z.string().nullable(),
    license: z.string().nullable(),
    capturedAt: DateSchema.nullable(),
    featured: z.boolean(),
    ...contentMetaShape,
  })
  .meta({ id: "MediaAssetSummary" });

export const MediaAssetSchema = MediaAssetSummarySchema.extend({
  description: z.string().nullable().meta({ description: "Markdown caption / story." }),
  embedUrl: UrlSchema.nullable().meta({ description: "Embeddable player URL for externally hosted video (iframe `src`)." }),
  expedition: ExpeditionRefSchema.nullable(),
  location: GeoPointSchema.nullable(),
  categories: z.array(CategoryRefSchema),
  keywords: z.array(z.string()),
}).meta({ id: "MediaAsset" });

export const ListMediaQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(24),
  q: SearchTextQuerySchema.optional(),
  type: MediaTypeSchema.optional(),
  featured: z.boolean().optional().meta({ description: "Only featured items (`true`)." }),
  expeditionId: ExpeditionIdFilterSchema,
  ...listFilterShape,
  sort: z.enum(["newest", "oldest", "capturedAt"]).default("newest"),
});

const MediaInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugInput,
  type: MediaTypeSchema,
  fileId: IdSchema.nullable().optional().meta({ description: "Uploaded file (purpose MEDIA). Either fileId or externalUrl is required." }),
  externalUrl: UrlSchema.nullable().optional().meta({ description: "Externally hosted media (e.g. a video page)." }),
  embedUrl: UrlSchema.nullable().optional(),
  thumbnailFileId: IdSchema.nullable().optional().meta({ description: "Generated automatically for uploaded images when omitted." }),
  altText: z.string().trim().min(3).max(300),
  description: z.string().trim().max(10_000).nullable().optional(),
  credit: z.string().trim().max(200).nullable().optional(),
  license: z.string().trim().max(100).nullable().optional(),
  capturedAt: DateSchema.nullable().optional(),
  location: GeoPointInputSchema.nullable().optional(),
  region: PolarRegionSchema.nullable().optional(),
  expeditionId: IdSchema.nullable().optional(),
  featured: z.boolean().optional().meta({ description: "EDITOR/ADMIN only. Defaults to false." }),
  ...taxonomyInputShape,
});

export const CreateMediaAssetRequestSchema = MediaInputSchema.refine((v) => Boolean(v.fileId || v.externalUrl), {
  message: "Provide either fileId or externalUrl",
  path: ["fileId"],
}).meta({ id: "CreateMediaAssetRequest" });

export const UpdateMediaAssetRequestSchema = MediaInputSchema.partial()
  .extend({ status: StatusUpdateSchema })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateMediaAssetRequest" });
