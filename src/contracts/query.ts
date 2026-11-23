/**
 * Query-string ⇄ typed object conversion, driven by the contract schemas.
 *
 * Contracts declare query params with their *real* types (number, boolean,
 * string[]), so client functions are strongly typed. On the wire everything is
 * a string. `coerceQuery` converts URLSearchParams back to typed values using
 * the schema's JSON Schema, before Zod validation. Used by both the backend and
 * the mock API so they behave identically.
 *
 * Wire format:
 *   numbers   ?page=2
 *   booleans  ?featured=true   (only "true" / "false")
 *   arrays    ?types=PUBLICATION,DATASET   (comma-separated)
 */
import { z } from "zod";

type JsonSchema = {
  type?: string | string[];
  $ref?: string;
  anyOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  $defs?: Record<string, JsonSchema>;
};

const kindCache = new WeakMap<z.ZodObject, Record<string, "number" | "integer" | "boolean" | "array" | "string">>();

function resolveKind(schema: JsonSchema, defs: Record<string, JsonSchema>): "number" | "integer" | "boolean" | "array" | "string" {
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop()!;
    return defs[name] ? resolveKind(defs[name], defs) : "string";
  }
  if (schema.anyOf) {
    const nonNull = schema.anyOf.find((s) => s.type !== "null");
    return nonNull ? resolveKind(nonNull, defs) : "string";
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "number" || type === "integer" || type === "boolean" || type === "array") return type;
  return "string";
}

function fieldKinds(schema: z.ZodObject) {
  let kinds = kindCache.get(schema);
  if (!kinds) {
    const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema;
    const defs = json.$defs ?? {};
    kinds = Object.fromEntries(Object.entries(json.properties ?? {}).map(([key, prop]) => [key, resolveKind(prop, defs)]));
    kindCache.set(schema, kinds);
  }
  return kinds;
}

/** URLSearchParams → plain object with numbers/booleans/arrays restored (unvalidated). */
export function coerceQuery(schema: z.ZodObject, params: URLSearchParams): Record<string, unknown> {
  const kinds = fieldKinds(schema);
  const out: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(kinds)) {
    const raw = params.getAll(key);
    if (raw.length === 0) continue;
    const last = raw[raw.length - 1];
    if (last === "" && kind !== "array") continue; // `?q=` is treated as absent
    switch (kind) {
      case "number":
      case "integer": {
        const n = Number(last);
        out[key] = Number.isFinite(n) && last.trim() !== "" ? n : last; // leave invalid input for Zod to reject
        break;
      }
      case "boolean":
        out[key] = last === "true" ? true : last === "false" ? false : last;
        break;
      case "array":
        out[key] = raw.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
        break;
      default:
        out[key] = last;
    }
  }
  // Unknown keys are ignored (forward compatible).
  return out;
}

/** Typed object → query string (client side). Skips undefined/null/empty values. */
export function serializeQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
