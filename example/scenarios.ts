export type ScenarioId = "error" | "feedback" | "moderation" | "extraction" | "api" | "streaming";

export interface ErrorExample {
  id: string;
  label: string;
  error: {
    code: string;
    message: string;
    status?: number;
    field?: string;
    details?: string;
  };
}

export const ERROR_EXAMPLES: ErrorExample[] = [
  {
    id: "auth_expired",
    label: "401 - Session Expired",
    error: {
      code: "AUTH_TOKEN_EXPIRED",
      message: "The authentication token has expired",
      status: 401,
      details: "Token expiry: 2024-12-09T10:30:00Z, Current time: 2024-12-09T14:45:00Z"
    }
  },
  {
    id: "rate_limit",
    label: "429 - Rate Limited",
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please retry after 60 seconds.",
      status: 429,
      details: "Limit: 100 req/min, Current: 147 req/min, Retry-After: 60"
    }
  },
  {
    id: "validation",
    label: "400 - Validation Error",
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid input: email format is incorrect",
      status: 400,
      field: "email",
      details: "Expected format: user@domain.com, Received: user@"
    }
  },
  {
    id: "not_found",
    label: "404 - Resource Not Found",
    error: {
      code: "RESOURCE_NOT_FOUND",
      message: "The requested order could not be found",
      status: 404,
      details: "Order ID: ORD-2024-98765 does not exist or has been deleted"
    }
  },
  {
    id: "payment",
    label: "402 - Payment Failed",
    error: {
      code: "PAYMENT_DECLINED",
      message: "Card was declined by the issuing bank",
      status: 402,
      details: "Decline code: insufficient_funds, Card ending: 4242"
    }
  },
  {
    id: "conflict",
    label: "409 - Conflict Error",
    error: {
      code: "DUPLICATE_ENTRY",
      message: "A user with this email already exists",
      status: 409,
      field: "email",
      details: "Existing account created: 2023-06-15"
    }
  },
  {
    id: "server",
    label: "500 - Internal Server Error",
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred while processing your request",
      status: 500,
      details: "Reference ID: err_abc123xyz, Timestamp: 2024-12-09T14:30:00Z"
    }
  },
  {
    id: "timeout",
    label: "504 - Gateway Timeout",
    error: {
      code: "GATEWAY_TIMEOUT",
      message: "The request timed out while waiting for upstream server",
      status: 504,
      details: "Timeout after 30000ms, Service: payment-processor"
    }
  },
  {
    id: "maintenance",
    label: "503 - Service Unavailable",
    error: {
      code: "SERVICE_MAINTENANCE",
      message: "The service is temporarily unavailable due to scheduled maintenance",
      status: 503,
      details: "Maintenance window: 2024-12-09 14:00-16:00 UTC"
    }
  },
  {
    id: "permission",
    label: "403 - Permission Denied",
    error: {
      code: "PERMISSION_DENIED",
      message: "You don't have permission to access this resource",
      status: 403,
      details: "Required role: admin, Current role: viewer, Resource: /api/admin/users"
    }
  }
];

export interface Scenario {
  id: ScenarioId;
  title: string;
  icon: string;
  description: string;
  placeholder: string;
  prompt: string;
  inputType?: "textarea" | "dropdown";
}

// PROMPTS: Focus on TASK and TONE only - the schema defines WHAT fields to output
// The package automatically injects schema requirements, so prompts should NOT repeat field names
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  error: {
    id: "error",
    title: "Error Summary",
    icon: "⚠️",
    description: "Transform technical errors into user-friendly messages",
    placeholder: "",
    // Task: explain the error | Audience: non-technical user | Tone: friendly, helpful
    prompt: "Explain this error to a non-technical user in a friendly, helpful way.",
    inputType: "dropdown"
  },
  feedback: {
    id: "feedback",
    title: "Customer Feedback Analyzer",
    icon: "💬",
    description: "Analyze customer reviews and feedback with structured insights",
    placeholder: `The new dashboard update is frustrating. I've been a premium user for 2 years and suddenly my saved filters are gone. The export feature also seems slower than before. Please fix this ASAP - I rely on this for my daily reports.`,
    // Task: analyze feedback | Output defined by schema
    prompt: "Analyze this customer feedback for a support team."
  },
  moderation: {
    id: "moderation",
    title: "Content Moderation",
    icon: "🛡️",
    description: "Check content safety with confidence scores and detailed flags",
    placeholder: `Check out our amazing new product! Visit example.com/deal for exclusive discounts. Limited time offer - act now before it's gone! Share with friends to unlock bonus rewards.`,
    // Task: moderate content | Be thorough
    prompt: "Review this content for policy violations and safety concerns."
  },
  extraction: {
    id: "extraction",
    title: "Smart Data Extractor",
    icon: "📋",
    description: "Extract structured data from unstructured text like emails or invoices",
    placeholder: `Hi John,

Thanks for your order #INV-2024-0892! Your purchase of $149.99 will ship to 123 Oak Street, Portland OR 97201.

Expected delivery: December 15, 2024
Contact: support@store.com or call (555) 123-4567

Best regards,
Sarah from Customer Success`,
    // Task: extract data | Schema defines what types to look for
    prompt: "Extract all structured data from this text."
  },
  api: {
    id: "api",
    title: "Natural Language → API",
    icon: "🔌",
    description: "Convert plain English requests into API endpoint suggestions",
    placeholder: `Get all premium users who signed up in the last 30 days and have made at least 2 purchases`,
    // Task: convert to API call | Schema defines the structure
    prompt: "Convert this request into a REST API call."
  },
  streaming: {
    id: "streaming",
    title: "Streaming Demo",
    icon: "⚡",
    description: "Real-time streaming with live text updates",
    placeholder: `Write a short poem about the beauty of coding at night`,
    // Task: creative writing | Schema defines mood and word count tracking
    prompt: "Write a creative response to this prompt."
  }
};

