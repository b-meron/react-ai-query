import { useEffect, useState } from "react";
import { AIProvider } from "../../src/core/types";
import { ScenarioId, SCENARIOS, ERROR_EXAMPLES } from "../scenarios";
import { scenarioConfigs } from "../scenarioConfigs";
import { AIResultPanel } from "./AIResultPanel";
import { SystemPromptPreview } from "./SystemPromptPreview";

interface PlaygroundScenarioProps {
  scenarioId: ScenarioId;
  provider: AIProvider;
}

export const PlaygroundScenario = ({ scenarioId, provider }: PlaygroundScenarioProps) => {
  const scenario = SCENARIOS[scenarioId];
  const config = scenarioConfigs[scenarioId];
  const isDropdownInput = scenario.inputType === "dropdown";
  
  // Text input state
  const [input, setInput] = useState<string>(scenario.placeholder);
  const [submittedInput, setSubmittedInput] = useState<string>(scenario.placeholder);
  
  // Error dropdown state
  const [selectedErrorId, setSelectedErrorId] = useState<string>(ERROR_EXAMPLES[0].id);
  const [submittedError, setSubmittedError] = useState(ERROR_EXAMPLES[0].error);
  
  const [runKey, setRunKey] = useState(0);
  
  useEffect(() => {
    setInput(scenario.placeholder);
    setSubmittedInput(scenario.placeholder);
    setSelectedErrorId(ERROR_EXAMPLES[0].id);
    setSubmittedError(ERROR_EXAMPLES[0].error);
    setRunKey(0);
  }, [scenarioId, scenario.placeholder]);

  const selectedError = ERROR_EXAMPLES.find(e => e.id === selectedErrorId) ?? ERROR_EXAMPLES[0];

  const handleSubmit = () => {
    if (isDropdownInput) {
      setSubmittedError(selectedError.error);
    } else {
      setSubmittedInput(input);
    }
    setRunKey(k => k + 1);
  };

  const handleReset = () => {
    if (isDropdownInput) {
      setSelectedErrorId(ERROR_EXAMPLES[0].id);
      setSubmittedError(ERROR_EXAMPLES[0].error);
    } else {
      setInput(scenario.placeholder);
      setSubmittedInput(scenario.placeholder);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400">
          {isDropdownInput ? "Select an Error" : "Your Input"}
        </label>
        
        {isDropdownInput ? (
          <ErrorDropdownInput
            selectedErrorId={selectedErrorId}
            onSelect={setSelectedErrorId}
            selectedError={selectedError}
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-slate-100 placeholder-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
            rows={5}
            placeholder="Enter your text here..."
          />
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!isDropdownInput && !input.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDropdownInput ? "Explain Error" : "Analyze"}
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-200 transition-colors"
          >
            Reset
          </button>
        </div>
        
        {/* System Prompt Preview - shows what actually goes to the AI */}
        <SystemPromptPreview
          appPrompt={scenario.prompt}
          userInput={isDropdownInput ? selectedError.error : input}
          schema={config.schema}
          inputLabel={isDropdownInput ? "Error Object" : "Your Input"}
        />
      </div>

      {/* Result Section */}
      <div className="border-t border-slate-800 pt-4">
        <AIResultPanel
          scenarioId={scenarioId}
          prompt={scenario.prompt}
          input={config.buildInput(submittedInput, submittedError, runKey)}
          schema={config.schema}
          provider={provider}
          fallback={config.fallback}
          loadingText={config.loadingText}
          resultText={config.resultText}
          ResultComponent={config.ResultComponent}
        />
      </div>
    </div>
  );
};

// Extracted error dropdown component
const ErrorDropdownInput = ({
  selectedErrorId,
  onSelect,
  selectedError,
}: {
  selectedErrorId: string;
  onSelect: (id: string) => void;
  selectedError: typeof ERROR_EXAMPLES[0];
}) => {
  const statusColor = (status: number = 500) =>
    status >= 500 ? "bg-red-900/50 text-red-300" :
    status >= 400 ? "bg-amber-900/50 text-amber-300" :
    "bg-blue-900/50 text-blue-300";

  return (
    <div className="space-y-3">
      <select
        value={selectedErrorId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      >
        {ERROR_EXAMPLES.map((example) => (
          <option key={example.id} value={example.id}>
            {example.label}
          </option>
        ))}
      </select>
      
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 font-mono text-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(selectedError.error.status)}`}>
            {selectedError.error.status ?? "ERR"}
          </span>
          <span className="text-slate-400">{selectedError.error.code}</span>
        </div>
        <p className="text-slate-300 mb-1">{selectedError.error.message}</p>
        {selectedError.error.details && (
          <p className="text-slate-500 text-xs">{selectedError.error.details}</p>
        )}
      </div>
    </div>
  );
};
