import type { z } from "zod";

interface OpenAIResponse {
  choices: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OllamaResponse {
  message?: { content?: string };
  eval_count?: number;
  prompt_eval_count?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T>;
  getConfig(): LLMClientConfig;
}

export class OpenAIClient implements LLMClient {
  private config: LLMClientConfig;

  constructor(config: Partial<LLMClientConfig> = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      model: config.model ?? "gpt-4o-mini",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      timeout: config.timeout ?? 30000,
    };
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    return {
      content: data.choices[0]?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const schemaPrompt = `You must respond with valid JSON that matches this schema. Do not include any text outside the JSON object.\n\nSchema: ${JSON.stringify(zodToJsonSchema(schema))}`;

    const messagesWithSchema: LLMMessage[] = [
      { role: "system", content: schemaPrompt },
      ...messages,
    ];

    const response = await this.chat(messagesWithSchema);

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }

  getConfig(): LLMClientConfig {
    return { ...this.config };
  }
}

export class OllamaClient implements LLMClient {
  private config: LLMClientConfig;

  constructor(config: Partial<LLMClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? "http://localhost:11434",
      model: config.model ?? "llama3.2",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      timeout: config.timeout ?? 60000,
    };
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OllamaResponse;

    return {
      content: data.message?.content ?? "",
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count ?? 0) + data.eval_count,
          }
        : undefined,
    };
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const schemaPrompt = `You must respond with valid JSON that matches this schema. Do not include any text outside the JSON object.\n\nSchema: ${JSON.stringify(zodToJsonSchema(schema))}`;

    const messagesWithSchema: LLMMessage[] = [
      { role: "system", content: schemaPrompt },
      ...messages,
    ];

    const response = await this.chat(messagesWithSchema);

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }

  getConfig(): LLMClientConfig {
    return { ...this.config };
  }
}

export class GeminiClient implements LLMClient {
  private config: LLMClientConfig;

  constructor(config: Partial<LLMClientConfig> = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.GEMINI_API_KEY,
      baseUrl: config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta",
      model: config.model ?? "gemini-1.5-flash",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      timeout: config.timeout ?? 30000,
    };
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Convert messages to Gemini format
    // Gemini uses "user" and "model" roles, and system prompt goes in systemInstruction
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const contents = chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      },
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const url = `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as GeminiResponse;

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      content,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const schemaPrompt = `You must respond with valid JSON that matches this schema. Do not include any text outside the JSON object.\n\nSchema: ${JSON.stringify(zodToJsonSchema(schema))}`;

    const messagesWithSchema: LLMMessage[] = [
      { role: "system", content: schemaPrompt },
      ...messages,
    ];

    const response = await this.chat(messagesWithSchema);

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }

  getConfig(): LLMClientConfig {
    return { ...this.config };
  }
}

export class MockLLMClient implements LLMClient {
  private responses: Map<string, string> = new Map();
  private defaultResponse: string;

  constructor(defaultResponse = '{"actions": []}') {
    this.defaultResponse = defaultResponse;
  }

  setResponse(prompt: string, response: string): void {
    this.responses.set(prompt, response);
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const response = this.responses.get(lastMessage.content) ?? this.defaultResponse;

    return {
      content: response,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.chat(messages);
    const parsed = JSON.parse(response.content);
    return schema.parse(parsed);
  }

  getConfig(): LLMClientConfig {
    return {
      model: "mock",
      temperature: 0,
      maxTokens: 1000,
    };
  }
}

function zodToJsonSchema(_schema: z.ZodType): object {
  // Simplified schema description for LLM prompts
  // Full JSON Schema generation would require zod-to-json-schema package
  return {
    type: "object",
    description: "Respond with a valid JSON object matching the expected format",
  };
}

/**
 * Create an LLM client for the specified provider.
 *
 * Supported providers:
 * - "openai": OpenAI API (requires OPENAI_API_KEY env var)
 * - "gemini": Google Gemini API (requires GEMINI_API_KEY env var)
 * - "ollama": Local Ollama server (no API key needed)
 * - "mock": Mock client for testing
 *
 * Example usage:
 *   // Gemini
 *   const client = createLLMClient('gemini');
 *   // or with custom model
 *   const client = createLLMClient('gemini', { model: 'gemini-1.5-pro' });
 */
export function createLLMClient(
  provider: "openai" | "gemini" | "ollama" | "mock" = "openai",
  config?: Partial<LLMClientConfig>,
): LLMClient {
  switch (provider) {
    case "openai":
      return new OpenAIClient(config);
    case "gemini":
      return new GeminiClient(config);
    case "ollama":
      return new OllamaClient(config);
    case "mock":
      return new MockLLMClient();
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
