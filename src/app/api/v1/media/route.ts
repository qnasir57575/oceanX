import { defineRoute, plannedRoute } from "@/server/http/route";
import { listMediaAssets } from "@/server/services/content";

export const GET = defineRoute("listMediaAssets", async ({ query, user }) => listMediaAssets(query, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createMediaAsset");
