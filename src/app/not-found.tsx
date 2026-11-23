import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { SearchBox } from "@/components/layout/search-box";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-polar-50 text-polar-800">
        <Icon name="compass" size={28} />
      </span>
      <p className="mt-6 text-sm font-semibold tracking-wide text-glacier-700 uppercase">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-4 max-w-lg text-ink-muted">
        The page may have moved, or the record may not be published. Try searching, or go back to the home page.
      </p>
      <SearchBox className="mt-8 w-full max-w-md text-left" />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="primary">
          Go to home page
        </ButtonLink>
        <ButtonLink href="/topics" variant="secondary">
          Browse research topics
        </ButtonLink>
      </div>
    </Container>
  );
}
