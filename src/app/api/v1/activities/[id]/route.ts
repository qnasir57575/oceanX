import { defineRoute, plannedRoute } from "@/server/http/route";
import { getActivity } from "@/server/services/content";

export const GET = defineRoute("getActivity", async ({ params, user }) => getActivity(params.id, user));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updateActivity");
export const DELETE = plannedRoute("deleteActivity");
