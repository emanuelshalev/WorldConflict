import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { combineSeed, createSeed, SeededRandom } from "./seed.js";
import { generatePlayerBackstory } from "./systems/government.js";
import { updateBeliefs } from "./systems/intelligence.js";
import {
  type CountryProfile,
  CountryProfileSchema,
  type CountryState,
  CountryStateSchema,
  type InsurgencyLevel,
  LeaderSchema,
  type NuclearStatus,
  type RegimeType,
  TIER1_COUNTRIES,
  type WorldState,
  WorldStateSchema,
} from "./types.js";

// ============================================================================
// Scenario schema: era leaders, regime/nuclear overrides, relations, alliances
// ============================================================================

const CountryOverrideSchema = z
  .object({
    name: z.string(),
    regimeType: z.string(),
    politicalSystemType: z.string(),
    leaderTitle: z.string(),
    electionCycleMonths: z.number(),
    gdp: z.number(),
    growthRate: z.number(),
    population: z.number(),
    manpower: z.number(),
    airpower: z.number(),
    militaryBudgetPct: z.number(),
    stability: z.number(),
    legitimacy: z.number(),
    intelLevel: z.number(),
    nuclearStatus: z.string(),
    warheads: z.number(),
    nuclearProgress: z.number(),
    insurgencyLevel: z.string(),
    debtGdpRatio: z.number(),
  })
  .partial();
export type CountryOverride = z.infer<typeof CountryOverrideSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  startYear: z.number(),
  startMonth: z.number().default(1),
  globalTension: z.number(),
  multipliers: z
    .object({
      gdpGrowth: z.number().default(1),
      militarySpending: z.number().default(1),
      stability: z.number().default(1),
    })
    .default({ gdpGrowth: 1, militarySpending: 1, stability: 1 }),
  initialRelations: z.record(z.string(), z.record(z.string(), z.number())).default({}),
  alliances: z.array(z.array(z.string())).default([]),
  leaders: z
    .record(
      z.string(),
      LeaderSchema.omit({ sinceTurn: true }).partial({ origin: true, style: true }),
    )
    .default({}),
  countryOverrides: z.record(z.string(), CountryOverrideSchema).default({}),
  startingWars: z
    .array(
      z.object({
        attackerId: z.string(),
        defenderId: z.string(),
        frontline: z.number().default(50),
      }),
    )
    .default([]),
});
export type ScenarioData = z.infer<typeof ScenarioSchema>;

export class DataLoader {
  private dataPath: string;
  private countriesCache = new Map<string, CountryProfile>();
  private scenariosCache = new Map<string, ScenarioData>();

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  loadCountry(iso3: string): CountryProfile {
    const cached = this.countriesCache.get(iso3);
    if (cached) return cached;
    const filePath = join(this.dataPath, "countries", `${iso3}.json`);
    const data = CountryProfileSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
    this.countriesCache.set(iso3, data);
    return data;
  }

  loadAllCountries(): CountryProfile[] {
    const countriesDir = join(this.dataPath, "countries");
    const files = readdirSync(countriesDir).filter((f) => f.endsWith(".json"));
    return files.map((file) => this.loadCountry(file.replace(".json", "")));
  }

  loadScenario(scenarioId: string): ScenarioData {
    const cached = this.scenariosCache.get(scenarioId);
    if (cached) return cached;
    const filePath = join(this.dataPath, "scenarios", `${scenarioId}.json`);
    const data = ScenarioSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
    this.scenariosCache.set(scenarioId, data);
    return data;
  }

  loadAvailableScenarios(): ScenarioData[] {
    const scenariosDir = join(this.dataPath, "scenarios");
    const files = readdirSync(scenariosDir).filter((f) => f.endsWith(".json"));
    return files.map((file) => this.loadScenario(file.replace(".json", "")));
  }

