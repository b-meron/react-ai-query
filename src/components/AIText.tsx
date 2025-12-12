import React from "react";
import { useAI } from "../core/useAI";
import type { UseAIOptions } from "../core/types";
import type { AITextRenderProp } from "./types";

interface AITextProps<T> extends UseAIOptions<T> {
  children: AITextRenderProp<T>;
}

/**
 * Declarative AI component that renders the result of `<AIText />` as a render-prop.
 * Mirrors `useAI` but exposes your templating surface declaratively.
 *
 * @example
 * ```tsx
 * <AIText
 *   prompt="Summarize this article"
 *   input={{ article }}
 *   schema={z.string()}
 *   provider={openaiProvider}
 *   fallback="Summary unavailable"
 * >
 *   {(data, { loading, error, cost, fromCache, usedFallback, fallbackReason, refresh }) =>
 *     loading ? <Spinner /> : <p>{data}</p>
 *   }
 * </AIText>
 * ```
 */
export function AIText<T>(props: AITextProps<T>) {
  const { children, ...options } = props;
  const result = useAI<T>(options);
  const { data, ...meta } = result;

  return (
    <>
      {children(data, meta)}
    </>
  );
}
