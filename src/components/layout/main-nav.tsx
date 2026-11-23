"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, isActivePath } from "@/lib/ui/site";
import { cn } from "@/lib/ui/cn";

const linkClass =
  "relative rounded-md px-3 py-2 whitespace-nowrap text-[0.9375rem] font-medium text-polar-200 transition-colors hover:bg-white/10 hover:text-white";
const activeClass = "text-white after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-glacier-300";

/** Desktop primary navigation with active-section highlighting. */
export function MainNav() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

/** Same links without active state — Suspense fallback while the pathname resolves. */
export function MainNavFallback() {
  return <NavLinks pathname={null} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {PRIMARY_NAV.map((item) => {
        const active = pathname ? isActivePath(pathname, item.href) : false;
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(linkClass, active && activeClass)}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
