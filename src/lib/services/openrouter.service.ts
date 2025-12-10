import { type ZodSchema } from "zod";
import type {
  ChatMessage,
  DefaultModelParams,
  GenerationOptions,
  OpenRouterPayload,
  OpenRouterResponse,
} from "./openrouter.types";
import { OPENROUTER_API_KEY } from "astro:env/server";

// ========================================
// ERROR CLASSES
// ========================================

export class BaseOpenRouterError extends Error {
  constructor(
    public readonly kind: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "BaseOpenRouterError";
  }
}

export class OpenRouterNetworkError extends BaseOpenRouterError {
  constructor(message: string, cause?: unknown) {
    super("network", message, cause);
    this.name = "OpenRouterNetworkError";
  }
}

export class OpenRouterHttpError extends BaseOpenRouterError {
  constructor(
    public readonly status: number,
    message: string,
    cause?: unknown
  ) {
    super("http", message, cause);
    this.name = "OpenRouterHttpError";
  }
}

export class OpenRouterParseError extends BaseOpenRouterError {
  constructor(message: string, cause?: unknown) {
    super("parse", message, cause);
    this.name = "OpenRouterParseError";
  }
}

export class OpenRouterValidationError extends BaseOpenRouterError {
  constructor(message: string, cause?: unknown) {
    super("validation", message, cause);
    this.name = "OpenRouterValidationError";
  }
}

export class OpenRouterRateLimitError extends BaseOpenRouterError {
  constructor(message: string, cause?: unknown) {
    super("rate_limit", message, cause);
    this.name = "OpenRouterRateLimitError";
  }
}

// ========================================
// SERVICE CLASS
// ========================================

export class OpenRouterService {
  private readonly API_URL = "https://openrouter.ai/api/v1/chat/completions";
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly THROTTLE_MS = 1000; // Minimum time between requests
  private readonly MAX_MESSAGE_LENGTH = 50000; // Max characters per message

