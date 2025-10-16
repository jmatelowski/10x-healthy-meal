export interface DefaultModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerationOptions extends DefaultModelParams {
  model?: string;
}

export interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface OpenRouterPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: OpenRouterResponseFormat;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
