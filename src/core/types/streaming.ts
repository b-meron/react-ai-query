/**
 * @fileoverview Streaming types for real-time AI responses.
 * Powered by Vercel AI SDK core primitives for reliable SSE parsing.
 * @module react-ai-query/types/streaming
 */

import { AIError, AnyZodSchema, CostBreakdown, ModelOptions } from "./common";
import { AIExecutionResult, AIProvider, ProviderExecuteArgs } from "./provider";

/**
 * Represents a single chunk during streaming.
 * Emitted via `onChunk` callback as the AI generates content.
 * 
 * @example
 * ```ts
 * onChunk: (chunk: StreamChunk) => {
 *   console.log("Accumulated:", chunk.text);
 *   console.log("New content:", chunk.delta);
 *   if (chunk.done) console.log("Stream complete!");
 * }
 * ```
 */
export interface StreamChunk {
    /** Accumulated text so far (full response up to this point) */
    text: string;
    /** Just the new delta text (what was just received) */
    delta: string;
    /** Whether the stream is complete */
    done: boolean;
}

/**
 * Arguments for streaming execution.
 * Extends {@link ProviderExecuteArgs} with streaming-specific callback.
 */
export interface StreamExecuteArgs extends ProviderExecuteArgs {
    /** 
     * Called on each chunk during streaming.
     * Use this to update UI in real-time or implement effects like typewriter.
     */
    onChunk: (chunk: StreamChunk) => void;
}

/**
 * Extended provider interface with streaming support.
 * Providers implementing this can be used with `useAIStream` and `<AIStream>`.
 * 
 * @example
 * ```ts
 * const streamingProvider: AIStreamProvider = {
 *   name: "openai",
 *   supportsStreaming: true,
 *   async execute(args) { ... },
 *   async executeStream(args) {
 *     // Stream implementation using Vercel AI SDK
 *     for await (const chunk of stream) {
 *       args.onChunk({ text: accumulated, delta: chunk, done: false });
 *     }
 *     return { data, tokens };
 *   },
 * };
 * ```
 */
export interface AIStreamProvider extends AIProvider {
    /** Whether this provider supports streaming */
    supportsStreaming: boolean;

    /**
     * Execute with streaming support.
     * Uses Vercel AI SDK core primitives internally for reliable SSE parsing.
     * 
     * @typeParam T - Expected response type (inferred from schema)
     * @param args - Streaming execution arguments including onChunk callback
     * @returns Promise resolving to execution result when stream completes
     * @throws {AIError} When streaming fails or final validation fails
     */
    executeStream<T>(args: StreamExecuteArgs): Promise<AIExecutionResult<T>>;
}

/**
 * Options for the `useAIStream` hook.
 * 
 * @typeParam T - Expected response type (inferred from schema)
 * 
 * @example
 * ```ts
 * const options: UseAIStreamOptions<{ story: string }> = {
 *   prompt: "Write a short story",
 *   schema: z.object({ story: z.string() }),
 *   provider: openaiProvider,
 *   onChunk: (chunk) => console.log(chunk.delta),
 * };
 * ```
 */
export interface UseAIStreamOptions<T> extends ModelOptions {
    /** The task/instruction for the AI */
    prompt: string;
    /** Optional context data to include in the request */
    input?: unknown;
    /** Zod schema defining the expected response format */
    schema: AnyZodSchema;
    /** Streaming-capable provider (must implement AIStreamProvider) */
    provider: AIStreamProvider;
    /** Timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
    /** Number of retry attempts on failure (default: 1) */
    retry?: number;
    /** Fallback value to use if all retries fail */
    fallback?: T | (() => T);
    /** 
     * Called on each streaming chunk.
     * Useful for typewriter effects or custom animations.
     */
    onChunk?: (chunk: StreamChunk) => void;
    /** 
     * If true, don't start streaming automatically.
     * Call `start()` manually to begin streaming.
     */
    manual?: boolean;
}

/**
 * Result returned from the `useAIStream` hook.
 * Provides real-time streaming state and controls.
 * 
 * @typeParam T - Expected response type (inferred from schema)
 * 
 * @example
 * ```ts
 * const { text, data, isStreaming, done, start, abort } = useAIStream(options);
 * 
 * return (
 *   <div>
 *     <p>{text}</p>
 *     {done && <span>Complete: {data?.summary}</span>}
 *     <button onClick={abort} disabled={!isStreaming}>Stop</button>
 *   </div>
 * );
 * ```
 */
export interface UseAIStreamResult<T> {
    /** Final validated data (only available when `done` is true) */
    data: T | undefined;
    /** Raw streaming text (updates in real-time as chunks arrive) */
    text: string;
    /** Whether the stream is currently active */
    isStreaming: boolean;
    /** Whether the stream has completed successfully */
    done: boolean;
    /** Loading state (true until first response or error) */
    loading: boolean;
    /** Error if stream failed */
    error: AIError | undefined;
    /** Cost breakdown (available when done) */
    cost?: CostBreakdown;

    /**
     * Start or restart the stream.
     * Aborts any existing stream before starting.
     */
    start: () => Promise<void>;

    /**
     * Abort the current stream.
     * Does nothing if no stream is active.
     */
    abort: () => void;

    /**
     * Alias for `start()`.
     * Provided for API consistency with `useAI`.
     */
    refresh: () => Promise<void>;
}

