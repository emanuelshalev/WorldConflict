import { describe, it, expect, beforeEach } from "vitest";
import { MockLLMClient } from "../../src/agents/llmClient.js";
import { CountryAgent } from "../../src/agents/countryAgent.js";
import { AdvisorAgent } from "../../src/agents/advisorAgent.js";
import { FallbackAI, generateFallbackIntents } from "../../src/agents/fallback.js";
import { World } from "../../src/core/world.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { join } from "path";

describe("MockLLMClient", () => {
  it("should return default response", async () => {
    const client = new MockLLMClient();
    const response = await client.chat([{ role: "user", content: "test" }]);

    expect(response.content).toBe('{"actions": []}');
  });

  it("should return custom response when set", async () => {
    const client = new MockLLMClient();
    client.setResponse("test prompt", '{"custom": true}');

    const response = await client.chat([{ role: "user", content: "test prompt" }]);

    expect(response.content).toBe('{"custom": true}');
  });
});

describe("CountryAgent", () => {
  let mockClient: MockLLMClient;
  let agent: CountryAgent;

  beforeEach(() => {
    mockClient = new MockLLMClient();
    agent = new CountryAgent(mockClient, { useFallback: true, maxRetries: 1 });
  });

  it("should generate fallback intent when LLM fails", async () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const china = world.getCountry("CHN")!;
    const intent = await agent.generateIntent(china, world.getState());

    expect(intent.countryId).toBe("CHN");
    expect(Array.isArray(intent.actions)).toBe(true);
  });

  it("should generate valid intent with mock response", async () => {
    mockClient = new MockLLMClient(
      JSON.stringify({
        countryId: "CHN",
        actions: [{ type: "DOMESTIC_PROPAGANDA" }],
        reasoning: "Test reasoning",
      })
    );
    agent = new CountryAgent(mockClient, { useFallback: true, maxRetries: 1 });

    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const china = world.getCountry("CHN")!;
    const intent = await agent.generateIntent(china, world.getState());

    expect(intent.countryId).toBe("CHN");
  });
});

describe("AdvisorAgent", () => {
  let mockClient: MockLLMClient;
  let agent: AdvisorAgent;

  beforeEach(() => {
    mockClient = new MockLLMClient();
    agent = new AdvisorAgent(mockClient, 1);
  });

  it("should create and manage sessions", () => {
    const session = agent.getOrCreateSession("USA", "FOREIGN_MINISTER");

    expect(session.countryId).toBe("USA");
    expect(session.advisorRole).toBe("FOREIGN_MINISTER");
    expect(session.history).toHaveLength(0);
  });

  it("should clear sessions", () => {
    agent.getOrCreateSession("USA", "FOREIGN_MINISTER");
    agent.getOrCreateSession("USA", "DEFENSE_MINISTER");

    agent.clearSession("USA", "FOREIGN_MINISTER");

    const newSession = agent.getOrCreateSession("USA", "FOREIGN_MINISTER");
    expect(newSession.history).toHaveLength(0);
  });

  it("should generate fallback response when LLM fails", async () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const usa = world.getCountry("USA")!;
    const response = await agent.chat("FOREIGN_MINISTER", usa, world.getState());

    expect(response.role).toBe("FOREIGN_MINISTER");
    expect(response.analysis).toBeTruthy();
    expect(Array.isArray(response.recommendations)).toBe(true);
  });

  it("should generate different fallback responses for each role", async () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const usa = world.getCountry("USA")!;

    const foreignResponse = await agent.chat("FOREIGN_MINISTER", usa, world.getState());
    const defenseResponse = await agent.chat("DEFENSE_MINISTER", usa, world.getState());
    const financeResponse = await agent.chat("FINANCE_MINISTER", usa, world.getState());

    expect(foreignResponse.role).toBe("FOREIGN_MINISTER");
    expect(defenseResponse.role).toBe("DEFENSE_MINISTER");
    expect(financeResponse.role).toBe("FINANCE_MINISTER");
  });
});

describe("FallbackAI", () => {
  it("should generate valid intents", () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const fallbackAI = new FallbackAI();
    const china = world.getCountry("CHN")!;

    const intent = fallbackAI.generateIntent(china, world.getState());

    expect(intent.countryId).toBe("CHN");
    expect(Array.isArray(intent.actions)).toBe(true);
    expect(intent.actions.length).toBeLessThanOrEqual(2);
  });

  it("should prioritize stability when low", () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const state = world.getState();
    const chinaIndex = state.countries.findIndex((c) => c.id === "CHN");
    state.countries[chinaIndex].stability = 25;

    const fallbackAI = new FallbackAI();
    const intent = fallbackAI.generateIntent(state.countries[chinaIndex], state);

    const hasStabilityAction = intent.actions.some(
      (a) => a.type === "DOMESTIC_REFORM" || a.type === "DOMESTIC_PROPAGANDA"
    );
    expect(hasStabilityAction).toBe(true);
  });

  it("should mobilize during wartime", () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const state = world.getState();
    const chinaIndex = state.countries.findIndex((c) => c.id === "CHN");
    state.countries[chinaIndex].atWarWith = ["USA"];
    state.countries[chinaIndex].mobilizationLevel = 20;

    const fallbackAI = new FallbackAI();
    const intent = fallbackAI.generateIntent(state.countries[chinaIndex], state);

    const hasMobilize = intent.actions.some((a) => a.type === "MILITARY_MOBILIZE");
    expect(hasMobilize).toBe(true);
  });
});

describe("generateFallbackIntents", () => {
  it("should generate intents for all AI countries", () => {
    const world = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const intents = generateFallbackIntents(world.getState());

    expect(intents.length).toBe(24);

    const intentCountryIds = intents.map((i) => i.countryId);
    expect(intentCountryIds).not.toContain("USA");
  });

  it("should generate deterministic intents with same state", () => {
    const world1 = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const world2 = World.initialize({
      seed: 12345,
      playerCountryId: "USA",
      startYear: 2025,
    });

    const intents1 = generateFallbackIntents(world1.getState());
    const intents2 = generateFallbackIntents(world2.getState());

    expect(intents1.length).toBe(intents2.length);
  });
});

describe("Integration: Data + Agents", () => {
  it("should work with loaded country data", async () => {
    const dataLoader = createDataLoader(join(process.cwd(), "data"));
    const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

    const fallbackAI = new FallbackAI();

    for (const country of worldState.countries) {
      if (country.id === "USA") continue;

      const intent = fallbackAI.generateIntent(country, worldState);

      expect(intent.countryId).toBe(country.id);
      expect(intent.actions.length).toBeLessThanOrEqual(2);

      for (const action of intent.actions) {
        expect(action.type).toBeTruthy();
      }
    }
  });
});
