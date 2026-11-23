import { defineRoute, plannedRoute } from "@/server/http/route";
import { getDataset } from "@/server/services/content";

export const GET = defineRoute("getDataset", async ({ params, user }) => getDataset(params.id, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updateDataset");
export const DELETE = plannedRoute("deleteDataset");
