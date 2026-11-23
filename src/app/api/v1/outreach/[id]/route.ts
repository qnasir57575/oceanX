import { defineRoute } from "@/server/http/route";
import { getOutreach } from "@/server/services/discovery";

export const GET = defineRoute("getOutreach", async ({ params }) => getOutreach(params.id));
