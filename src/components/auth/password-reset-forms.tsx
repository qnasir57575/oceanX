"use client";

/**
 * Forgot / reset password. Both endpoints are PLANNED: they work against the
 * mock API, and against the live backend they currently return 404 — shown
 * as "not available yet" rather than a generic error.
 */
import Link from "next/link";
import { useState } from "react";
import { forgotPassword, resetPassword } from "@/lib/api/auth";
import { PASSWORD_MIN_LENGTH } from "@/contracts/schemas/auth";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/forms/fields";
import { ButtonLink } from "@/components/ui/button";
import { toFormError, type FormError } from "@/lib/ui/form-errors";

const NOT_AVAILABLE = "Password reset isn't available yet. Please contact the portal team for help with your account.";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (sentTo) {
    return (
      <div className="space-y-5">
        <FormMessage tone="success" title="Check your email">
          If an account exists for <strong>{sentTo}</strong>, we&apos;ve sent a link to reset your password. The link expires after a
          short time.
        </FormMessage>
        <p className="text-sm text-ink-muted">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button type="button" onClick={() => setSentTo(null)} className="font-medium text-glacier-700 underline underline-offset-2">
            try another email address
          </button>
          .
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setAttempt((a) => a + 1);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError({
        message: "Please correct the highlighted field.",
        fieldErrors: { email: "Enter a valid email address, like name@example.org." },
        reason: null,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await forgotPassword({ email });
      setSentTo(email);
    } catch (err) {
      setError(toFormError(err, { NOT_FOUND: NOT_AVAILABLE }));
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <FormMessage tone="danger" title="We couldn't send the reset link" focusKey={attempt}>
          {error.message}
        </FormMessage>
      ) : null}
      <Field label="Email address" name="email" type="email" autoComplete="email" inputMode="email" required error={error?.fieldErrors.email} />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!token) {
    return (
      <div className="space-y-5">
        <FormMessage tone="warning" title="This reset link is incomplete">
          Open the link from your email again, or request a new one.
        </FormMessage>
        <ButtonLink href="/forgot-password">Request a new link</ButtonLink>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <FormMessage tone="success" title="Your password has been reset">
          You can now log in with your new password.
        </FormMessage>
        <ButtonLink href="/login">Log in</ButtonLink>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const fieldErrors: Record<string, string> = {};
    if (newPassword.length < PASSWORD_MIN_LENGTH) fieldErrors.newPassword = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    else if (confirm !== newPassword) fieldErrors.confirm = "The passwords don't match.";
    setAttempt((a) => a + 1);
    if (Object.keys(fieldErrors).length) {
      setError({ message: "Please correct the highlighted fields.", fieldErrors, reason: null, code: "VALIDATION_ERROR" });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await resetPassword({ token: token as string, newPassword });
      setDone(true);
    } catch (err) {
      setError(
        toFormError(err, {
          NOT_FOUND: NOT_AVAILABLE,
          "reason:INVALID_TOKEN": "This reset link is invalid or has expired.",
          BAD_REQUEST: "This reset link is invalid or has expired.",
        }),
      );
    } finally {
      setPending(false);
    }
  }

  const tokenProblem = error && (error.reason === "INVALID_TOKEN" || error.code === "BAD_REQUEST" || error.fieldErrors.token);

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <FormMessage tone="danger" title="We couldn't reset your password" focusKey={attempt}>
          {error.fieldErrors.token && !error.reason ? "This reset link is invalid or has expired." : error.message}
          {tokenProblem ? (
            <>
              {" "}
              <Link href="/forgot-password" className="font-medium text-glacier-700 underline underline-offset-2">
                Request a new link
              </Link>
              .
            </>
          ) : null}
        </FormMessage>
      ) : null}
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={128}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={error?.fieldErrors.newPassword}
      />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" required error={error?.fieldErrors.confirm} />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
