"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PRIMARY_NAV } from "@/lib/ui/site";
import { Icon } from "@/components/icons";
import { SearchBox } from "@/components/layout/search-box";
import { useSession } from "@/components/auth/session-provider";
import { useLogout } from "@/components/layout/user-menu";

/** Small-screen menu: disclosure panel with search, navigation and account links. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user } = useSession();
  const { logout, pending } = useLogout();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = "block rounded-md px-3 py-3 text-base font-medium text-polar-100 hover:bg-white/10 hover:text-white";

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center rounded-md text-white hover:bg-white/10"
      >
        <Icon name={open ? "close" : "menu"} size={24} />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-polar-950 shadow-xl"
      >
        <div className="space-y-6 px-4 py-5 sm:px-6">
          <SearchBox onNavigate={close} className="md:hidden" />
          <nav aria-label="Main">
            <ul className="space-y-1">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/topics" onClick={close} className={linkClass}>
                  Research topics
                </Link>
              </li>
              <li>
                <Link href="/about" onClick={close} className={linkClass}>
                  About
                </Link>
              </li>
            </ul>
          </nav>
          <div className="border-t border-white/10 pt-5">
            {user ? (
              <ul className="space-y-1">
                <li className="px-3 pb-2 text-sm text-polar-200">
                  Signed in as <span className="font-medium text-white">{user.name}</span>
                </li>
                <li>
                  <Link href="/account" onClick={close} className={linkClass}>
                    My account
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      close();
                      void logout();
                    }}
                    className={`${linkClass} w-full text-left`}
                  >
                    {pending ? "Logging out…" : "Log out"}
                  </button>
                </li>
              </ul>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex-1 rounded-md border border-white/30 px-4 py-3 text-center font-medium text-white hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="flex-1 rounded-md bg-white px-4 py-3 text-center font-medium text-polar-900 hover:bg-polar-50"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
