import { ZodType } from "zod";

export type ProviderName = "mock" | "openai" | "local";
export type ProviderKind = ProviderName | AIProvider;

// Completely decoupled schema type to avoid TypeScript depth errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodSchema = ZodType<any, any, any>;

export interface AIExecutionResult<T> {
  data: T;
  tokens: number;
  estimatedUSD: number;
  fromCache?: boolean;
}

export interface ProviderExecuteArgs {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
  temperature: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  name: string;
  execute<T>(args: ProviderExecuteArgs): Promise<AIExecutionResult<T>>;
}

export interface CostBreakdown {
  tokens: number;
  estimatedUSD: number;
}

export interface UseAIOptions<T> {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
  provider?: ProviderKind;
  temperature?: number;
  cache?: "session" | false;
  timeoutMs?: number;
  retry?: number;
  fallback?: T | (() => T);
}

export interface UseAIResult<T> {
  data: T | undefined;
  loading: boolean;
  error: AIError | undefined;
  cost?: CostBreakdown;
  tokens?: number;
  estimatedUSD?: number;
  fromCache?: boolean;
  refresh: () => Promise<void>;
}

export type CachePolicy = "session" | false;

export type ErrorCode =
  | "validation_error"
  | "provider_error"
  | "timeout"
  | "fallback"
  | "configuration";

export class AIError extends Error {
  code: ErrorCode;
  cause?: unknown;

  constructor(message: string, code: ErrorCode, cause?: unknown) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.cause = cause;
  }
}
