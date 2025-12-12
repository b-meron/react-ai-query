import apiSchemaSource from "../scenarios/api/schema.ts?raw";
import errorSchemaSource from "../scenarios/error/schema.ts?raw";
import extractionSchemaSource from "../scenarios/extraction/schema.ts?raw";
import feedbackSchemaSource from "../scenarios/feedback/schema.ts?raw";
import moderationSchemaSource from "../scenarios/moderation/schema.ts?raw";
import streamingSchemaSource from "../scenarios/streaming/schema.ts?raw";
import { ScenarioId } from "../scenarios";

const trimSchemaSource = (source: string) => {
  const delimiter = "\nexport type";
  const endIndex = source.indexOf(delimiter);
  return endIndex === -1 ? source.trim() : source.slice(0, endIndex).trim();
};

// Schema source code for each scenario (pulled from each schema file via Vite raw imports)
const SCHEMA_CODE: Record<ScenarioId, string> = {
  api: trimSchemaSource(apiSchemaSource),
  error: trimSchemaSource(errorSchemaSource),
  extraction: trimSchemaSource(extractionSchemaSource),
  feedback: trimSchemaSource(feedbackSchemaSource),
  moderation: trimSchemaSource(moderationSchemaSource),
  streaming: trimSchemaSource(streamingSchemaSource),
};

const USAGE_CODE: Record<ScenarioId, string> = {
  error: `const { data, loading } = useAI<ErrorSummary>({
  prompt: "Explain this error to a non-technical user",
  input: { error: serverError },
  schema: errorSummarySchema,
  fallback: { severity: "error", retryable: true, ... }
});`,

  feedback: `const { data, loading } = useAI<FeedbackAnalysis>({
  prompt: "Analyze this customer feedback",
  input: { text: customerMessage },
  schema: feedbackAnalysisSchema,
  fallback: { sentiment: "neutral", urgency: 3, ... }
});`,

  moderation: `const { data, loading } = useAI<ContentModeration>({
  prompt: "Check if this content is safe",
  input: { content: userContent },
  schema: contentModerationSchema,
  fallback: { safe: false, confidence: 0, flags: ["review_required"] }
});`,

  extraction: `const { data, loading } = useAI<DataExtraction>({
  prompt: "Extract structured data from this text",
  input: { text: emailOrInvoice },
  schema: dataExtractionSchema,
  fallback: { extractedFields: [], summary: "Unable to extract" }
});`,

  api: `const { data, loading } = useAI<ApiRequest>({
  prompt: "Convert this to an API request",
  input: { request: naturalLanguageQuery },
  schema: apiRequestSchema,
  fallback: { method: "GET", endpoint: "/api/unknown", queryParams: [] }
});`,

  streaming: `// ⚡ Streaming with real-time text updates
const { text, data, isStreaming, done, start, abort } = useAIStream({
  prompt: "Write a creative response",
  input: { userPrompt },
  schema: streamingResponseSchema,
  provider: openaiProvider, // Must support streaming
  onChunk: (chunk) => console.log(chunk.delta), // Optional
});

// 'text' updates in real-time as chunks arrive
// 'data' is only available when 'done' is true (schema validated)`
};

interface SchemaViewerProps {
  scenarioId: ScenarioId;
}

export const SchemaViewer = ({ scenarioId }: SchemaViewerProps) => (
  <div className="space-y-4">
    {/* Schema Definition */}
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Schema Definition</p>
      <div className="rounded-lg bg-slate-900/70 p-4 overflow-x-auto">
        <pre className="text-sm text-emerald-300">
          <code>{SCHEMA_CODE[scenarioId]}</code>
        </pre>
      </div>
    </div>
    
    {/* Usage Example */}
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Usage</p>
      <div className="rounded-lg bg-slate-900/70 p-4 overflow-x-auto">
        <pre className="text-sm text-slate-200">
          <code>{USAGE_CODE[scenarioId]}</code>
        </pre>
      </div>
    </div>
  </div>
);

