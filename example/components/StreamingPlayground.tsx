import { useState, useEffect } from "react";
import { AIStreamProvider, useAIStream } from "react-ai-query";
import { SCENARIOS } from "../scenarios";
import { scenarioConfigs } from "../scenarioConfigs";
import { StreamingResponse } from "../schemas";
import { CostBadge } from "./CostBadge";
import { SystemPromptPreview } from "./SystemPromptPreview";

interface StreamingPlaygroundProps {
  provider: AIStreamProvider;
}

export const StreamingPlayground = ({ provider }: StreamingPlaygroundProps) => {
  const scenario = SCENARIOS.streaming;
  const config = scenarioConfigs.streaming;
  
  const [input, setInput] = useState(scenario.placeholder);
  const [submittedInput, setSubmittedInput] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  
  // Provider options state - default 500 tokens to allow for JSON structure completion
  const [maxTokens, setMaxTokens] = useState<number | undefined>(500);
  const [temperature, setTemperature] = useState(0);
  const [topP, setTopP] = useState(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);

  // Use the scenario prompt directly - the library handles JSON formatting via schema
  // No need to manually specify JSON format - that's the whole point of using schemas!
  const { 
    text, 
    data, 
    isStreaming, 
    done, 
    loading, 
    error, 
    cost, 
    start, 
    abort 
  } = useAIStream<StreamingResponse>({
    prompt: scenario.prompt,
    input: config.buildInput(submittedInput, null, 0),
    schema: config.schema,
    provider,
    manual: true,
    fallback: config.fallback as StreamingResponse,
    temperature,
    maxTokens,
    providerOptions: {
      top_p: topP,
      frequency_penalty: frequencyPenalty,
    },
  });

  // Trigger start() after state has been updated
  useEffect(() => {
    if (pendingStart && submittedInput) {
      setPendingStart(false);
      start();
    }
  }, [pendingStart, submittedInput, start]);

  const handleStart = () => {
    setSubmittedInput(input);
    setHasStarted(true);
    setPendingStart(true);
  };

  const handleReset = () => {
    setInput(scenario.placeholder);
    setSubmittedInput("");
    setHasStarted(false);
    abort();
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Your Prompt</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-slate-100 placeholder-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
          rows={3}
          placeholder="Enter your prompt..."
          disabled={isStreaming}
        />
        
        <div className="flex gap-2">
          {!isStreaming ? (
            <button
              onClick={handleStart}
              disabled={!input.trim() || !provider.supportsStreaming}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <span>⚡</span>
              {hasStarted && done ? "Regenerate" : "Start Streaming"}
            </button>
          ) : (
            <button
              onClick={abort}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors flex items-center gap-2"
            >
              <span>■</span>
              Stop
            </button>
          )}
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-200 transition-colors"
          >
            Reset
          </button>
        </div>

        {!provider.supportsStreaming && (
          <p className="text-xs text-amber-400">
            ⚠️ Current provider doesn't support streaming. Switch to OpenAI or Groq.
          </p>
        )}

        {/* Options Toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1"
        >
          <span>{showOptions ? "▼" : "▶"}</span>
          <span>Model Options</span>
        </button>

        {/* Options Panel */}
        {showOptions && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Max Tokens */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Max Tokens: {maxTokens ?? "unlimited"}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={maxTokens ?? 500}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                  disabled={isStreaming}
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                  disabled={isStreaming}
                />
              </div>

              {/* Top P */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Top P: {topP}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                  disabled={isStreaming}
                />
              </div>

              {/* Frequency Penalty */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Frequency Penalty: {frequencyPenalty}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={frequencyPenalty}
                  onChange={(e) => setFrequencyPenalty(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                  disabled={isStreaming}
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              These options are passed via <code className="text-emerald-400">maxTokens</code> and <code className="text-emerald-400">providerOptions</code>
            </p>
          </div>
        )}

        {/* System Prompt Preview - shows what actually goes to the AI */}
        <SystemPromptPreview
          appPrompt={scenario.prompt}
          userInput={input}
          schema={config.schema}
          inputLabel="Your Prompt"
        />
      </div>

      {/* Streaming Result Section */}
      <div className="border-t border-slate-800 pt-4">
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isStreaming && (
              <span className="flex items-center gap-2 text-emerald-400 text-sm">
                <span className="animate-pulse">●</span>
                Streaming...
              </span>
            )}
            {done && !isStreaming && (
              <span className="flex items-center gap-2 text-emerald-400 text-sm">
                <span>✓</span>
                Complete
              </span>
            )}
            {loading && !isStreaming && !done && (
              <span className="text-slate-400 text-sm">Waiting to start...</span>
            )}
          </div>
          {cost && <CostBadge tokens={cost.tokens} usd={cost.estimatedUSD} />}
        </div>

        {/* Live Text Display */}
        {(hasStarted || text) && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 min-h-[120px]">
            {text ? (
              <div className="space-y-3">
                <pre className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {text}
                  {isStreaming && <span className="animate-pulse text-emerald-400">▌</span>}
                </pre>
              </div>
            ) : (
              <p className="text-slate-500 italic">
                {loading ? "Connecting..." : "No response yet"}
              </p>
            )}
          </div>
        )}

        {/* Final Validated Data */}
        {done && data && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-400">Validated Result:</p>
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-900/50 text-emerald-300">
                  {data.mood}
                </span>
                <span className="text-slate-500 text-sm">{data.wordCount} words</span>
              </div>
              <p className="text-slate-200 whitespace-pre-wrap">{data.content}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/20 p-4">
            <p className="text-red-400 text-sm">
              <span className="font-medium">Error:</span> {error.message}
            </p>
            <p className="text-red-500/70 text-xs mt-1">Code: {error.code}</p>
          </div>
        )}
      </div>
    </div>
  );
};

