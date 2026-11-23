import { defineRoute, plannedRoute } from "@/server/http/route";
import { getPublication } from "@/server/services/content";

export const GET = defineRoute("getPublication", async ({ params, user }) => getPublication(params.id, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updatePublication");
export const DELETE = plannedRoute("deletePublication");
