import { defineRoute, plannedRoute } from "@/server/http/route";
import { listKeywords } from "@/server/services/discovery";

export const GET = defineRoute("listKeywords", async ({ query }) => listKeywords(query));

// PLANNED — see docs/API_DOCUMENTATION.md. Replace with defineRoute() when implemented.
export const POST = plannedRoute("createKeyword");
