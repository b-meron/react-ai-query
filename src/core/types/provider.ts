/**
 * @fileoverview Provider interfaces for AI execution.
 * Defines the contract that all AI providers must implement.
 * @module react-ai-query/types/provider
 */

import { AnyZodSchema, ModelOptions } from "./common";

/**
 * Result returned from an AI provider execution.
 * Contains the validated data, token usage, and metadata.
 * 
 * @typeParam T - The expected data type (inferred from Zod schema)
 * 
 * @example
 * ```ts
 * const result: AIExecutionResult<{ summary: string }> = {
 *   data: { summary: "This is a summary" },
 *   tokens: 150,
 *   fromCache: false,
 * };
 * ```
 */
export interface AIExecutionResult<T> {
    /** The validated response data matching the schema */
    data: T;
    /** Total tokens used (prompt + completion) */
    tokens: number;
    /** Whether this result was served from cache */
    fromCache?: boolean;
    /** Whether a fallback value was used due to failure */
    usedFallback?: boolean;
    /** Reason why fallback was triggered, if applicable */
    fallbackReason?: string;
}

/**
 * Arguments passed to a provider's execute method.
 * Contains all information needed to make an AI request.
 * 
 * @example
 * ```ts
 * const args: ProviderExecuteArgs = {
 *   prompt: "Summarize this article",
 *   input: { article: "..." },
 *   schema: z.object({ summary: z.string() }),
 *   temperature: 0,
 * };
 * ```
 */
export interface ProviderExecuteArgs extends Omit<ModelOptions, 'temperature'> {
    /** The task/instruction for the AI */
    prompt: string;
    /** Optional context data to include in the request */
    input?: unknown;
    /** Zod schema defining the expected response format */
    schema: AnyZodSchema;
    /** Temperature for response randomness (0 = deterministic) - required at provider level */
    temperature: number;
    /** AbortSignal for request cancellation */
    signal?: AbortSignal;
}

/**
 * Base interface for AI providers.
 * All providers (OpenAI, Groq, Local, Mock) implement this interface.
 * 
 * @example
 * ```ts
 * const myProvider: AIProvider = {
 *   name: "custom",
 *   async execute(args) {
 *     // Implementation
 *     return { data, tokens };
 *   },
 * };
 * ```
 */
export interface AIProvider {
    /** Unique identifier for the provider */
    name: string;

    /**
     * Execute an AI request and return validated data.
     * 
     * @typeParam T - Expected response type (inferred from schema)
     * @param args - Execution arguments including prompt, input, and schema
     * @returns Promise resolving to execution result with validated data
     * @throws {AIError} When execution fails or validation fails
     */
    execute<T>(args: ProviderExecuteArgs): Promise<AIExecutionResult<T>>;
}

