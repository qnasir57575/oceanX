import { z } from "zod";
import { ContentTypeSchema, DateTimeSchema, IdSchema, PageQuerySchema, SlugSchema, limitQuery } from "../primitives";
import { UserSummarySchema } from "./refs";

export const SubmissionStatusSchema = z
  .enum(["PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "WITHDRAWN"])
  .meta({ id: "SubmissionStatus" });

export const ReviewDecisionSchema = z
  .enum(["APPROVE", "REJECT", "REQUEST_CHANGES"])
  .meta({ id: "ReviewDecision" });

export const ReviewEventSchema = z
  .object({
    id: IdSchema,
    action: z.enum(["SUBMITTED", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "WITHDRAWN"]),
    actor: UserSummarySchema,
    comment: z.string().nullable(),
    createdAt: DateTimeSchema,
  })
  .meta({ id: "ReviewEvent" });

export const SubmissionSchema = z
  .object({
    id: IdSchema,
    contentType: ContentTypeSchema,
    contentId: IdSchema,
    contentTitle: z.string(),
    contentSlug: SlugSchema,
    status: SubmissionStatusSchema,
    message: z.string().nullable().meta({ description: "Note from the submitter to reviewers." }),
    submittedBy: UserSummarySchema,
    submittedAt: DateTimeSchema,
    reviewedBy: UserSummarySchema.nullable(),
    reviewedAt: DateTimeSchema.nullable(),
    reviewComment: z.string().nullable(),
    history: z.array(ReviewEventSchema).meta({ description: "Oldest first." }),
  })
  .meta({ id: "Submission" });

export const ListSubmissionsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(20),
  status: SubmissionStatusSchema.optional(),
  contentType: ContentTypeSchema.optional(),
  mine: z.boolean().optional().meta({ description: "Only my submissions. Always true for RESEARCHER." }),
});

export const CreateSubmissionRequestSchema = z
  .object({
    contentType: ContentTypeSchema,
    contentId: IdSchema,
    message: z.string().trim().max(2000).optional(),
  })
  .meta({ id: "CreateSubmissionRequest" });

export const ReviewSubmissionRequestSchema = z
  .object({
    decision: ReviewDecisionSchema,
    comment: z.string().trim().max(5000).optional(),
  })
  .refine((v) => v.decision === "APPROVE" || Boolean(v.comment), {
    message: "A comment is required when rejecting or requesting changes",
    path: ["comment"],
  })
  .meta({ id: "ReviewSubmissionRequest" });
