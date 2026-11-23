import { defineRoute, plannedRoute } from "@/server/http/route";
import { getCategory } from "@/server/services/discovery";

export const GET = defineRoute("getCategory", async ({ params }) => getCategory(params.id));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const PATCH = plannedRoute("updateCategory");
export const DELETE = plannedRoute("deleteCategory");
