import { z } from "zod";
import {
  DateTimeSchema,
  IdSchema,
  SearchTextQuerySchema,
  UrlOrPathSchema,
  UserRoleSchema,
  PageQuerySchema,
  limitQuery,
} from "../primitives";

export const UserStatusSchema = z
  .enum(["ACTIVE", "SUSPENDED"])
  .meta({ id: "UserStatus", description: "SUSPENDED users cannot log in." });

export const UserSchema = z
  .object({
    id: IdSchema,
    email: z.email(),
    name: z.string(),
    role: UserRoleSchema,
    status: UserStatusSchema,
    affiliation: z.string().nullable().meta({ description: "Institution or organisation." }),
    bio: z.string().nullable(),
    avatarUrl: UrlOrPathSchema.nullable(),
    createdAt: DateTimeSchema,
    lastLoginAt: DateTimeSchema.nullable(),
  })
  .meta({ id: "User", description: "Full user record. Only returned to the user themself and to admins." });

export const PASSWORD_MIN_LENGTH = 10;

const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128)
  .meta({ description: `${PASSWORD_MIN_LENGTH}–128 characters.` });

const EmailInputSchema = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase())
  .meta({ description: "Email address (case-insensitive)." });

const NameSchema = z.string().trim().min(2).max(100);

// ─── Requests ───────────────────────────────────────────────────────────────

export const RegisterRequestSchema = z
  .object({
    name: NameSchema,
    email: EmailInputSchema,
    password: PasswordSchema,
    affiliation: z.string().trim().max(200).optional(),
  })
  .meta({ id: "RegisterRequest" });

export const LoginRequestSchema = z
  .object({
    email: EmailInputSchema,
    password: z.string().min(1).max(128),
  })
  .meta({ id: "LoginRequest" });

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: PasswordSchema,
  })
  .meta({ id: "ChangePasswordRequest" });

export const ForgotPasswordRequestSchema = z
  .object({ email: EmailInputSchema })
  .meta({ id: "ForgotPasswordRequest" });

export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(16).max(256).meta({ description: "Token from the reset email link." }),
    newPassword: PasswordSchema,
  })
  .meta({ id: "ResetPasswordRequest" });

export const UpdateProfileRequestSchema = z
  .object({
    name: NameSchema.optional(),
    affiliation: z.string().trim().max(200).nullable().optional(),
    bio: z.string().trim().max(2000).nullable().optional(),
    avatarUrl: UrlOrPathSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "UpdateProfileRequest" });

// ─── Responses ──────────────────────────────────────────────────────────────

export const AuthResultSchema = z
  .object({
    user: UserSchema,
    expiresAt: DateTimeSchema.meta({ description: "When the session cookie expires." }),
  })
  .meta({ id: "AuthResult" });

export const SessionSchema = z
  .object({
    user: UserSchema.nullable().meta({ description: "`null` when not logged in." }),
    expiresAt: DateTimeSchema.nullable(),
  })
  .meta({ id: "Session" });

export const LogoutResultSchema = z.object({ loggedOut: z.literal(true) }).meta({ id: "LogoutResult" });
export const PasswordChangedSchema = z.object({ changed: z.literal(true) }).meta({ id: "PasswordChanged" });
export const AcceptedSchema = z
  .object({ accepted: z.literal(true) })
  .meta({ id: "Accepted", description: "Request accepted. Always returned, to avoid revealing whether an account exists." });
export const PasswordResetSchema = z.object({ reset: z.literal(true) }).meta({ id: "PasswordReset" });

// ─── Admin user management ──────────────────────────────────────────────────

export const ListUsersQuerySchema = z.object({
  page: PageQuerySchema,
  limit: limitQuery(20),
  q: SearchTextQuerySchema.optional().meta({ description: "Matches name or email." }),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
});

export const CreateUserRequestSchema = z
  .object({
    name: NameSchema,
    email: EmailInputSchema,
    role: UserRoleSchema,
    affiliation: z.string().trim().max(200).optional(),
    temporaryPassword: PasswordSchema.meta({ description: "Share securely; the user should change it after first login." }),
  })
  .meta({ id: "CreateUserRequest" });

export const AdminUpdateUserRequestSchema = z
  .object({
    name: NameSchema.optional(),
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
    affiliation: z.string().trim().max(200).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update")
  .meta({ id: "AdminUpdateUserRequest" });
