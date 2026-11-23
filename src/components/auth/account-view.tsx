"use client";

/**
 * My Account. Reads the session in the browser (works with the mock API and
 * the live backend). Logged-out visitors are sent to /login?next=/account.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, updateMyProfile } from "@/lib/api/auth";
import { isApiRequestError } from "@/lib/api-client";
import { PASSWORD_MIN_LENGTH } from "@/contracts/schemas/auth";
import type { UpdateProfileRequest, User } from "@/types/api";
import { useSession } from "@/components/auth/session-provider";
import { useLogout } from "@/components/layout/user-menu";
import { Field, FormMessage, PasswordField, SubmitButton, TextAreaField } from "@/components/forms/fields";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { Skeleton, LoadingRegion } from "@/components/ui/skeleton";
import { DateTime } from "@/components/ui/date-time";
import { Icon } from "@/components/icons";
import { loginHref } from "@/lib/ui/safe-redirect";
import { toFormError, type FormError } from "@/lib/ui/form-errors";
import { label, ROLE_LABELS } from "@/lib/format/labels";

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${title}-title`.replace(/\s+/g, "-").toLowerCase()} className="rounded-lg border border-line bg-surface p-6">
      <h2 id={`${title}-title`.replace(/\s+/g, "-").toLowerCase()} className="text-xl font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** On 401 the session has expired: clear it so the page redirects to login. */
function useSessionExpiryHandler() {
  const { setUser } = useSession();
  return (err: unknown) => {
    if (isApiRequestError(err) && err.isUnauthenticated && err.details?.reason !== "INVALID_CURRENT_PASSWORD") {
      setUser(null);
      return true;
    }
    return false;
  };
}

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useSession();
  const onExpired = useSessionExpiryHandler();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [saved, setSaved] = useState<number>(0);
  const [attempt, setAttempt] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const affiliation = String(fd.get("affiliation") ?? "").trim();
    const bio = String(fd.get("bio") ?? "").trim();
    setAttempt((a) => a + 1);
    setSaved(0);

    if (name.length < 2) {
      setError({ message: "Please correct the highlighted field.", fieldErrors: { name: "Enter your name (at least 2 characters)." }, reason: null, code: "VALIDATION_ERROR" });
      return;
    }
    const changes: UpdateProfileRequest = {};
    if (name !== user.name) changes.name = name;
    if (affiliation !== (user.affiliation ?? "")) changes.affiliation = affiliation || null;
    if (bio !== (user.bio ?? "")) changes.bio = bio || null;
    if (Object.keys(changes).length === 0) {
      setError(null);
      setSaved(-1);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { data } = await updateMyProfile(changes);
      setUser(data);
      setSaved(Date.now());
    } catch (err) {
      if (!onExpired(err)) setError(toFormError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <FormMessage tone="danger" title="Your changes weren't saved" focusKey={attempt}>
          {error.message}
        </FormMessage>
      ) : saved > 0 ? (
        <FormMessage tone="success" title="Profile updated" focusKey={saved} />
      ) : saved === -1 ? (
        <FormMessage tone="info" focusKey={attempt}>
          There were no changes to save.
        </FormMessage>
      ) : null}
      <Field label="Full name" name="name" autoComplete="name" defaultValue={user.name} required maxLength={100} error={error?.fieldErrors.name} />
      <Field
        label="Institution or organisation"
        name="affiliation"
        autoComplete="organization"
        defaultValue={user.affiliation ?? ""}
        optional
        maxLength={200}
        error={error?.fieldErrors.affiliation}
      />
      <TextAreaField label="About you" name="bio" defaultValue={user.bio ?? ""} optional maxLength={2000} rows={4} error={error?.fieldErrors.bio} hint="Up to 2,000 characters." />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

function ChangePasswordForm() {
  const onExpired = useSessionExpiryHandler();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [done, setDone] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const fieldErrors: Record<string, string> = {};
    if (!currentPassword) fieldErrors.currentPassword = "Enter your current password.";
    if (newPassword.length < PASSWORD_MIN_LENGTH) fieldErrors.newPassword = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    else if (confirm !== newPassword) fieldErrors.confirm = "The passwords don't match.";
    setAttempt((a) => a + 1);
    setDone(0);
    if (Object.keys(fieldErrors).length) {
      setError({ message: "Please correct the highlighted fields.", fieldErrors, reason: null, code: "VALIDATION_ERROR" });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setDone(Date.now());
      setFormKey((k) => k + 1); // clear the fields
    } catch (err) {
      if (onExpired(err)) return;
      const fe = toFormError(err, { "reason:INVALID_CURRENT_PASSWORD": "Your current password is incorrect." });
      if (fe.reason === "INVALID_CURRENT_PASSWORD") fe.fieldErrors.currentPassword = "This password is incorrect.";
      setError(fe);
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={formKey} noValidate onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <FormMessage tone="danger" title="Your password wasn't changed" focusKey={attempt}>
          {error.message}
        </FormMessage>
      ) : done ? (
        <FormMessage tone="success" title="Password changed" focusKey={done} />
      ) : null}
      <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" required error={error?.fieldErrors.currentPassword} />
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
      <SubmitButton pending={pending} pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}

function AccountSkeleton() {
  return (
    <LoadingRegion label="Loading your account">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-lg border border-line bg-surface p-6">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <div className="space-y-3 rounded-lg border border-line bg-surface p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AccountView({ welcome = false }: { welcome?: boolean }) {
  const router = useRouter();
  const { status, user, refresh, loggedOut } = useSession();
  const { logout, pending: loggingOut } = useLogout();

  useEffect(() => {
    if (status === "unauthenticated" && !loggedOut) router.replace(loginHref("/account"));
  }, [status, loggedOut, router]);

  if (status === "loading") return <AccountSkeleton />;
  if (status === "error") {
    return (
      <ErrorState
        title="We couldn't load your account"
        message="Please try again in a moment."
        action={
          <Button variant="secondary" onClick={() => void refresh()}>
            <Icon name="refresh" size={18} />
            Try again
          </Button>
        }
      />
    );
  }
  if (!user) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <p className="text-ink" role="status">
          {loggedOut ? "You have been logged out." : "Please log in to view your account."}
        </p>
        <ButtonLink href={loginHref("/account")} className="mt-4">
          Log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {welcome ? (
        <FormMessage tone="success" title={`Welcome, ${user.name}!`}>
          Your account is ready. You can now download registered-access files.
        </FormMessage>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Profile" description="Your name and affiliation may appear on content you contribute.">
            <ProfileForm user={user} />
          </Panel>
          <Panel title="Password">
            <ChangePasswordForm />
          </Panel>
        </div>
        <aside className="space-y-6">
          <Panel title="Account">
            <dl className="space-y-4 text-[0.9375rem]">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Email</dt>
                <dd className="break-all text-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Role</dt>
                <dd className="text-ink">{label(ROLE_LABELS, user.role)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Member since</dt>
                <dd className="text-ink">
                  <DateTime value={user.createdAt} style="long" />
                </dd>
              </div>
              {user.lastLoginAt ? (
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Last login</dt>
                  <dd className="text-ink">
                    <DateTime value={user.lastLoginAt} style="dateTime" />
                  </dd>
                </div>
              ) : null}
            </dl>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => void logout()} disabled={loggingOut}>
              <Icon name="logout" size={18} />
              {loggingOut ? "Logging out…" : "Log out"}
            </Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
