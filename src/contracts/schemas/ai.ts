/**
 * AI-assisted research summaries and outreach content.
 * Every AI output is created as a DRAFT and must be reviewed by a human
 * (EDITOR/ADMIN) before it becomes PUBLISHED and visible to the public.
 */
import { z } from "zod";
import {
  DateTimeSchema,
  IdSchema,
  LanguageSchema,
  PageQuerySchema,
  SearchTextQuerySchema,
  SlugSchema,
  limitQuery,
} from "../primitives";
import { UserSummarySchema } from "./refs";

export const AIContentKindSchema = z
  .enum(["RESEARCH_SUMMARY", "SOCIAL_POST", "NEWSLETTER", "PRESS_RELEASE", "EXPLAINER", "QUIZ", "FAQ"])
  .meta({ id: "AIContentKind" });

export const AudienceSchema = z
  .enum(["GENERAL_PUBLIC", "STUDENTS", "EDUCATORS", "POLICY_MAKERS", "RESEARCHERS"])
  .meta({ id: "Audience" });

export const AIContentStatusSchema = z
  .enum(["DRAFT", "PUBLISHED", "REJECTED", "ARCHIVED"])
  .meta({ id: "AIContentStatus", description: "DRAFT until a human reviewer publishes or rejects it." });

export const AISourceTypeSchema = z
  .enum(["EXPEDITION", "PUBLICATION", "DATASET", "ACTIVITY"])
  .meta({ id: "AISourceType" });

export const AISourceRefSchema = z
  .object({ type: AISourceTypeSchema, id: IdSchema, slug: SlugSchema, title: z.string() })
  .meta({ id: "AISourceRef" });

export const AI_DISCLAIMER =
  "This text was drafted with AI assistance from the linked source records and reviewed by portal staff. " +
  "Refer to the original sources for authoritative scientific information.";

export const AIOutreachContentSchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    kind: AIContentKindSchema,
    title: z.string(),
    body: z.string().meta({ description: "Markdown." }),
    audience: AudienceSchema,
    language: LanguageSchema,
    sources: z.array(AISourceRefSchema).min(1).meta({ description: "Records the content was generated from." }),
    status: AIContentStatusSchema,
    isAIGenerated: z.literal(true),
    disclaimer: z.string().meta({ description: "Must be displayed with the content." }),
    model: z.string().meta({ description: "Model that produced the draft." }),
    generatedBy: UserSummarySchema.nullable(),
    reviewedBy: UserSummarySchema.nullable(),
    reviewedAt: DateTimeSchema.nullable(),
    publishedAt: DateTimeSchema.nullable(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .meta({ id: "AIOutreachContent" });

/** Public listing shape (published items only). */
export const OutreachSummarySchema = AIOutreachContentSchema.pick({
  id: true,
  slug: true,
  kind: true,
  title: true,
  audience: true,
  language: true,
  isAIGenerated: true,
  publishedAt: true,
})
  .extend({ excerpt: z.string().meta({ description: "Plain-text excerpt (≤ 240 chars)." }) })
  .meta({ id: "OutreachSummary" });

export const GenerateSummaryRequestSchema = z
  .object({
    sourceType: z.enum(["PUBLICATION", "DATASET", "EXPEDITION"]),
    sourceId: IdSchema,
    audience: AudienceSchema.default("GENERAL_PUBLIC"),
    length: z.enum(["SHORT", "MEDIUM", "LONG"]).default("MEDIUM").meta({ description: "≈80 / 200 / 400 words." }),
    language: LanguageSchema.default("en"),
  })
  .meta({ id: "GenerateSummaryRequest" });

export const GenerateOutreachRequestSchema = z
  .object({
    kind: AIContentKindSchema.exclude(["RESEARCH_SUMMARY"]),
    sources: z
      .array(z.object({ type: AISourceTypeSchema, id: IdSchema }))
      .min(1)
      .max(5)
      .meta({ description: "1–5 PUBLISHED records to ground the content in." }),
    audience: AudienceSchema.default("GENERAL_PUBLIC"),
    tone: z.enum(["INFORMATIVE", "ENGAGING", "FORMAL", "PLAYFUL"]).default("INFORMATIVE"),
    language: LanguageSchema.default("en"),
    maxWords: z.number().int().min(30).max(1500).default(300),
    instructions: z.string().trim().max(1000).optional().meta({ description: "Extra guidance for the draft." }),
  })
  .meta({ id: "GenerateOutreachRequest" });

export const ListAIContentQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(20),
  kind: AIContentKindSchema.optional(),
  status: AIContentStatusSchema.optional(),
  sourceType: AISourceTypeSchema.optional(),
  sourceId: IdSchema.optional(),
});

export const UpdateAIContentRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    body: z.string().trim().min(10).max(20_000).optional(),
    status: AIContentStatusSchema.optional().meta({ description: "Set PUBLISHED to approve, REJECTED to discard." }),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateAIContentRequest" });

export const ListOutreachQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(),
  q: SearchTextQuerySchema.optional(),
  kind: AIContentKindSchema.optional(),
  audience: AudienceSchema.optional(),
  language: LanguageSchema.optional(),
  sourceType: AISourceTypeSchema.optional(),
  sourceId: IdSchema.optional().meta({ description: "Only content generated from this record." }),
});
