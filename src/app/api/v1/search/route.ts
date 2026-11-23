import { defineRoute } from "@/server/http/route";
import { search } from "@/server/services/discovery";

export const GET = defineRoute("search", async ({ query }) => search(query));
