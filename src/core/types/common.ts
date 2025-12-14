/**
 * @fileoverview Common types and utilities shared across react-ai-query.
 * These are foundational types used by providers, hooks, and components.
 * @module react-ai-query/types/common
 */

import { ZodType } from "zod";

/**
 * A loosely-typed Zod schema to avoid TypeScript depth errors.
 * Use this when accepting any Zod schema as a parameter.
 * 
 * @example
 * ```ts
 * function validateData(schema: AnyZodSchema, data: unknown) {
 *   return schema.safeParse(data);
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodSchema = ZodType<any, any, any>;

/**
 * Error codes for AI-related failures.
 * Used by {@link AIError} to categorize errors for handling.
 * 
 * - `validation_error` - Schema validation failed (Zod parse error)
 * - `provider_error` - AI provider returned an error or invalid response
 * - `timeout` - Request exceeded the configured timeout
 * - `fallback` - Fallback value was used due to failure
 * - `configuration` - Missing or invalid configuration (e.g., no API key)
 */
export type ErrorCode =
    | "validation_error"
    | "provider_error"
    | "timeout"
    | "fallback"
    | "configuration";

/**
 * Custom error class for AI-related failures.
 * Provides structured error information with categorized error codes.
 * 
 * @example
 * ```ts
 * try {
 *   await provider.execute(args);
 * } catch (error) {
 *   if (error instanceof AIError) {
 *     console.log(`AI Error [${error.code}]: ${error.message}`);
 *   }
 * }
 * ```
 */
export class AIError extends Error {
    /** Categorized error code for programmatic handling */
    code: ErrorCode;
    /** Original error that caused this AIError, if any */
    cause?: unknown;

    /**
     * Creates a new AIError instance.
     * 
     * @param message - Human-readable error message
     * @param code - Categorized error code
     * @param cause - Original error that caused this failure
     */
    constructor(message: string, code: ErrorCode, cause?: unknown) {
        super(message);
        this.name = "AIError";
        this.code = code;
        this.cause = cause;
    }
}

/**
 * Cost breakdown for an AI request.
 * Tracks token usage so you can compare prompts or throttle totals.
 * 
 * @example
 * ```ts
 * const { cost } = useAI({ ... });
 * if (cost) {
 *   console.log(`Used ${cost.tokens} tokens for this request`);
 * }
 * ```
 */
export interface CostBreakdown {
    /** Total tokens used (prompt + completion) */
    tokens: number;
}

/**
 * Cache policy for AI requests.
 * 
 * - `"session"` - Cache responses in session storage (default)
 * - `false` - Disable caching entirely
 */
export type CachePolicy = "session" | false;

/**
 * Common model options shared across hooks, components, and providers.
 * These control how the AI model generates responses.
 * 
 * @example
 * ```ts
 * const options: ModelOptions = {
 *   temperature: 0.7,
 *   maxTokens: 500,
 *   providerOptions: { topP: 0.9 },
 * };
 * ```
 */
export interface ModelOptions {
    /** Temperature for response randomness (0 = deterministic, default: 0) */
    temperature?: number;
    /** Maximum tokens to generate (prevents runaway responses) */
    maxTokens?: number;
    /** 
     * Additional provider-specific options passed directly to the API.
     * Use this for advanced options like topP, frequencyPenalty, seed, etc.
     * 
     * @example
     * ```ts
     * providerOptions: {
     *   topP: 0.9,
     *   frequencyPenalty: 0.5,
     *   seed: 42,
     * }
     * ```
     */
    providerOptions?: Record<string, unknown>;
}

