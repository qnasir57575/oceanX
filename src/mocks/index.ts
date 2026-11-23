/**
 * Mock API controls (development only).
 *
 * Enable: NEXT_PUBLIC_USE_MOCK_API=true in .env.local. No component changes are
 * needed — every function in src/lib/api/* is answered by src/mocks/transport.ts.
 *
 *   import { setMockScenario, setMockSessionUser, DEMO_ACCOUNTS } from "@/mocks";
 *   setMockScenario("empty");          // normal | empty | error | unauthenticated | slow
 *   setMockSessionUser("admin");       // admin | editor | researcher | member | null
 */
export { setMockScenario, getMockScenario, setMockSessionUser, resetMockStore, MOCK_SCENARIOS, type MockScenario } from "./store";
export { DEMO_NOTICE, DEMO_PASSWORD } from "./data/fixtures";

/** Demo logins accepted by the mock API AND by the seeded development database. */
export const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@demo.oceanx.local", password: "demo-password-123" },
  { role: "EDITOR", email: "editor@demo.oceanx.local", password: "demo-password-123" },
  { role: "RESEARCHER", email: "researcher@demo.oceanx.local", password: "demo-password-123" },
  { role: "MEMBER", email: "member@demo.oceanx.local", password: "demo-password-123" },
] as const;
