import { SeededRandom } from "./seed.js";
import { EventSchema, type GameEvent, type WorldState } from "./types.js";

export type EventType = "RANDOM" | "TRIGGERED" | "WAR" | "DIPLOMACY" | "ECONOMY" | "STABILITY";

export interface EventTemplate {
  id: string;
  type: EventType;
  title: string;
  description: string;
  probability: number;
  conditions?: (world: WorldState) => boolean;
  effects: Record<string, number>;
  affectedCountryCount: number | "all" | "random";
}

const RANDOM_EVENTS: EventTemplate[] = [
  {
    id: "economic_boom",
    type: "ECONOMY",
    title: "Economic Boom",
    description: "A period of rapid economic growth sweeps across the region.",
    probability: 0.05,
    effects: { gdpGrowth: 0.02, stability: 5 },
    affectedCountryCount: "random",
  },
  {
    id: "recession",
    type: "ECONOMY",
    title: "Economic Recession",
    description: "Economic downturn affects multiple nations.",
    probability: 0.03,
    effects: { gdpGrowth: -0.03, stability: -10 },
    affectedCountryCount: "random",
  },
  {
    id: "natural_disaster",
    type: "STABILITY",
    title: "Natural Disaster",
    description: "A major natural disaster strikes, causing widespread damage.",
    probability: 0.02,
    effects: { stability: -15, gdpGrowth: -0.01 },
    affectedCountryCount: 1,
  },
  {
    id: "diplomatic_summit",
    type: "DIPLOMACY",
    title: "International Summit",
    description: "World leaders gather for a major diplomatic summit.",
    probability: 0.04,
    effects: { globalTension: -5, relations: 5 },
    affectedCountryCount: "all",
  },
  {
    id: "military_incident",
    type: "WAR",
    title: "Military Incident",
    description: "A border incident raises tensions between nations.",
    probability: 0.03,
    conditions: (world) => world.globalTension > 50,
    effects: { globalTension: 10, relations: -10 },
    affectedCountryCount: 2,
  },
  {
    id: "oil_crisis",
    type: "ECONOMY",
    title: "Oil Price Shock",
    description: "Global oil prices spike dramatically.",
    probability: 0.02,
    effects: { gdpGrowth: -0.02 },
    affectedCountryCount: "all",
  },
  {
    id: "technological_breakthrough",
    type: "ECONOMY",
    title: "Technological Breakthrough",
    description: "A major technological advancement boosts productivity.",
    probability: 0.03,
    effects: { gdpGrowth: 0.01, stability: 3 },
    affectedCountryCount: 1,
  },
  {
    id: "civil_unrest",
    type: "STABILITY",
    title: "Civil Unrest",
    description: "Widespread protests and civil unrest destabilize the government.",
    probability: 0.04,
    conditions: (world) => world.countries.some((c) => c.stability < 40),
    effects: { stability: -20, legitimacy: -10 },
    affectedCountryCount: 1,
  },
];

export class EventSystem {
  private rng: SeededRandom;
  private templates: EventTemplate[];

  constructor(seed: number, customTemplates?: EventTemplate[]) {
    this.rng = new SeededRandom(seed);
    this.templates = customTemplates ?? RANDOM_EVENTS;
  }

  generateEvents(world: WorldState, turn: number): GameEvent[] {
    const events: GameEvent[] = [];

    for (const template of this.templates) {
      if (template.conditions && !template.conditions(world)) {
        continue;
      }

      if (this.rng.next() < template.probability) {
        const affectedCountries = this.selectAffectedCountries(
          world,
          template.affectedCountryCount,
        );

        const event: GameEvent = {
          id: `${template.id}_${turn}_${this.rng.nextInt(0, 10000)}`,
          type: template.type,
          title: template.title,
          description: template.description,
          affectedCountries,
          effects: template.effects,
          turn,
        };

        const validated = EventSchema.parse(event);
        events.push(validated);
      }
    }

    return events;
  }

  private selectAffectedCountries(world: WorldState, count: number | "all" | "random"): string[] {
    const countryIds = world.countries.map((c) => c.id);

    if (count === "all") {
      return countryIds;
    }

    if (count === "random") {
      const numCountries = this.rng.nextInt(1, Math.min(5, countryIds.length));
      return this.selectRandomCountries(countryIds, numCountries);
    }

    return this.selectRandomCountries(countryIds, Math.min(count, countryIds.length));
  }

  private selectRandomCountries(countryIds: string[], count: number): string[] {
    const shuffled = [...countryIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.rng.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  static createTriggeredEvent(
    type: EventType,
    title: string,
    description: string,
    affectedCountries: string[],
    turn: number,
    effects?: Record<string, number>,
  ): GameEvent {
    const event: GameEvent = {
      id: `triggered_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      title,
      description,
      affectedCountries,
      effects,
      turn,
    };

    return EventSchema.parse(event);
  }

  static createWarEvent(attackerId: string, defenderId: string, turn: number): GameEvent {
    return EventSystem.createTriggeredEvent(
      "WAR",
      "War Declared",
      `${attackerId} has declared war on ${defenderId}!`,
      [attackerId, defenderId],
      turn,
      { globalTension: 20 },
    );
  }

  static createAllianceEvent(country1: string, country2: string, turn: number): GameEvent {
    return EventSystem.createTriggeredEvent(
      "DIPLOMACY",
      "Alliance Formed",
      `${country1} and ${country2} have formed a military alliance.`,
      [country1, country2],
      turn,
      { globalTension: -5 },
    );
  }

  static createCeasefireEvent(country1: string, country2: string, turn: number): GameEvent {
    return EventSystem.createTriggeredEvent(
      "WAR",
      "Ceasefire Declared",
      `${country1} and ${country2} have agreed to a ceasefire.`,
      [country1, country2],
      turn,
      { globalTension: -10 },
    );
  }

  setSeed(seed: number): void {
    this.rng = new SeededRandom(seed);
  }
}

export { RANDOM_EVENTS };
