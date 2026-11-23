import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SearchBox } from "@/components/layout/search-box";
import { Icon, type IconName } from "@/components/icons";
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

      <Container className="py-14">
        <h2 className="sr-only">Sections</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex h-full gap-4 rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md"
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
    </>
  );
}
