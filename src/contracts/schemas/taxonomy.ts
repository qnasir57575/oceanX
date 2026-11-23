import { z } from "zod";
import { IdSchema, PageQuerySchema, SlugSchema, limitQuery } from "../primitives";

export const CategoryCountsSchema = z
  .object({
    expeditions: z.number().int().min(0),
    publications: z.number().int().min(0),
    datasets: z.number().int().min(0),
    media: z.number().int().min(0),
    activities: z.number().int().min(0),
  })
  .meta({ id: "CategoryCounts", description: "Number of PUBLISHED records tagged with the category." });

export const ResearchCategorySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    name: z.string(),
    description: z.string().nullable(),
    parentId: IdSchema.nullable().meta({
      description: "Parent category ID; `null` for top-level. Categories are at most two levels deep.",
    }),
    sortOrder: z.number().int(),
    counts: CategoryCountsSchema.nullable().meta({
      description: "Present when requested with `withCounts=true` (list) or always on the detail endpoint.",
    }),
  })
  .meta({ id: "ResearchCategory" });

export const KeywordSchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    label: z.string(),
    usageCount: z.number().int().min(0).meta({ description: "Number of PUBLISHED records using the keyword." }),
  })
  .meta({ id: "Keyword" });

export const ListCategoriesQuerySchema = z.object({
  withCounts: z.boolean().default(false).meta({ description: "Include per-content-type counts." }),
  parentId: IdSchema.optional().meta({ description: "Only children of this category." }),
});

export const CreateCategoryRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: SlugSchema.optional().meta({ description: "Generated from `name` when omitted." }),
    description: z.string().trim().max(1000).nullable().optional(),
    parentId: IdSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .meta({ id: "CreateCategoryRequest" });

export const UpdateCategoryRequestSchema = CreateCategoryRequestSchema.partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateCategoryRequest" });

export const ListKeywordsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(20),
  q: z.string().trim().min(1).max(100).optional().meta({ description: "Prefix/contains match on the label." }),
});

export const CreateKeywordRequestSchema = z
  .object({ label: z.string().trim().min(2).max(60) })
  .meta({ id: "CreateKeywordRequest" });

/** Input used by content create/update endpoints to attach taxonomy. */
export const taxonomyInputShape = {
  categoryIds: z.array(IdSchema).max(10).optional().meta({ description: "Category IDs (max 10)." }),
  keywords: z
    .array(z.string().trim().min(2).max(60))
    .max(20)
    .optional()
    .meta({ description: "Keyword labels (max 20). Unknown labels are created automatically." }),
};
