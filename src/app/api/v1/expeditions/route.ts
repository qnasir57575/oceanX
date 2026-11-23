import { defineRoute, plannedRoute } from "@/server/http/route";
import { listExpeditions } from "@/server/services/content";

export const GET = defineRoute("listExpeditions", async ({ query, user }) => listExpeditions(query, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createExpedition");
