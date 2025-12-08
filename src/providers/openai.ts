import OpenAI from "openai";
import { AIExecutionResult, AIProvider, ProviderExecuteArgs } from "../core/types";
import { deriveCost, estimateUSD } from "../core/cost";
import { AIError } from "../core/types";
import { stableStringify } from "../core/utils";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  dangerouslyAllowBrowser?: boolean;
}

const DEFAULT_MODEL = "gpt-4o-mini";

const resolveEnv = (key: string): string | undefined => {
  if (typeof process !== "undefined" && process.env && process.env[key]) return process.env[key];
  if (typeof globalThis !== "undefined") {
    const fromGlobal = (globalThis as unknown as { [k: string]: string | undefined })[key];
    if (fromGlobal) return fromGlobal;
  }
  if (typeof import.meta !== "undefined") {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (env?.[key]) return env[key];
  }
  return undefined;
};

const getClient = (config: OpenAIProviderConfig = {}) => {
  const apiKey = config.apiKey ?? resolveEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new AIError("Missing OPENAI_API_KEY", "configuration");
  }
  return new OpenAI({
    apiKey,
    baseURL: config.baseURL,
    dangerouslyAllowBrowser: config.dangerouslyAllowBrowser ?? true
  });
};

const safeJsonParse = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
};

class OpenAIProviderImpl implements AIProvider {
  name = "openai";
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig = {}) {
    this.config = config;
  }

  async execute<T>({ prompt, input, schema, temperature, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const client = getClient(this.config);
    const systemPrompt = [
      "You are a deterministic function for a React UI runtime.",
      "Always respond with strict JSON object: { \"data\": <value> }.",
      "Never include code, JSX, HTML, or explanations.",
      "Follow the user's prompt and schema strictly.",
      "If uncertain, return a safe, minimal value within schema."
    ].join(" ");

    const userContent = [
      `Prompt: ${prompt}`,
      input ? `Input: ${stableStringify(input)}` : undefined,
      "Return only JSON for { data }"
    ].filter(Boolean).join("\n");

    const completion = await client.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      temperature: temperature ?? 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      response_format: { type: "json_object" }
    }, { signal });

    const messageContent = completion.choices[0]?.message?.content;
    const content = Array.isArray(messageContent)
      ? messageContent.map((c) => (typeof c === "string" ? c : c.text ?? "")).join("")
      : (messageContent ?? "");

    const parsed = typeof content === "string" ? safeJsonParse(content) : undefined;
    const data = parsed && typeof parsed === "object" && "data" in parsed ? (parsed as { data: unknown }).data : undefined;

    if (data === undefined) {
      throw new AIError("OpenAI returned no data", "provider_error");
    }

    const validated = schema.safeParse(data);
    if (!validated.success) {
      throw new AIError("OpenAI returned invalid schema", "validation_error", validated.error);
    }

    const usageTokens = completion.usage?.total_tokens;
    const estimated = deriveCost(prompt, input);

    return {
      data: validated.data,
      tokens: usageTokens ?? estimated.tokens,
      estimatedUSD: usageTokens ? estimateUSD(usageTokens) : estimated.estimatedUSD
    };
  }
}

export const createOpenAIProvider = (config: OpenAIProviderConfig = {}) => new OpenAIProviderImpl(config);
export const openAIProvider = new OpenAIProviderImpl();
