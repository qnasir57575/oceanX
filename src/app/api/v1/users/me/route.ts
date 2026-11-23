import { defineRoute } from "@/server/http/route";
import { updateProfile } from "@/server/services/auth";

export const PATCH = defineRoute("updateMyProfile", async ({ user, body, ip }) => ({
  success: true as const,
  data: await updateProfile(user, body, ip),
}));
