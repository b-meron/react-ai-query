import { useCallback, useEffect, useRef, useState } from "react";
import { executeAIStream } from "./streamExecution";
import { AIError, CostBreakdown, StreamChunk, UseAIStreamOptions, UseAIStreamResult } from "./types";

/**
 * React hook for streaming AI responses with schema validation.
 * Uses Vercel AI SDK core primitives internally for reliable SSE parsing.
 * 
 * @example
 * ```tsx
 * const { text, data, done, start, abort } = useAIStream({
 *   prompt: "Write a haiku about React",
 *   schema: z.object({ haiku: z.string() }),
 *   provider: createOpenAIProvider({ apiKey: "..." }),
 * });
 * 
 * return (
 *   <div>
 *     <pre>{text}</pre>
 *     {done && <p>Final: {data?.haiku}</p>}
 *     <button onClick={abort}>Stop</button>
 *   </div>
 * );
 * ```
 */
export function useAIStream<T>(options: UseAIStreamOptions<T>): UseAIStreamResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(!options.manual);
  const [error, setError] = useState<AIError | undefined>(undefined);
  const [cost, setCost] = useState<CostBreakdown | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  // Initialize to undefined to detect first mount vs subsequent renders
  const prevManualRef = useRef<boolean | undefined>(undefined);
  optionsRef.current = options;

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const start = useCallback(async () => {
    const opts = optionsRef.current;

    // Abort any existing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Reset state
    setData(undefined);
    setText("");
    setIsStreaming(true);
    setDone(false);
    setLoading(true);
    setError(undefined);
    setCost(undefined);

    const handleChunk = (chunk: StreamChunk) => {
      setText(chunk.text);
      opts.onChunk?.(chunk);

      if (chunk.done) {
        setIsStreaming(false);
      }
    };

    try {
      const result = await executeAIStream<T>({
        prompt: opts.prompt,
        input: opts.input,
        schema: opts.schema,
        provider: opts.provider,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        timeoutMs: opts.timeoutMs,
        retry: opts.retry,
        fallback: opts.fallback,
        onChunk: handleChunk,
        signal: abortControllerRef.current.signal,
        providerOptions: opts.providerOptions,
      });

      setData(result.data);
      setCost({ tokens: result.tokens });
      setDone(true);
      setIsStreaming(false);
      setLoading(false);
    } catch (err) {
      setIsStreaming(false);
      setLoading(false);

      if (err instanceof AIError) {
        setError(err);
      } else if (abortControllerRef.current?.signal.aborted) {
        setError(new AIError("Stream aborted", "timeout"));
      } else {
        setError(new AIError("Stream failed", "provider_error", err));
      }
    }
  }, []);

  // Auto-start unless manual mode
  // Handles initial mount and transitions from manual=true to manual=false
  useEffect(() => {
    const wasManual = prevManualRef.current;
    const isManual = options.manual;
    prevManualRef.current = isManual;

    // Auto-start on mount (when not manual) or when transitioning from manual to auto
    if (!isManual && (wasManual || wasManual === undefined)) {
      start();
    }
  }, [options.manual, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    text,
    isStreaming,
    done,
    loading,
    error,
    cost,
    start,
    abort,
    refresh: start, // Alias for consistency with useAI
  };
}

