import { useEffect, useMemo, useState } from "react";
import {
  createGroqProvider,
  createOpenAIProvider,
  createLocalProvider,
  mockProvider,
  type AIProvider,
  type AIStreamProvider,
} from "react-ai-query";
import { GROQ_KEY_STORAGE, OPENAI_KEY_STORAGE, ProviderChoice } from "./helpers";
import { SCENARIOS, ScenarioId } from "./scenarios";
import { scenarioConfigs } from "./scenarioConfigs";
import {
  Header,
  Footer,
  Section,
  ScenarioTab,
  PlaygroundScenario,
  StreamingPlayground,
  FeatureCard,
  FEATURES,
  SchemaViewer,
} from "./components";

const isAIStreamProvider = (provider: AIProvider): provider is AIStreamProvider => {
  const candidate = provider as AIStreamProvider;
  return candidate.supportsStreaming === true && typeof candidate.executeStream === "function";
};

export default function DemoPage() {
  // Provider state
  const [providerName, setProviderName] = useState<ProviderChoice>("mock");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("error");

  // Load saved API keys
  useEffect(() => {
    const savedGroqKey = localStorage.getItem(GROQ_KEY_STORAGE);
    const savedOpenaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (savedGroqKey) setGroqApiKey(savedGroqKey);
    if (savedOpenaiKey) setOpenaiApiKey(savedOpenaiKey);
  }, []);

  // Save API keys
  const handleGroqKeyChange = (key: string) => {
    setGroqApiKey(key);
    key ? localStorage.setItem(GROQ_KEY_STORAGE, key) : localStorage.removeItem(GROQ_KEY_STORAGE);
  };

  const handleOpenaiKeyChange = (key: string) => {
    setOpenaiApiKey(key);
    key ? localStorage.setItem(OPENAI_KEY_STORAGE, key) : localStorage.removeItem(OPENAI_KEY_STORAGE);
  };

  // Create provider instance
  const provider = useMemo<AIProvider>(() => {
    if (providerName === "openai") return createOpenAIProvider({ apiKey: openaiApiKey });
    if (providerName === "local") return createLocalProvider();
    if (providerName === "groq") return createGroqProvider({ apiKey: groqApiKey });
    return mockProvider;
  }, [providerName, groqApiKey, openaiApiKey]);

  const streamingProvider = isAIStreamProvider(provider) ? provider : undefined;
  const fallbackScenario = useMemo<ScenarioId>(
    () =>
      ((Object.keys(SCENARIOS) as ScenarioId[]).find((id) => !scenarioConfigs[id]?.isStreaming) ??
        "error"),
    []
  );

  useEffect(() => {
    if (!streamingProvider && activeScenario === "streaming") {
      setActiveScenario(fallbackScenario);
    }
  }, [activeScenario, fallbackScenario, streamingProvider]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Header
        providerName={providerName}
        onProviderChange={setProviderName}
        groqApiKey={groqApiKey}
        onGroqKeyChange={handleGroqKeyChange}
        openaiApiKey={openaiApiKey}
        onOpenaiKeyChange={handleOpenaiKeyChange}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* Interactive Playground */}
        <Section
          title="Interactive Playground"
          subtitle="Try different AI use cases with your own input. Schema-validated, cached, with cost tracking."
          badge={<span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-300">NEW</span>}
        >
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
                const config = scenarioConfigs[id];
                const isStreamingScenario = Boolean(config?.isStreaming);
                const disabled = isStreamingScenario && !streamingProvider;

                return (
                  <ScenarioTab
                    key={id}
                    scenario={SCENARIOS[id]}
                    active={activeScenario === id}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) {
                        setActiveScenario(id);
                      }
                    }}
                  />
                );
              })}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              {activeScenario === "streaming" ? (
                streamingProvider ? (
                  <StreamingPlayground provider={streamingProvider} />
                ) : (
                  <div className="rounded-lg border border-amber-700/60 bg-amber-900/10 p-6 text-center text-sm text-amber-200">
                    Streaming demos require a provider that supports real-time events (OpenAI or Groq).
                    Switch providers to try it out.
                  </div>
                )
              ) : (
                <PlaygroundScenario scenarioId={activeScenario} provider={provider} />
              )}
            </div>
          </div>
        </Section>

        {/* How It Works */}
        <Section title="How It Works" subtitle="What makes this different from raw LLM calls">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </Section>

        {/* Code Example - updates based on selected scenario */}
        <Section 
          title={`Code: ${SCENARIOS[activeScenario].title}`} 
          subtitle="Copy this schema and usage pattern for your project"
        >
          <SchemaViewer scenarioId={activeScenario} />
        </Section>

        {/* Debug */}
        <Section title="Debug" subtitle="Current session state">
          <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-4 text-xs text-slate-200">
            {JSON.stringify({ provider: providerName, activeScenario }, null, 2)}
          </pre>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
