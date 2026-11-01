import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import type { LLMClient, LLMMessage, LLMResponse } from "../../src/agents/llmClient.js";
import { parseDecision, pickCountries, planTurn } from "../../src/agents/strategist.js";
import { addUsage, emptyUsage, priceFor } from "../../src/agents/usage.js";
import { createDataLoader } from "../../src/core/data-loader.js";

const loader = createDataLoader();
const world = () => loader.initializeWorldState("2025", "ISR", 4242);

function fakeClient(reply: (messages: LLMMessage[]) => string): LLMClient & { calls: number } {
  return {
    calls: 0,
    async chat(messages: LLMMessage[]): Promise<LLMResponse> {
      this.calls++;
      return {
        content: reply(messages),
        usage: { promptTokens: 1000, completionTokens: 200, totalTokens: 1200 },
      };
    },
    async chatWithSchema() {
      throw new Error("unused");
    },
    getConfig() {
      return { model: "claude-haiku-5-5" };
    },
  };
}

describe("AI tiers", () => {
  it("ALGORITHMIC tier is exactly the deterministic PersonalityAI", async () => {
    const w = world();
    const plan = await planTurn(w, { tier: "ALGORITHMIC" });
    expect(plan.intents).toEqual(generateDeterministicIntents(w));
    expect(plan.usage.calls).toBe(0);
  });

  it("FULL_LLM replaces picked countries' intents and meters cost", async () => {
    const w = world();
    const client = fakeClient(
      () =>
        '{"actions":[{"type":"DOMESTIC_REFORM"},{"type":"DIPLOMACY_IMPROVE_RELATIONS","targetCountryId":"ZZZ"}],"statement":"We seek calm."}',
    );
    const plan = await planTurn(
      w,
      { tier: "FULL_LLM", provider: "anthropic", maxCallsPerTurn: 4 },
      { client },
    );
    expect(client.calls).toBe(4);
    expect(plan.llmCountries).toHaveLength(4);
    for (const id of plan.llmCountries) {
      const intent = plan.intents.find((i) => i.countryId === id);
      // Invalid target ZZZ is dropped, valid reform kept
      expect(intent?.actions).toEqual([{ type: "DOMESTIC_REFORM" }]);
    }
    expect(plan.statements[0]?.text).toBe("We seek calm.");
    // 4 calls × (1000 in × $0.10 + 200 out × $0.50) / 1M
    expect(plan.usage.costUsd).toBeCloseTo((4 * (1000 * 0.1 + 200 * 0.5)) / 1e6, 10);
    // The player's own country is never driven by the AI
    expect(plan.intents.some((i) => i.countryId === "ISR")).toBe(false);
  });

  it("falls back to the algorithmic intent on garbage output", async () => {
    const w = world();
    const baseline = generateDeterministicIntents(w);
    const plan = await planTurn(
      w,
      { tier: "FULL_LLM", provider: "anthropic", maxCallsPerTurn: 2 },
      { client: fakeClient(() => "I refuse to answer in JSON") },
    );
    expect(plan.intents).toEqual(baseline);
    expect(plan.usage.fallbacks).toBe(2);
  });

  it("stops calling the LLM once the session budget cap is reached", async () => {
    const w = world();
    const client = fakeClient(() => '{"actions":[]}');
    const plan = await planTurn(
      w,
      { tier: "FULL_LLM", provider: "openai", budgetUsd: 0.5 },
      { client, sessionSpentUsd: 0.51 },
    );
    expect(client.calls).toBe(0);
    expect(plan.notice).toMatch(/budget cap/i);
  });

  it("KEY_DECISIONS only involves countries making high-stakes moves", () => {
    const w = world();
    const baseline = generateDeterministicIntents(w).map((i) =>
      i.countryId === "RUS"
        ? { ...i, actions: [{ type: "DIPLOMACY_DECLARE_WAR" as const, targetCountryId: "POL" }] }
        : { ...i, actions: [{ type: "DOMESTIC_PROPAGANDA" as const }] },
    );
    expect(pickCountries(w, baseline, { tier: "KEY_DECISIONS" })).toEqual(["RUS"]);
  });

  it("parseDecision rejects self-targets and caps at 3 actions", () => {
    const w = world();
    const iran = w.countries.find((c) => c.id === "IRN");
    if (!iran) throw new Error("IRN missing");
    const d = parseDecision(
      JSON.stringify({
        actions: [
          { type: "DIPLOMACY_DENOUNCE", targetCountryId: "IRN" },
          { type: "MILITARY_MOBILIZE" },
          { type: "INTEL_GATHER", targetCountryId: "ISR" },
          { type: "DOMESTIC_PROPAGANDA" },
          { type: "DOMESTIC_REFORM" },
        ],
      }),
      w,
      iran,
    );
    expect(d?.actions.map((a) => a.type)).toEqual([
      "MILITARY_MOBILIZE",
      "INTEL_GATHER",
      "DOMESTIC_PROPAGANDA",
    ]);
  });

  it("prices local models at zero and unknown models as null", () => {
    expect(priceFor("ollama", "llama3.2")).toEqual({ input: 0, output: 0 });
    expect(priceFor("openai", "some-future-model")).toBeNull();
    expect(priceFor("anthropic", "claude-haiku-5-5")).toEqual({ input: 0.1, output: 0.5 });
    const unknown = { ...emptyUsage(), costUsd: null };
    expect(addUsage(emptyUsage(), unknown).costUsd).toBeNull();
  });
});
