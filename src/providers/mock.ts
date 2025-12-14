import { AIExecutionResult, AIProvider, AnyZodSchema, ProviderExecuteArgs } from "../core/types";
import { deriveTokens } from "../core/cost";
import { stableStringify } from "../core/utils";

interface ZodDef {
  typeName: string;
  shape?: () => Record<string, { _def: ZodDef }>;
  type?: { _def: ZodDef };
  options?: Array<{ _def: ZodDef }>;
  values?: string[];
  value?: unknown;
  innerType?: { _def: ZodDef };
  defaultValue?: () => unknown;
  checks?: Array<{ kind: string; value?: number }>;
}

// Context-aware mock strings based on field names
const MOCK_STRINGS: Record<string, string[]> = {
  reason: [
    "Based on the input analysis, this decision reflects standard processing criteria.",
    "The data suggests a confident assessment given the provided context.",
    "Analysis indicates this outcome aligns with expected patterns."
  ],
  suggestedAction: [
    "Please try again in a few moments. If the issue persists, contact our support team.",
    "Check your information and try again. Our team is here to help if needed.",
    "Wait a moment and refresh the page. The issue should resolve shortly.",
    "Log out and log back in to refresh your session."
  ],
  userFriendlyMessage: [
    "We're having trouble completing your request right now.",
    "Something unexpected happened. Don't worry, your data is safe.",
    "We couldn't process that action at the moment.",
    "There was a hiccup on our end. Please try again."
  ],
  technicalContext: [
    "HTTP error response received from upstream service.",
    "Request validation failed at gateway level.",
    "Service temporarily unavailable due to high load.",
    "Authentication token requires refresh."
  ],
  summary: [
    "The input contains structured information including contact details and transaction data.",
    "Multiple data points extracted successfully from the provided text.",
    "Key information identified and categorized for further processing."
  ],
  description: [
    "Retrieves filtered data based on the specified criteria and parameters.",
    "Returns matching records from the database with pagination support.",
    "Executes the requested operation with the provided configuration."
  ],
  label: ["Order ID", "Customer Name", "Email Address", "Phone", "Amount", "Date", "Address"],
  value: ["#INV-2024-0892", "John Smith", "user@example.com", "(555) 123-4567", "$149.99", "Dec 15, 2024", "123 Main St"],
  endpoint: ["/api/v1/users", "/api/v1/orders", "/api/v1/products", "/api/v1/analytics"],
  key: ["filter", "limit", "offset", "sort", "include", "startDate", "endDate"]
};

// Error code to severity mapping for mock responses
const ERROR_SEVERITY_MAP: Record<string, string> = {
  "AUTH_TOKEN_EXPIRED": "warning",
  "RATE_LIMIT_EXCEEDED": "warning",
  "VALIDATION_ERROR": "info",
  "RESOURCE_NOT_FOUND": "warning",
  "PAYMENT_DECLINED": "error",
  "DUPLICATE_ENTRY": "info",
  "INTERNAL_ERROR": "critical",
  "GATEWAY_TIMEOUT": "error",
  "SERVICE_MAINTENANCE": "warning",
  "PERMISSION_DENIED": "error"
};

const MOCK_KEY_POINTS = [
  "User reports functionality change after recent update",
  "Long-term customer expressing frustration",
  "Specific feature mentioned as critical for workflow",
  "Request for immediate resolution",
  "Impact on daily operations noted"
];

const getContextualString = (fieldName: string, prompt: string, context: string): string => {
  const lowerField = fieldName.toLowerCase();

  // Check for exact matches first
  for (const [key, values] of Object.entries(MOCK_STRINGS)) {
    if (lowerField.includes(key)) {
      return values[Math.floor(Math.random() * values.length)];
    }
  }

  // Fallback based on context
  if (context.includes("feedback") || prompt.includes("feedback")) {
    return "Customer feedback indicates mixed sentiment requiring attention.";
  }
  if (context.includes("moderat") || prompt.includes("moderat")) {
    return "Content reviewed against community guidelines and safety policies.";
  }
  if (context.includes("extract") || prompt.includes("extract")) {
    return "Data extracted from unstructured text input.";
  }
  if (context.includes("api") || context.includes("API") || prompt.includes("API")) {
    return "API endpoint suggestion based on natural language query.";
  }

  return `Generated response for: ${fieldName}`;
};

