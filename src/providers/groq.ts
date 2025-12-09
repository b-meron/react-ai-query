import { AIExecutionResult, AIProvider, ProviderExecuteArgs, AIError } from "../core/types";
import { deriveCost, estimateUSD } from "../core/cost";
import { stableStringify, zodToJsonExample, isPrimitiveSchema, getPrimitiveTypeName, unwrapLLMResponse } from "../core/utils";

export interface GroqProviderConfig {
    apiKey?: string;
    model?: string;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant"; // Free, fast model

const safeJsonParse = (value: string): unknown => {
    try {
        return JSON.parse(value);
    } catch {
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

class GroqProviderImpl implements AIProvider {
    name = "groq";
    private config: GroqProviderConfig;

    constructor(config: GroqProviderConfig = {}) {
        this.config = config;
    }

    async execute<T>({ prompt, input, schema, temperature, signal }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            throw new AIError("Groq API key is required. Get a free key at console.groq.com", "configuration");
        }

        const model = this.config.model ?? DEFAULT_MODEL;
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
                "Use lowercase for enum values.",
                "DO NOT add notes, explanations, or any text outside the JSON.",
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
                stream: false
            }),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            throw new AIError(`Groq API error: ${response.status} - ${errorText}`, "provider_error");
        }

        const payload = await response.json();
        const messageContent = payload?.choices?.[0]?.message?.content;

        // For primitives, try to use raw content first
        let data: unknown;
        if (isPrimitive) {
            // Try raw string first for string schemas
            const trimmed = typeof messageContent === "string" ? messageContent.trim() : messageContent;
            if (schema.safeParse(trimmed).success) {
                data = trimmed;
            } else {
                // Fall back to parsing and unwrapping
                const parsed = typeof messageContent === "string" ? safeJsonParse(messageContent) : messageContent;
                data = unwrapLLMResponse(parsed, schema);
            }
        } else {
            const parsed = typeof messageContent === "string" ? safeJsonParse(messageContent) : messageContent;
            data = unwrapLLMResponse(parsed, schema);
        }

        const validated = schema.safeParse(data);
        if (!validated.success) {
            throw new AIError("Groq returned invalid schema", "validation_error", validated.error);
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

export const createGroqProvider = (config: GroqProviderConfig = {}) => new GroqProviderImpl(config);

