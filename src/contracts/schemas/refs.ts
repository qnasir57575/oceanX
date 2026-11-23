/**
 * Small embedded shapes reused across domains (references to other records,
 * images, files, coordinates). Changing these affects many endpoints.
 */
import { z } from "zod";
import {
  AccessLevelSchema,
  ContentStatusSchema,
  DateTimeSchema,
  IdSchema,
  SlugSchema,
  UrlOrPathSchema,
} from "../primitives";

export const ImageRefSchema = z
  .object({
    url: UrlOrPathSchema,
    alt: z.string().max(300).meta({ description: "Alt text. Required for accessibility." }),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    credit: z.string().max(200).nullable().meta({ description: "Photographer / source credit line." }),
  })
  .meta({ id: "ImageRef" });

/** Image input accepted by create/update endpoints. */
export const ImageInputSchema = z
  .object({
    url: UrlOrPathSchema,
    alt: z.string().trim().min(1).max(300),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    credit: z.string().trim().max(200).nullable().optional(),
  })
  .meta({ id: "ImageInput" });

export const GeoPointSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    label: z.string().max(200).nullable().meta({ description: "Human-readable place name." }),
  })
  .meta({ id: "GeoPoint" });

export const GeoPointInputSchema = GeoPointSchema.extend({
  label: z.string().trim().max(200).nullable().optional(),
}).meta({ id: "GeoPointInput" });

export const BoundingBoxSchema = z
  .object({
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
  })
  .meta({ id: "BoundingBox", description: "Geographic bounding box in decimal degrees (WGS 84)." });

export const CategoryRefSchema = z
  .object({ id: IdSchema, slug: SlugSchema, name: z.string() })
  .meta({ id: "CategoryRef" });

export const UserSummarySchema = z
  .object({
    id: IdSchema,
    name: z.string(),
    affiliation: z.string().nullable(),
    avatarUrl: UrlOrPathSchema.nullable(),
  })
  .meta({ id: "UserSummary", description: "Public-safe user reference (never includes email)." });

export const ExpeditionRefSchema = z
  .object({ id: IdSchema, slug: SlugSchema, title: z.string(), year: z.number().int() })
  .meta({ id: "ExpeditionRef" });

export const PublicationRefSchema = z
  .object({ id: IdSchema, slug: SlugSchema, title: z.string(), year: z.number().int() })
  .meta({ id: "PublicationRef" });

export const DatasetRefSchema = z
  .object({ id: IdSchema, slug: SlugSchema, title: z.string() })
  .meta({ id: "DatasetRef" });

export const FileRefSchema = z
  .object({
    id: IdSchema,
    fileName: z.string(),
    contentType: z.string().meta({ description: "MIME type, e.g. `application/pdf`." }),
    sizeBytes: z.number().int().min(0),
    accessLevel: AccessLevelSchema,
    downloadUrl: UrlOrPathSchema.meta({
      description:
        "Use directly as a link `href`. Points to `GET /api/v1/files/{id}/download`, which enforces access rules.",
    }),
  })
  .meta({ id: "FileRef" });

export const CitationSchema = z
  .object({
    apa: z.string().meta({ description: "Plain-text APA-style citation." }),
    bibtex: z.string().meta({ description: "BibTeX entry." }),
  })
  .meta({ id: "Citation" });

/** Fields shared by every editorial content record. */
export const contentMetaShape = {
  status: ContentStatusSchema,
  publishedAt: DateTimeSchema.nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
};
