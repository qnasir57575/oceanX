/**
 * Detects drift between the contract registry and everything that depends on it:
 * route handlers, endpoint status, contract tests, client functions, the route
 * map and the documentation. Generated-file freshness is checked separately by
 * `npm run api:check` (also run in CI).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_MODULES, type EndpointDefinition } from "@/contracts/endpoint";
import { endpointList, endpoints } from "@/contracts/registry";
import { ROUTES } from "@/lib/api/routes.generated";

const ROOT = path.resolve(import.meta.dirname, "../..");
const API_DIR = path.join(ROOT, "src/app/api/v1");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** `src/app/api/v1/expeditions/[id]/route.ts` → `/expeditions/{id}` */
function apiPathOf(file: string): string {
  const rel = path.relative(API_DIR, path.dirname(file));
  return `/${rel.split(path.sep).map((s) => s.replace(/^\[(\w+)\]$/, "{$1}")).join("/")}`;
}

const routeFiles = walk(API_DIR).filter((f) => f.endsWith("route.ts") && !f.includes("[...path]"));
const wired = routeFiles.flatMap((file) => {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/export const (GET|POST|PUT|PATCH|DELETE) = defineRoute\("(\w+)"/g)].map((m) => ({
    file: path.relative(ROOT, file),
    method: m[1]!,
    operationId: m[2]!,
    path: apiPathOf(file),
  }));
});
const plannedStubs = routeFiles.flatMap((file) =>
  [...readFileSync(file, "utf8").matchAll(/export const (GET|POST|PUT|PATCH|DELETE) = plannedRoute\("(\w+)"\)/g)].map((m) => ({
    file: path.relative(ROOT, file),
    method: m[1]!,
    operationId: m[2]!,
    path: apiPathOf(file),
  })),
);
const contractTestSource = walk(path.join(ROOT, "tests/contract"))
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

