import { useState } from "react";
import { 
  buildSystemPrompt, 
  buildUserContent, 
  zodToJsonExample,
  isPrimitiveSchema,
  getPrimitiveTypeName,
} from "react-ai-query";
import type { AnyZodSchema } from "react-ai-query";

interface SystemPromptPreviewProps {
  /** The app/scenario prompt (e.g., "Explain this error to a user") */
  appPrompt: string;
  /** The user's input data */
  userInput: unknown;
  /** The Zod schema for the expected response */
  schema: AnyZodSchema;
  /** Label for the user input field name in preview */
  inputLabel?: string;
}

// Keep old interface for backward compatibility
interface LegacySystemPromptPreviewProps {
  systemPrompt: string;
  userInput: unknown;
  inputLabel?: string;
}

type Props = SystemPromptPreviewProps | LegacySystemPromptPreviewProps;

function isNewProps(props: Props): props is SystemPromptPreviewProps {
  return 'appPrompt' in props && 'schema' in props;
}

/**
 * Component that shows users what's actually being sent to the AI model.
 * Reveals ALL parts of the prompt and the final API request.
 */
export const SystemPromptPreview = (props: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle both old and new props
  const isNew = isNewProps(props);
  const appPrompt = isNew ? props.appPrompt : props.systemPrompt;
  const userInput = props.userInput;
  const inputLabel = props.inputLabel ?? "Context Data";
  
  // For new props, generate the actual prompts
  const schema = isNew ? props.schema : null;
  const isPrimitive = schema ? isPrimitiveSchema(schema) : false;
  const primitiveType = schema ? getPrimitiveTypeName(schema) : null;
  const schemaExample = schema ? zodToJsonExample(schema) : null;
  
  // The ACTUAL system prompt the package sends
  const packageSystemPrompt = buildSystemPrompt(isPrimitive);
  
  // The ACTUAL user content the package builds
  const actualUserContent = schema 
    ? buildUserContent(appPrompt, userInput, schemaExample!, isPrimitive, primitiveType)
    : `Task: ${appPrompt}\n\nContext: ${formatInput(userInput)}`;

  // The complete messages array
  const messagesArray = [
    { role: "system", content: packageSystemPrompt },
    { role: "user", content: actualUserContent }
  ];

  function formatInput(input: unknown): string {
    if (input === null || input === undefined) return "(none)";
    if (typeof input === "string") return input || "(empty)";
    try {
      return JSON.stringify(input, null, 2);
    } catch {
      return String(input);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(messagesArray, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-900/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">💡</span>
          <span className="text-amber-300 text-sm font-medium">
            What the AI actually receives
          </span>
        </div>
        <span className="text-amber-500 text-xs">
          {isExpanded ? "▲ Hide" : "▼ Show"}
        </span>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-amber-800/30">
          
          {/* Prompt Parts */}
          <div className="pt-3 space-y-3">
            {/* 1. App/Scenario Prompt */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300">
                  App Prompt
                </span>
                <span className="text-slate-500 text-xs">(Your app's instruction)</span>
              </div>
              <div className="rounded border border-slate-700/50 bg-slate-900/50 p-2 ml-7">
                <p className="text-blue-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {appPrompt}
                </p>
              </div>
            </div>

            {/* 2. User Input */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-900/50 text-emerald-300">
                  {inputLabel}
                </span>
                <span className="text-slate-500 text-xs">(Runtime data)</span>
              </div>
              <div className="rounded border border-slate-700/50 bg-slate-900/50 p-2 ml-7">
                <pre className="text-emerald-300 text-sm whitespace-pre-wrap font-mono max-h-32 overflow-auto">
                  {formatInput(userInput)}
                </pre>
              </div>
            </div>

            {/* 3. Schema / Expected Format */}
            {schemaExample && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-900/50 text-purple-300">
                    Schema
                  </span>
                  <span className="text-slate-500 text-xs">(Expected JSON format)</span>
                </div>
                <div className="rounded border border-slate-700/50 bg-slate-900/50 p-2 ml-7">
                  <pre className="text-purple-300 text-sm whitespace-pre-wrap font-mono">
                    {schemaExample}
                  </pre>
                </div>
              </div>
            )}

            {/* 4. Package System Prompt */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-900/50 text-orange-300">
                  Package Instructions
                </span>
                <span className="text-slate-500 text-xs">(Added by react-ai-query)</span>
              </div>
              <div className="rounded border border-slate-700/50 bg-slate-900/50 p-2 ml-7">
                <p className="text-orange-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {packageSystemPrompt}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-medium">📤 Final API Request</span>
                <span className="text-slate-500 text-xs">(messages array)</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors flex items-center gap-1"
              >
                {copied ? "✓ Copied!" : "📋 Copy JSON"}
              </button>
            </div>
            <div className="rounded border border-slate-700/50 bg-slate-950 p-2 overflow-auto max-h-64">
              <pre className="text-slate-300 text-xs font-mono">
{JSON.stringify(messagesArray, null, 2)}
              </pre>
            </div>
          </div>

          {/* Info note */}
          <p className="text-slate-500 text-xs pt-2 border-t border-slate-800/50">
            react-ai-query combines your prompt with schema requirements to ensure structured, validated responses.
          </p>
        </div>
      )}
    </div>
  );
};
