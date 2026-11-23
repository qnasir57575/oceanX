/** Site-wide navigation and identity. UI copy only — no API data here. */

export const SITE_NAME = "OceanX";
export const SITE_TAGLINE = "Polar Science Outreach Portal";
export const SITE_DESCRIPTION =
  "A public portal for polar expeditions, research publications, scientific datasets, media and outreach material.";

export interface NavItem {
  href: string;
  label: string;
}

/** Primary navigation (header). */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/expeditions", label: "Expeditions" },
  { href: "/research", label: "Research" },
  { href: "/datasets", label: "Data" },
  { href: "/gallery", label: "Gallery" },
  { href: "/news", label: "News & Events" },
  { href: "/learn", label: "Learn" },
];

/** Footer navigation groups. */
export const FOOTER_NAV: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Explore",
    items: [
      { href: "/expeditions", label: "Expeditions" },
      { href: "/research", label: "Research publications" },
      { href: "/datasets", label: "Data repository" },
      { href: "/gallery", label: "Media gallery" },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/topics", label: "Research topics" },
      { href: "/news", label: "News & events" },
      { href: "/learn", label: "Learn & outreach" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Portal",
    items: [
      { href: "/about", label: "About & statistics" },
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create an account" },
    ],
  },
];

/** True when `pathname` is `href` or inside it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
