import React from "react";
import { useAI } from "../core/useAI";
import type { UseAIOptions } from "../core/types";
import type { AITextRenderProp } from "./types";

interface AITextProps<T> extends UseAIOptions<T> {
  children: AITextRenderProp<T>;
}

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
