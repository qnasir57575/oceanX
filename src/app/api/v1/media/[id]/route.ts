import { defineRoute, plannedRoute } from "@/server/http/route";
import { getMediaAsset } from "@/server/services/content";

export const GET = defineRoute("getMediaAsset", async ({ params, user }) => getMediaAsset(params.id, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updateMediaAsset");
export const DELETE = plannedRoute("deleteMediaAsset");
