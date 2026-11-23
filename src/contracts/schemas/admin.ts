import { z } from "zod";
import { ContentStatusSchema, DateSchema, DateTimeSchema, IdSchema, PageQuerySchema, limitQuery } from "../primitives";
import { UserSummarySchema } from "./refs";
import { SubmissionSchema } from "./submissions";

const statusCounts = z.record(ContentStatusSchema, z.number().int().min(0));

export const AdminDashboardSchema = z
  .object({
    totals: z.object({
      expeditions: z.number().int().min(0),
      publications: z.number().int().min(0),
      datasets: z.number().int().min(0),
      media: z.number().int().min(0),
      activities: z.number().int().min(0),
      users: z.number().int().min(0),
    }),
    contentByStatus: statusCounts.meta({ description: "All content types combined, keyed by ContentStatus." }),
    pendingSubmissions: z.number().int().min(0),
    recentSubmissions: z.array(SubmissionSchema).meta({ description: "Up to 5 most recent." }),
    downloads: z.object({ last30Days: z.number().int().min(0), total: z.number().int().min(0) }),
    storage: z.object({ usedBytes: z.number().int().min(0), fileCount: z.number().int().min(0) }),
    ai: z.object({ generatedLast30Days: z.number().int().min(0), awaitingReview: z.number().int().min(0) }),
  })
  .meta({ id: "AdminDashboard" });

export const AuditLogEntrySchema = z
  .object({
    id: IdSchema,
    actor: UserSummarySchema.nullable(),
    action: z.string().meta({ description: "Dot-separated verb, e.g. `publication.update`, `auth.login`." }),
    entityType: z.string(),
    entityId: IdSchema.nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    ipAddress: z.string().nullable(),
    createdAt: DateTimeSchema,
  })
  .meta({ id: "AuditLogEntry" });

export const ListAuditLogsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(50),
  actorId: IdSchema.optional(),
  action: z.string().trim().max(100).optional().meta({ description: "Exact action or prefix ending in `.`, e.g. `auth.`." }),
  entityType: z.string().trim().max(50).optional(),
  from: DateSchema.optional(),
  to: DateSchema.optional(),
});
