/** Query parameters and input fields shared by the content list/create endpoints. */
import { z } from "zod";
import { ContentStatusSchema, PolarRegionSchema, SlugSchema } from "../primitives";

export const listFilterShape = {
  region: PolarRegionSchema.optional(),
  category: SlugSchema.optional().meta({ description: "Category slug." }),
  keyword: SlugSchema.optional().meta({ description: "Keyword slug." }),
  status: ContentStatusSchema.optional().meta({
    description:
      "Staff only (EDITOR/ADMIN): list records in another workflow status. " +
      "Anyone else gets 403 if this is set to anything other than PUBLISHED.",
  }),
};

export const YearSchema = z.number().int().min(1900).max(2100);

export const yearRangeShape = {
  year: YearSchema.optional().meta({ description: "Exact year. Overrides yearFrom/yearTo." }),
  yearFrom: YearSchema.optional().meta({ description: "Inclusive lower bound." }),
  yearTo: YearSchema.optional().meta({ description: "Inclusive upper bound." }),
};

/** Staff may set the workflow status directly via PATCH. */
export const StatusUpdateSchema = ContentStatusSchema.optional().meta({
  description:
    "EDITOR/ADMIN only. Set the workflow status directly (e.g. ARCHIVED). " +
    "Researchers must use POST /submissions to request publication.",
});

export const slugInput = SlugSchema.optional().meta({ description: "Generated from the title when omitted. Must be unique." });
