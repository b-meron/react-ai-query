import { clearSessionCache } from "react-ai-query";
import { ProviderChoice } from "../helpers";

interface HeaderProps {
  providerName: ProviderChoice;
  onProviderChange: (provider: ProviderChoice) => void;
  groqApiKey: string;
  onGroqKeyChange: (key: string) => void;
  openaiApiKey: string;
  onOpenaiKeyChange: (key: string) => void;
}

export const Header = ({
  providerName,
  onProviderChange,
  groqApiKey,
  onGroqKeyChange,
  openaiApiKey,
  onOpenaiKeyChange,
}: HeaderProps) => (
  <header className="border-b border-slate-900 bg-slate-900/60 sticky top-0 z-10 backdrop-blur-sm">
    <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">react-ai-query</p>
        <h1 className="text-xl font-bold text-slate-50">AI-Native, Deterministic, Schema-Safe</h1>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
          value={providerName}
          onChange={(e) => onProviderChange(e.target.value as ProviderChoice)}
        >
          <option value="mock">Mock (deterministic)</option>
          <option value="groq">Groq (free LLM)</option>
          <option value="openai">OpenAI (browser)</option>
          <option value="local">Local (Ollama) ⚠️</option>
        </select>
        {providerName === "groq" && (
          <input
            type="password"
            placeholder="Groq API key"
            value={groqApiKey}
            onChange={(e) => onGroqKeyChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 w-48"
          />
        )}
        {providerName === "openai" && (
          <input
            type="password"
            placeholder="OpenAI API key"
            value={openaiApiKey}
            onChange={(e) => onOpenaiKeyChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 w-48"
          />
        )}
        <button
          onClick={() => clearSessionCache()}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 hover:border-slate-600"
        >
          Clear Cache
        </button>
      </div>
    </div>
  </header>
);