/**
 * Builds realistic mock data based on schema structure and prompt context
 */
const buildMockData = (schema: AnyZodSchema, prompt: string, input?: unknown): unknown => {
  const def = (schema as unknown as { _def: ZodDef })._def;
  const context = input ? stableStringify(input) : "";

  return buildMockValue(def, prompt, context, "root");
};

const buildMockValue = (def: ZodDef, prompt: string, context: string, fieldName: string): unknown => {
  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return getContextualString(fieldName, prompt, context);

    case "ZodNumber": {
      // Check for min/max constraints
      const minCheck = def.checks?.find(c => c.kind === "min");
      const maxCheck = def.checks?.find(c => c.kind === "max");
      const min = minCheck?.value ?? 0;
      const max = maxCheck?.value ?? 100;

      // Generate contextual numbers
      if (fieldName.includes("urgency")) return Math.floor(Math.random() * 3) + 2; // 2-4
      if (fieldName.includes("confidence")) return Math.floor(Math.random() * 20) + 75; // 75-95

      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    case "ZodBoolean": {
      // Context-aware boolean
      if (fieldName.includes("safe")) {
        return !context.includes("spam") && !context.includes("scam");
      }
      if (fieldName.includes("approve")) {
        return context.includes("manager") || context.includes("pro");
      }
      if (fieldName.includes("retryable")) {
        // Non-retryable errors
        if (context.includes("VALIDATION_ERROR") || context.includes("PERMISSION_DENIED") ||
          context.includes("DUPLICATE_ENTRY") || context.includes("RESOURCE_NOT_FOUND")) {
          return false;
        }
        // Retryable errors
        if (context.includes("RATE_LIMIT") || context.includes("TIMEOUT") ||
          context.includes("MAINTENANCE") || context.includes("TOKEN_EXPIRED")) {
          return true;
        }
        return true; // Default to retryable
      }
      return true;
    }

    case "ZodNull":
      return null;

    case "ZodLiteral":
      return def.value;

    case "ZodEnum": {
      const values = def.values ?? [];
      // Context-aware enum selection
      if (fieldName.includes("severity")) {
        // Map error codes to severity
        for (const [errorCode, severity] of Object.entries(ERROR_SEVERITY_MAP)) {
          if (context.includes(errorCode)) return severity;
        }
        // Fallback based on status codes in context
        if (context.includes("500") || context.includes("502") || context.includes("503")) return "critical";
        if (context.includes("401") || context.includes("403") || context.includes("429")) return "warning";
        if (context.includes("400") || context.includes("404") || context.includes("409")) return "info";
        return "error";
      }
      if (fieldName.includes("sentiment")) {
        if (context.includes("frustrat") || context.includes("angry") || context.includes("terrible")) return "negative";
        if (context.includes("love") || context.includes("great") || context.includes("amazing")) return "positive";
        return values[Math.floor(Math.random() * values.length)];
      }
      if (fieldName.includes("category")) {
        if (context.includes("bug") || context.includes("broken") || context.includes("error")) return "bug";
        if (context.includes("feature") || context.includes("would be nice") || context.includes("wish")) return "feature_request";
        if (context.includes("love") || context.includes("great") || context.includes("thank")) return "praise";
      }
      if (fieldName.includes("method")) {
        if (context.includes("create") || context.includes("add") || context.includes("new")) return "POST";
        if (context.includes("update") || context.includes("change") || context.includes("modify")) return "PUT";
        if (context.includes("delete") || context.includes("remove")) return "DELETE";
        return "GET";
      }
      if (fieldName.includes("type")) {
        if (context.includes("$") || context.includes("price") || context.includes("cost")) return "amount";
        if (context.includes("@") || context.includes("email")) return "email";
        if (context.includes("phone") || context.includes("call")) return "phone";
        return values[Math.floor(Math.random() * values.length)];
      }
      return values[0] ?? "enum_value";
    }

    case "ZodArray": {
      if (def.type) {
        // Special handling for keyPoints array
        if (fieldName.includes("keyPoint")) {
          return MOCK_KEY_POINTS.slice(0, 3);
        }
        // Special handling for flags array
        if (fieldName.includes("flag")) {
          const hasSpam = context.includes("spam") || context.includes("deal") || context.includes("offer");
          const flags: string[] = [];
          if (hasSpam) flags.push("promotional_content");
          if (context.includes("urgent") || context.includes("act now")) flags.push("urgency_manipulation");
          if (context.includes("share") || context.includes("friends")) flags.push("viral_incentive");
          return flags.length > 0 ? flags : [];
        }
        // Special handling for extractedFields
        if (fieldName.includes("extractedField")) {
          const fields: Array<{ label: string; value: string; type: string }> = [];
          if (context.includes("#") || context.includes("order") || context.includes("INV")) {
            fields.push({ label: "Order ID", value: "#INV-2024-0892", type: "other" });
          }
          if (context.includes("$") || context.match(/\d+\.\d{2}/)) {
            fields.push({ label: "Amount", value: "$149.99", type: "amount" });
          }
          if (context.includes("@")) {
            fields.push({ label: "Email", value: "support@store.com", type: "email" });
          }
          if (context.includes("(") && context.includes(")")) {
            fields.push({ label: "Phone", value: "(555) 123-4567", type: "phone" });
          }
          if (context.match(/\d{4}/) || context.includes("December") || context.includes("delivery")) {
            fields.push({ label: "Date", value: "December 15, 2024", type: "date" });
          }
          if (context.includes("Street") || context.includes("St") || context.includes("Ave")) {
            fields.push({ label: "Address", value: "123 Oak Street, Portland OR 97201", type: "address" });
          }
          if (fields.length === 0) {
            fields.push({ label: "Extracted Data", value: "Sample value", type: "other" });
          }
          return fields;
        }
        // Special handling for queryParams
        if (fieldName.includes("queryParam")) {
          const params: Array<{ key: string; value: string }> = [];
          if (context.includes("premium") || context.includes("pro")) {
            params.push({ key: "plan", value: "premium" });
          }
          if (context.includes("30 days") || context.includes("last month")) {
            params.push({ key: "since", value: "30d" });
          }
          if (context.includes("purchase") || context.includes("order")) {
            params.push({ key: "min_purchases", value: "2" });
          }
          if (params.length === 0) {
            params.push({ key: "limit", value: "50" });
          }
          return params;
        }
        // Default: generate 2 items
        return [
          buildMockValue(def.type._def, prompt, context, `${fieldName}[0]`),
          buildMockValue(def.type._def, prompt, context, `${fieldName}[1]`),
        ];
      }
      return [];
    }

    case "ZodObject":
      if (def.shape) {
        const shape = def.shape();
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(shape)) {
          result[key] = buildMockValue(value._def, prompt, context, key);
        }
        return result;
      }
      return {};

    case "ZodOptional":
    case "ZodNullable":
      if (def.innerType) {
        return buildMockValue(def.innerType._def, prompt, context, fieldName);
      }
      return null;

    case "ZodDefault":
      if (def.defaultValue) {
        return def.defaultValue();
      }
      if (def.innerType) {
        return buildMockValue(def.innerType._def, prompt, context, fieldName);
      }
      return null;

    case "ZodUnion":
      if (def.options && def.options.length > 0) {
        return buildMockValue(def.options[0]._def, prompt, context, fieldName);
      }
      return "union_value";

    default:
      return `<mock:${typeName}>`;
  }
};

class MockProviderImpl implements AIProvider {
  name = "mock";

  async execute<T>({ prompt, input, schema }: ProviderExecuteArgs): Promise<AIExecutionResult<T>> {
    const tokens = deriveTokens(prompt, input);
    const data = buildMockData(schema, prompt, input) as T;
    return {
      data,
      tokens,
    };
  }
}

export const mockProvider = new MockProviderImpl();
