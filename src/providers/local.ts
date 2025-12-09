import { AIExecutionResult, AIProvider, ProviderExecuteArgs, AIError } from "../core/types";
import { deriveCost, estimateUSD } from "../core/cost";
import { stableStringify, zodToJsonExample, isPrimitiveSchema, getPrimitiveTypeName, unwrapLLMResponse } from "../core/utils";

export interface LocalProviderConfig {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

const DEFAULT_ENDPOINT = "http://localhost:11434/v1/chat/completions";
const DEFAULT_MODEL = "llama3";

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    // Try to extract JSON from text that might have extra content after it
    const jsonMatch = value.match(/^\s*(\{[\s\S]*\})\s*(?:\n|$)/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
};

const resolveFetch = () => {
  if (typeof fetch === "function") return fetch;
  throw new AIError("fetch is not available in this environment", "configuration");
};

class LocalProviderImpl implements AIProvider {
  name = "local";
  private config: LocalProviderConfig;

  constructor(config: LocalProviderConfig = {}) {
    this.config = config;
  }

  async execute<T>({ prompt, input, schema, temperature, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const fetcher = resolveFetch();
    const endpoint = this.config.endpoint ?? DEFAULT_ENDPOINT;
    const model = this.config.model ?? DEFAULT_MODEL;

    // Generate JSON example from Zod schema
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);
    const primitiveType = getPrimitiveTypeName(schema);

    const systemPrompt = isPrimitive
      ? [
        "You are a deterministic function.",
        "Output ONLY the raw value requested. No JSON wrapping.",
        "For strings: output just the text, no quotes.",
        "For numbers: output just the number.",
        "For booleans: output just true or false.",
        "DO NOT wrap in objects like {\"data\": ...} or {\"result\": ...}.",
        "DO NOT add notes, explanations, or any extra text.",
      ].join(" ")
      : [
        "You are a deterministic JSON-only function.",
        "Output ONLY the JSON object. No text before or after.",
        "Use lowercase for enum values (e.g., 'positive' not 'POSITIVE').",
        "DO NOT add notes, explanations, or any text outside the JSON.",
        "If you add anything other than JSON, the system will fail."
      ].join(" ");

    const userContent = isPrimitive
      ? [
        `Task: ${prompt}`,
        input ? `Context: ${stableStringify(input)}` : null,
        `Return ONLY a ${primitiveType} value. No JSON, no wrapping, just the raw value.`
      ].filter(Boolean).join("\n")
      : [
        `Task: ${prompt}`,
        input ? `Context: ${stableStringify(input)}` : null,
        `Required JSON format: ${schemaExample}`,
        "Return ONLY the JSON object matching this format."
      ].filter(Boolean).join("\n");

    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        ...this.config.headers
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: temperature ?? 0,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new AIError(`Local provider responded with ${response.status}`, "provider_error");
    }

    const payload = await response.json();
    const messageContent = payload?.choices?.[0]?.message?.content;
    const rawContent = Array.isArray(messageContent)
      ? messageContent.map((c: unknown) => (typeof c === "string" ? c : (c as { text?: string })?.text ?? "")).join("")
      : messageContent;

    // For primitives, try to use raw content first
    let data: unknown;
    if (isPrimitive) {
      const trimmed = typeof rawContent === "string" ? rawContent.trim() : rawContent;
      if (schema.safeParse(trimmed).success) {
        data = trimmed;
      } else {
        // Fall back to parsing and unwrapping
        const parsed = typeof rawContent === "string" ? safeJsonParse(rawContent) : rawContent;
        data = unwrapLLMResponse(parsed, schema);
      }
    } else {
      const parsed = typeof rawContent === "string" ? safeJsonParse(rawContent) : rawContent;
      data = unwrapLLMResponse(parsed, schema);
    }

    const validated = schema.safeParse(data);
    if (!validated.success) {
      throw new AIError("Local provider returned invalid schema", "validation_error", validated.error);
    }

    const usageTokens = payload?.usage?.total_tokens;
    const fallbackCost = deriveCost(prompt, input);

    return {
      data: validated.data,
      tokens: usageTokens ?? fallbackCost.tokens,
      estimatedUSD: usageTokens ? estimateUSD(usageTokens) : fallbackCost.estimatedUSD
    };
  }
}

export const createLocalProvider = (config: LocalProviderConfig = {}) => new LocalProviderImpl(config);
export const localProvider = new LocalProviderImpl();
