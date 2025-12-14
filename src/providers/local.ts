import { AIExecutionResult, AIProvider, ProviderExecuteArgs, AIError } from "../core/types";
import { resolveTokens } from "../core/cost";
import {
  zodToJsonExample,
  isPrimitiveSchema,
  getPrimitiveTypeName,
  buildSystemPrompt,
  buildUserContent,
  parseAndValidateResponse
} from "../core/utils";

export interface LocalProviderConfig {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

const DEFAULT_ENDPOINT = "http://localhost:11434/v1/chat/completions";
const DEFAULT_MODEL = "llama3";

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

  async execute<T>({ prompt, input, schema, temperature, maxTokens, providerOptions, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const fetcher = resolveFetch();
    const endpoint = this.config.endpoint ?? DEFAULT_ENDPOINT;
    const model = this.config.model ?? DEFAULT_MODEL;

    // Generate JSON example from Zod schema
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);
    const primitiveType = getPrimitiveTypeName(schema);

    // Use shared prompt builders for consistency
    const systemPrompt = buildSystemPrompt(isPrimitive);
    const userContent = buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType);

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
        ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
        stream: false,
        // Spread any additional provider-specific options
        ...providerOptions,
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

    // Use shared response parser for consistency
    const validatedData = parseAndValidateResponse<T>(rawContent, schema, isPrimitive, "Local provider");

    const tokens = resolveTokens(payload?.usage?.total_tokens, prompt, input);

    return {
      data: validatedData,
      tokens,
    };
  }
}

export const createLocalProvider = (config: LocalProviderConfig = {}) => new LocalProviderImpl(config);
