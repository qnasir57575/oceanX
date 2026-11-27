import Link from "next/link";
import { Suspense } from "react";
import { getHomePageData } from "@/lib/api/home";
import { Container } from "@/components/ui/container";
import { SearchBox } from "@/components/layout/search-box";
import { SectionHeading } from "@/components/layout/page-header";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { EmptyState } from "@/components/ui/states";
import { CardGridSkeleton, RowListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Icon, type IconName } from "@/components/icons";
import { StatTiles, StatTilesSkeleton } from "@/components/content/stats";
import { ExpeditionCard } from "@/components/content/expedition-card";
import { PublicationList } from "@/components/content/publication-item";
import { MediaTile } from "@/components/content/media-tile";
import { ActivityCard } from "@/components/content/activity-card";
import { OutreachCard } from "@/components/content/outreach-card";
import { SITE_DESCRIPTION } from "@/lib/ui/site";

const SECTIONS: Array<{ href: string; title: string; text: string; icon: IconName }> = [
  { href: "/expeditions", title: "Expeditions", text: "Field campaigns across polar and high-altitude regions.", icon: "ship" },
  { href: "/research", title: "Research publications", text: "Papers, reports and theses from the research community.", icon: "book" },
  { href: "/datasets", title: "Data repository", text: "Scientific datasets with documentation and downloads.", icon: "database" },
  { href: "/gallery", title: "Media gallery", text: "Photographs, video and audio from the field.", icon: "image" },
  { href: "/news", title: "News & events", text: "Announcements, workshops and outreach programmes.", icon: "calendar" },
  { href: "/learn", title: "Learn", text: "Plain-language explainers and learning material.", icon: "compass" },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-contours on-dark text-white" aria-labelledby="home-title">
        <Container className="py-16 sm:py-24">
          <p className="text-sm font-medium tracking-wide text-glacier-300 uppercase">Polar science, open to everyone</p>
          <h1 id="home-title" className="mt-3 max-w-3xl text-4xl leading-tight font-semibold sm:text-5xl">
            Explore polar research, data and stories from the field
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-polar-200">{SITE_DESCRIPTION}</p>
          <SearchBox size="lg" className="mt-8 max-w-2xl" label="Search expeditions, publications, datasets and more" />
        </Container>
      </section>

      <SectionBoundary subject="the latest content" className="mx-4 my-10 sm:mx-6 lg:mx-auto lg:max-w-5xl">
        <Suspense fallback={<HomeSectionsSkeleton />}>
          <HomeSections />
        </Suspense>
      </SectionBoundary>

      <section aria-labelledby="explore-title" className="border-t border-line bg-surface">
        <Container className="py-14">
          <h2 id="explore-title" className="mb-6 text-2xl font-semibold text-ink sm:text-3xl">
            Explore the portal
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex h-full gap-4 rounded-lg border border-line bg-snow p-5 transition-shadow hover:shadow-md"
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-polar-50 text-polar-800">
                    <Icon name={s.icon} size={22} />
                  </span>
                  <span>
                    <span className="block font-serif text-lg font-semibold text-ink group-hover:text-glacier-700">{s.title}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

async function HomeSections() {
  const { data } = await getHomePageData();
  const { stats, featuredExpeditions, latestPublications, featuredMedia, latestNews, upcomingEvents, featuredOutreach } = data;
  const hasContent =
    featuredExpeditions.length + latestPublications.length + featuredMedia.length + latestNews.length + upcomingEvents.length + featuredOutreach.length >
    0;

  return (
    <>
      <Container className="-mt-8 relative">
        <h2 className="sr-only">Portal at a glance</h2>
        <StatTiles stats={stats} className="shadow-sm" />
      </Container>

      {!hasContent ? (
        <Container className="py-14">
          <EmptyState
            icon="compass"
            title="Content is on its way"
            description="Nothing has been published yet. Check back soon for expeditions, research and stories from the field."
          />
        </Container>
      ) : null}

      {featuredExpeditions.length > 0 ? (
        <Container as="section" className="pt-14">
          <SectionHeading title="Featured expeditions" href="/expeditions" linkLabel="All expeditions" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredExpeditions.map((e, i) => (
              <li key={e.id}>
                <ExpeditionCard expedition={e} priority={i === 0} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {latestPublications.length > 0 || latestNews.length > 0 ? (
        <Container
          className={
            latestPublications.length > 0 && latestNews.length > 0
              ? "grid gap-12 pt-14 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
              : "pt-14"
          }
        >
          {latestPublications.length > 0 ? (
            <section>
              <SectionHeading title="Latest research" href="/research" linkLabel="All publications" />
              <PublicationList publications={latestPublications} compact />
            </section>
          ) : null}
          {latestNews.length > 0 ? (
            <section>
              <SectionHeading title="Latest news" href="/news" linkLabel="All news" />
              <ul className="space-y-4">
                {latestNews.map((a) => (
                  <li key={a.id}>
                    <ActivityCard activity={a} withImage={false} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Container>
      ) : null}

      {featuredMedia.length > 0 ? (
        <Container as="section" className="pt-14">
          <SectionHeading title="From the gallery" href="/gallery" linkLabel="Open the gallery" />
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featuredMedia.map((m) => (
              <li key={m.id}>
                <MediaTile media={m} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <Container as="section" className="pt-14">
          <SectionHeading title="Upcoming events" href="/news?upcoming=true" linkLabel="All upcoming events" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((a) => (
              <li key={a.id}>
                <ActivityCard activity={a} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {featuredOutreach.length > 0 ? (
        <Container as="section" className="pt-14">
          <SectionHeading title="Learn about polar science" href="/learn" linkLabel="All learning material" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredOutreach.map((o) => (
              <li key={o.id}>
                <OutreachCard item={o} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
      <div className="pb-14" />
    </>
  );
}

function HomeSectionsSkeleton() {
  return (
    <>
      <Container className="-mt-8 relative">
        <StatTilesSkeleton />
      </Container>
      <Container className="space-y-14 py-14">
        <div>
          <Skeleton className="mb-6 h-8 w-64" />
          <CardGridSkeleton count={3} label="Loading featured expeditions" />
        </div>
        <div>
          <Skeleton className="mb-6 h-8 w-48" />
          <RowListSkeleton count={4} label="Loading latest research" />
        </div>
      </Container>
    </>
  );
}
