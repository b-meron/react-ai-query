/**
 * @fileoverview Hook types for useAI.
 * Defines options and results for the primary non-streaming hook.
 * @module react-ai-query/types/hooks
 */

import { AIError, AnyZodSchema, CachePolicy, CostBreakdown, ModelOptions } from "./common";
import { AIProvider } from "./provider";

/**
 * Options for the `useAI` hook.
 * 
 * @typeParam T - Expected response type (inferred from schema)
 * 
 * @example
 * ```ts
 * const options: UseAIOptions<string> = {
 *   prompt: "Summarize this text",
 *   input: { text: "..." },
 *   schema: z.string(),
 *   provider: openaiProvider,
 *   cache: "session",
 *   fallback: "Summary unavailable",
 * };
 * ```
 */
export interface UseAIOptions<T> extends ModelOptions {
  /** The task/instruction for the AI */
  prompt: string;
  /** Optional context data to include in the request */
  input?: unknown;
  /** Zod schema defining the expected response format */
  schema: AnyZodSchema;
  /** AI provider to use (default: mockProvider) */
  provider?: AIProvider;
  /** 
   * Cache policy for this request.
   * - `"session"` - Cache in session storage (default)
   * - `false` - Disable caching
   */
  cache?: CachePolicy;
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Number of retry attempts on failure (default: 1) */
  retry?: number;
  /** 
   * Fallback value to use if all retries fail.
   * Can be a value or a function returning a value.
   */
  fallback?: T | (() => T);
}

/**
 * Result returned from the `useAI` hook.
 * Contains validated data, loading state, and metadata.
 * 
 * @typeParam T - Expected response type (inferred from schema)
 * 
 * @example
 * ```ts
 * const { data, loading, error, cost, refresh } = useAI(options);
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * return <Summary text={data} cost={cost} />;
 * ```
 */
export interface UseAIResult<T> {
  /** The validated response data, or undefined if loading/error */
  data: T | undefined;
  /** Whether a request is in progress */
  loading: boolean;
  /** Error if the request failed */
  error: AIError | undefined;
  /** Cost breakdown with token usage */
  cost?: CostBreakdown;
  /** Total tokens used (also reflected in cost.tokens) */
  tokens?: number;
  /** Whether the result was served from cache */
  fromCache?: boolean;
  /** Whether a fallback value was used due to failure */
  usedFallback?: boolean;
  /** Reason why fallback was triggered, if applicable */
  fallbackReason?: string;

  /**
   * Manually re-execute the AI request.
   * Useful for "regenerate" buttons or retry logic.
   */
  refresh: () => Promise<void>;
}

