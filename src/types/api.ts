/**
 * Shared API types for frontend and backend.
 *
 *   import type { Expedition, PaginatedResponse } from "@/types/api";
 *
 * Every type here is DERIVED from the Zod schemas in src/contracts — never
 * hand-edit a shape here. To change a type, change the schema (a contract
 * change: see CLAUDE.md) and the type follows automatically.
 *
 * Naming:
 *   Xxx            full record returned by detail endpoints
 *   XxxSummary     lighter record returned by list endpoints
 *   XxxQuery       query parameters accepted by client functions (defaults optional)
 *   XxxRequest     JSON request body
 */
import type { z } from "zod";
import type * as P from "@/contracts/primitives";
import type * as Auth from "@/contracts/schemas/auth";
import type * as Refs from "@/contracts/schemas/refs";
import type * as Tax from "@/contracts/schemas/taxonomy";
import type * as Exp from "@/contracts/schemas/expeditions";
import type * as Pub from "@/contracts/schemas/publications";
import type * as Ds from "@/contracts/schemas/datasets";
import type * as Med from "@/contracts/schemas/media";
import type * as Act from "@/contracts/schemas/activities";
import type * as Srch from "@/contracts/schemas/search";
import type * as Home from "@/contracts/schemas/home";
import type * as Files from "@/contracts/schemas/files";
import type * as Sub from "@/contracts/schemas/submissions";
import type * as AI from "@/contracts/schemas/ai";
import type * as Admin from "@/contracts/schemas/admin";
import type * as Sys from "@/contracts/schemas/system";

type Out<T extends z.ZodType> = z.output<T>;
type In<T extends z.ZodType> = z.input<T>;

// ─── Envelopes & errors ─────────────────────────────────────────────────────

/** Successful response wrapping a single value. */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export type Pagination = Out<typeof P.PaginationSchema>;

/** Successful response wrapping a page of items. */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

export type ErrorCode = Out<typeof P.ErrorCodeSchema>;
/** The `error` object inside an error response. */
export type ApiError = Out<typeof P.ApiErrorSchema>;
/** Body of every non-2xx JSON response. */
export type ErrorResponse = Out<typeof P.ErrorResponseSchema>;
export type Deleted = Out<typeof P.DeletedSchema>;

// ─── Enums ──────────────────────────────────────────────────────────────────

export type PolarRegion = Out<typeof P.PolarRegionSchema>;
export type UserRole = Out<typeof P.UserRoleSchema>;
export type ContentStatus = Out<typeof P.ContentStatusSchema>;
export type AccessLevel = Out<typeof P.AccessLevelSchema>;
export type ContentType = Out<typeof P.ContentTypeSchema>;
export type UserStatus = Out<typeof Auth.UserStatusSchema>;
export type ExpeditionPhase = Out<typeof Exp.ExpeditionPhaseSchema>;
export type PublicationType = Out<typeof Pub.PublicationTypeSchema>;
export type MediaType = Out<typeof Med.MediaTypeSchema>;
export type ActivityType = Out<typeof Act.ActivityTypeSchema>;
export type SearchResultType = Out<typeof Srch.SearchResultTypeSchema>;
export type UploadPurpose = Out<typeof Files.UploadPurposeSchema>;
export type FileStatus = Out<typeof Files.FileStatusSchema>;
export type SubmissionStatus = Out<typeof Sub.SubmissionStatusSchema>;
export type ReviewDecision = Out<typeof Sub.ReviewDecisionSchema>;
export type AIContentKind = Out<typeof AI.AIContentKindSchema>;
export type AIContentStatus = Out<typeof AI.AIContentStatusSchema>;
export type Audience = Out<typeof AI.AudienceSchema>;
export type AISourceType = Out<typeof AI.AISourceTypeSchema>;

// ─── Shared embedded shapes ─────────────────────────────────────────────────

