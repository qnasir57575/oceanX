"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/auth";
import { useSession } from "@/components/auth/session-provider";
import { useLogout } from "@/components/layout/user-menu";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/forms/fields";
import { ButtonLink, Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/auth/auth-card";
import { safeNextPath } from "@/lib/ui/safe-redirect";
import { toFormError, type FormError } from "@/lib/ui/form-errors";

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { status, user, setUser } = useSession();
  const { logout, pending: loggingOut } = useLogout();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const destination = safeNextPath(next);

  if (status === "loading") return <FormSkeleton />;

  if (user && !pending) {
    return (
      <div className="space-y-5">
        <FormMessage tone="info" title={`You're logged in as ${user.name}`}>
          {user.email}
        </FormMessage>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={destination}>{next ? "Continue" : "Go to my account"}</ButtonLink>
          <Button variant="secondary" onClick={() => void logout()} disabled={loggingOut}>
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Enter a valid email address, like name@example.org.";
    if (!password) fieldErrors.password = "Enter your password.";
    setAttempt((a) => a + 1);
    if (Object.keys(fieldErrors).length) {
      setError({ message: "Please correct the highlighted fields.", fieldErrors, reason: null, code: "VALIDATION_ERROR" });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { data } = await login({ email, password });
      setUser(data.user);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        toFormError(err, {
          UNAUTHENTICATED: "The email or password is incorrect.",
          "reason:ACCOUNT_SUSPENDED": "This account is suspended. Contact the portal team for help.",
        }),
      );
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {next && !error ? <FormMessage tone="info">Please log in to continue.</FormMessage> : null}
      {error ? (
        <FormMessage tone="danger" title="We couldn't log you in" focusKey={attempt}>
          {error.message}
        </FormMessage>
      ) : null}
      <Field label="Email address" name="email" type="email" autoComplete="email" inputMode="email" required error={error?.fieldErrors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" required error={error?.fieldErrors.password} />
      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/forgot-password" className="text-sm font-medium text-glacier-700 underline-offset-2 hover:underline">
          Forgot your password?
        </Link>
        <SubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </div>
    </form>
  );
}
