import { defineRoute } from "@/server/http/route";
import { listOutreach } from "@/server/services/discovery";

export const GET = defineRoute("listOutreach", async ({ query }) => listOutreach(query));
