import { z } from "zod";
import { AIExecutionResult, AIProvider, AnyZodSchema, ProviderExecuteArgs } from "../core/types";
import { deriveCost } from "../core/cost";
import { stableStringify } from "../core/utils";

const buildMockData = (schema: AnyZodSchema, prompt: string, input?: unknown): unknown => {
  const base = `Mock response for: ${prompt}`;
  const withInput = input ? `${base} | input: ${stableStringify(input)}` : base;
  if ((schema as unknown as { _def?: { typeName?: string } })._def?.typeName === z.string()._def.typeName) {
    return schema.parse(withInput);
  }
  if ((schema as unknown as { _def?: { typeName?: string } })._def?.typeName === z.object({})._def.typeName) {
    return schema.parse({ message: withInput });
  }
  return schema.parse(withInput);
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