  createCountryState(
    profile: CountryProfile,
    scenario: ScenarioData,
    seed: number,
    playerCountryId: string,
    playerLeaderName?: string,
  ): CountryState {
    const override = scenario.countryOverrides[profile.id] ?? {};
    const { multipliers } = scenario;
    const rng = new SeededRandom(combineSeed(seed, createSeed(scenario.startYear, profile.id)));

    const regimeType = (override.regimeType as RegimeType) ?? profile.regimeType;
    const electionCycleMonths =
      override.electionCycleMonths ?? profile.politicalSystem.electionCycleMonths;
    const isPlayer = profile.id === playerCountryId;

    // Election clock: stagger first elections deterministically
    const nextElectionTurn =
      electionCycleMonths > 0 ? rng.nextInt(8, Math.max(9, electionCycleMonths)) : null;

    const scenarioLeader = scenario.leaders[profile.id];
    const leader = {
      name: isPlayer ? (playerLeaderName ?? "You") : (scenarioLeader?.name ?? "Unknown Leader"),
      title: scenarioLeader?.title ?? override.leaderTitle ?? profile.politicalSystem.leaderTitle,
      style: scenarioLeader?.style ?? "PRAGMATIC",
      origin: scenarioLeader?.origin ?? "ELECTED",
      sinceTurn: 0,
      sinceDate: `${scenario.startYear}-01`,
    } as const;

    const nuclearStatus =
      (override.nuclearStatus as NuclearStatus) ?? profile.military.nuclearStatus;

    const legitimacy = override.legitimacy ?? profile.legitimacy;
    const stability = Math.min(
      100,
      (override.stability ?? profile.stability) * multipliers.stability,
    );

    return CountryStateSchema.parse({
      id: profile.id,
      name: override.name ?? profile.name,
      iso3: profile.iso3 ?? profile.id,
      population: override.population ?? profile.population,

      regimeType,
      politicalSystem: {
        type: override.politicalSystemType ?? profile.politicalSystem.type,
        powerCenters: profile.politicalSystem.powerCenters,
        electionCycleMonths,
        nextElectionTurn,
        leaderTitle: override.leaderTitle ?? profile.politicalSystem.leaderTitle,
      },
      leader: { ...leader },
      approval: Math.round((legitimacy + stability) / 2),

      gdp: override.gdp ?? profile.economy.gdp,
      growthRate: (override.growthRate ?? profile.economy.growthRate) * multipliers.gdpGrowth,
      debtGdpRatio: override.debtGdpRatio ?? profile.economy.debtGdpRatio,
      militaryBudgetPercent: Math.min(
        20,
        (override.militaryBudgetPct ?? profile.militaryBudgetPct) * multipliers.militarySpending,
      ),
      economyProfile: profile.economy,

      manpower: override.manpower ?? profile.military.manpower,
      airpower: override.airpower ?? profile.military.airpower,
      mobilizationLevel: 10,
      doctrine: profile.military.doctrine,
      borderDeployments: [],
      supplierRelations: Object.fromEntries(profile.military.arms_suppliers.map((s) => [s, 50])),
      nuclear: {
        status: nuclearStatus,
        progress:
          override.nuclearProgress ??
          (nuclearStatus === "TESTED" || nuclearStatus === "ARMED"
            ? 100
            : nuclearStatus === "DEVELOPING"
              ? 40
              : 0),
        funded: nuclearStatus === "DEVELOPING",
        consecutiveStrikesTaken: 0,
        warheads: override.warheads ?? profile.military.warheads,
      },

      relations: {},
      alliances: [],
      atWarWith: [],
      diplomaticStances: {},

      stability,
      legitimacy,
      insurgencyLevel: (override.insurgencyLevel as InsurgencyLevel) ?? profile.insurgencyLevel,
      policingTactic: "SOFT",
      internalDivisions: structuredClone(profile.internalDivisions),

      intelLevel: override.intelLevel ?? profile.intelLevel,
      counterIntelLevel: Math.round((override.intelLevel ?? profile.intelLevel) * 0.7),
      beliefs: {},

      goals: structuredClone(profile.goals),
      personality: structuredClone(profile.personality),
      redLines: structuredClone(profile.redLines),
      history: structuredClone(profile.history),

      collapsed: false,
      embargoedBy: [],
      underGlobalEmbargo: false,
    });
  }

