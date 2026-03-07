import type { Action, CountryIntent, CountryState, WorldState } from "../core/types.js";
import type { LLMClient } from "./llmClient.js";
import {
  generateLeaderSystemPrompt,
  generateLeaderUserPrompt,
  getAvailableActions,
  type LeaderPromptContext,
} from "./prompts/country-leader.js";
import { type CountryIntentResponse, CountryIntentResponseSchema } from "./schemas.js";

export interface CountryAgentConfig {
  maxRetries: number;
  timeoutMs: number;
  useFallback: boolean;
}

const DEFAULT_CONFIG: CountryAgentConfig = {
  maxRetries: 3,
  timeoutMs: 10000,
  useFallback: true,
};

export class CountryAgent {
  private llmClient: LLMClient;
  private config: CountryAgentConfig;

  constructor(llmClient: LLMClient, config: Partial<CountryAgentConfig> = {}) {
    this.llmClient = llmClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateIntent(
    country: CountryState,
    world: WorldState,
    recentEvents: string[] = [],
  ): Promise<CountryIntent> {
    const availableActions = getAvailableActions(country);

    const context: LeaderPromptContext = {
      country,
      world,
      recentEvents,
      availableActions,
    };

    const systemPrompt = generateLeaderSystemPrompt(country);
    const userPrompt = generateLeaderUserPrompt(context);

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.llmClient.chatWithSchema<CountryIntentResponse>(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          CountryIntentResponseSchema,
        );

        return {
          countryId: country.id,
          actions: response.actions.map((a) => ({
            type: a.type,
            targetCountryId: a.targetCountryId,
            value: a.value,
          })),
        };
      } catch (error) {
        console.error(`Country agent attempt ${attempt + 1} failed for ${country.id}:`, error);

        if (attempt === this.config.maxRetries - 1 && this.config.useFallback) {
          return this.generateFallbackIntent(country, world);
        }
      }
    }

    return this.generateFallbackIntent(country, world);
  }

  private generateFallbackIntent(country: CountryState, world: WorldState): CountryIntent {
    const actions: Action[] = [];

    if (country.stability < 40) {
      actions.push({ type: "DOMESTIC_REFORM" });
    } else if (country.legitimacy < 50) {
      actions.push({ type: "DOMESTIC_PROPAGANDA" });
    }

    if (country.atWarWith.length > 0) {
      if (country.mobilizationLevel < 80) {
        actions.push({ type: "MILITARY_MOBILIZE" });
      }

      for (const enemyId of country.atWarWith) {
        const war = world.wars.find(
          (w) =>
            (w.attackerId === country.id && w.defenderId === enemyId) ||
            (w.defenderId === country.id && w.attackerId === enemyId),
        );

        if (war) {
          const isAttacker = war.attackerId === country.id;
          const progress = isAttacker ? war.attackerProgress : war.defenderProgress;

          if (progress < 30 || country.stability < 30) {
            actions.push({ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemyId });
          }
        }
      }
    } else {
      if (country.mobilizationLevel > 30) {
        actions.push({ type: "MILITARY_DEMOBILIZE" });
      }

      const potentialAllies = Object.entries(country.relations)
        .filter(([id, value]) => value >= 50 && value < 70 && !country.alliances.includes(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1);

      for (const [allyId] of potentialAllies) {
        actions.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: allyId });
      }

      const hostileCountries = Object.entries(country.relations)
        .filter(([_, value]) => value < -60)
        .map(([id]) => id);

      if (hostileCountries.length > 0 && country.riskTolerance > 70 && country.stability > 60) {
        const weakestEnemy = hostileCountries
          .map((id) => world.countries.find((c) => c.id === id))
          .filter((c): c is CountryState => c !== undefined)
          .sort((a, b) => a.stability - b.stability)[0];

        if (weakestEnemy && weakestEnemy.stability < 40) {
          actions.push({ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: weakestEnemy.id });
        }
      }
    }

    return {
      countryId: country.id,
      actions: actions.slice(0, 2),
    };
  }
}

export async function generateAllCountryIntents(
  llmClient: LLMClient,
  world: WorldState,
  recentEvents: string[] = [],
  config?: Partial<CountryAgentConfig>,
): Promise<CountryIntent[]> {
  const agent = new CountryAgent(llmClient, config);
  const intents: CountryIntent[] = [];

  const aiCountries = world.countries.filter((c) => c.id !== world.playerCountryId);

  const fallbackAI = new (await import("./fallback.js")).FallbackAI();

  const promises = aiCountries.map((country) =>
    agent.generateIntent(country, world, recentEvents).catch((error) => {
      console.error(`Failed to generate intent for ${country.id}:`, error);
      return fallbackAI.generateIntent(country, world);
    }),
  );

  const results = await Promise.all(promises);
  intents.push(...results);

  return intents;
}
