import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { getParam } from "@/lib/ui/query";

export const metadata: Metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <AuthCard
      title="Set a new password"
      description="Choose a new password for your account."
      footer={
        <Link href="/login" className="font-medium text-glacier-700 underline underline-offset-2">
          Back to log in
        </Link>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <ResetFormWithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetFormWithToken({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const token = getParam(await searchParams, "token") ?? null;
  return <ResetPasswordForm token={token} />;
}
