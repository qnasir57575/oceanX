import { defineRoute, plannedRoute } from "@/server/http/route";
import { listPublications } from "@/server/services/content";

export const GET = defineRoute("listPublications", async ({ query, user }) => listPublications(query, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createPublication");
