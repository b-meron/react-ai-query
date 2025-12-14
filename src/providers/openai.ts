import OpenAI from "openai";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { AIExecutionResult, AIStreamProvider, ProviderExecuteArgs, StreamExecuteArgs } from "../core/types";
import { resolveTokens } from "../core/cost";
import {
  zodToJsonExample,
  isPrimitiveSchema,
  getPrimitiveTypeName,
  buildSystemPrompt,
  buildUserContent,
  parseAndValidateResponse,
  parseAndValidateStreamResponse
} from "../core/utils";

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  dangerouslyAllowBrowser?: boolean;
}

const DEFAULT_MODEL = "gpt-4o-mini";

class OpenAIProviderImpl implements AIStreamProvider {
  name = "openai";
  supportsStreaming = true;
  private config: OpenAIProviderConfig;
  private client: OpenAI;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: config.dangerouslyAllowBrowser ?? true
    });
  }

  async execute<T>({ prompt, input, schema, temperature, maxTokens, providerOptions, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    // Generate JSON example from Zod schema
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);
    const primitiveType = getPrimitiveTypeName(schema);

    // Use shared prompt builders for consistency with streaming and other providers
    const systemPrompt = buildSystemPrompt(isPrimitive);
    const userContent = buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType);

    const completion = await this.client.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      temperature: temperature ?? 0,
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      // Only use JSON mode for non-primitives (primitives return raw text)
      ...(isPrimitive ? {} : { response_format: { type: "json_object" as const } }),
      // Spread any additional provider-specific options
      ...providerOptions,
    }, { signal });

    const messageContent = completion.choices[0]?.message?.content;
    const content = Array.isArray(messageContent)
      ? messageContent.map((c) => (typeof c === "string" ? c : c.text ?? "")).join("")
      : (messageContent ?? "");

    // Use shared response parser for consistency
    const validatedData = parseAndValidateResponse<T>(content, schema, isPrimitive, "OpenAI");

    const tokens = resolveTokens(completion.usage?.total_tokens, prompt, input);

    return {
      data: validatedData,
      tokens,
    };
  }

  /**
   * Stream execution using Vercel AI SDK core primitives.
   * Provides reliable SSE parsing with automatic provider format handling.
   * Supports both primitive (raw value) and object (JSON) schemas.
   */
  async executeStream<T>({
    prompt, input, schema, temperature, maxTokens, providerOptions, signal, onChunk
  }: StreamExecuteArgs): Promise<AIExecutionResult<T>> {
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);
    const primitiveType = getPrimitiveTypeName(schema);

    // Use shared prompt builders for consistency
    const systemPrompt = buildSystemPrompt(isPrimitive);
    const userContent = buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType);

    // Use Vercel AI SDK for streaming
    const openai = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    const result = await streamText({
      model: openai(this.config.model ?? DEFAULT_MODEL),
      temperature: temperature ?? 0,
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      abortSignal: signal,
      // Spread any additional provider-specific options
      ...providerOptions,
    });

    let fullText = "";

    // Stream chunks to callback
    for await (const chunk of result.textStream) {
      fullText += chunk;
      onChunk({
        text: fullText,
        delta: chunk,
        done: false,
      });
    }

    // Final chunk
    onChunk({ text: fullText, delta: "", done: true });

    // Parse and validate final result using shared helper (handles primitives)
    const validatedData = parseAndValidateStreamResponse<T>(fullText, schema, "OpenAI");

    // Get usage from result (await finishes the stream)
    const usage = await result.usage;
    const tokens = resolveTokens(usage?.totalTokens, prompt, input);

    return {
      data: validatedData,
      tokens,
    };
  }
}

export const createOpenAIProvider = (config: OpenAIProviderConfig) => new OpenAIProviderImpl(config);
