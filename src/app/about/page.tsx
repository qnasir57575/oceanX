import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPortalStats } from "@/lib/api/home";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { Skeleton, LoadingRegion } from "@/components/ui/skeleton";
import { DateTime } from "@/components/ui/date-time";
import { RegionBars, StatTiles, StatTilesSkeleton } from "@/components/content/stats";
import { Icon, type IconName } from "@/components/icons";

export const metadata: Metadata = {
  title: "About & statistics",
  description: "What the portal offers, how content is reviewed and published, and live counts of published records.",
};

const PILLARS: Array<{ title: string; text: string; icon: IconName }> = [
  {
    title: "Knowledge repository",
    text: "Expeditions, research publications and scientific datasets in one searchable place, with citations and documented access conditions.",
    icon: "database",
  },
  {
    title: "Media dissemination",
    text: "Photographs, video and audio from the field, with credits and licences shown alongside every item.",
    icon: "image",
  },
  {
    title: "Outreach",
    text: "News, events and plain-language learning material for students, educators and the public.",
    icon: "compass",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the portal"
        description="An integrated portal for polar science outreach, a knowledge repository and media dissemination."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "About" }]}
      />

      <Container className="space-y-16 py-12">
        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="mb-2 text-2xl font-semibold text-ink sm:text-3xl">
            Portal statistics
          </h2>
          <p className="mb-6 text-ink-muted">Counts of currently published records.</p>
          <SectionBoundary subject="portal statistics">
            <Suspense fallback={<StatsSkeleton />}>
              <PortalStatistics />
            </Suspense>
          </SectionBoundary>
        </section>

        <section aria-labelledby="offer-title">
          <h2 id="offer-title" className="mb-6 text-2xl font-semibold text-ink sm:text-3xl">
            What you can find here
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.title} className="rounded-lg border border-line bg-surface p-6">
                <span className="inline-flex size-11 items-center justify-center rounded-md bg-polar-50 text-polar-800">
                  <Icon name={p.icon} size={22} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-ink-muted">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="publishing-title" className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="publishing-title" className="mb-4 text-2xl font-semibold text-ink sm:text-3xl">
              How content is published
            </h2>
            <div className="prose">
              <p>
                Researchers submit records as drafts. Editors review each submission and either publish it, request changes or
                decline it. Only published records appear on the public site.
              </p>
              <p>
                Some plain-language summaries and learning material are drafted with AI assistance from published source records.
                Every AI-assisted text is reviewed by portal staff before it is published, is clearly labelled, and links back to its
                sources.
              </p>
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-ink sm:text-3xl">Using the data</h2>
            <div className="prose">
              <p>
                Each dataset and publication shows its access level and licence. Open files can be downloaded by anyone; some files
                need a free account; restricted files list a data custodian to contact.
              </p>
              <p>
                Please cite records using the citation provided on each record page. <Link href="/datasets">Browse the data repository</Link>{" "}
                or <Link href="/register">create an account</Link>.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}

async function PortalStatistics() {
  const { data: stats } = await getPortalStats();
  return (
    <div className="space-y-6">
      <StatTiles stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RegionBars byRegion={stats.byRegion} />
        <div className="flex items-center rounded-lg border border-line bg-surface p-5 text-sm text-ink-muted">
          <Icon name="refresh" size={18} className="mr-2 shrink-0" />
          {stats.lastUpdatedAt ? (
            <span>
              Last content update: <DateTime value={stats.lastUpdatedAt} style="long" className="font-medium text-ink" />
            </span>
          ) : (
            <span>No content has been published yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <StatTilesSkeleton />
      <LoadingRegion label="Loading regional breakdown">
        <div className="space-y-3 rounded-lg border border-line bg-surface p-5 lg:w-1/2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </LoadingRegion>
    </div>
  );
}
