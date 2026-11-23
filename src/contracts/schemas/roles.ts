import type { z } from "zod";
import type { UserRoleSchema } from "../primitives";

export type UserRole = z.infer<typeof UserRoleSchema>;

export const STAFF_ROLES = ["EDITOR", "ADMIN"] as const satisfies readonly UserRole[];
export const CONTRIBUTOR_ROLES = ["RESEARCHER", "EDITOR", "ADMIN"] as const satisfies readonly UserRole[];
export const ADMIN_ONLY = ["ADMIN"] as const satisfies readonly UserRole[];
