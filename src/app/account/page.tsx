import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { AccountView } from "@/components/auth/account-view";
import { getParam } from "@/lib/ui/query";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <>
      <PageHeader title="My account" breadcrumbs={[{ href: "/", label: "Home" }, { label: "My account" }]} />
      <Container className="py-10">
        <Suspense fallback={<AccountView />}>
          <AccountWithWelcome searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function AccountWithWelcome({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const welcome = getParam(await searchParams, "welcome") === "1";
  return <AccountView welcome={welcome} />;
}
