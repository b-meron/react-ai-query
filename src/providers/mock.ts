import { ZodArray, ZodBoolean, ZodDefault, ZodEnum, ZodLiteral, ZodNullable, ZodNumber, ZodObject, ZodOptional, ZodString, ZodType, ZodUnion } from "zod";
import { AIExecutionResult, AIProvider, AnyZodSchema, ProviderExecuteArgs } from "../core/types";
import { deriveCost } from "../core/cost";
import { stableStringify } from "../core/utils";

/**
 * Generate mock data that conforms to any Zod schema structure.
 * Recursively handles nested objects, arrays, enums, optionals, etc.
 */
const generateMockValue = (schema: ZodType, prompt: string, input?: unknown, path: string = ""): unknown => {
  const contextSuffix = input ? ` (context: ${stableStringify(input).slice(0, 50)})` : "";

  if (schema instanceof ZodString) {
    return `Mock ${path || "value"} for: ${prompt.slice(0, 30)}${contextSuffix}`;
  }

  if (schema instanceof ZodNumber) {
    return 42;
  }

  if (schema instanceof ZodBoolean) {
    return true;
  }

  if (schema instanceof ZodEnum) {
    return schema._def.values[0] ?? "unknown";
  }

  if (schema instanceof ZodLiteral) {
    return schema._def.value;
  }

  if (schema instanceof ZodArray) {
    return [
      generateMockValue(schema._def.type, prompt, input, `${path}[0]`),
      generateMockValue(schema._def.type, prompt, input, `${path}[1]`),
    ];
  }

  if (schema instanceof ZodOptional) {
    return generateMockValue(schema._def.innerType, prompt, input, path);
  }

  if (schema instanceof ZodNullable) {
    return generateMockValue(schema._def.innerType, prompt, input, path);
  }

  if (schema instanceof ZodDefault) {
    return schema._def.defaultValue();
  }

  if (schema instanceof ZodObject) {
    const shape = schema._def.shape();
    const result: Record<string, unknown> = {};
    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = generateMockValue(fieldSchema as ZodType, prompt, input, path ? `${path}.${key}` : key);
    }
    return result;
  }

  if (schema instanceof ZodUnion) {
    const firstOption = schema._def.options[0];
    if (firstOption) {
      return generateMockValue(firstOption, prompt, input, path);
    }
  }

  // Fallback for unhandled types
  return `Mock ${path || "value"}`;
};

const buildMockData = (schema: AnyZodSchema, prompt: string, input?: unknown): unknown => {
  return generateMockValue(schema, prompt, input);
};

class MockProviderImpl implements AIProvider {
  name = "mock";

  async execute<T>({ prompt, input, schema }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const cost = deriveCost(prompt, input);
    const data = buildMockData(schema, prompt, input) as T;
    return {
      data,
      tokens: cost.tokens,
      estimatedUSD: cost.estimatedUSD
    };
  }
}

export const mockProvider = new MockProviderImpl();
