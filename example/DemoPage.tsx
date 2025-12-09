import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AIText, clearSessionCache, createGroqProvider, createOpenAIProvider, localProvider, mockProvider, useAI } from "../src";

const errorSchema = z.string();
const featureFlagSchema = z.boolean();
const approvalSchema = z.object({
  approve: z.boolean(),
  reason: z.string()
});

type ProviderChoice = "mock" | "openai" | "local" | "groq";

const GROQ_KEY_STORAGE = "intent-ui-groq-key";
const OPENAI_KEY_STORAGE = "intent-ui-openai-key";

const formatUSD = (usd?: number) => (usd === undefined ? "—" : `$${usd.toFixed(6)}`);

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="card space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
    </div>
    <div>{children}</div>
  </section>
);

const CostBadge = ({ tokens, usd, fromCache, usedFallback }: { tokens?: number; usd?: number; fromCache?: boolean; usedFallback?: boolean }) => (
  <div className="flex items-center gap-2 text-xs text-slate-300">
    <span className="rounded-full bg-slate-800 px-3 py-1">tokens: {tokens ?? "est."}</span>
    <span className="rounded-full bg-slate-800 px-3 py-1">usd: {formatUSD(usd)}</span>
    {fromCache ? <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-emerald-300">cache hit</span> : null}
    {usedFallback ? <span className="rounded-full bg-amber-900/50 px-3 py-1 text-amber-300">fallback</span> : null}
  </div>
);

export default function DemoPage() {
  const [providerName, setProviderName] = useState<ProviderChoice>("mock");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  
  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedGroqKey = localStorage.getItem(GROQ_KEY_STORAGE);
    if (savedGroqKey) setGroqApiKey(savedGroqKey);
    
    const savedOpenaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (savedOpenaiKey) setOpenaiApiKey(savedOpenaiKey);
  }, []);
  
  // Save Groq API key to localStorage
  const handleGroqKeyChange = (key: string) => {
    setGroqApiKey(key);
    if (key) {
      localStorage.setItem(GROQ_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(GROQ_KEY_STORAGE);
    }
  };
  
  // Save OpenAI API key to localStorage
  const handleOpenaiKeyChange = (key: string) => {
    setOpenaiApiKey(key);
    if (key) {
      localStorage.setItem(OPENAI_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(OPENAI_KEY_STORAGE);
    }
  };

  const provider = useMemo(() => {
    if (providerName === "openai") return createOpenAIProvider({ apiKey: openaiApiKey });
    if (providerName === "local") return localProvider;
    if (providerName === "groq") return createGroqProvider({ apiKey: groqApiKey });
    return mockProvider;
  }, [providerName, groqApiKey, openaiApiKey]);

  const errorInput = { code: "EMAIL_REQUIRED", message: "Email field is missing", field: "email" };

  const {
    data: explanation,
    loading: summaryLoading,
    error: summaryError,
    cost: summaryCost,
    fromCache: summaryFromCache,
    refresh: refreshSummary
  } = useAI<string>({
    prompt: "Explain this error to a non-technical user in one sentence",
    input: errorInput,
    schema: errorSchema,
    provider,
    cache: "session",
    temperature: 0,
    retry: 1
  });

  const {
    data: featureEnabled,
    loading: featureLoading,
    error: featureError,
    usedFallback: featureUsedFallback,
    fallbackReason: featureFallbackReason
  } = useAI<boolean>({
    prompt: "Enable this feature only for power users unlikely to churn",
    input: { usage: { weeklySessions: 12, nps: 52 }, plan: "pro", behavior: "low_churn_risk" },
    schema: featureFlagSchema,
    provider,
    cache: "session",
    fallback: false
  });

  const expenseRequest = {
    user: { id: "u_123", role: "manager" },
    amount: 1250,
    vendor: "Figma",
    history: { approvals: 12, declines: 1 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-900 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Intent-driven UI Runtime</p>
            <h1 className="text-2xl font-bold text-slate-50">AI-Native, Deterministic, Schema-Safe</h1>
            <p className="muted">
              Headless components + providers. Deterministic defaults, Zod validation, cache-first execution.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
              value={providerName}
              onChange={(event) => setProviderName(event.target.value as ProviderChoice)}
            >
              <option value="mock">Mock (deterministic)</option>
              <option value="groq">Groq (free LLM)</option>
              <option value="openai">OpenAI (browser)</option>
              <option value="local">Local (Ollama) ⚠️</option>
            </select>
            {providerName === "groq" && (
              <input
                type="password"
                placeholder="Groq API key (free at console.groq.com)"
                value={groqApiKey}
                onChange={(e) => handleGroqKeyChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 w-64"
              />
            )}
            {providerName === "openai" && (
              <input
                type="password"
                placeholder="OpenAI API key (platform.openai.com)"
                value={openaiApiKey}
                onChange={(e) => handleOpenaiKeyChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 w-64"
              />
            )}
            <button
              onClick={() => {
                clearSessionCache();
                refreshSummary();
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 hover:border-slate-600"
            >
              Reset cache
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Section
          title="Error Explanation"
          subtitle="Deterministic, schema-validated runtime built on useAI()."
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">Summary</p>
                <CostBadge
                  tokens={summaryCost?.tokens}
                  usd={summaryCost?.estimatedUSD}
                  fromCache={summaryFromCache}
                />
              </div>
              <p className="mt-2 text-base text-slate-50">
                {summaryLoading && "Loading AI explanation…"}
                {summaryError && "AI failed — fallback to typed error"}
                {!summaryLoading && !summaryError && explanation}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-50 hover:border-slate-700"
                onClick={refreshSummary}
              >
                Refresh
              </button>
              <span className="muted">Prompt + input are cached by session; cost stays stable.</span>
            </div>
          </div>
        </Section>

        <Section
          title="Feature Gating"
          subtitle="Decide if a feature should be enabled using deterministic AI."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-50">
                {featureLoading ? "Scoring user…" : featureEnabled ? "Enabled for this user" : "Disabled for this user"}
              </p>
              {featureError ? <p className="muted">Failed safely to fallback: {featureError.message}</p> : null}
              {featureUsedFallback ? (
                <p className="text-sm text-amber-400">⚠️ Using fallback: {featureFallbackReason}</p>
              ) : null}
            </div>
            <div className="flex gap-2 text-xs text-slate-300">
              <span className="rounded-full bg-slate-800 px-3 py-1">prompt-validated</span>
              <span className="rounded-full bg-slate-800 px-3 py-1">fallback=false</span>
              {featureUsedFallback ? (
                <span className="rounded-full bg-amber-900/50 px-3 py-1 text-amber-300">fallback active</span>
              ) : null}
            </div>
          </div>
        </Section>

        <Section
          title="Internal Approval"
          subtitle="Headless <AIText /> render props with loading/error/cost."
        >
          <AIText
            prompt="Decide if this expense should be approved safely with a one-sentence reason."
            input={expenseRequest}
            schema={approvalSchema}
            provider={provider}
            cache="session"
            fallback={{ approve: false, reason: "Manual review required" }}
          >
            {(decision, meta) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-50">
                    {meta.loading
                      ? "Evaluating expense…"
                      : decision
                        ? decision.approve
                          ? "Approved"
                          : "Declined"
                        : "No decision"}
                  </p>
                  <CostBadge tokens={meta.tokens} usd={meta.estimatedUSD} fromCache={meta.fromCache} usedFallback={meta.usedFallback} />
                </div>
                {meta.error ? (
                  <p className="muted">Error: {meta.error.message}</p>
                ) : (
                  <p className="text-slate-100">{decision?.reason}</p>
                )}
                {meta.usedFallback ? (
                  <p className="text-sm text-amber-400">⚠️ AI unavailable: {meta.fallbackReason}</p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-50 hover:border-slate-700"
                    onClick={meta.refresh}
                  >
                    Retry
                  </button>
                  {meta.fromCache ? <span className="muted">Served from cache</span> : null}
                </div>
              </div>
            )}
          </AIText>
        </Section>

        <Section title="Debug" subtitle="Session cache + provider metadata + fallback observability.">
          <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-4 text-xs text-slate-200">
            {JSON.stringify(
              {
                provider: providerName,
                summary: { explanation, summaryLoading, summaryError, summaryCost, summaryFromCache },
                featureGating: { featureEnabled, featureLoading, featureError, featureUsedFallback, featureFallbackReason },
                expenseRequest
              },
              null,
              2
            )}
          </pre>
        </Section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-900/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">Built for deterministic, schema-safe AI UI.</p>
          <div className="flex gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-slate-800 px-3 py-1">Headless</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">Zod validated</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">Cost aware</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

