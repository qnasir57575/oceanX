import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getParam } from "@/lib/ui/query";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="Log in"
      description="Log in to download registered-access data and manage your profile."
      footer={
        <>
          New to the portal?{" "}
          <Link href="/register" className="font-medium text-glacier-700 underline underline-offset-2">
            Create a free account
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const next = getParam(await searchParams, "next") ?? null;
  return <LoginForm next={next} />;
}
