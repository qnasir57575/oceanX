import { beforeAll, describe, expect, it } from "vitest";
import { callRoute, cookieFrom, DEMO_PASSWORD, expectContract, expectError, loginAs, seed } from "./helpers";
import { resetRateLimits } from "@/server/http/rate-limit";

beforeAll(seed);

describe("getHealth", () => {
  it("returns ok with database check", async () => {
    const body = expectContract("getHealth", await callRoute("getHealth"));
    expect(body).toMatchObject({ data: { status: "ok", checks: { database: "ok" } } });
  });
});

describe("register", () => {
  it("creates a MEMBER, sets an httpOnly session cookie and never returns a token", async () => {
    const res = await callRoute("register", {
      body: { name: "Test Member", email: "New.Member@Example.org", password: "long-enough-password" },
      headers: { Origin: "http://localhost:3000" },
    });
    const body = expectContract("register", res) as { data: { user: { email: string; role: string } } };
    expect(body.data.user).toMatchObject({ email: "new.member@example.org", role: "MEMBER" });
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^oceanx_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(JSON.stringify(res.body)).not.toMatch(/token|passwordHash/i);
  });

  it("409 when the email is taken", async () => {
    const err = expectError(
      "register",
      await callRoute("register", { body: { name: "Dup", email: "member@demo.oceanx.local", password: "long-enough-password" } }),
      409,
    );
    expect(err.details?.reason).toBe("EMAIL_TAKEN");
  });

  it("422 with fieldErrors for invalid input", async () => {
    const err = expectError("register", await callRoute("register", { body: { name: "X", email: "not-an-email", password: "short" } }), 422);
    expect(Object.keys(err.details?.fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("400 for malformed JSON", async () => {
    expectError("register", await callRoute("register", { rawBody: "{not json" }), 400);
  });

  it("403 for a cross-origin request", async () => {
    const err = expectError(
      "register",
      await callRoute("register", {
        body: { name: "Evil", email: "evil@example.org", password: "long-enough-password" },
        headers: { Origin: "https://evil.example" },
      }),
      403,
    );
    expect(err.details?.reason).toBe("ORIGIN_NOT_ALLOWED");
  });
});

describe("login / session / logout", () => {
  it("login sets a cookie that getSession recognises; logout revokes it", async () => {
    const login = await callRoute("login", { body: { email: "EDITOR@demo.oceanx.local", password: DEMO_PASSWORD } });
    const body = expectContract("login", login) as { data: { user: { role: string } } };
    expect(body.data.user.role).toBe("EDITOR");
    const cookie = cookieFrom(login);

    const session = expectContract("getSession", await callRoute("getSession", { cookie })) as { data: { user: { role: string } | null } };
    expect(session.data.user?.role).toBe("EDITOR");

    const logout = await callRoute("logout", { cookie });
    expectContract("logout", logout);
    expect(logout.headers.get("set-cookie")).toMatch(/Max-Age=0/);

    const after = expectContract("getSession", await callRoute("getSession", { cookie })) as { data: { user: unknown } };
    expect(after.data.user).toBeNull();
  });

  it("getSession returns user:null when logged out (never 401)", async () => {
    const body = expectContract("getSession", await callRoute("getSession")) as { data: { user: unknown; expiresAt: unknown } };
    expect(body.data).toEqual({ user: null, expiresAt: null });
  });

  it("logout is idempotent without a session", async () => {
    expectContract("logout", await callRoute("logout"));
  });

  it("401 with a generic message for a wrong password or unknown email", async () => {
    const a = expectError("login", await callRoute("login", { body: { email: "member@demo.oceanx.local", password: "wrong-password" } }), 401);
    const b = expectError("login", await callRoute("login", { body: { email: "nobody@demo.oceanx.local", password: "wrong-password" } }), 401);
    expect(a.message).toBe(b.message);
  });

  it("422 for invalid body", async () => {
    expectError("login", await callRoute("login", { body: { email: "x" } }), 422);
  });

  it("429 after too many attempts from one IP", async () => {
    resetRateLimits();
    const headers = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 10; i++) {
      await callRoute("login", { body: { email: "member@demo.oceanx.local", password: "wrong-password" }, headers });
    }
    const res = await callRoute("login", { body: { email: "member@demo.oceanx.local", password: "wrong-password" }, headers });
    const err = expectError("login", res, 429);
    expect(err.details?.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get("retry-after")).toBe(String(err.details?.retryAfterSeconds));
    resetRateLimits();
  });
});

describe("changePassword", () => {
  it("401 when logged out", async () => {
    expectError("changePassword", await callRoute("changePassword", { body: { currentPassword: "x", newPassword: "another-long-pass" } }), 401);
  });

  it("401 INVALID_CURRENT_PASSWORD for a wrong current password", async () => {
    const cookie = await loginAs("researcher");
    const err = expectError(
      "changePassword",
      await callRoute("changePassword", { cookie, body: { currentPassword: "wrong-password", newPassword: "another-long-pass" } }),
      401,
    );
    expect(err.details?.reason).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("changes the password, keeps the current session and revokes others", async () => {
    const current = await loginAs("researcher");
    const other = await loginAs("researcher");
    expectContract(
      "changePassword",
      await callRoute("changePassword", { cookie: current, body: { currentPassword: DEMO_PASSWORD, newPassword: "a-brand-new-password" } }),
    );
    const s1 = expectContract("getSession", await callRoute("getSession", { cookie: current })) as { data: { user: unknown } };
    const s2 = expectContract("getSession", await callRoute("getSession", { cookie: other })) as { data: { user: unknown } };
    expect(s1.data.user).not.toBeNull();
    expect(s2.data.user).toBeNull();
    expectContract("login", await callRoute("login", { body: { email: "researcher@demo.oceanx.local", password: "a-brand-new-password" } }));
  });
});

describe("updateMyProfile", () => {
  it("401 when logged out", async () => {
    expectError("updateMyProfile", await callRoute("updateMyProfile", { body: { bio: "x" } }), 401);
  });

  it("updates own profile", async () => {
    const cookie = await loginAs("member");
    const body = expectContract(
      "updateMyProfile",
      await callRoute("updateMyProfile", { cookie, body: { affiliation: "Demo Institute of Polar Studies", bio: "Interested in sea ice." } }),
    ) as { data: { affiliation: string; bio: string } };
    expect(body.data).toMatchObject({ affiliation: "Demo Institute of Polar Studies", bio: "Interested in sea ice." });
  });

  it("422 for an empty update", async () => {
    const cookie = await loginAs("member");
    expectError("updateMyProfile", await callRoute("updateMyProfile", { cookie, body: {} }), 422);
  });
});
