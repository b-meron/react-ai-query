import React from "react";
import { AIText, AIProvider, AnyZodSchema } from "react-ai-query";
import { CostBadge } from "./CostBadge";
import { ScenarioId } from "../scenarios";

// Loading skeleton configurations
const skeletonConfigs: Record<ScenarioId, React.ReactNode> = {
  error: (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="h-8 bg-slate-800 rounded w-20" />
        <div className="h-8 bg-slate-800 rounded w-24" />
      </div>
      <div className="h-20 bg-slate-800 rounded" />
      <div className="h-12 bg-slate-800 rounded" />
    </div>
  ),
  feedback: (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-slate-800 rounded w-1/3" />
      <div className="h-4 bg-slate-800 rounded w-2/3" />
      <div className="h-4 bg-slate-800 rounded w-1/2" />
    </div>
  ),
  moderation: (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-slate-800 rounded w-1/4" />
      <div className="h-4 bg-slate-800 rounded w-full" />
    </div>
  ),
  extraction: (
    <div className="animate-pulse grid gap-2 sm:grid-cols-2">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-800 rounded" />)}
    </div>
  ),
  api: (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-slate-800 rounded w-1/2" />
      <div className="h-20 bg-slate-800 rounded" />
    </div>
  ),
  streaming: (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-800 rounded w-full" />
      <div className="h-4 bg-slate-800 rounded w-5/6" />
      <div className="h-4 bg-slate-800 rounded w-4/6" />
    </div>
  ),
};

interface AIResultPanelProps<T> {
  scenarioId: ScenarioId;
  prompt: string;
  input: unknown;
  schema: AnyZodSchema;
  provider: AIProvider;
  fallback: T;
  loadingText: string;
  resultText: string;
  ResultComponent: React.ComponentType<{ data: T }>;
}

export function AIResultPanel<T>({
  scenarioId,
  prompt,
  input,
  schema,
  provider,
  fallback,
  loadingText,
  resultText,
  ResultComponent,
}: AIResultPanelProps<T>) {
  return (
    <AIText<T>
      key={scenarioId} // Force remount when scenario changes to clear stale data
      prompt={prompt}
      input={input}
      schema={schema}
      provider={provider}
      cache="session"
      fallback={fallback}
    >
      {(data, meta) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              {meta.loading ? loadingText : resultText}
            </p>
            <CostBadge 
              tokens={meta.tokens} 
              usd={meta.estimatedUSD} 
              fromCache={meta.fromCache} 
              usedFallback={meta.usedFallback} 
            />
          </div>
          
          {meta.error ? (
            <p className="text-red-400">Error: {meta.error.message}</p>
          ) : meta.loading ? (
            skeletonConfigs[scenarioId]
          ) : data ? (
            <ResultComponent data={data} />
          ) : null}
          
          {meta.usedFallback && (
            <p className="text-sm text-amber-400">⚠️ AI unavailable: {meta.fallbackReason}</p>
          )}
        </div>
      )}
    </AIText>
  );
}

