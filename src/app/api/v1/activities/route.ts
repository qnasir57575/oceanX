import { defineRoute, plannedRoute } from "@/server/http/route";
import { listActivities } from "@/server/services/content";

export const GET = defineRoute("listActivities", async ({ query, user }) => listActivities(query, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createActivity");
