import { defineRoute, plannedRoute } from "@/server/http/route";
import { listDatasets } from "@/server/services/content";

export const GET = defineRoute("listDatasets", async ({ query, user }) => listDatasets(query, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createDataset");
