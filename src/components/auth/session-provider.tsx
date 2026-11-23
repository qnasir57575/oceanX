"use client";

/**
 * Client-side session state for the header user menu and account pages.
 *
 * - Source of truth is the httpOnly cookie; we only keep the `User` returned
 *   by `getSession()` / `login()` / `register()` in React state (never in
 *   localStorage/sessionStorage).
 * - Fetching in the browser works identically against the mock API and the
 *   live backend, and keeps the layout shell static (no cookies() in it).
 */
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { getSession } from "@/lib/api/auth";
import type { User } from "@/types/api";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  /** Re-read the session from the API (e.g. after logout or a 401). */
  refresh: () => Promise<User | null>;
  /** Set the user directly from a login/register/profile-update response. */
  setUser: (user: User | null, options?: { loggedOut?: boolean }) => void;
  /** True right after the user chose to log out (pages shouldn't bounce them to /login). */
  loggedOut: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  const setUser = useCallback((next: User | null, options?: { loggedOut?: boolean }) => {
    setUserState(next);
    setStatus(next ? "authenticated" : "unauthenticated");
    setLoggedOut(Boolean(options?.loggedOut) && !next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await getSession();
      setUser(data.user);
      return data.user;
    } catch {
      setUserState(null);
      setStatus("error");
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    getSession({ signal: controller.signal })
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) {
          setUserState(null);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [setUser]);

  const value = useMemo(() => ({ status, user, refresh, setUser, loggedOut }), [status, user, refresh, setUser, loggedOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
