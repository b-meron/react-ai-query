import { useCallback, useEffect, useRef, useState } from "react";
import { executeAI } from "./execution";
import { AIError, ProviderKind, UseAIOptions, UseAIResult } from "./types";
import { stableStringify } from "./utils";

/**
 * Build a stable cache key from all options that should trigger a re-fetch
 */
const buildOptionsKey = <T>(options: UseAIOptions<T>): string => {
  return [
    options.prompt,
    stableStringify(options.input),
    options.temperature ?? 0,
    options.cache ?? "session",
    options.timeoutMs ?? 15000,
    options.retry ?? 1,
  ].join("::");
};

export function useAI<T>(options: UseAIOptions<T>): UseAIResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<AIError | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true); // Start as loading
  const [tokens, setTokens] = useState<number | undefined>(undefined);
  const [estimatedUSD, setEstimatedUSD] = useState<number | undefined>(undefined);
  const [fromCache, setFromCache] = useState<boolean | undefined>(undefined);

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
        provider: currentOptions.provider as ProviderKind,
        temperature: currentOptions.temperature,
        cache: currentOptions.cache,
        timeoutMs: currentOptions.timeoutMs,
        retry: currentOptions.retry,
        fallback: currentOptions.fallback
      });
      setData(result.data);
      setTokens(result.tokens);
      setEstimatedUSD(result.estimatedUSD);
      setFromCache(result.fromCache);
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
    cost: tokens !== undefined && estimatedUSD !== undefined ? { tokens, estimatedUSD } : undefined,
    tokens,
    estimatedUSD,
    fromCache,
    refresh: run
  };
}
