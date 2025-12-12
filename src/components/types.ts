import type { ReactNode } from "react";

import type {
    UseAIResult,
    UseAIStreamResult,
} from "../core/types";

export type AITextRenderMeta<T> = Omit<UseAIResult<T>, "data">;
export type AIStreamRenderMeta<T> = Omit<UseAIStreamResult<T>, "text" | "data">;

export type AITextRenderProp<T> = (
    data: T | undefined,
    meta: AITextRenderMeta<T>
) => ReactNode;

export type AIStreamRenderProp<T> = (
    text: string,
    data: T | undefined,
    meta: AIStreamRenderMeta<T>
) => ReactNode;

