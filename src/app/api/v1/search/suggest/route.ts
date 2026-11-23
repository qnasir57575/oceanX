import { defineRoute } from "@/server/http/route";
import { getSearchSuggestions } from "@/server/services/discovery";

export const GET = defineRoute("getSearchSuggestions", async ({ query }) => getSearchSuggestions(query));
