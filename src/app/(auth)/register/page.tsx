import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getParam } from "@/lib/ui/query";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <AuthCard
      title="Create an account"
      description="A free account lets you download registered-access datasets and publications."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-glacier-700 underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <RegisterFormWithNext searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function RegisterFormWithNext({ searchParams }: { searchParams: PageProps<"/register">["searchParams"] }) {
  const next = getParam(await searchParams, "next") ?? null;
  return <RegisterForm next={next} />;
}
