import { defineRoute, plannedRoute } from "@/server/http/route";
import { getExpedition } from "@/server/services/content";

export const GET = defineRoute("getExpedition", async ({ params, user }) => getExpedition(params.id, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updateExpedition");
export const DELETE = plannedRoute("deleteExpedition");