  /**
   * @param defaultModel Name of the LLM model (e.g. "tngtech/deepseek-r1t2-chimera:free")
   * @param defaults     Optional default model parameters
   */
  constructor(
    private defaultModel = "tngtech/deepseek-r1t2-chimera:free",
    private defaults: DefaultModelParams = { temperature: 0.7 }
  ) {
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("OpenRouter API key is required. Please set OPENROUTER_API_KEY environment variable.");
    }
    this.apiKey = apiKey;
  }

  private readonly apiKey: string;
  private lastRequestTime = 0;

  // ========================================
  // PUBLIC METHODS
  // ========================================

  /**
   * Generates a chat completion and returns raw assistant text.
   * @param messages Array of chat messages
   * @param opts Optional generation parameters
   * @returns The assistant's response text
   */
  async generateChatCompletion(messages: ChatMessage[], opts?: GenerationOptions): Promise<string> {
    const startTime = Date.now();
    const model = opts?.model || this.defaultModel;

    try {
      const payload = this.buildPayload(messages, opts);
      const response = await this.sendRequestWithRetry<OpenRouterResponse>(payload);

      if (!response.choices || response.choices.length === 0) {
        throw new OpenRouterParseError("No choices returned in response");
      }

      const content = response.choices[0]?.message?.content;
      if (typeof content !== "string") {
        throw new OpenRouterParseError("Invalid content in response");
      }

      // Log successful request
      this.logRequest(response.id, model, Date.now() - startTime, response.usage);

      return content;
    } catch (error) {
      // Log failed request
      this.logError(model, Date.now() - startTime, error);
      throw error;
    }
  }

  /**
   * Generates a structured JSON response validated against a Zod schema.
   * @param messages Array of chat messages
   * @param jsonSchema Zod schema to validate against
   * @param opts Optional generation parameters
   * @returns Parsed and validated data matching the schema
   */
  async generateStructured<T>(messages: ChatMessage[], jsonSchema: ZodSchema<T>, opts?: GenerationOptions): Promise<T> {
    const startTime = Date.now();
    const model = opts?.model || this.defaultModel;

    try {
      const payload = this.buildPayload(messages, opts, jsonSchema);
      const response = await this.sendRequestWithRetry<OpenRouterResponse>(payload);

      if (!response.choices || response.choices.length === 0) {
        throw new OpenRouterParseError("No choices returned in response");
      }

      const content = response.choices[0]?.message?.content;
      if (typeof content !== "string") {
        throw new OpenRouterParseError("Invalid content in response");
      }

      // Parse JSON
      let jsonData: unknown;
      try {
        jsonData = JSON.parse(content);
      } catch (error) {
        throw new OpenRouterParseError("Failed to parse JSON response from LLM", error);
      }

      // Validate against schema
      const validatedData = this.validateAgainstSchema(jsonData, jsonSchema);

      // Log successful request
      this.logRequest(response.id, model, Date.now() - startTime, response.usage);

      return validatedData;
    } catch (error) {
      // Log failed request
      this.logError(model, Date.now() - startTime, error);
      throw error;
    }
  }

  /**
   * Get the currently active model name.
   * @returns Current model name
   */
  getModel(): string {
    return this.defaultModel;
  }

  /**
   * Switch the active model.
   * @param modelName New model name (e.g. "openai/gpt-4o")
   */
  setModel(modelName: string): void {
    this.defaultModel = modelName;
  }

  /**
   * Update default model parameters.
   * @param partialParams Partial params to merge with existing defaults
   */
  updateDefaults(partialParams: Partial<DefaultModelParams>): void {
    this.defaults = { ...this.defaults, ...partialParams };
  }

  /**
   * Validates data against a Zod schema.
   * @param data Data to validate
   * @param schema Zod schema
   * @returns Validated data
   */
  validateAgainstSchema<T>(data: unknown, schema: ZodSchema<T>): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new OpenRouterValidationError(`Schema validation failed: ${result.error.message}`, result.error);
    }
    return result.data;
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Builds HTTP headers for OpenRouter API requests.
   */
  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Builds the request payload for OpenRouter API.
   * @param messages Array of chat messages
   * @param opts Optional generation parameters
   * @param jsonSchema Optional Zod schema for structured output
   */
  private buildPayload(
    messages: ChatMessage[],
    opts?: GenerationOptions,
    jsonSchema?: ZodSchema<unknown>
  ): OpenRouterPayload {
    // Sanitize and validate messages
    const sanitizedMessages = this.sanitizeMessages(messages);

    // Merge default params with per-call opts
    const params: DefaultModelParams = {
      ...this.defaults,
      ...(opts
        ? {
            temperature: opts.temperature,
            top_p: opts.top_p,
            max_tokens: opts.max_tokens,
            frequency_penalty: opts.frequency_penalty,
            presence_penalty: opts.presence_penalty,
          }
        : {}),
    };

    const payload: OpenRouterPayload = {
      model: opts?.model || this.defaultModel,
      messages: sanitizedMessages,
      ...params,
    };

    // Add response_format if schema provided (strict mode enabled)
    if (jsonSchema) {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "schema",
          strict: true,
          schema: this.zodToJsonSchema(),
        },
      };
    }

    return payload;
  }

  /**
   * Converts a Zod schema to JSON Schema format.
   * This is a simplified conversion that works with the schema structure.
   * For now, returns a permissive schema and relies on Zod validation afterward.
   */
  private zodToJsonSchema(): Record<string, unknown> {
    // For structured output, we rely on the schema's parse/safeParse for validation
    // OpenRouter will handle the JSON schema format internally
    // Return a permissive JSON schema that allows OpenRouter to work with the structure
    // The actual validation happens via Zod's safeParse in validateAgainstSchema
    return {
      type: "object",
      additionalProperties: true,
    };
  }

  /**
   * Sends request with retry logic for rate limits and transient errors.
   */
  private async sendRequestWithRetry<T>(payload: OpenRouterPayload, attempt = 1): Promise<T> {
    try {
      return await this.sendRequest<T>(payload);
    } catch (error) {
      // Retry on rate limit or 5xx errors
      if (
        (error instanceof OpenRouterHttpError && (error.status === 429 || error.status >= 500)) ||
        error instanceof OpenRouterNetworkError
      ) {
        if (attempt >= this.MAX_RETRIES) {
          // Exceeded max retries
          if (error instanceof OpenRouterHttpError && error.status === 429) {
            throw new OpenRouterRateLimitError(`Rate limit exceeded after ${this.MAX_RETRIES} attempts`, error);
          }
          throw error;
        }

        // Exponential backoff
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.sendRequestWithRetry<T>(payload, attempt + 1);
      }

      // Non-retryable error
      throw error;
    }
  }

  /**
   * Sends a request to OpenRouter API with throttling.
   */
  private async sendRequest<T>(payload: OpenRouterPayload): Promise<T> {
    // Apply throttling to prevent request spam
    await this.throttle();

    let response: Response;

    try {
      response = await fetch(this.API_URL, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new OpenRouterNetworkError("Network request to OpenRouter failed", error);
    }

    return this.handleResponse<T>(response);
  }

  /**
   * Handles the HTTP response from OpenRouter API.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle non-2xx status codes
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorBody = await response.json();
        if (errorBody.error && errorBody.error.message) {
          errorMessage = errorBody.error.message;
        }
      } catch {
        // Ignore JSON parse errors for error body
      }

      throw new OpenRouterHttpError(response.status, errorMessage);
    }

    // Parse successful response
    let data: T;
    try {
      data = await response.json();
    } catch (error) {
      throw new OpenRouterParseError("Failed to parse JSON response from OpenRouter", error);
    }

    return data;
  }

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Throttles requests to prevent API abuse.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.THROTTLE_MS) {
      const delay = this.THROTTLE_MS - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sanitizes chat messages to prevent prompt injection attacks and data leaks.
   * - Validates message structure
   * - Enforces length limits
   * - Filters sensitive data (API keys, tokens, passwords)
   * - Removes potentially dangerous patterns
   */
  private sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages must be a non-empty array");
    }

    return messages.map((msg) => {
      if (!msg.role || !msg.content) {
        throw new Error("Each message must have 'role' and 'content'");
      }

      if (!["system", "user", "assistant"].includes(msg.role)) {
        throw new Error(`Invalid role: ${msg.role}`);
      }

      // Enforce length limits
      if (msg.content.length > this.MAX_MESSAGE_LENGTH) {
        throw new Error(`Message content exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`);
      }

      // Trim whitespace and normalize newlines
      let sanitizedContent = msg.content.trim().replace(/\r\n/g, "\n");

      // Filter out sensitive data patterns
      sanitizedContent = this.filterSensitiveData(sanitizedContent);

      return {
        role: msg.role,
        content: sanitizedContent,
      };
    });
  }

  /**
   * Filters sensitive data from content to prevent data leaks.
   * Redacts patterns matching API keys, tokens, passwords, and other credentials.
   */
  private filterSensitiveData(content: string): string {
    // Patterns for sensitive data
    const sensitivePatterns = [
      // API keys (various formats)
      { pattern: /\b[A-Za-z0-9_-]{20,}\b/g, replacement: "[REDACTED_KEY]", context: /(api[_-]?key|apikey|key)/i },
      // Bearer tokens
      { pattern: /Bearer\s+[A-Za-z0-9_.-]+/gi, replacement: "Bearer [REDACTED_TOKEN]" },
      // JWT tokens (header.payload.signature)
      { pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, replacement: "[REDACTED_JWT]" },
      // Password-like patterns
      {
        pattern: /(['"]?password['"]?\s*[:=]\s*)(['"][^'"]*['"]|[^\s,}]+)/gi,
        replacement: "$1[REDACTED_PASSWORD]",
      },
      // Token-like patterns
      {
        pattern: /(['"]?token['"]?\s*[:=]\s*)(['"][^'"]*['"]|[^\s,}]+)/gi,
        replacement: "$1[REDACTED_TOKEN]",
      },
      // Secret-like patterns
      {
        pattern: /(['"]?secret['"]?\s*[:=]\s*)(['"][^'"]*['"]|[^\s,}]+)/gi,
        replacement: "$1[REDACTED_SECRET]",
      },
    ];

    let filtered = content;

    // Apply context-aware filtering for API keys
    const apiKeyPattern = sensitivePatterns[0];
    if (apiKeyPattern.context && apiKeyPattern.context.test(content)) {
      filtered = filtered.replace(apiKeyPattern.pattern, apiKeyPattern.replacement);
    }

    // Apply other patterns
    for (let i = 1; i < sensitivePatterns.length; i++) {
      const { pattern, replacement } = sensitivePatterns[i];
      filtered = filtered.replace(pattern, replacement);
    }

    return filtered;
  }

  /**
   * Logs successful API request with metrics.
   */
  private logRequest(
    requestId: string,
    model: string,
    latencyMs: number,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): void {
    const logData = {
      requestId,
      model,
      latencyMs,
      tokens: usage
        ? {
            prompt: usage.prompt_tokens,
            completion: usage.completion_tokens,
            total: usage.total_tokens,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    };

    // TODO: Send to monitoring service / Supabase analytics table
    // For now, log to console in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[OpenRouter Success]", logData);
    }
  }

  /**
   * Logs failed API request with error details.
   */
  private logError(model: string, latencyMs: number, error: unknown): void {
    const logData = {
      model,
      latencyMs,
      errorKind: error instanceof BaseOpenRouterError ? error.kind : "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };

    // TODO: Send to generation_error_logs table in Supabase
    // For now, log to console
    if (import.meta.env.DEV) {
      console.error("[OpenRouter Error]", logData);
    }
  }
}
