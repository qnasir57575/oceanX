import { z } from "zod";
import {
  AccessLevelSchema,
  DateSchema,
  IdSchema,
  PageQuerySchema,
  PolarRegionSchema,
  SearchTextQuerySchema,
  SlugSchema,
  limitQuery,
} from "../primitives";
import {
  BoundingBoxSchema,
  CategoryRefSchema,
  CitationSchema,
  ExpeditionRefSchema,
  FileRefSchema,
  PublicationRefSchema,
  contentMetaShape,
} from "./refs";
import { taxonomyInputShape } from "./taxonomy";
import { StatusUpdateSchema, listFilterShape, slugInput } from "./content-common";
import { ExpeditionIdFilterSchema } from "./expeditions";

export const TemporalCoverageSchema = z
  .object({ start: DateSchema.nullable(), end: DateSchema.nullable() })
  .meta({ id: "TemporalCoverage" });

export const DatasetSummarySchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    title: z.string(),
    summary: z.string(),
    region: PolarRegionSchema,
    parameters: z.array(z.string()).meta({ description: "Measured variables, e.g. `Sea surface temperature`." }),
    formats: z.array(z.string()).meta({ description: "File formats, e.g. `NetCDF`, `CSV`." }),
    temporalCoverage: TemporalCoverageSchema,
    accessLevel: AccessLevelSchema,
    license: z.string().meta({ description: "SPDX identifier or license name, e.g. `CC-BY-4.0`." }),
    doi: z.string().nullable(),
    version: z.string().nullable(),
    fileCount: z.number().int().min(0),
    totalSizeBytes: z.number().int().min(0),
    downloadCount: z.number().int().min(0),
    categories: z.array(CategoryRefSchema),
    keywords: z.array(z.string()),
    ...contentMetaShape,
  })
  .meta({ id: "DatasetSummary" });

export const DatasetContactSchema = z
  .object({
    name: z.string(),
    email: z.email().nullable(),
    organization: z.string().nullable(),
  })
  .meta({ id: "DatasetContact", description: "Data custodian to contact about RESTRICTED access." });

export const DatasetSchema = DatasetSummarySchema.extend({
  description: z.string().meta({ description: "Markdown. Methods, processing, quality notes." }),
  spatialCoverage: BoundingBoxSchema.nullable(),
  files: z.array(FileRefSchema),
  expedition: ExpeditionRefSchema.nullable(),
  relatedPublications: z.array(PublicationRefSchema),
  contact: DatasetContactSchema.nullable(),
  citation: CitationSchema,
}).meta({ id: "Dataset" });

export const ListDatasetsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(),
  q: SearchTextQuerySchema.optional().meta({ description: "Searches title, summary and parameters." }),
  accessLevel: AccessLevelSchema.optional(),
  format: z.string().trim().min(1).max(40).optional().meta({ description: "File format, case-insensitive (e.g. `netcdf`)." }),
  parameter: z.string().trim().min(2).max(100).optional().meta({ description: "Parameter name contains." }),
  expeditionId: ExpeditionIdFilterSchema,
  from: DateSchema.optional().meta({ description: "Temporal coverage overlaps on/after this date." }),
  to: DateSchema.optional().meta({ description: "Temporal coverage overlaps on/before this date." }),
  ...listFilterShape,
  sort: z.enum(["newest", "oldest", "title", "downloads"]).default("newest"),
});

const DatasetInputSchema = z.object({
  title: z.string().trim().min(3).max(300),
  slug: slugInput,
  summary: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(50_000),
  region: PolarRegionSchema,
  parameters: z.array(z.string().trim().min(2).max(100)).max(50).optional(),
  formats: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  temporalCoverage: TemporalCoverageSchema.optional(),
  spatialCoverage: BoundingBoxSchema.nullable().optional(),
  license: z.string().trim().min(2).max(100),
  doi: z.string().trim().regex(/^10\.\d{4,9}\/\S+$/).nullable().optional(),
  version: z.string().trim().max(40).nullable().optional(),
  accessLevel: AccessLevelSchema.optional().meta({ description: "Defaults to OPEN." }),
  fileIds: z.array(IdSchema).max(200).optional().meta({ description: "IDs of uploaded files (purpose DATASET_FILE)." }),
  expeditionId: IdSchema.nullable().optional(),
  publicationIds: z.array(IdSchema).max(50).optional(),
  contact: DatasetContactSchema.partial({ email: true, organization: true }).nullable().optional(),
  ...taxonomyInputShape,
});

export const CreateDatasetRequestSchema = DatasetInputSchema.meta({ id: "CreateDatasetRequest" });

export const UpdateDatasetRequestSchema = DatasetInputSchema.partial()
  .extend({ status: StatusUpdateSchema })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateDatasetRequest" });
