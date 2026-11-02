import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import type { LLMClient, LLMClientConfig, LLMMessage, LLMResponse } from "../llmClient.js";

/**
 * Claude via the official Anthropic SDK. Defaults to Claude Haiku 5.5 at low
 * effort: game decisions and advisor replies are short and frequent, so the
 * cheapest current model with minimal thinking keeps per-turn cost tiny.
 */
export class AnthropicClient implements LLMClient {
  private config: LLMClientConfig;
  private client: Anthropic;

  constructor(config: Partial<LLMClientConfig> = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      baseUrl: config.baseUrl,
      model: config.model ?? "claude-haiku-5-5",
      maxTokens: config.maxTokens ?? 2000,
      timeout: config.timeout ?? 30000,
    };
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      ...(this.config.baseUrl ? { baseURL: this.config.baseUrl } : {}),
      timeout: this.config.timeout,
      maxRetries: 1,
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 2000,
      ...(system ? { system } : {}),
      output_config: { effort: "low" },
      messages: turns,
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The model declined this request");
    }
    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.chat(messages);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    return schema.parse(JSON.parse(jsonMatch[0]));
  }

  getConfig(): LLMClientConfig {
    return { ...this.config };
  }
}
