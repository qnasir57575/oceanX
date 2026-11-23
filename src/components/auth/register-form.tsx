"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth";
import { PASSWORD_MIN_LENGTH } from "@/contracts/schemas/auth";
import { useSession } from "@/components/auth/session-provider";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/forms/fields";
import { ButtonLink } from "@/components/ui/button";
import { FormSkeleton } from "@/components/auth/auth-card";
import { safeNextPath } from "@/lib/ui/safe-redirect";
import { toFormError, type FormError } from "@/lib/ui/form-errors";

export function RegisterForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { status, user, setUser } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const destination = safeNextPath(next);

  if (status === "loading") return <FormSkeleton fields={5} />;

  if (user && !pending) {
    return (
      <div className="space-y-5">
        <FormMessage tone="info" title={`You're already logged in as ${user.name}`} />
        <ButtonLink href="/account">Go to my account</ButtonLink>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const affiliation = String(fd.get("affiliation") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    const fieldErrors: Record<string, string> = {};
    if (name.length < 2) fieldErrors.name = "Enter your name (at least 2 characters).";
    if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Enter a valid email address, like name@example.org.";
    if (password.length < PASSWORD_MIN_LENGTH) fieldErrors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    if (!fieldErrors.password && confirm !== password) fieldErrors.confirm = "The passwords don't match.";
    setAttempt((a) => a + 1);
    if (Object.keys(fieldErrors).length) {
      setError({ message: "Please correct the highlighted fields.", fieldErrors, reason: null, code: "VALIDATION_ERROR" });
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { data } = await register({ name, email, password, ...(affiliation ? { affiliation } : {}) });
      setUser(data.user);
      router.replace(next ? destination : "/account?welcome=1");
      router.refresh();
    } catch (err) {
      const fe = toFormError(err, { "reason:EMAIL_TAKEN": "An account with this email address already exists." });
      if (fe.reason === "EMAIL_TAKEN") fe.fieldErrors.email = "This email address is already registered.";
      setError(fe);
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <FormMessage tone="danger" title="We couldn't create your account" focusKey={attempt}>
          {error.message}
          {error.reason === "EMAIL_TAKEN" ? (
            <>
              {" "}
              <Link href="/login" className="font-medium text-glacier-700 underline underline-offset-2">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/forgot-password" className="font-medium text-glacier-700 underline underline-offset-2">
                reset your password
              </Link>
              .
            </>
          ) : null}
        </FormMessage>
      ) : null}
      <Field label="Full name" name="name" autoComplete="name" required maxLength={100} error={error?.fieldErrors.name} />
      <Field label="Email address" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} error={error?.fieldErrors.email} />
      <Field
        label="Institution or organisation"
        name="affiliation"
        autoComplete="organization"
        optional
        maxLength={200}
        error={error?.fieldErrors.affiliation}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={128}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={error?.fieldErrors.password}
      />
      <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" required error={error?.fieldErrors.confirm} />
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
