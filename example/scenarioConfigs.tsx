import React from "react";
import { AnyZodSchema } from "react-ai-query";
import { ScenarioId } from "./scenarios";
import {
  errorSummarySchema,
  feedbackAnalysisSchema,
  contentModerationSchema,
  dataExtractionSchema,
  apiRequestSchema,
  streamingResponseSchema,
  ErrorSummary,
  FeedbackAnalysis,
  ContentModeration,
  DataExtraction,
  ApiRequest,
  StreamingResponse
} from "./schemas";
import { ErrorResult, FeedbackResult, ModerationResult, ExtractionResult, ApiResult, StreamingResult } from "./components/results";

export interface ScenarioConfig<T = unknown> {
  schema: AnyZodSchema;
  fallback: T;
  loadingText: string;
  resultText: string;
  ResultComponent: React.ComponentType<{ data: T }>;
  buildInput: (submittedInput: string, submittedError: unknown, runKey: number) => unknown;
  /** If true, this scenario uses streaming (useAIStream) instead of useAI */
  isStreaming?: boolean;
}

// Type-safe scenario configurations
export const scenarioConfigs: Record<ScenarioId, ScenarioConfig> = {
  error: {
    schema: errorSummarySchema,
    fallback: {
      userFriendlyMessage: "Something went wrong. Please try again.",
      suggestedAction: "Contact support if the problem persists.",
      severity: "error",
      retryable: true,
      technicalContext: "Fallback response - AI unavailable"
    } as ErrorSummary,
    loadingText: "Generating explanation...",
    resultText: "User-Friendly Explanation",
    ResultComponent: ErrorResult as React.ComponentType<{ data: unknown }>,
    buildInput: (_, submittedError, runKey) => ({ error: submittedError, _run: runKey }),
  },
  
  feedback: {
    schema: feedbackAnalysisSchema,
    fallback: {
      sentiment: "neutral",
      urgency: 3,
      category: "other",
      keyPoints: ["Unable to analyze feedback"],
      suggestedAction: "Manual review required"
    } as FeedbackAnalysis,
    loadingText: "Analyzing feedback...",
    resultText: "Analysis Result",
    ResultComponent: FeedbackResult as React.ComponentType<{ data: unknown }>,
    buildInput: (submittedInput, _, runKey) => ({ text: submittedInput, _run: runKey }),
  },
  
  moderation: {
    schema: contentModerationSchema,
    fallback: {
      safe: false,
      confidence: 0,
      flags: ["review_required"],
      reason: "AI unavailable - manual review needed"
    } as ContentModeration,
    loadingText: "Checking content...",
    resultText: "Moderation Result",
    ResultComponent: ModerationResult as React.ComponentType<{ data: unknown }>,
    buildInput: (submittedInput, _, runKey) => ({ content: submittedInput, _run: runKey }),
  },
  
  extraction: {
    schema: dataExtractionSchema,
    fallback: {
      extractedFields: [],
      summary: "Unable to extract data - manual review required"
    } as DataExtraction,
    loadingText: "Extracting data...",
    resultText: "Extracted Data",
    ResultComponent: ExtractionResult as React.ComponentType<{ data: unknown }>,
    buildInput: (submittedInput, _, runKey) => ({ text: submittedInput, _run: runKey }),
  },
  
  api: {
    schema: apiRequestSchema,
    fallback: {
      method: "GET",
      endpoint: "/api/unknown",
      queryParams: [],
      description: "Unable to generate API request - please try again"
    } as ApiRequest,
    loadingText: "Generating API...",
    resultText: "Generated API Request",
    ResultComponent: ApiResult as React.ComponentType<{ data: unknown }>,
    buildInput: (submittedInput, _, runKey) => ({ request: submittedInput, _run: runKey }),
  },
  
  streaming: {
    schema: streamingResponseSchema,
    fallback: {
      content: "Unable to generate response - streaming unavailable",
      wordCount: 0,
      mood: "thoughtful"
    } as StreamingResponse,
    loadingText: "Streaming...",
    resultText: "Streamed Response",
    ResultComponent: StreamingResult as React.ComponentType<{ data: unknown }>,
    buildInput: (submittedInput, _, runKey) => ({ prompt: submittedInput, _run: runKey }),
    isStreaming: true, // Special flag for streaming scenarios
  },
};

