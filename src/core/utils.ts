import { z } from "zod";
import { AnyZodSchema } from "./types";

/**
 * Check if a Zod schema expects a primitive type (string, number, boolean).
 * Used to adjust LLM prompts for better response formatting.
 */
export const isPrimitiveSchema = (schema: AnyZodSchema): boolean => {
  const typeName = (schema as unknown as { _def?: { typeName?: string } })._def?.typeName;
  return typeName === "ZodString" || typeName === "ZodNumber" || typeName === "ZodBoolean";
};

/**
 * Get the primitive type name for a schema, if applicable.
 */
export const getPrimitiveTypeName = (schema: AnyZodSchema): string | null => {
  const typeName = (schema as unknown as { _def?: { typeName?: string } })._def?.typeName;
  if (typeName === "ZodString") return "string";
  if (typeName === "ZodNumber") return "number";
  if (typeName === "ZodBoolean") return "boolean";
  return null;
};

/**
 * Unwrap LLM response from common wrapper patterns.
 * LLMs often wrap responses in objects like {"data": ...}, {"result": ...}, {"error": ...}
 * This handles the "LLM Quirk Handling" documented in README.
 */
export const unwrapLLMResponse = (parsed: unknown, schema: AnyZodSchema): unknown => {
  if (!parsed || typeof parsed !== "object") return parsed;

  const obj = parsed as Record<string, unknown>;

  // If schema expects primitive, try to extract from common wrappers
  if (isPrimitiveSchema(schema)) {
    // Try common wrapper keys
    for (const key of ["data", "result", "response", "output", "answer", "error", "message", "text", "value"]) {
      if (key in obj && Object.keys(obj).length === 1) {
        return obj[key];
      }
    }
    // If single key object, extract its value
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      return obj[keys[0]];
    }
  }

  // For objects, check for "data" wrapper (standard provider contract)
  if ("data" in obj) {
    return obj.data;
  }

  return parsed;
};

/**
 * Creates a case-insensitive enum schema.
 * LLMs often return enum values in different cases (e.g., "POSITIVE" instead of "positive").
 * This helper normalizes input to lowercase before validation.
 *
 * @example
 * const schema = z.object({
 *   sentiment: caseInsensitiveEnum(['positive', 'neutral', 'negative']),
 * });
 *
 * // All of these will validate successfully:
 * // { sentiment: "positive" }
 * // { sentiment: "POSITIVE" }
 * // { sentiment: "Positive" }
 */
export const caseInsensitiveEnum = <T extends readonly [string, ...string[]]>(
  values: T
) => {
  return z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() : val),
    z.enum(values)
  );
};

/**
 * Stable JSON serialization that handles edge cases:
 * - Circular references (returns "[Circular]")
 * - Functions (ignored/undefined)
 * - Sorts object keys for consistent output
 * - Falls back to String() on error
 */
export const stableStringify = (value: unknown): string => {
  const seen = new WeakSet();

  const serialize = (val: unknown): unknown => {
    if (val === null || val === undefined) return val;
    if (typeof val === "function") return undefined;
    if (typeof val !== "object") return val;

    if (seen.has(val as object)) return "[Circular]";
    seen.add(val as object);

    if (Array.isArray(val)) {
      return val.map(serialize);
    }

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(val as object).sort()) {
      const serialized = serialize((val as Record<string, unknown>)[key]);
      if (serialized !== undefined) {
        sorted[key] = serialized;
      }
    }
    return sorted;
  };

  try {
    return JSON.stringify(serialize(value));
  } catch {
    return String(value);
  }
};

/**
 * Converts a Zod schema to a human-readable JSON example string.
 * This helps LLMs understand exactly what format to return.
 */
export const zodToJsonExample = (schema: AnyZodSchema): string => {
  const def = (schema as unknown as { _def: ZodDef })._def;
  return JSON.stringify(buildExample(def), null, 0);
};

interface ZodDef {
  typeName: string;
  shape?: () => Record<string, { _def: ZodDef }>;
  type?: { _def: ZodDef };
  options?: Array<{ _def: ZodDef }>;
  values?: string[];
  value?: unknown;
  innerType?: { _def: ZodDef };
  defaultValue?: () => unknown;
}

const buildExample = (def: ZodDef): unknown => {
  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return 0;
    case "ZodBoolean":
      return true;
    case "ZodNull":
      return null;
    case "ZodUndefined":
      return undefined;
    case "ZodLiteral":
      return def.value;
    case "ZodEnum":
      // Show all enum options: "positive" | "neutral" | "negative"
      return def.values?.join(" | ") ?? "enum";
    case "ZodNativeEnum":
      return "enum_value";
    case "ZodArray":
      if (def.type) {
        return [buildExample(def.type._def)];
      }
      return ["item"];
    case "ZodObject":
      if (def.shape) {
        const shape = def.shape();
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(shape)) {
          result[key] = buildExample(value._def);
        }
        return result;
      }
      return {};
    case "ZodOptional":
    case "ZodNullable":
      if (def.innerType) {
        return buildExample(def.innerType._def);
      }
      return null;
    case "ZodDefault":
      if (def.defaultValue) {
        return def.defaultValue();
      }
      if (def.innerType) {
        return buildExample(def.innerType._def);
      }
      return null;
    case "ZodUnion":
      // Return the first option as example
      if (def.options && def.options.length > 0) {
        return buildExample(def.options[0]._def);
      }
      return "union_value";
    case "ZodTuple":
      return ["tuple_item"];
    case "ZodRecord":
      return { key: "value" };
    case "ZodAny":
      return "any_value";
    case "ZodUnknown":
      return "unknown_value";
    default:
      return `<${typeName}>`;
  }
};

