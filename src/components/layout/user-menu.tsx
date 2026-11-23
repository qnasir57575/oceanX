"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { useSession } from "@/components/auth/session-provider";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import { label, ROLE_LABELS } from "@/lib/format/labels";

/** Shared log-out action: clears the cookie, updates state, re-renders server content. */
export function useLogout() {
  const router = useRouter();
  const { setUser, refresh } = useSession();
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    try {
      await logout();
      setUser(null);
    } catch {
      await refresh();
    } finally {
      setPending(false);
      router.push("/");
      router.refresh();
    }
  }
  return { logout: run, pending };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Header account control (desktop). */
export function UserMenu() {
  const { status, user } = useSession();
  const { logout: doLogout, pending } = useLogout();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <Skeleton className="h-9 w-20 bg-white/15" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-[0.9375rem] font-medium whitespace-nowrap text-polar-200 hover:bg-white/10 hover:text-white"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-white px-3 py-2 text-[0.9375rem] font-medium text-polar-900 hover:bg-polar-50"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-polar-200 hover:bg-white/10 hover:text-white"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-8 items-center justify-center rounded-full bg-glacier-300 text-sm font-semibold text-polar-950"
        >
          {initials(user.name) || <Icon name="user" size={16} />}
        </span>
        <span className="max-w-32 truncate text-[0.9375rem] font-medium">{user.name}</span>
        <span className="sr-only">: account menu</span>
        <Icon name="chevron-down" size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-line bg-white py-2 text-ink shadow-lg"
      >
        <div className="border-b border-line px-4 pt-1 pb-3">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <p className="mt-1 text-xs text-ink-muted">{label(ROLE_LABELS, user.role)}</p>
        </div>
        <ul className="pt-1">
          <li>
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-polar-50">
              <Icon name="user" size={16} />
              My account
            </Link>
          </li>
          <li>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                void doLogout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-polar-50 disabled:opacity-60"
            >
              <Icon name="logout" size={16} />
              {pending ? "Logging out…" : "Log out"}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
