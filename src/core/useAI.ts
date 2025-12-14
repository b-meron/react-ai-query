import { useCallback, useEffect, useRef, useState } from "react";
import { executeAI } from "./execution";
import { AIError, AIProvider, UseAIOptions, UseAIResult } from "./types";

/**
 * Stable JSON serialization for dependency comparison.
 * Handles circular references and sorts object keys for consistency.
 */
const stableStringify = (value: unknown): string => {
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
      sorted[key] = serialize((val as Record<string, unknown>)[key]);
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
 * Build a stable cache key from all options that should trigger a re-fetch
 */
const buildOptionsKey = <T>(options: UseAIOptions<T>): string => {
  return [
    options.prompt,
    stableStringify(options.input),
    options.temperature ?? 0,
    options.maxTokens ?? "",
    options.cache ?? "session",
    options.timeoutMs ?? 15000,
    options.retry ?? 1,
    stableStringify(options.providerOptions),
  ].join("::");
};

export function useAI<T>(options: UseAIOptions<T>): UseAIResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<AIError | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true); // Start as loading
  const [tokens, setTokens] = useState<number | undefined>(undefined);
  const [fromCache, setFromCache] = useState<boolean | undefined>(undefined);
  const [usedFallback, setUsedFallback] = useState<boolean | undefined>(undefined);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>(undefined);

  // Track the current options key to detect actual changes
  const optionsKey = buildOptionsKey(options);
  const lastKeyRef = useRef<string>("");
  const isRunningRef = useRef<boolean>(false);

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(async () => {
    if (isRunningRef.current) return; // Prevent concurrent runs
    isRunningRef.current = true;

    setLoading(true);
    setError(undefined);

    try {
      const currentOptions = optionsRef.current;
      const result = await executeAI<T>({
        prompt: currentOptions.prompt,
        input: currentOptions.input,
        schema: currentOptions.schema,
        provider: currentOptions.provider as AIProvider,
        temperature: currentOptions.temperature,
        maxTokens: currentOptions.maxTokens,
        cache: currentOptions.cache,
        timeoutMs: currentOptions.timeoutMs,
        retry: currentOptions.retry,
        fallback: currentOptions.fallback,
        providerOptions: currentOptions.providerOptions,
      });
      setData(result.data);
      setTokens(result.tokens);
      setFromCache(result.fromCache);
      setUsedFallback(result.usedFallback);
      setFallbackReason(result.fallbackReason);
    } catch (err) {
      const aiError = err instanceof AIError ? err : new AIError("Unknown error", "provider_error", err);
      setError(aiError);
      setData(undefined);
    } finally {
      setLoading(false);
      isRunningRef.current = false;
    }
  }, []); // Empty deps - uses refs for latest values

  // Only run when the options key actually changes
  useEffect(() => {
    if (optionsKey !== lastKeyRef.current) {
      lastKeyRef.current = optionsKey;
      run();
    }
  }, [optionsKey, run]);

  return {
    data,
    loading,
    error,
    cost: tokens !== undefined ? { tokens } : undefined,
    tokens,
    fromCache,
    usedFallback,
    fallbackReason,
    refresh: run
  };
}
