"use client";

import Link from "next/link";
import { useSession } from "@/components/auth/session-provider";
import { loginHref } from "@/lib/ui/safe-redirect";

/** "Log in to download" link for REGISTERED files, shown only when logged out. */
export function AccessLoginHint() {
  const { status, user } = useSession();
  if (status === "loading" || user) return null;
  const next = typeof window !== "undefined" ? window.location.pathname : undefined;
  return (
    <Link href={loginHref(next)} className="text-sm font-medium text-glacier-700 underline underline-offset-2">
      Log in to download
    </Link>
  );
}
