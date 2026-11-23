import { defineRoute, plannedRoute } from "@/server/http/route";
import { listCategories } from "@/server/services/discovery";

export const GET = defineRoute("listCategories", async ({ query }) => listCategories(query));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createCategory");
