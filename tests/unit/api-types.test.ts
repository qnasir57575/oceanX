/**
 * Compile-time checks (enforced by `npm run typecheck`) that the readable
 * shared types in src/types/api.ts are exactly what each endpoint returns.
 */
import { describe, expectTypeOf, it } from "vitest";
import type { ResponseOf } from "@/contracts/registry";
import type {
  ApiResponse,
  Dataset,
  DatasetSummary,
  Expedition,
  ExpeditionSummary,
  HomePageData,
  MediaAssetSummary,
  PaginatedResponse,
  Publication,
  PublicationSummary,
  ResearchCategory,
  SearchResponse,
  Session,
  ActivitySummary,
  InstitutionalActivity,
  OutreachSummary,
  AIOutreachContent,
  Submission,
  FileAsset,
} from "@/types/api";

describe("shared types equal endpoint response types", () => {
  it("lists and details", () => {
    expectTypeOf<ResponseOf<"listExpeditions">>().toEqualTypeOf<PaginatedResponse<ExpeditionSummary>>();
    expectTypeOf<ResponseOf<"getExpedition">>().toEqualTypeOf<ApiResponse<Expedition>>();
    expectTypeOf<ResponseOf<"listPublications">>().toEqualTypeOf<PaginatedResponse<PublicationSummary>>();
    expectTypeOf<ResponseOf<"getPublication">>().toEqualTypeOf<ApiResponse<Publication>>();
    expectTypeOf<ResponseOf<"listDatasets">>().toEqualTypeOf<PaginatedResponse<DatasetSummary>>();
    expectTypeOf<ResponseOf<"getDataset">>().toEqualTypeOf<ApiResponse<Dataset>>();
    expectTypeOf<ResponseOf<"listMediaAssets">>().toEqualTypeOf<PaginatedResponse<MediaAssetSummary>>();
    expectTypeOf<ResponseOf<"listActivities">>().toEqualTypeOf<PaginatedResponse<ActivitySummary>>();
    expectTypeOf<ResponseOf<"getActivity">>().toEqualTypeOf<ApiResponse<InstitutionalActivity>>();
    expectTypeOf<ResponseOf<"listOutreach">>().toEqualTypeOf<PaginatedResponse<OutreachSummary>>();
    expectTypeOf<ResponseOf<"getOutreach">>().toEqualTypeOf<ApiResponse<AIOutreachContent>>();
    expectTypeOf<ResponseOf<"listSubmissions">>().toEqualTypeOf<PaginatedResponse<Submission>>();
    expectTypeOf<ResponseOf<"completeUpload">>().toEqualTypeOf<ApiResponse<FileAsset>>();
  });

  it("aggregates", () => {
    expectTypeOf<ResponseOf<"getHomePageData">>().toEqualTypeOf<ApiResponse<HomePageData>>();
    expectTypeOf<ResponseOf<"search">>().toEqualTypeOf<SearchResponse>();
    expectTypeOf<ResponseOf<"listCategories">>().toEqualTypeOf<ApiResponse<ResearchCategory[]>>();
    expectTypeOf<ResponseOf<"getSession">>().toEqualTypeOf<ApiResponse<Session>>();
  });
});
