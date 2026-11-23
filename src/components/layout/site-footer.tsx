import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FOOTER_NAV, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/ui/site";
import { MOCK_API_ENABLED } from "@/lib/api-client";

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-polar-950 text-polar-200">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <p className="font-serif text-xl font-semibold text-white">{SITE_NAME}</p>
          <p className="mt-1 text-sm tracking-wide uppercase">{SITE_TAGLINE}</p>
          <p className="mt-4 text-sm leading-relaxed">{SITE_DESCRIPTION}</p>
        </div>
        {FOOTER_NAV.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-sans text-sm font-semibold text-white">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="underline-offset-2 hover:text-white hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>Developed for Smart India Hackathon problem statement SIH26063.</p>
          {MOCK_API_ENABLED ? (
            <p className="rounded bg-warning-bg px-2 py-1 font-medium text-warning">
              Development mode: serving demonstration data from the mock API
              {process.env.NEXT_PUBLIC_MOCK_SCENARIO && process.env.NEXT_PUBLIC_MOCK_SCENARIO !== "normal"
                ? ` (scenario: ${process.env.NEXT_PUBLIC_MOCK_SCENARIO})`
                : ""}
              .
            </p>
          ) : null}
        </Container>
      </div>
    </footer>
  );
}
