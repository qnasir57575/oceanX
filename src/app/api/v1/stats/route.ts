import { defineRoute } from "@/server/http/route";
import { getPortalStats } from "@/server/services/discovery";

export const GET = defineRoute("getPortalStats", async () => ({ success: true as const, data: await getPortalStats() }));
