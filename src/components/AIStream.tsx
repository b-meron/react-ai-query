import React from "react";
import { useAIStream } from "../core/useAIStream";
import type { UseAIStreamOptions } from "../core/types";
import type { AIStreamRenderProp } from "./types";

interface AIStreamProps<T> extends UseAIStreamOptions<T> {
  children: AIStreamRenderProp<T>;
}

/**
 * Declarative streaming AI component.
 * Mirrors <AIText> API but with real-time streaming support.
 * 
 * @example
 * ```tsx
 * <AIStream
 *   prompt="Write a short story about a robot"
 *   schema={z.object({ story: z.string() })}
 *   provider={createOpenAIProvider({ apiKey: "..." })}
 * >
 *   {(text, data, { isStreaming, done, error }) => (
 *     <div>
 *       {isStreaming && <span>⏳</span>}
 *       <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>
 *       {done && <p>✓ Complete</p>}
 *       {error && <p>{error.message}</p>}
 *     </div>
 *   )}
 * </AIStream>
 * ```
 */
export function AIStream<T>(props: AIStreamProps<T>) {
  const { children, ...streamOptions } = props;
  const result = useAIStream<T>(streamOptions);
  const { text, data, ...meta } = result;

  return (
    <>
      {children(text, data, meta)}
    </>
  );
}

