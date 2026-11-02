/**
 * LLM usage & cost accounting. Every LLM call the game makes (country AI,
 * advisors, newspaper flavor) is recorded here so the player always sees what
 * the session has consumed. Prices are list estimates in USD per 1M tokens;
 * players can override them in settings for models not listed.
 */
import type { z } from "zod";
import type { LLMClient, LLMClientConfig, LLMMessage, LLMResponse } from "./llmClient.js";

export type LLMProvider = "openai" | "gemini" | "anthropic" | "ollama" | "local";

export interface ModelPrice {
  input: number; // USD per 1M input tokens
  output: number; // USD per 1M output tokens
}

// Matched by longest prefix of the model id
const PRICE_TABLE: Record<string, ModelPrice> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-haiku-5-5",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  ollama: "llama3.2",
  local: "local-model",
};

/** Returns null when the price is unknown (shown as tokens only). Local models are free. */
export function priceFor(
  provider: LLMProvider,
  model: string,
  override?: ModelPrice,
): ModelPrice | null {
  if (override) return override;
  if (provider === "ollama" || provider === "local") return { input: 0, output: 0 };
  const key = Object.keys(PRICE_TABLE)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICE_TABLE[key] : null;
}

export type UsagePurpose = "country-ai" | "advisor" | "news";

export interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null; // null when any call had an unknown price
  fallbacks: number; // LLM calls that failed/were skipped and fell back to the algorithmic AI
  byPurpose: Partial<Record<UsagePurpose, { calls: number; tokens: number }>>;
}

export function emptyUsage(): UsageTotals {
  return {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    fallbacks: 0,
    byPurpose: {},
  };
}

export class UsageMeter {
  readonly turn: UsageTotals = emptyUsage();

  constructor(
    private provider: LLMProvider,
    private model: string,
    private priceOverride?: ModelPrice,
  ) {}

  record(purpose: UsagePurpose, promptTokens: number, completionTokens: number): void {
    const price = priceFor(this.provider, this.model, this.priceOverride);
    this.turn.calls += 1;
    this.turn.promptTokens += promptTokens;
    this.turn.completionTokens += completionTokens;
    if (this.turn.costUsd !== null) {
      this.turn.costUsd = price
        ? this.turn.costUsd +
          (promptTokens * price.input + completionTokens * price.output) / 1_000_000
        : null;
    }
    const slot = this.turn.byPurpose[purpose] ?? { calls: 0, tokens: 0 };
    slot.calls += 1;
    slot.tokens += promptTokens + completionTokens;
    this.turn.byPurpose[purpose] = slot;
  }

  recordFallback(): void {
    this.turn.fallbacks += 1;
  }
}

export function addUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  const byPurpose: UsageTotals["byPurpose"] = { ...a.byPurpose };
  for (const [k, v] of Object.entries(b.byPurpose) as [
    UsagePurpose,
    { calls: number; tokens: number },
  ][]) {
    const prev = byPurpose[k] ?? { calls: 0, tokens: 0 };
    byPurpose[k] = { calls: prev.calls + v.calls, tokens: prev.tokens + v.tokens };
  }
  return {
    calls: a.calls + b.calls,
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    costUsd: a.costUsd === null || b.costUsd === null ? null : a.costUsd + b.costUsd,
    fallbacks: a.fallbacks + b.fallbacks,
    byPurpose,
  };
}

/**
 * Wraps any LLM client and meters every call. `drain()` returns the usage
 * accumulated since the previous drain (one API request's worth).
 */
export class MeteredClient implements LLMClient {
  private meter: UsageMeter;

  constructor(
    private inner: LLMClient,
    private provider: LLMProvider,
    private purpose: UsagePurpose,
  ) {
    this.meter = new UsageMeter(provider, inner.getConfig().model);
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await this.inner.chat(messages);
    this.meter.record(
      this.purpose,
      response.usage?.promptTokens ?? Math.ceil(JSON.stringify(messages).length / 4),
      response.usage?.completionTokens ?? Math.ceil(response.content.length / 4),
    );
    return response;
  }

  async chatWithSchema<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.chat(messages);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    return schema.parse(JSON.parse(jsonMatch[0]));
  }

  getConfig(): LLMClientConfig {
    return this.inner.getConfig();
  }

  drain(): UsageTotals {
    const usage = this.meter.turn;
    this.meter = new UsageMeter(this.provider, this.inner.getConfig().model);
    return usage;
  }
}
