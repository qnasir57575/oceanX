import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { MainNav, MainNavFallback } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBox } from "@/components/layout/search-box";
import { UserMenu } from "@/components/layout/user-menu";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/ui/site";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md text-white">
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M5 19.5 11.5 9l4 5 3-3.5L27 19.5Z" fill="var(--color-glacier-300)" />
        <path d="M4 22.5c3 1.6 6 1.6 8 0s5-1.6 8 0 5 1.6 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="leading-none">
        <span className="block font-serif text-xl font-semibold tracking-tight">{SITE_NAME}</span>
        <span className="hidden text-[0.6875rem] tracking-wide text-polar-200 uppercase 2xl:block">{SITE_TAGLINE}</span>
      </span>
      <span className="sr-only"> — home</span>
    </Link>
  );
}

/**
 * Global header. Static shell: the active-nav state (usePathname) sits in
 * Suspense, and the session-dependent user menu is a client component.
 */
export function SiteHeader() {
  return (
    <header className="on-dark sticky top-0 z-40 bg-polar-900 text-white shadow-[0_1px_0_rgb(255_255_255/0.08)]">
      <Container className="relative flex h-16 items-center gap-4">
        <Logo />
        <nav aria-label="Main" className="ml-2 hidden xl:block">
          <Suspense fallback={<MainNavFallback />}>
            <MainNav />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-72 md:block xl:w-60 2xl:w-80" formLabel="Site search" />
          <div className="hidden xl:block">
            <UserMenu />
          </div>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
