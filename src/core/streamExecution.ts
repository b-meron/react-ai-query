import { AIError, AIExecutionResult, AIStreamProvider, AnyZodSchema, StreamChunk } from "./types";
import { resolveTokens } from "./cost";
import { sanitizeInput, sanitizePrompt } from "./sanitize";
import { combineAbortSignals } from "./utils";

const defaultTimeout = 30000; // Longer timeout for streaming
const defaultRetry = 1;
const defaultTemperature = 0;

export interface StreamExecutionArgs<T> {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
  provider: AIStreamProvider;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retry?: number;
  fallback?: T | (() => T);
  onChunk: (chunk: StreamChunk) => void;
  signal?: AbortSignal;
  providerOptions?: Record<string, unknown>;
}

/**
 * Execute streaming AI call with retry, timeout, and fallback support.
 * Uses Vercel AI SDK core primitives internally via provider.executeStream().
 */
export const executeAIStream = async <T>(args: StreamExecutionArgs<T>): Promise<AIExecutionResult<T>> => {
  const { provider, onChunk, signal, providerOptions } = args;
  const prompt = sanitizePrompt(args.prompt);
  const input = sanitizeInput(args.input);
  const temperature = args.temperature ?? defaultTemperature;
  const maxTokens = args.maxTokens;
  const timeoutMs = args.timeoutMs ?? defaultTimeout;
  const retry = args.retry ?? defaultRetry;

  if (!provider) {
    throw new AIError("Streaming provider is required", "configuration");
  }

  if (!provider.supportsStreaming || !provider.executeStream) {
    throw new AIError(`Provider "${provider.name}" does not support streaming`, "configuration");
  }

  const attemptExecution = async (): Promise<AIExecutionResult<T>> => {
    const controller = new AbortController();
    // Use helper for Node.js 18 compatibility (AbortSignal.any requires Node 20.3+)
    const combinedSignal = signal
      ? combineAbortSignals([signal, controller.signal])
      : controller.signal;

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await provider.executeStream<T>({
        prompt,
        input,
        schema: args.schema,
        temperature,
        maxTokens,
        providerOptions,
        signal: combinedSignal,
        onChunk,
      });

      // Validate final result
      const validated = args.schema.safeParse(result.data);
      if (!validated.success) {
        throw new AIError("Stream returned invalid schema", "validation_error", validated.error);
      }

      const tokens = resolveTokens(result.tokens, prompt, input);

      return {
        data: validated.data,
        tokens,
        fromCache: false,
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AIError("Stream timed out", "timeout");
      }
      if (error instanceof AIError) throw error;
      throw new AIError("Stream execution failed", "provider_error", error);
    } finally {
      clearTimeout(timer);
    }
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      return await attemptExecution();
    } catch (error) {
      lastError = error;

      // Skip retries if user-initiated abort occurred
      // The signal remains aborted, so retries would fail immediately
      if (signal?.aborted) {
        break;
      }

      if (attempt === retry) break;
      // Small delay before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Handle fallback
  if (args.fallback !== undefined) {
    const fallbackValue = typeof args.fallback === "function"
      ? (args.fallback as () => T)()
      : args.fallback;
    const errorMessage = lastError instanceof AIError ? lastError.message : String(lastError);
    return {
      data: fallbackValue,
      tokens: 0,
      fromCache: false,
      usedFallback: true,
      fallbackReason: errorMessage,
    };
  }

  if (lastError instanceof AIError) throw lastError;
  throw new AIError("Stream failed after retries", "provider_error", lastError);
};

