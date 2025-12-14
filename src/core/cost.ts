import { stableStringify } from "./utils";

export const estimateTokens = (prompt: string, input?: unknown): number => {
  const promptTokens = Math.ceil(prompt.length / 4);
  const inputTokens = input ? Math.ceil(stableStringify(input).length / 4) : 0;
  return promptTokens + inputTokens + 8; // small buffer for system instructions
};

export const deriveTokens = (prompt: string, input?: unknown): number => estimateTokens(prompt, input);

/**
 * Resolve tokens from provider result or fall back to estimation.
 * Uses explicit undefined checks to handle 0 as a valid token count.
 *
 * @param resultTokens - Token count from provider (may be undefined)
 * @param prompt - Original prompt for fallback estimation
 * @param input - Original input for fallback estimation
 * @returns Resolved token count
 */
export const resolveTokens = (
  resultTokens: number | undefined,
  prompt: string,
  input?: unknown
): number => {
  if (resultTokens !== undefined) {
    return resultTokens;
  }
  return deriveTokens(prompt, input);
};
