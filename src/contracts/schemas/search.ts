import { z } from "zod";
import {
  DateTimeSchema,
  IdSchema,
  PageQuerySchema,
  PaginationSchema,
  PolarRegionSchema,
  SlugSchema,
  UrlOrPathSchema,
  limitQuery,
} from "../primitives";

export const SearchResultTypeSchema = z
  .enum(["EXPEDITION", "PUBLICATION", "DATASET", "MEDIA", "ACTIVITY", "OUTREACH"])
  .meta({ id: "SearchResultType" });

export const SearchResultSchema = z
  .object({
    type: SearchResultTypeSchema,
    id: IdSchema,
    slug: SlugSchema,
    title: z.string(),
    snippet: z.string().meta({ description: "Plain-text excerpt (≤ 240 chars). No HTML." }),
    thumbnailUrl: UrlOrPathSchema.nullable(),
    region: PolarRegionSchema.nullable(),
    year: z.number().int().nullable(),
    publishedAt: DateTimeSchema.nullable(),
    score: z.number().min(0).meta({ description: "Relevance score; higher is better. Only meaningful within one response." }),
  })
  .meta({
    id: "SearchResult",
    description: "Build the page link on the client from `type` + `slug` (see `searchResultHref()` in src/lib/api/search.ts).",
  });

export const FacetBucketSchema = z
  .object({ value: z.string(), count: z.number().int().min(0) })
  .meta({ id: "FacetBucket" });

export const SearchFacetsSchema = z
  .object({
    types: z.array(FacetBucketSchema),
    regions: z.array(FacetBucketSchema),
    years: z.array(FacetBucketSchema),
  })
  .meta({ id: "SearchFacets", description: "Counts over ALL matches (ignoring pagination) for building filter UIs." });

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200).meta({ description: "Search text (min 2 characters)." }),
  types: z
    .array(SearchResultTypeSchema)
    .min(1)
    .optional()
    .meta({ description: "Comma-separated list, e.g. `types=PUBLICATION,DATASET`. Default: all types." }),
  region: PolarRegionSchema.optional(),
  category: SlugSchema.optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  page: PageQuerySchema,
  limit: limitQuery(10, 50),
});

export const SearchResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.array(SearchResultSchema),
    pagination: PaginationSchema,
    meta: z.object({
      query: z.string(),
      tookMs: z.number().int().min(0),
      facets: SearchFacetsSchema,
    }),
  })
  .meta({ id: "SearchResponse" });

export const SuggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(20).default(8),
});

export const SearchSuggestionSchema = z
  .object({
    text: z.string(),
    kind: z.enum(["TITLE", "KEYWORD", "CATEGORY"]),
    resultType: SearchResultTypeSchema.nullable().meta({ description: "For TITLE suggestions: which kind of record." }),
    slug: SlugSchema.nullable().meta({ description: "For TITLE/CATEGORY suggestions: navigate directly." }),
  })
  .meta({ id: "SearchSuggestion" });
