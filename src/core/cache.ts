import { AIExecutionResult, AnyZodSchema } from "./types";
import { stableStringify } from "./utils";

interface CacheEntry<T> extends AIExecutionResult<T> {
  timestamp: number;
}

const sessionCache = new Map<string, CacheEntry<unknown>>();

export const buildCacheKey = (args: {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
}): string => {
  const schemaId = (args.schema as unknown as { description?: string; _def?: { typeName?: string } }).description ||
    (args.schema as unknown as { _def?: { typeName?: string } })._def?.typeName ||
    args.schema.toString();

  return [
    args.prompt.trim(),
    stableStringify(args.input),
    schemaId
  ].join("::");
};

export const getFromSessionCache = <T>(key: string): AIExecutionResult<T> | undefined => {
  const hit = sessionCache.get(key);
  if (!hit) return undefined;
  return { ...hit, fromCache: true } as AIExecutionResult<T>;
};

export const setSessionCache = <T>(key: string, value: AIExecutionResult<T>): void => {
  sessionCache.set(key, {
    ...value,
    timestamp: Date.now()
  });
};

export const clearSessionCache = (): void => {
  sessionCache.clear();
};