describe("registry integrity", () => {
  it("registry keys equal operationIds", () => {
    for (const [key, e] of Object.entries(endpoints)) expect(e.operationId).toBe(key);
  });

  it("method + path pairs are unique", () => {
    const keys = endpointList.map((e) => `${e.method} ${e.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every endpoint documents at least a 500 error or a specific failure", () => {
    for (const e of endpointList) expect(Object.keys(e.errors).length, e.operationId).toBeGreaterThan(0);
  });

  it("endpoints with path params and response schemas have examples (for docs and mocks)", () => {
    for (const e of endpointList) {
      if (e.request?.params) expect(e.example?.params, `${e.operationId} needs example.params`).toBeDefined();
      if (e.request?.body) expect(e.example?.body, `${e.operationId} needs example.body`).toBeDefined();
    }
  });
});

describe("route handlers ↔ registry", () => {
  it("every route handler is registered with the same method and path", () => {
    for (const w of wired) {
      const e = endpoints[w.operationId as keyof typeof endpoints];
      expect(e, `${w.file} wires unknown operationId "${w.operationId}"`).toBeDefined();
      expect(`${e.method} ${e.path}`, w.file).toBe(`${w.method} ${w.path}`);
    }
  });

  it("route files export nothing but defineRoute handlers (no unregistered endpoints)", () => {
    for (const file of routeFiles) {
      const src = readFileSync(file, "utf8");
      const exported = [...src.matchAll(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g)].length;
      const viaHelpers = [...src.matchAll(/export const (GET|POST|PUT|PATCH|DELETE) = (defineRoute|plannedRoute)\(/g)].length;
      expect(viaHelpers, `${path.relative(ROOT, file)} exports a handler without defineRoute/plannedRoute`).toBe(exported);
    }
  });

  it("IMPLEMENTED endpoints have a route handler; PLANNED endpoints do not", () => {
    const wiredOps = new Set(wired.map((w) => w.operationId));
    for (const e of endpointList) {
      if (e.status === "IMPLEMENTED" || e.status === "DEPRECATED") {
        expect(wiredOps.has(e.operationId), `${e.operationId} is ${e.status} but has no route handler`).toBe(true);
      }
      if (e.status === "PLANNED") {
        expect(wiredOps.has(e.operationId), `${e.operationId} has a route handler but is still marked PLANNED — update its status`).toBe(false);
      }
    }
  });

  it("plannedRoute stubs only point at non-implemented endpoints with matching method/path", () => {
    for (const p of plannedStubs) {
      const e: EndpointDefinition = endpoints[p.operationId as keyof typeof endpoints];
      expect(e, `${p.file}: unknown operationId "${p.operationId}"`).toBeDefined();
      expect(`${e.method} ${e.path}`, p.file).toBe(`${p.method} ${p.path}`);
      expect(e.status === "PLANNED" || e.status === "IN_PROGRESS", `${p.operationId} is ${e.status} but still uses plannedRoute`).toBe(true);
    }
  });

  it("IMPLEMENTED endpoints are covered by contract tests", () => {
    for (const e of endpointList.filter((x) => x.status === "IMPLEMENTED")) {
      expect(contractTestSource.includes(`"${e.operationId}"`), `${e.operationId} is IMPLEMENTED but no contract test references it`).toBe(true);
    }
  });
});

describe("client functions ↔ registry", () => {
  const modules = Object.fromEntries(
    CLIENT_MODULES.map((m) => [m, readFileSync(path.join(ROOT, `src/lib/api/${m}.ts`), "utf8")]),
  );

  it("every endpoint's client function exists and calls the right operation", async () => {
    for (const e of endpointList) {
      const mod = (await import(`@/lib/api/${e.client.module}`)) as Record<string, unknown>;
      expect(typeof mod[e.client.fn], `${e.client.fn} missing from src/lib/api/${e.client.module}.ts`).toBe("function");
      const src = modules[e.client.module]!;
      const fnStart = src.indexOf(`function ${e.client.fn}(`);
      const body = src.slice(fnStart, src.indexOf("\n}\n", fnStart));
      expect(body.includes(`"${e.operationId}"`), `${e.client.fn}() does not reference "${e.operationId}"`).toBe(true);
    }
  });

  it("every exported request function maps to an endpoint", async () => {
    const helpers = new Set(["searchResultHref", "uploadFile"]);
    const fns = new Set(endpointList.map((e) => e.client.fn));
    for (const m of CLIENT_MODULES) {
      const mod = (await import(`@/lib/api/${m}`)) as Record<string, unknown>;
      for (const [name, value] of Object.entries(mod)) {
        if (typeof value !== "function" || helpers.has(name)) continue;
        expect(fns.has(name), `src/lib/api/${m}.ts exports ${name}() which is not linked to any endpoint`).toBe(true);
      }
    }
  });

  it("routes.generated.ts matches the registry", () => {
    for (const e of endpointList) expect(ROUTES[e.operationId as keyof typeof ROUTES]).toEqual({ method: e.method, path: e.path });
    expect(Object.keys(ROUTES)).toHaveLength(endpointList.length);
  });
});

describe("documentation ↔ registry", () => {
  const doc = readFileSync(path.join(ROOT, "docs/API_DOCUMENTATION.md"), "utf8");
  const openapi = readFileSync(path.join(ROOT, "docs/openapi.yaml"), "utf8");

  it("every endpoint has a section in API_DOCUMENTATION.md and an operation in openapi.yaml", () => {
    for (const e of endpointList) {
      expect(doc.includes(`<a id="op-${e.operationId.toLowerCase()}"></a>`), `docs section missing for ${e.operationId}`).toBe(true);
      expect(openapi.includes(`operationId: ${e.operationId}\n`), `openapi operation missing for ${e.operationId}`).toBe(true);
    }
  });

  it("the documented status matches the registry", () => {
    for (const e of endpointList) {
      const section = doc.slice(doc.indexOf(`<a id="op-${e.operationId.toLowerCase()}"></a>`)).split("[↑ Back to endpoint table]")[0]!;
      expect(section, e.operationId).toContain(`${e.status}`);
    }
  });

  it("handoff and testing guides exist", () => {
    expect(existsSync(path.join(ROOT, "docs/FRONTEND_HANDOFF.md"))).toBe(true);
    expect(existsSync(path.join(ROOT, "docs/API_TESTING.md"))).toBe(true);
  });
});