  initializeWorldState(
    scenarioId: string,
    playerCountryId: string,
    seed: number,
    playerLeaderName?: string,
  ): WorldState {
    const scenario = this.loadScenario(scenarioId);
    const allCountries = this.loadAllCountries();

    const tier1 = allCountries.filter((c) =>
      TIER1_COUNTRIES.includes(c.id as (typeof TIER1_COUNTRIES)[number]),
    );

    const countries = tier1.map((profile) =>
      this.createCountryState(profile, scenario, seed, playerCountryId, playerLeaderName),
    );

    this.applyScenarioRelations(countries, scenario);
    this.applyScenarioAlliances(countries, scenario);

    const date = `${scenario.startYear}-${String(scenario.startMonth).padStart(2, "0")}`;

    const world: WorldState = WorldStateSchema.parse({
      turn: 0,
      date,
      countries,
      wars: [],
      globalTension: scenario.globalTension,
      eventQueue: [],
      seed,
      playerCountryId,
      newspaper: [],
      pendingDecisions: [],
      timeline: [],
      score: { economic: 25, security: 25, approval: 25, prestige: 25, total: 100 },
      scoreHistory: [],
      gameOver: null,
      playerBackstory: "",
    });

    // Starting wars from the scenario
    for (const sw of scenario.startingWars) {
      const attacker = world.countries.find((c) => c.id === sw.attackerId);
      const defender = world.countries.find((c) => c.id === sw.defenderId);
      if (attacker && defender) {
        attacker.atWarWith.push(defender.id);
        defender.atWarWith.push(attacker.id);
        attacker.relations[defender.id] = -100;
        defender.relations[attacker.id] = -100;
        world.wars.push({
          id: `war_${sw.attackerId}_${sw.defenderId}_0`,
          attackerId: sw.attackerId,
          defenderId: sw.defenderId,
          startTurn: 0,
          frontline: sw.frontline,
          attackerCasualties: 0,
          defenderCasualties: 0,
          exhaustion: 0,
        });
      }
    }

    // Player onboarding: rise-to-power backstory shifts starting legitimacy
    const player = world.countries.find((c) => c.id === playerCountryId);
    if (player) {
      const rng = new SeededRandom(combineSeed(seed, 7777));
      world.playerBackstory = generatePlayerBackstory(player, rng);
      player.leader.sinceTurn = 0;
    }

    // Initial intelligence picture so the player view works on turn 0
    updateBeliefs(world, new SeededRandom(combineSeed(seed, 12345)));

    return world;
  }

  private applyScenarioRelations(countries: CountryState[], scenario: ScenarioData): void {
    for (const country of countries) {
      const scenarioRelations = scenario.initialRelations[country.id];
      if (scenarioRelations) {
        country.relations = { ...scenarioRelations };
      }
    }
    // Fill gaps: symmetry, then history-informed defaults
    for (const country of countries) {
      for (const other of countries) {
        if (country.id === other.id) continue;
        if (country.relations[other.id] === undefined) {
          const reverse = other.relations[country.id];
          if (reverse !== undefined) {
            country.relations[other.id] = Math.round(reverse * 0.9);
            continue;
          }
          let base = 0;
          if ((country.history.historicalAllies ?? []).includes(other.id)) base += 40;
          if ((country.history.historicalRivals ?? []).includes(other.id)) base -= 45;
          if (country.regimeType === other.regimeType) base += 10;
          country.relations[other.id] = Math.max(-100, Math.min(100, base));
        }
      }
    }
  }

  private applyScenarioAlliances(countries: CountryState[], scenario: ScenarioData): void {
    for (const group of scenario.alliances) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = countries.find((c) => c.id === group[i]);
          const b = countries.find((c) => c.id === group[j]);
          if (!a || !b) continue;
          if (!a.alliances.includes(b.id)) a.alliances.push(b.id);
          if (!b.alliances.includes(a.id)) b.alliances.push(a.id);
          if ((a.relations[b.id] ?? 0) < 60) a.relations[b.id] = 70;
          if ((b.relations[a.id] ?? 0) < 60) b.relations[a.id] = 70;
        }
      }
    }
  }

  clearCache(): void {
    this.countriesCache.clear();
    this.scenariosCache.clear();
  }
}

export function createDataLoader(dataPath?: string): DataLoader {
  const path = dataPath ?? join(process.cwd(), "data");
  return new DataLoader(path);
}