export type ImageRef = Out<typeof Refs.ImageRefSchema>;
export type GeoPoint = Out<typeof Refs.GeoPointSchema>;
export type BoundingBox = Out<typeof Refs.BoundingBoxSchema>;
export type CategoryRef = Out<typeof Refs.CategoryRefSchema>;
export type UserSummary = Out<typeof Refs.UserSummarySchema>;
export type ExpeditionRef = Out<typeof Refs.ExpeditionRefSchema>;
export type PublicationRef = Out<typeof Refs.PublicationRefSchema>;
export type DatasetRef = Out<typeof Refs.DatasetRefSchema>;
export type FileRef = Out<typeof Refs.FileRefSchema>;
export type Citation = Out<typeof Refs.CitationSchema>;

// ─── Users & auth ───────────────────────────────────────────────────────────

export type User = Out<typeof Auth.UserSchema>;
export type Session = Out<typeof Auth.SessionSchema>;
export type AuthResult = Out<typeof Auth.AuthResultSchema>;
export type RegisterRequest = In<typeof Auth.RegisterRequestSchema>;
export type LoginRequest = In<typeof Auth.LoginRequestSchema>;
export type ChangePasswordRequest = In<typeof Auth.ChangePasswordRequestSchema>;
export type ForgotPasswordRequest = In<typeof Auth.ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = In<typeof Auth.ResetPasswordRequestSchema>;
export type UpdateProfileRequest = In<typeof Auth.UpdateProfileRequestSchema>;
export type ListUsersQuery = In<typeof Auth.ListUsersQuerySchema>;
export type CreateUserRequest = In<typeof Auth.CreateUserRequestSchema>;
export type AdminUpdateUserRequest = In<typeof Auth.AdminUpdateUserRequestSchema>;

// ─── Taxonomy ───────────────────────────────────────────────────────────────

export type ResearchCategory = Out<typeof Tax.ResearchCategorySchema>;
export type CategoryCounts = Out<typeof Tax.CategoryCountsSchema>;
export type Keyword = Out<typeof Tax.KeywordSchema>;
export type ListCategoriesQuery = In<typeof Tax.ListCategoriesQuerySchema>;
export type ListKeywordsQuery = In<typeof Tax.ListKeywordsQuerySchema>;
export type CreateCategoryRequest = In<typeof Tax.CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = In<typeof Tax.UpdateCategoryRequestSchema>;
export type CreateKeywordRequest = In<typeof Tax.CreateKeywordRequestSchema>;

// ─── Expeditions ────────────────────────────────────────────────────────────

export type ExpeditionSummary = Out<typeof Exp.ExpeditionSummarySchema>;
export type Expedition = Out<typeof Exp.ExpeditionSchema>;
export type ListExpeditionsQuery = In<typeof Exp.ListExpeditionsQuerySchema>;
export type CreateExpeditionRequest = In<typeof Exp.CreateExpeditionRequestSchema>;
export type UpdateExpeditionRequest = In<typeof Exp.UpdateExpeditionRequestSchema>;

// ─── Publications ───────────────────────────────────────────────────────────

export type Author = Out<typeof Pub.AuthorSchema>;
export type AISummaryRef = Out<typeof Pub.AISummaryRefSchema>;
export type PublicationSummary = Out<typeof Pub.PublicationSummarySchema>;
export type Publication = Out<typeof Pub.PublicationSchema>;
export type ListPublicationsQuery = In<typeof Pub.ListPublicationsQuerySchema>;
export type CreatePublicationRequest = In<typeof Pub.CreatePublicationRequestSchema>;
export type UpdatePublicationRequest = In<typeof Pub.UpdatePublicationRequestSchema>;

// ─── Datasets ───────────────────────────────────────────────────────────────

export type TemporalCoverage = Out<typeof Ds.TemporalCoverageSchema>;
export type DatasetContact = Out<typeof Ds.DatasetContactSchema>;
export type DatasetSummary = Out<typeof Ds.DatasetSummarySchema>;
export type Dataset = Out<typeof Ds.DatasetSchema>;
export type ListDatasetsQuery = In<typeof Ds.ListDatasetsQuerySchema>;
export type CreateDatasetRequest = In<typeof Ds.CreateDatasetRequestSchema>;
export type UpdateDatasetRequest = In<typeof Ds.UpdateDatasetRequestSchema>;

// ─── Media ──────────────────────────────────────────────────────────────────

