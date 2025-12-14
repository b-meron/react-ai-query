# react ai query

[![CI](https://github.com/b-meron/react-ai-query/actions/workflows/ci.yml/badge.svg)](https://github.com/b-meron/react-ai-query/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-ai-query.svg)](https://www.npmjs.com/package/react-ai-query)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Schema-safe AI inference for React** — headless, cached, cost-aware, deterministic by default.

> Think of it as **React Query for AI**: declare what you need, get typed data back.

**[▶️ Try the Live Demo](https://b-meron.github.io/react-ai-query/)**

## Table of Contents

- [Problem](#problem)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Principles](#core-principles)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
  - [Hooks](#hooks)
  - [Components](#components)
  - [Providers](#providers)
  - [Utilities](#utilities)
  - [Types](#types)
- [Advanced Usage](#advanced-usage)
  - [Controlling Output](#controlling-output-with-maxtokens-and-provideroptions)
  - [Custom Providers](#custom-providers)
  - [Security: API Keys in Production](#security-api-keys-in-production)
- [Examples](#examples)
- [Comparison](#comparison)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

## Problem

Raw AI output is unsafe to render in UI. You need:

- ✅ **Deterministic responses** — same input → same output
- ✅ **Strict schema validation** — Zod-validated, typed results
- ✅ **Cost awareness** — token counting, caching, and usage insights
- ✅ **Headless rendering** — you control the DOM, not the library
- ✅ **Streaming support** — real-time responses with schema validation

This library enforces all of these guarantees.

## Installation

```bash
npm install react-ai-query zod react
```

## Quick Start

### Standard (Non-Streaming)

```tsx
import { z } from "zod";
import { AIText } from "react-ai-query";

export function ErrorSummary({ error }: { error: Error }) {
  return (
    <AIText
      prompt="Explain this error to a non-technical user"
      input={{ error }}
      schema={z.string()}
    >
      {(text, { loading, error: aiError }) =>
        loading ? "Loading…" : aiError ? "AI failed safely" : text
      }
    </AIText>
  );
}
```

### With Streaming

```tsx
import { z } from "zod";
import { useAIStream, createOpenAIProvider } from "react-ai-query";

const provider = createOpenAIProvider({ apiKey: "..." });

export function StreamingSummary({ error }: { error: Error }) {
  const { text, done, isStreaming } = useAIStream({
    prompt: "Explain this error to a non-technical user",
    input: { error },
    schema: z.string(),
    provider,
  });

  return (
    <p className={isStreaming ? "animate-pulse" : ""}>
      {text}
      {done && " ✓"}
    </p>
  );
}
```

## Core Principles

| Principle         | Implementation                                           |
| ----------------- | -------------------------------------------------------- |
| **Deterministic** | Temperature defaults to `0`, inputs sanitized            |
| **Schema-safe**   | Auto schema injection + Zod validation before rendering  |
| **Fail-safe**     | Retries + timeouts + typed errors + observable fallbacks |
| **Headless**      | Render props only — no UI opinions                       |
| **Cost-aware**    | Token counting and session caching                       |
| **Pluggable**     | Mock, OpenAI, Groq, local LLM, or custom providers       |
| **Streaming**     | Real-time responses with `useAIStream` and `<AIStream>`  |

## How It Works

When you provide a Zod schema, react-ai-query automatically:

1. **Converts** your schema to a human-readable JSON example
2. **Injects** it into the LLM prompt — the AI knows exactly what format to return
3. **Validates** the response against your schema
4. **Returns** typed, safe data to your component

```tsx
// You write this:
schema: z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

// The LLM receives:
// "Required format: {"summary":"string","sentiment":"positive | neutral | negative"}"
```

You declare intent, we handle the rest.

---

## API Reference

### Hooks

#### `useAI<T>(options): UseAIResult<T>`

The primary hook for non-streaming AI inference.

```tsx
import { useAI } from "react-ai-query";
import { z } from "zod";

const {
  data, // T | undefined - validated response data
  loading, // boolean - request in progress
  error, // AIError | undefined - error if failed
  cost, // CostBreakdown | undefined - { tokens }
  fromCache, // boolean | undefined - served from cache?
  usedFallback, // boolean | undefined - fallback was used?
  fallbackReason, // string | undefined - why fallback triggered
  refresh, // () => Promise<void> - manually re-execute
} = useAI({
  // Required
  prompt: "Explain this error",
  schema: z.string(),

  // Optional
  input: { error }, // Context data
  provider: mockProvider, // Default: mockProvider
  temperature: 0, // Default: 0 (deterministic)
  maxTokens: 500, // Limit output length (prevents runaway)
  cache: "session", // "session" | false
  timeoutMs: 15000, // Default: 15000ms
  retry: 1, // Retry attempts after first failure
  fallback: "Default text", // Value to use on failure
  providerOptions: {
    // Pass additional options to provider
    topP: 0.9,
    frequencyPenalty: 0.5,
  },
});
```

#### `useAIStream<T>(options): UseAIStreamResult<T>`

Real-time streaming hook powered by [Vercel AI SDK](https://sdk.vercel.ai) core primitives.

```tsx
import { useAIStream, createOpenAIProvider } from "react-ai-query";
import { z } from "zod";

const provider = createOpenAIProvider({ apiKey: "..." });

const {
  text, // string - raw streaming text (updates real-time)
  data, // T | undefined - validated data (when done)
  isStreaming, // boolean - currently streaming?
  done, // boolean - stream complete?
  loading, // boolean - initial loading state
  error, // AIError | undefined - error if failed
  cost, // CostBreakdown | undefined - available when done
  start, // () => Promise<void> - start/restart stream
  abort, // () => void - abort current stream
  refresh, // () => Promise<void> - alias for start
} = useAIStream({
  // Required
  prompt: "Write a haiku about React",
  schema: z.object({ haiku: z.string() }),
  provider,

  // Optional
  input: { topic: "hooks" },
  temperature: 0, // Default: 0
  maxTokens: 500, // Limit output length (prevents runaway)
  timeoutMs: 30000, // Default: 30000ms
  retry: 1, // Retry attempts
  fallback: { haiku: "..." }, // Fallback value
  onChunk: (chunk) => {}, // Called on each chunk
  manual: false, // If true, don't auto-start
  providerOptions: { topP: 0.9 }, // Additional provider options
});
```

---

### Components

#### `<AIText />`

Headless render-prop component wrapping `useAI`:

```tsx
import { AIText } from "react-ai-query";
import { z } from "zod";

<AIText
  prompt="Summarize this article"
  input={{ article }}
  schema={z.string()}
  provider={openaiProvider}
  fallback="Summary unavailable"
>
  {(
    data,
    { loading, error, cost, fromCache, usedFallback, fallbackReason, refresh }
  ) => (loading ? <Spinner /> : <p>{data}</p>)}
</AIText>;
```

#### `<AIStream />`

Declarative streaming component with render props:

```tsx
import { AIStream, createGroqProvider } from "react-ai-query";
import { z } from "zod";

const provider = createGroqProvider({ apiKey: "..." });

<AIStream
  prompt="Write a short story about a robot"
  schema={z.object({ story: z.string() })}
  provider={provider}
  onChunk={(chunk) => console.log("Delta:", chunk.delta)}
>
  {(text, data, { isStreaming, done, error, cost, start, abort }) => (
    <div>
      {isStreaming && <span className="animate-spin">⏳</span>}
      <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>
      {done && <p className="text-green-500">✓ Complete</p>}
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  )}
</AIStream>;
```

---

### Providers

| Provider               | Use Case                                              |
| ---------------------- | ----------------------------------------------------- |
| `mockProvider`         | Development, deterministic, zero cost                 |
| `createGroqProvider`   | Free cloud LLMs via Groq, uses `llama-3.1-8b-instant` |
| `createOpenAIProvider` | Production, uses `gpt-4o-mini` by default             |
| `createLocalProvider`  | Local LLMs (Ollama, LM Studio), $0 cost               |
| Custom                 | Implement `AIProvider` interface                      |

#### Groq Provider (Free)

Groq offers free API access with fast inference. Get a free key at [console.groq.com](https://console.groq.com):

```tsx
import { createGroqProvider, useAI } from "react-ai-query";

const groqProvider = createGroqProvider({ apiKey: "your-groq-api-key" });

const { data } = useAI({
  prompt: "Summarize this text",
  input: { text },
  schema: z.string(),
  provider: groqProvider,
});
```

#### OpenAI Provider

```tsx
import { createOpenAIProvider, useAI } from "react-ai-query";

const openaiProvider = createOpenAIProvider({
  apiKey: "your-openai-api-key",
  model: "gpt-4o-mini", // optional, this is the default
});

const { data } = useAI({
  prompt: "Analyze this data",
  input: { data },
  schema: z.object({ summary: z.string() }),
  provider: openaiProvider,
});
```

#### Local Provider (Ollama, LM Studio)

```tsx
import { createLocalProvider, useAI } from "react-ai-query";

const localProvider = createLocalProvider({
  endpoint: "http://localhost:11434/v1/chat/completions", // Ollama default
  model: "llama3",
});

const { data } = useAI({
  prompt: "Explain this concept",
  schema: z.string(),
  provider: localProvider,
});
```

---

### Utilities

#### `caseInsensitiveEnum(values)`

LLMs often return enum values in different cases. Use this helper for case-insensitive enum validation:

```tsx
import { caseInsensitiveEnum } from "react-ai-query";
import { z } from "zod";

const schema = z.object({
  sentiment: caseInsensitiveEnum(["positive", "neutral", "negative"]),
});

// All of these will validate successfully:
// { sentiment: "positive" }
// { sentiment: "POSITIVE" }
// { sentiment: "Positive" }
```

#### `zodToJsonExample(schema)`

Converts a Zod schema to the JSON example string injected into LLM prompts. Useful for debugging or custom providers:

```tsx
import { zodToJsonExample } from "react-ai-query";
import { z } from "zod";

const schema = z.object({
  approved: z.boolean(),
  reason: z.string(),
});

console.log(zodToJsonExample(schema));
// {"approved":true,"reason":"string"}
```

#### `clearSessionCache()`

Clears the in-memory session cache. Useful for testing or when you want to force fresh AI calls:

```tsx
import { clearSessionCache } from "react-ai-query";

// Clear all cached AI responses
clearSessionCache();
```

#### Provider Utilities

These utilities are exported for custom provider authors:

| Utility                                                                      | Description                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `isPrimitiveSchema(schema)`                                                  | Returns `true` if schema is string, number, or boolean |
| `getPrimitiveTypeName(schema)`                                               | Returns `"string"`, `"number"`, `"boolean"`, or `null` |
| `buildSystemPrompt(isPrimitive)`                                             | Builds the system prompt for LLM requests              |
| `buildUserContent(prompt, input, schemaExample, isPrimitive, primitiveType)` | Builds user message content                            |
| `parseAndValidateResponse(content, schema, isPrimitive, providerName)`       | Parses and validates non-streaming response            |
| `parseAndValidateStreamResponse(content, schema, providerName)`              | Parses and validates streaming response                |
| `safeJsonParse(content)`                                                     | Safely parses JSON, returns `undefined` on failure     |
| `unwrapLLMResponse(parsed, schema)`                                          | Unwraps common LLM wrappers like `{"data": ...}`       |

---

### Types

All types are exported from the main package:

```tsx
import type {
  // Hook types
  UseAIOptions,
  UseAIResult,
  UseAIStreamOptions,
  UseAIStreamResult,

  // Provider types
  AIProvider,
  AIStreamProvider,
  AIExecutionResult,
  ProviderExecuteArgs,
  StreamExecuteArgs,
  StreamChunk,

  // Common types
  AIError,
  ErrorCode,
  CostBreakdown,
  CachePolicy,
  AnyZodSchema,
} from "react-ai-query";
```

#### `AIProvider`

Base interface for non-streaming providers:

```tsx
interface AIProvider {
  name: string;
  execute<T>(args: ProviderExecuteArgs): Promise<AIExecutionResult<T>>;
}
```

#### `AIStreamProvider`

Extended interface for streaming providers:

```tsx
interface AIStreamProvider extends AIProvider {
  supportsStreaming: boolean;
  executeStream<T>(args: StreamExecuteArgs): Promise<AIExecutionResult<T>>;
}
```

#### `ProviderExecuteArgs`

Arguments passed to provider's `execute` method:

```tsx
interface ProviderExecuteArgs {
  prompt: string;
  input?: unknown;
  schema: AnyZodSchema;
  temperature: number;
  maxTokens?: number; // Limit output length
  providerOptions?: Record<string, unknown>; // Additional provider options
  signal?: AbortSignal;
}
```

#### `StreamExecuteArgs`

Arguments for streaming execution (extends `ProviderExecuteArgs`):

```tsx
interface StreamExecuteArgs extends ProviderExecuteArgs {
  onChunk: (chunk: StreamChunk) => void;
}
```

#### `StreamChunk`

Represents a streaming chunk:

```tsx
interface StreamChunk {
  text: string; // Accumulated text so far
  delta: string; // Just the new content
  done: boolean; // Whether stream is complete
}
```

#### `AIExecutionResult<T>`

Result from provider execution:

```tsx
interface AIExecutionResult<T> {
  data: T;
  tokens: number;
  fromCache?: boolean;
  usedFallback?: boolean;
  fallbackReason?: string;
}
```

#### `CostBreakdown`

Cost information returned from hooks:

```tsx
interface CostBreakdown {
  tokens: number;
}
```

#### `AIError`

Custom error class with categorized error codes:

```tsx
class AIError extends Error {
  code: ErrorCode;
  cause?: unknown;

  constructor(message: string, code: ErrorCode, cause?: unknown);
}
```

#### `ErrorCode`

Categorized error codes:

```tsx
type ErrorCode =
  | "validation_error" // Schema validation failed
  | "provider_error" // Provider returned error
  | "timeout" // Request timed out
  | "fallback" // Fallback value was used
  | "configuration"; // Missing/invalid config
```

#### `CachePolicy`

Cache configuration options:

```tsx
type CachePolicy = "session" | false;
```

#### `AnyZodSchema`

Generic Zod schema type for parameters:

```tsx
type AnyZodSchema = ZodType<any, any, any>;
```

---

## Advanced Usage

### Controlling Output with `maxTokens` and `providerOptions`

You can control how the AI generates responses using `maxTokens` (first-class) and `providerOptions` (escape hatch for any provider-specific options):

```tsx
const { text } = useAIStream({
  prompt: "Write a poem",
  schema: z.string(),
  provider,

  // First-class option - limit output length
  maxTokens: 100, // Prevents runaway responses

  // Escape hatch - any provider-specific options
  providerOptions: {
    topP: 0.9, // Nucleus sampling
    frequencyPenalty: 0.5, // Reduce repetition
    presencePenalty: 0.3, // Encourage new topics
    seed: 42, // Reproducibility
    stop: ["\n\n"], // Stop sequences
  },
});
```

| Option            | Type                      | Description                                   |
| ----------------- | ------------------------- | --------------------------------------------- |
| `maxTokens`       | `number`                  | Maximum tokens to generate (prevents runaway) |
| `providerOptions` | `Record<string, unknown>` | Passed directly to provider API               |

**Common `providerOptions`:**

| Option             | Description                           |
| ------------------ | ------------------------------------- |
| `topP`             | Nucleus sampling (0-1)                |
| `topK`             | Top-k sampling                        |
| `frequencyPenalty` | Penalize repeated tokens              |
| `presencePenalty`  | Penalize tokens that already appeared |
| `stop`             | Stop sequences (array of strings)     |
| `seed`             | For reproducibility                   |
| `logitBias`        | Adjust token probabilities            |

These options are passed through to all providers (OpenAI, Groq, Local). Unknown options are ignored by providers that don't support them.

### Custom Providers

You can create custom providers by implementing the `AIProvider` interface:

```tsx
import type {
  AIProvider,
  ProviderExecuteArgs,
  AIExecutionResult,
} from "react-ai-query";
import {
  AIError,
  zodToJsonExample,
  parseAndValidateResponse,
  isPrimitiveSchema,
} from "react-ai-query";

const customProvider: AIProvider = {
  name: "custom",

  async execute<T>({
    prompt,
    input,
    schema,
    temperature,
    signal,
  }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    // Build request using exported utilities
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);

    // Make your API call
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        input,
        schemaExample,
        temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new AIError("Custom provider failed", "provider_error");
    }

    const { content, tokens } = await response.json();

    // Parse and validate using exported utility
    const data = parseAndValidateResponse<T>(
      content,
      schema,
      isPrimitive,
      "Custom"
    );

    return {
      data,
      tokens: tokens ?? 0,
    };
  },
};

// Usage
const { data } = useAI({
  prompt: "Analyze this",
  schema: z.object({ summary: z.string() }),
  provider: customProvider,
});
```

For streaming providers, also implement `AIStreamProvider`:

```tsx
import type { AIStreamProvider, StreamExecuteArgs } from "react-ai-query";
import {
  zodToJsonExample,
  isPrimitiveSchema,
  getPrimitiveTypeName,
  buildSystemPrompt,
  buildUserContent,
  parseAndValidateStreamResponse,
} from "react-ai-query";

const streamingProvider: AIStreamProvider = {
  name: "custom-streaming",
  supportsStreaming: true,

  async execute<T>(args) {
    /* same as above */
  },

  async executeStream<T>({
    prompt,
    input,
    schema,
    temperature,
    signal,
    onChunk,
  }: StreamExecuteArgs) {
    // Use utility functions to build prompts
    const schemaExample = zodToJsonExample(schema);
    const isPrimitive = isPrimitiveSchema(schema);
    const primitiveType = getPrimitiveTypeName(schema);
    const systemPrompt = buildSystemPrompt(isPrimitive);
    const userContent = buildUserContent(
      prompt,
      input,
      schemaExample,
      isPrimitive,
      primitiveType
    );

    // Stream from your API...
    let fullText = "";
    for await (const chunk of yourStreamingAPI(systemPrompt, userContent)) {
      fullText += chunk;
      onChunk({ text: fullText, delta: chunk, done: false });
    }
    onChunk({ text: fullText, delta: "", done: true });

    // Validate final result
    const data = parseAndValidateStreamResponse<T>(fullText, schema, "Custom");

    return { data, tokens: 100 };
  },
};
```

### Security: API Keys in Production

> **Important:** Never expose API keys directly in browser code for production applications.

The examples in this documentation use client-side keys for simplicity, but in production you should **proxy requests through your backend** to keep keys secure.

#### Option 1: Next.js API Route (App Router)

Create a route handler at `app/api/ai/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Secure server-side key
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch AI response" },
      { status: 500 }
    );
  }
}
```

#### Option 2: Express Proxy

```ts
import express from "express";
import fetch from "node-fetch"; // Required for Node < 18

const app = express();
app.use(express.json());

app.post("/api/ai", async (req, res) => {
  try {
    const { messages, model } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        temperature: 0,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error" });
  }
});

app.listen(3001);
```

#### Custom Provider for Proxy

Define a provider in your frontend that calls your secure endpoint:

```tsx
import type {
  AIProvider,
  ProviderExecuteArgs,
  AIExecutionResult,
} from "react-ai-query";
import { safeJsonParse, unwrapLLMResponse } from "react-ai-query";

export const proxyProvider: AIProvider = {
  name: "proxy",

  async execute<T>({
    prompt,
    input,
    schema,
  }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nInput: ${JSON.stringify(input)}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error("Proxy call failed");

    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content || "";

    // Parse and unwrap the response
    const parsed = safeJsonParse(contentStr);
    const unwrapped = unwrapLLMResponse(parsed, schema);

    // Validate against schema
    const validated = schema.safeParse(unwrapped);
    if (!validated.success) {
      throw new Error("Invalid response from AI");
    }

    return {
      data: validated.data as T,
      tokens: data.usage?.total_tokens || 0,
    };
  },
};

// Usage
const { data } = useAI({
  prompt: "Analyze this",
  schema: z.object({ summary: z.string() }),
  provider: proxyProvider, // ✅ Secure!
});
```

---

## LLM Quirk Handling

LLMs sometimes return unexpected formats. react-ai-query handles common quirks automatically:

| Quirk                                        | Handling                             |
| -------------------------------------------- | ------------------------------------ |
| Wrapped responses (`{"data": ...}`)          | Auto-unwrapped                       |
| Other wrappers (`{"result": ...}`, etc.)     | Auto-unwrapped for primitive schemas |
| Extra text after JSON (`{...}\n\nNote: ...`) | Extracted JSON, ignored text         |
| Extra whitespace                             | Trimmed before parsing               |
| Enum casing (`"POSITIVE"` vs `"positive"`)   | **Opt-in** via `caseInsensitiveEnum` |
| Primitive schemas (string, number, boolean)  | Smart prompts to avoid JSON wrapping |

---

## Fallback Observability

When AI fails (timeout, validation error, provider error), the library gracefully falls back to your default value. You can **observe** when this happens:

```tsx
const { data, usedFallback, fallbackReason } = useAI({
  prompt: "Summarize this article",
  input: { article },
  schema: z.string(),
  fallback: "Summary unavailable",
});

// Know when fallback was used
if (usedFallback) {
  console.log(`AI failed: ${fallbackReason}`);
  // e.g., "AI call timed out" or "Provider returned invalid shape"
}
```

| Field            | Type      | Description                               |
| ---------------- | --------- | ----------------------------------------- |
| `usedFallback`   | `boolean` | `true` if AI failed and fallback was used |
| `fallbackReason` | `string`  | Why the fallback was triggered            |

---

## Cost Model

- **Token estimation**: `ceil(prompt.length/4) + ceil(input.length/4) + 8`
- **Provider-reported tokens**: When a provider shares `usage.total_tokens` we prefer the real count; only providers that don't report usage fall back to the heuristic.
- **Token-only reporting**: Cost is surfaced as tokens so you can map it to your provider pricing.
- **Cache hits**: Cached responses return `tokens: 0` since no new model call is made once `fromCache` is `true`.
- **Session caching**: Enabled by default, avoids repeated API calls
- **Real usage**: If provider returns actual token count, it's used instead

---

## Examples

### Error Explanation

```tsx
<AIText
  prompt="Explain this error to a non-technical user"
  input={{ error }}
  schema={z.string()}
>
  {(text, { loading }) => (loading ? "Loading…" : text)}
</AIText>
```

### Feature Gating

```tsx
const { data: enabled } = useAI({
  prompt: "Should this user see the beta feature?",
  input: { usage, plan, behavior },
  schema: z.boolean(),
});
```

### Structured Decisions

```tsx
<AIText
  prompt="Decide if this expense should be approved"
  input={{ user, amount, vendor, history }}
  schema={z.object({ approve: z.boolean(), reason: z.string() })}
>
  {(decision, { loading }) =>
    loading ? (
      "Evaluating…"
    ) : (
      <div>
        <p>{decision?.approve ? "✅ Approved" : "❌ Rejected"}</p>
        <p>{decision?.reason}</p>
      </div>
    )
  }
</AIText>
```

### Streaming Response

```tsx
import { useAIStream, createOpenAIProvider } from "react-ai-query";
import { z } from "zod";

const provider = createOpenAIProvider({ apiKey: "..." });

function StreamingExplanation({ topic }: { topic: string }) {
  const { text, done, isStreaming, abort } = useAIStream({
    prompt: `Explain ${topic} in simple terms`,
    schema: z.object({ explanation: z.string() }),
    provider,
  });

  return (
    <div>
      <p className={isStreaming ? "animate-pulse" : ""}>{text}</p>
      {isStreaming && <button onClick={abort}>Stop</button>}
      {done && <span className="text-green-500">✓</span>}
    </div>
  );
}
```

### Typewriter Effect

```tsx
function TypewriterDemo() {
  const [chars, setChars] = useState<string[]>([]);

  const { text } = useAIStream({
    prompt: "Explain quantum computing in one paragraph",
    schema: z.object({ explanation: z.string() }),
    provider,
    onChunk: (chunk) => {
      // Animate each character as it arrives
      if (chunk.delta) {
        setChars((prev) => [...prev, chunk.delta]);
      }
    },
  });

  return (
    <p className="font-mono">
      {chars.map((char, i) => (
        <span key={i} className="animate-fade-in">
          {char}
        </span>
      ))}
      <span className="animate-blink">|</span>
    </p>
  );
}
```

---

## Provider Contract

Providers return JSON, never React components:

```json
{
  "data": "Your validated result",
  "tokens": 42
}
```

Rendering is always client-side via `useAI()` or `<AIText />`.

---

## Comparison

| Feature                 | react-ai-query | Vercel AI SDK   | CopilotKit | LangChain.js  | Instructor        |
| ----------------------- | -------------- | --------------- | ---------- | ------------- | ----------------- |
| Schema validation (Zod) | ✅ Built-in    | ✅ Yes          | ❌ No      | ❌ Manual     | ✅ Yes            |
| React hooks/components  | ✅ Yes         | ✅ Yes          | ✅ Yes     | ❌ No         | ❌ No             |
| Headless render props   | ✅ Yes         | ❌ No           | ❌ No      | ❌ No         | ❌ No             |
| Streaming support       | ✅ Built-in    | ✅ Yes          | ✅ Yes     | ✅ Yes        | ❌ No             |
| Session caching         | ✅ Built-in    | ❌ Manual       | ❌ No      | ❌ Manual     | ❌ No             |
| Cost tracking           | ✅ Built-in    | ❌ No           | ❌ No      | ❌ No         | ❌ No             |
| Deterministic default   | ✅ temp=0      | ❌ No           | ❌ No      | ❌ No         | ❌ No             |
| Fallback values         | ✅ Built-in    | ❌ Manual       | ❌ No      | ❌ Manual     | ❌ No             |
| Focus                   | Data inference | Infra/streaming | Chat UI    | Orchestration | Structured output |

---

## Development

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Build library
npm run typecheck # Type check
npm run test      # Run tests
```

Demo page in `DemoPage.tsx` shows all features.

---

## Roadmap

- [x] Streaming support (`useAIStream`, `<AIStream>`)
- [ ] `<AIForm />` — AI-assisted form validation
- [ ] `<AIDecision />` — boolean decisions with reasoning
- [ ] Multi-step inference chains
- [ ] Tool/function calling
- [ ] Devtools & debug panel

---

## License

MIT
