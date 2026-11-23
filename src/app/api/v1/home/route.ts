import { defineRoute } from "@/server/http/route";
import { getHomePageData } from "@/server/services/discovery";

export const GET = defineRoute("getHomePageData", async () => getHomePageData());
