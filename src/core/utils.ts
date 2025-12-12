import { z } from "zod";
import { AIError, AnyZodSchema } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// ABORT SIGNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combine multiple AbortSignals into one that aborts when ANY signal aborts.
 * Uses native AbortSignal.any() when available (Node 20.3+, modern browsers),
 * falls back to a manual implementation for older environments (Node 18).
 * 
 * TODO: Remove fallback when Node.js 18 support is dropped (EOL April 2025)
 * Just use: return AbortSignal.any(signals);
 * 
 * @param signals - Array of AbortSignals to combine
 * @returns A single AbortSignal that aborts when any input signal aborts
 */
export const combineAbortSignals = (signals: AbortSignal[]): AbortSignal => {
  // Use native implementation when available (best performance)
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }

  // Fallback for Node.js 18 and older browsers
  const controller = new AbortController();

  // Track handlers for cleanup
  const handlers: Array<{ signal: AbortSignal; handler: () => void }> = [];

  const cleanup = () => {
    for (const { signal, handler } of handlers) {
      signal.removeEventListener("abort", handler);
    }
    handlers.length = 0;
  };

  for (const signal of signals) {
    // If any signal is already aborted, abort immediately
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    // Listen for future aborts
    const handler = () => {
      cleanup(); // Remove all listeners when any signal aborts
      controller.abort(signal.reason);
    };
    handlers.push({ signal, handler });
    signal.addEventListener("abort", handler, { once: true });
  }

  return controller.signal;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build system prompt for AI provider.
 * Handles both primitive (raw value) and object (JSON) schemas.
 * 
 * @param isPrimitive - Whether the schema expects a primitive type
 * @returns System prompt string
 */
export const buildSystemPrompt = (isPrimitive: boolean): string => {
  return isPrimitive
    ? [
      "You are a deterministic function.",
      "Output ONLY the raw value requested. No JSON wrapping.",
      "For strings: output just the text, no quotes.",
      "For numbers: output just the number.",
      "For booleans: output just true or false.",
      "DO NOT wrap in objects like {\"data\": ...} or {\"result\": ...}.",
      "DO NOT add notes, explanations, or any extra text.",
    ].join(" ")
    : [
      "You are a deterministic JSON-only function.",
      "Output ONLY the JSON object. No text before or after.",
      "Use lowercase for enum values.",
      "DO NOT add notes, explanations, or any text outside the JSON.",
    ].join(" ");
};

/**
 * Build user content for AI provider.
 * Handles both primitive (raw value) and object (JSON) schemas.
 * 
 * @param prompt - The task/instruction
 * @param input - Optional context data
 * @param schemaExample - JSON example of expected format
 * @param isPrimitive - Whether the schema expects a primitive type
 * @param primitiveType - The primitive type name (string/number/boolean)
 * @returns User content string
 */
export const buildUserContent = (
  prompt: string,
  input: unknown | undefined,
  schemaExample: string,
  isPrimitive: boolean,
  primitiveType: string | null
): string => {
  return isPrimitive
    ? [
      `Task: ${prompt}`,
      input ? `Context: ${stableStringify(input)}` : null,
      `Return ONLY a ${primitiveType} value. No JSON, no wrapping, just the raw value.`
    ].filter(Boolean).join("\n")
    : [
      `Task: ${prompt}`,
      input ? `Context: ${stableStringify(input)}` : null,
      `Required JSON format: ${schemaExample}`,
      "Return ONLY the JSON object matching this format."
    ].filter(Boolean).join("\n");
};

/**
 * Parse raw LLM response content and validate against schema.
 * Handles both primitive (raw value) and object (JSON) responses.
 * 
 * @param rawContent - The raw response content from the LLM
 * @param schema - Zod schema to validate against
 * @param isPrimitive - Whether the schema expects a primitive type
 * @param providerName - Provider name for error messages
 * @returns Validated data
 * @throws {AIError} If parsing fails or validation fails
 */
export const parseAndValidateResponse = <T>(
  rawContent: unknown,
  schema: AnyZodSchema,
  isPrimitive: boolean,
  providerName: string
): T => {
  let data: unknown;

  if (isPrimitive) {
    // Try raw string first for primitive schemas
    const trimmed = typeof rawContent === "string" ? rawContent.trim() : rawContent;
    if (schema.safeParse(trimmed).success) {
      data = trimmed;
    } else {
      // Fall back to parsing and unwrapping
      const parsed = typeof rawContent === "string" ? safeJsonParse(rawContent) : rawContent;
      data = unwrapLLMResponse(parsed, schema);
    }
  } else {
    const parsed = typeof rawContent === "string" ? safeJsonParse(rawContent) : rawContent;
    data = unwrapLLMResponse(parsed, schema);
  }

  if (data === undefined) {
    throw new AIError(`${providerName} returned no data`, "provider_error");
  }

  const validated = schema.safeParse(data);
  if (!validated.success) {
    throw new AIError(`${providerName} returned invalid schema`, "validation_error", validated.error);
  }

  return validated.data as T;
};

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON with fallback for malformed responses.
 * Attempts to extract JSON objects even when surrounded by extra text.
 */
export const safeJsonParse = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON object from potentially malformed response
    const jsonMatch = content.match(/^\s*(\{[\s\S]*\})\s*(?:\n|$)/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
};

/**
 * Parse and validate LLM stream response.
 * Handles unwrapping, undefined checks, and schema validation.
 * Delegates to parseAndValidateResponse for consistent behavior.
 * 
 * @param rawText - The raw text from the LLM stream
 * @param schema - Zod schema to validate against
 * @param providerName - Provider name for error messages
 * @returns Validated data
 * @throws {AIError} If parsing fails or validation fails
 */
export const parseAndValidateStreamResponse = <T>(
  rawText: string,
  schema: AnyZodSchema,
  providerName: string
): T => {
  const isPrimitive = isPrimitiveSchema(schema);
  return parseAndValidateResponse<T>(rawText, schema, isPrimitive, `${providerName} stream`);
};

