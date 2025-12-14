import { AIError, AIExecutionResult, AIProvider, AnyZodSchema, CachePolicy } from "./types";
import { buildCacheKey, getFromSessionCache, setSessionCache } from "./cache";
import { resolveTokens } from "./cost";
import { mockProvider } from "../providers/mock";
import { sanitizeInput, sanitizePrompt } from "./sanitize";

const defaultTimeout = 15000;
const defaultRetry = 1;
const defaultTemperature = 0;

const selectProvider = (provider?: AIProvider) => {
  return provider ?? mockProvider;
};

export const executeAI = async <T>(args: {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  cache?: CachePolicy;
  timeoutMs?: number;
  retry?: number;
  fallback?: T | (() => T);
  providerOptions?: Record<string, unknown>;
}): Promise<AIExecutionResult<T>> => {
  const provider = selectProvider(args.provider);
  const prompt = sanitizePrompt(args.prompt);
  const input = sanitizeInput(args.input);
  const temperature = args.temperature ?? defaultTemperature;
  const maxTokens = args.maxTokens;
  const providerOptions = args.providerOptions;
  const timeoutMs = args.timeoutMs ?? defaultTimeout;
  const retry = args.retry ?? defaultRetry;
  const cachePolicy = args.cache ?? "session";

  if (!provider) {
    throw new AIError("Provider is required", "configuration");
  }

  const cacheKey = cachePolicy
    ? buildCacheKey({
      prompt,
      input,
      schema: args.schema,
      temperature,
      maxTokens,
      providerOptions,
    })
    : undefined;
  if (cacheKey && cachePolicy === "session") {
    const cached = getFromSessionCache<T>(cacheKey);
    if (cached) {
      return {
        ...cached,
        tokens: 0,
        fromCache: true,
      };
    }
  }

  const attemptExecution = async (): Promise<AIExecutionResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await provider.execute<T>({
        prompt,
        input,
        schema: args.schema,
        temperature,
        maxTokens,
        providerOptions,
        signal: controller.signal
      });

      const validated = args.schema.safeParse(result.data);
      if (!validated.success) {
        throw new AIError("Provider returned invalid shape", "validation_error", validated.error);
      }

      const tokens = resolveTokens(result.tokens, prompt, input);

      const finalResult: AIExecutionResult<T> = {
        data: validated.data,
        tokens,
        fromCache: false
      };

      if (cacheKey && cachePolicy === "session") {
        setSessionCache(cacheKey, finalResult);
      }

      return finalResult;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AIError("AI call timed out", "timeout");
      }
      if (error instanceof AIError) throw error;
      throw new AIError("Provider execution failed", "provider_error", error);
    } finally {
      clearTimeout(timer);
    }
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retry; attempt += 1) {
    try {
      return await attemptExecution();
    } catch (error) {
      lastError = error;
      if (attempt === retry) break;
    }
  }

  if (args.fallback !== undefined) {
    const fallbackValue = typeof args.fallback === "function" ? (args.fallback as () => T)() : args.fallback;
    const errorMessage = lastError instanceof AIError ? lastError.message : String(lastError);
    return {
      data: fallbackValue,
      tokens: 0,
      fromCache: false,
      usedFallback: true,
      fallbackReason: errorMessage
    };
  }

  if (lastError instanceof AIError) throw lastError;
  throw new AIError("AI execution failed", "provider_error", lastError);
};
