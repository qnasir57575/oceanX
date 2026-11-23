import { z } from "zod";
import { DateTimeSchema } from "../primitives";

export const HealthStatusSchema = z
  .object({
    status: z.literal("ok"),
    version: z.string(),
    timestamp: DateTimeSchema,
    checks: z.object({ database: z.literal("ok") }),
  })
  .meta({ id: "HealthStatus", description: "Returned only when healthy. An unhealthy service answers 503 SERVICE_UNAVAILABLE." });
