import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { AIExecutionResult, AIStreamProvider, ProviderExecuteArgs, StreamExecuteArgs, AIError } from "../core/types";
import { resolveCost, estimateUSD } from "../core/cost";
import {
    zodToJsonExample,
    isPrimitiveSchema,
    getPrimitiveTypeName,
    buildSystemPrompt,
    buildUserContent,
    parseAndValidateResponse,
    parseAndValidateStreamResponse
} from "../core/utils";

export interface GroqProviderConfig {
    apiKey: string;
    model?: string;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant"; // Free, fast model

class GroqProviderImpl implements AIStreamProvider {
    name = "groq";
    supportsStreaming = true;
    private config: GroqProviderConfig;

    constructor(config: GroqProviderConfig) {
        this.config = config;
    }

    async execute<T>({ prompt, input, schema, temperature, maxTokens, providerOptions, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            throw new AIError("Groq API key is required. Get a free key at console.groq.com", "configuration");
        }

        const model = this.config.model ?? DEFAULT_MODEL;
        const schemaExample = zodToJsonExample(schema);
        const isPrimitive = isPrimitiveSchema(schema);
        const primitiveType = getPrimitiveTypeName(schema);

        // Use shared prompt builders for consistency
        const systemPrompt = buildSystemPrompt(isPrimitive);
        const userContent = buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType);

        const response = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
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
            const errorText = await response.text().catch(() => "Unknown error");
            throw new AIError(`Groq API error: ${response.status} - ${errorText}`, "provider_error");
        }

        const payload = await response.json();
        const messageContent = payload?.choices?.[0]?.message?.content;

        // Use shared response parser for consistency
        const validatedData = parseAndValidateResponse<T>(messageContent, schema, isPrimitive, "Groq");

        const usageTokens = payload?.usage?.total_tokens;
        const estimatedUSD = usageTokens !== undefined ? estimateUSD(usageTokens) : undefined;

        // Use shared helper with explicit undefined checks (0 is valid)
        const cost = resolveCost(usageTokens, estimatedUSD, prompt, input);

        return {
            data: validatedData,
            tokens: cost.tokens,
            estimatedUSD: cost.estimatedUSD,
        };
    }

    /**
     * Stream execution using Vercel AI SDK core primitives.
     * Groq uses OpenAI-compatible API, so we use @ai-sdk/openai with baseURL.
     * Supports both primitive (raw value) and object (JSON) schemas.
     */
    async executeStream<T>({
        prompt, input, schema, temperature, maxTokens, providerOptions, signal, onChunk
    }: StreamExecuteArgs): Promise<AIExecutionResult<T>> {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            throw new AIError("Groq API key is required", "configuration");
        }

        const schemaExample = zodToJsonExample(schema);
        const isPrimitive = isPrimitiveSchema(schema);
        const primitiveType = getPrimitiveTypeName(schema);

        // Use shared prompt builders for consistency with execute()
        const systemPrompt = buildSystemPrompt(isPrimitive);
        const userContent = buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType);

        // Use Vercel AI SDK with Groq's OpenAI-compatible endpoint
        const groq = createOpenAI({
            apiKey,
            baseURL: "https://api.groq.com/openai/v1",
        });

        const result = await streamText({
            model: groq(this.config.model ?? DEFAULT_MODEL),
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

        // Get usage from result
        const usage = await result.usage;

        // Parse and validate final result using shared helper (handles primitives)
        const validatedData = parseAndValidateStreamResponse<T>(fullText, schema, "Groq");
        const totalTokens = usage?.totalTokens;
        const estimatedUSD = totalTokens !== undefined ? estimateUSD(totalTokens) : undefined;

        // Use shared helper with explicit undefined checks (0 is valid)
        const cost = resolveCost(totalTokens, estimatedUSD, prompt, input);

        return {
            data: validatedData,
            tokens: cost.tokens,
            estimatedUSD: cost.estimatedUSD,
        };
    }
}

export const createGroqProvider = (config: GroqProviderConfig) => new GroqProviderImpl(config);