export type MediaAssetSummary = Out<typeof Med.MediaAssetSummarySchema>;
export type MediaAsset = Out<typeof Med.MediaAssetSchema>;
export type ListMediaQuery = In<typeof Med.ListMediaQuerySchema>;
export type CreateMediaAssetRequest = In<typeof Med.CreateMediaAssetRequestSchema>;
export type UpdateMediaAssetRequest = In<typeof Med.UpdateMediaAssetRequestSchema>;

// ─── Institutional news & activities ────────────────────────────────────────

export type ActivitySummary = Out<typeof Act.ActivitySummarySchema>;
export type InstitutionalActivity = Out<typeof Act.InstitutionalActivitySchema>;
export type ListActivitiesQuery = In<typeof Act.ListActivitiesQuerySchema>;
export type CreateActivityRequest = In<typeof Act.CreateActivityRequestSchema>;
export type UpdateActivityRequest = In<typeof Act.UpdateActivityRequestSchema>;

// ─── Search ─────────────────────────────────────────────────────────────────

export type SearchResult = Out<typeof Srch.SearchResultSchema>;
export type SearchFacets = Out<typeof Srch.SearchFacetsSchema>;
export type FacetBucket = Out<typeof Srch.FacetBucketSchema>;
export type SearchQuery = In<typeof Srch.SearchQuerySchema>;
export type SearchResponse = Out<typeof Srch.SearchResponseSchema>;
export type SuggestQuery = In<typeof Srch.SuggestQuerySchema>;
export type SearchSuggestion = Out<typeof Srch.SearchSuggestionSchema>;

// ─── Homepage ───────────────────────────────────────────────────────────────

export type PortalStats = Out<typeof Home.PortalStatsSchema>;
export type HomePageData = Out<typeof Home.HomePageDataSchema>;

// ─── Files ──────────────────────────────────────────────────────────────────

export type FileAsset = Out<typeof Files.FileAssetSchema>;
export type CreateUploadRequest = In<typeof Files.CreateUploadRequestSchema>;
export type UploadTicket = Out<typeof Files.UploadTicketSchema>;
export type UploadContentResult = Out<typeof Files.UploadContentResultSchema>;

// ─── Submissions ────────────────────────────────────────────────────────────

export type Submission = Out<typeof Sub.SubmissionSchema>;
export type ReviewEvent = Out<typeof Sub.ReviewEventSchema>;
export type ListSubmissionsQuery = In<typeof Sub.ListSubmissionsQuerySchema>;
export type CreateSubmissionRequest = In<typeof Sub.CreateSubmissionRequestSchema>;
export type ReviewSubmissionRequest = In<typeof Sub.ReviewSubmissionRequestSchema>;

// ─── AI & outreach ──────────────────────────────────────────────────────────

export type AIOutreachContent = Out<typeof AI.AIOutreachContentSchema>;
export type AISourceRef = Out<typeof AI.AISourceRefSchema>;
export type OutreachSummary = Out<typeof AI.OutreachSummarySchema>;
export type GenerateSummaryRequest = In<typeof AI.GenerateSummaryRequestSchema>;
export type GenerateOutreachRequest = In<typeof AI.GenerateOutreachRequestSchema>;
export type ListAIContentQuery = In<typeof AI.ListAIContentQuerySchema>;
export type UpdateAIContentRequest = In<typeof AI.UpdateAIContentRequestSchema>;
export type ListOutreachQuery = In<typeof AI.ListOutreachQuerySchema>;

// ─── Admin ──────────────────────────────────────────────────────────────────

export type AdminDashboard = Out<typeof Admin.AdminDashboardSchema>;
export type AuditLogEntry = Out<typeof Admin.AuditLogEntrySchema>;
export type ListAuditLogsQuery = In<typeof Admin.ListAuditLogsQuerySchema>;

// ─── System ─────────────────────────────────────────────────────────────────

export type HealthStatus = Out<typeof Sys.HealthStatusSchema>;

// ─── Per-endpoint helpers ───────────────────────────────────────────────────
// For any operationId in the registry, e.g. ResponseOf<"listExpeditions">.
export type {
  OperationId,
  QueryInputOf,
  BodyInputOf,
  ResponseOf,
} from "@/contracts/registry";
