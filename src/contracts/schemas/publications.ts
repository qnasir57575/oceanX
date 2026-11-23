import { z } from "zod";
import {
  AccessLevelSchema,
  DateSchema,
  DateTimeSchema,
  IdSchema,
  LanguageSchema,
  PageQuerySchema,
  PolarRegionSchema,
  SearchTextQuerySchema,
  SlugSchema,
  UrlSchema,
  limitQuery,
} from "../primitives";
import {
  CategoryRefSchema,
  CitationSchema,
  DatasetRefSchema,
  ExpeditionRefSchema,
  FileRefSchema,
  contentMetaShape,
} from "./refs";
import { taxonomyInputShape } from "./taxonomy";
import { StatusUpdateSchema, YearSchema, listFilterShape, slugInput, yearRangeShape } from "./content-common";
import { ExpeditionIdFilterSchema } from "./expeditions";

export const PublicationTypeSchema = z
  .enum([
    "JOURNAL_ARTICLE",
    "CONFERENCE_PAPER",
    "REPORT",
    "THESIS",
    "BOOK_CHAPTER",
    "TECHNICAL_NOTE",
    "DATA_PAPER",
    "OTHER",
  ])
  .meta({ id: "PublicationType" });

export const AuthorSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    affiliation: z.string().trim().max(300).nullable(),
    orcid: z
      .string()
      .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Must be an ORCID iD like 0000-0002-1825-0097")
      .nullable(),
  })
  .meta({ id: "Author" });

/** Human-reviewed, AI-generated plain-language summary attached to a record. */
export const AISummaryRefSchema = z
  .object({
    id: IdSchema,
    text: z.string().meta({ description: "Markdown." }),
    audience: z.string(),
    language: LanguageSchema,
    model: z.string().meta({ description: "Model that produced the draft." }),
    reviewedAt: DateTimeSchema.nullable(),
    disclaimer: z.string().meta({ description: "Must be displayed next to the summary." }),
  })
  .meta({ id: "AISummaryRef" });

export const PublicationSummarySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    title: z.string(),
    abstractPreview: z.string().meta({ description: "First ~300 characters of the abstract, plain text." }),
    authors: z.array(AuthorSchema),
    type: PublicationTypeSchema,
    year: z.number().int(),
    venue: z.string().nullable().meta({ description: "Journal, conference or publisher series." }),
    doi: z.string().nullable().meta({ description: "DOI without the `https://doi.org/` prefix." }),
    region: PolarRegionSchema.nullable(),
    accessLevel: AccessLevelSchema,
    hasFullText: z.boolean().meta({ description: "True when a PDF is attached." }),
    categories: z.array(CategoryRefSchema),
    keywords: z.array(z.string()),
    ...contentMetaShape,
  })
  .meta({ id: "PublicationSummary" });

export const PublicationSchema = PublicationSummarySchema.extend({
  abstract: z.string(),
  publicationDate: DateSchema.nullable(),
  volume: z.string().nullable(),
  issue: z.string().nullable(),
  pages: z.string().nullable(),
  publisher: z.string().nullable(),
  externalUrl: UrlSchema.nullable().meta({ description: "Publisher landing page." }),
  pdf: FileRefSchema.nullable(),
  expedition: ExpeditionRefSchema.nullable(),
  datasets: z.array(DatasetRefSchema).meta({ description: "Published datasets linked to this publication." }),
  citation: CitationSchema,
  aiSummary: AISummaryRefSchema.nullable().meta({
    description: "Published plain-language summary, if one has been generated and approved.",
  }),
}).meta({ id: "Publication" });

export const ListPublicationsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(),
  q: SearchTextQuerySchema.optional().meta({ description: "Searches title, abstract and author names." }),
  type: PublicationTypeSchema.optional(),
  author: z.string().trim().min(2).max(100).optional().meta({ description: "Author name contains (case-insensitive)." }),
  expeditionId: ExpeditionIdFilterSchema,
  ...listFilterShape,
  ...yearRangeShape,
  sort: z.enum(["newest", "oldest", "title"]).default("newest").meta({ description: "`newest` = by year, descending." }),
});

const PublicationInputSchema = z.object({
  title: z.string().trim().min(3).max(300),
  slug: slugInput,
  abstract: z.string().trim().min(20).max(10_000),
  authors: z.array(AuthorSchema.partial({ affiliation: true, orcid: true })).min(1).max(100),
  type: PublicationTypeSchema,
  year: YearSchema,
  publicationDate: DateSchema.nullable().optional(),
  venue: z.string().trim().max(300).nullable().optional(),
  volume: z.string().trim().max(50).nullable().optional(),
  issue: z.string().trim().max(50).nullable().optional(),
  pages: z.string().trim().max(50).nullable().optional(),
  publisher: z.string().trim().max(200).nullable().optional(),
  doi: z
    .string()
    .trim()
    .regex(/^10\.\d{4,9}\/\S+$/, "Must be a DOI like 10.1234/abcd (without https://doi.org/)")
    .nullable()
    .optional(),
  externalUrl: UrlSchema.nullable().optional(),
  pdfFileId: IdSchema.nullable().optional().meta({ description: "ID of an uploaded file (purpose PUBLICATION_PDF)." }),
  accessLevel: AccessLevelSchema.optional().meta({ description: "Defaults to OPEN." }),
  region: PolarRegionSchema.nullable().optional(),
  expeditionId: IdSchema.nullable().optional(),
  datasetIds: z.array(IdSchema).max(50).optional(),
  ...taxonomyInputShape,
});

export const CreatePublicationRequestSchema = PublicationInputSchema.meta({ id: "CreatePublicationRequest" });

export const UpdatePublicationRequestSchema = PublicationInputSchema.partial()
  .extend({ status: StatusUpdateSchema })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdatePublicationRequest" });
