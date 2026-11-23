import { z } from "zod";
import { DateTimeSchema, PolarRegionSchema } from "../primitives";
import { ExpeditionSummarySchema } from "./expeditions";
import { PublicationSummarySchema } from "./publications";
import { MediaAssetSummarySchema } from "./media";
import { ActivitySummarySchema } from "./activities";
import { OutreachSummarySchema } from "./ai";

export const PortalStatsSchema = z
  .object({
    expeditions: z.number().int().min(0),
    publications: z.number().int().min(0),
    datasets: z.number().int().min(0),
    mediaAssets: z.number().int().min(0),
    activities: z.number().int().min(0),
    byRegion: z
      .array(z.object({ region: PolarRegionSchema, expeditions: z.number().int().min(0) }))
      .meta({ description: "Published expeditions per region." }),
    lastUpdatedAt: DateTimeSchema.nullable().meta({ description: "Most recent publish time across all content." }),
  })
  .meta({ id: "PortalStats", description: "Counts of PUBLISHED records." });

export const HomePageDataSchema = z
  .object({
    stats: PortalStatsSchema,
    featuredExpeditions: z.array(ExpeditionSummarySchema).meta({ description: "Up to 3." }),
    latestPublications: z.array(PublicationSummarySchema).meta({ description: "Up to 4, newest first." }),
    featuredMedia: z.array(MediaAssetSummarySchema).meta({ description: "Up to 8 featured items." }),
    latestNews: z.array(ActivitySummarySchema).meta({ description: "Up to 4 NEWS/PRESS_RELEASE/ANNOUNCEMENT items." }),
    upcomingEvents: z.array(ActivitySummarySchema).meta({ description: "Up to 3 future EVENT/WORKSHOP/OUTREACH_PROGRAM items." }),
    featuredOutreach: z.array(OutreachSummarySchema).meta({ description: "Up to 3 published outreach pieces." }),
  })
  .meta({ id: "HomePageData" });
