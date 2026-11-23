/**
 * In-memory state for the mock API. Mutations (create/update/delete) persist
 * until the page reloads (browser) or the dev server restarts (server).
 */
import type { User } from "@/types/api";
import { createFixtures, type Fixtures } from "./data/fixtures";

export type MockScenario = "normal" | "empty" | "error" | "unauthenticated" | "slow";
export const MOCK_SCENARIOS: readonly MockScenario[] = ["normal", "empty", "error", "unauthenticated", "slow"];

let fixedNow: Date | null = null;
let state: Fixtures | null = null;
let scenarioOverride: MockScenario | null = null;
let sessionUserId: string | null | undefined; // undefined = not initialised yet

const SESSION_STORAGE_KEY = "oceanx-mock-session-user";
const DEFAULT_USERS: Record<string, string> = {
  admin: "usr_demo_admin",
  editor: "usr_demo_editor",
  researcher: "usr_demo_researcher",
  member: "usr_demo_member",
};

export function mockNow(): Date {
  return fixedNow ? new Date(fixedNow) : new Date();
}

/** Pin the mock clock (tests, docs generation). Resets data. */
export function setMockClock(date: Date | null): void {
  fixedNow = date;
  state = null;
}

export function getStore(): Fixtures {
  if (!state) state = createFixtures(mockNow());
  return state;
}

/** Restore fixtures and the default session. */
export function resetMockStore(): void {
  state = null;
  sessionUserId = undefined;
  scenarioOverride = null;
}

// ─── Scenario ───────────────────────────────────────────────────────────────

export function getMockScenario(): MockScenario {
  if (scenarioOverride) return scenarioOverride;
  const env = process.env.NEXT_PUBLIC_MOCK_SCENARIO as MockScenario | undefined;
  return env && MOCK_SCENARIOS.includes(env) ? env : "normal";
}

/** Switch scenario at runtime, e.g. from a dev toolbar: setMockScenario("empty"). `null` = back to env default. */
export function setMockScenario(scenario: MockScenario | null): void {
  scenarioOverride = scenario;
}

// ─── Session ────────────────────────────────────────────────────────────────

function readPersistedSession(): string | null | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const v = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return v === null ? undefined : v === "" ? null : v;
  } catch {
    return undefined;
  }
}

function persistSession(id: string | null) {
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(SESSION_STORAGE_KEY, id ?? "");
  } catch {
    /* storage unavailable */
  }
}

export function getMockSessionUser(): User | null {
  if (sessionUserId === undefined) {
    const persisted = readPersistedSession();
    const envDefault = process.env.NEXT_PUBLIC_MOCK_USER ? DEFAULT_USERS[process.env.NEXT_PUBLIC_MOCK_USER] ?? null : null;
    sessionUserId = persisted !== undefined ? persisted : envDefault;
  }
  if (getMockScenario() === "unauthenticated" || !sessionUserId) return null;
  return getStore().users.find((u) => u.id === sessionUserId) ?? null;
}

/** Log in/out in mock mode without going through the login form. */
export function setMockSessionUser(userIdOrRole: string | null): void {
  sessionUserId = userIdOrRole ? (DEFAULT_USERS[userIdOrRole] ?? userIdOrRole) : null;
  persistSession(sessionUserId);
}
