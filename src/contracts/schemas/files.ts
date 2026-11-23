import { z } from "zod";
import { AccessLevelSchema, DateTimeSchema, IdSchema, UrlOrPathSchema } from "../primitives";
import { UserSummarySchema } from "./refs";

export const UploadPurposeSchema = z
  .enum(["PUBLICATION_PDF", "DATASET_FILE", "MEDIA", "COVER_IMAGE", "ATTACHMENT", "AVATAR"])
  .meta({ id: "UploadPurpose" });

const MB = 1024 * 1024;

/** Maximum upload size per purpose. Enforced on POST /uploads (413) and on the upload itself. */
export const UPLOAD_LIMITS: Record<z.infer<typeof UploadPurposeSchema>, { maxBytes: number; contentTypes: string[] }> = {
  PUBLICATION_PDF: { maxBytes: 50 * MB, contentTypes: ["application/pdf"] },
  DATASET_FILE: {
    maxBytes: 2048 * MB,
    contentTypes: [
      "application/x-netcdf",
      "application/netcdf",
      "text/csv",
      "application/json",
      "application/geo+json",
      "application/zip",
      "application/x-hdf5",
      "image/tiff",
      "text/plain",
      "application/octet-stream",
    ],
  },
  MEDIA: {
    maxBytes: 500 * MB,
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "audio/mpeg", "audio/ogg", "application/pdf"],
  },
  COVER_IMAGE: { maxBytes: 15 * MB, contentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
  ATTACHMENT: { maxBytes: 25 * MB, contentTypes: ["application/pdf", "image/jpeg", "image/png", "text/plain"] },
  AVATAR: { maxBytes: 5 * MB, contentTypes: ["image/jpeg", "image/png", "image/webp"] },
};

export const FileStatusSchema = z
  .enum(["PENDING", "READY", "FAILED"])
  .meta({ id: "FileStatus", description: "PENDING until the upload is completed." });

export const FileAssetSchema = z
  .object({
    id: IdSchema,
    fileName: z.string(),
    contentType: z.string(),
    sizeBytes: z.number().int().min(0),
    purpose: UploadPurposeSchema,
    accessLevel: AccessLevelSchema,
    status: FileStatusSchema,
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    downloadUrl: UrlOrPathSchema,
    downloadCount: z.number().int().min(0),
    uploadedBy: UserSummarySchema.nullable(),
    createdAt: DateTimeSchema,
  })
  .meta({ id: "FileAsset" });

export const CreateUploadRequestSchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[^/\\\0]+$/, "Must be a file name, not a path"),
    contentType: z.string().trim().min(3).max(100).meta({ description: "MIME type; must be allowed for the purpose." }),
    sizeBytes: z.number().int().min(1).meta({ description: "Exact size in bytes. Checked against the purpose limit (413)." }),
    purpose: UploadPurposeSchema,
    accessLevel: AccessLevelSchema.optional().meta({ description: "Defaults to OPEN." }),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).optional().meta({ description: "Optional hex SHA-256; verified on completion." }),
  })
  .meta({ id: "CreateUploadRequest" });

export const UploadTicketSchema = z
  .object({
    fileId: IdSchema,
    method: z.literal("PUT"),
    uploadUrl: UrlOrPathSchema.meta({
      description:
        "Send the raw file bytes here with the given method and headers. " +
        "A signed object-storage URL in production, or `/api/v1/uploads/{id}/content` with the local driver.",
    }),
    headers: z.record(z.string(), z.string()).meta({ description: "Headers that MUST be sent with the upload request." }),
    expiresAt: DateTimeSchema,
    maxSizeBytes: z.number().int(),
  })
  .meta({ id: "UploadTicket" });

export const UploadContentResultSchema = z
  .object({ fileId: IdSchema, receivedBytes: z.number().int().min(0) })
  .meta({ id: "UploadContentResult" });
