import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { combineSeed, createSeed, SeededRandom } from "./seed.js";
import { generateLeaderName, generatePlayerBackstory } from "./systems/government.js";
import { updateBeliefs } from "./systems/intelligence.js";
import {
  type CountryProfile,
  CountryProfileSchema,
  type CountryState,
  CountryStateSchema,
  type Difficulty,
  type GameMode,
  type InsurgencyLevel,
  LeaderSchema,
  MODE_TURNS,
  type NuclearStatus,
  ObjectiveSchema,
  PendingDecisionSchema,
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

// ============================================================================
// Flashpoints: short authored sessions on top of a base scenario
// ============================================================================

const ScriptedCrisisSchema = z.object({
  turn: z.number(),
  templateId: z.string(),
  headline: z.string(),
  text: z.string(),
  decision: PendingDecisionSchema.omit({ id: true, turn: true, deadlineTurn: true }).extend({
    templateId: z.string().optional(),
  }),
});

export const FlashpointSchema = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  hook: z.string(), // the real-world situation, with dates
  sources: z.array(z.string()).default([]),
  scenarioId: z.string(), // base world
  date: z.string().optional(), // YYYY-MM start override
  turns: z.number().default(12),
  globalTension: z.number().optional(),
  playable: z.array(
    z.object({
      countryId: z.string(),
      role: z.string(),
      difficulty: z.enum(["STEADY", "TOUGH", "BRUTAL"]).default("TOUGH"),
    }),
  ),
  setup: z
    .object({
      wars: z
        .array(z.object({ attackerId: z.string(), defenderId: z.string(), frontline: z.number() }))
        .default([]),
      relations: z.array(z.object({ a: z.string(), b: z.string(), value: z.number() })).default([]),
      countries: z
        .record(
          z.string(),
          z
            .object({
              stability: z.number(),
              approval: z.number(),
              legitimacy: z.number(),
              mobilization: z.number(),
              nuclearStatus: z.string(),
              nuclearProgress: z.number(),
              insurgencyLevel: z.string(),
              growthRate: z.number(),
            })
            .partial(),
        )
        .default({}),
    })
    .default({ wars: [], relations: [], countries: {} }),
  objectives: z.record(z.string(), ObjectiveSchema),
  scripted: z.record(z.string(), z.array(ScriptedCrisisSchema)).default({}),
  debrief: z.string().default(""),
});
export type FlashpointData = z.infer<typeof FlashpointSchema>;

export interface NewGameOptions {
  scenarioId: string;
  playerCountryId: string;
  seed: number;
  leaderName?: string;
  mode?: GameMode;
  difficulty?: Difficulty;
  flashpointId?: string;
}

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

  loadFlashpoint(id: string): FlashpointData {
    const filePath = join(this.dataPath, "flashpoints", `${id}.json`);
    return FlashpointSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
  }

  loadAvailableFlashpoints(): FlashpointData[] {
    const dir = join(this.dataPath, "flashpoints");
    let files: string[] = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      return [];
    }
    return files.map((f) => this.loadFlashpoint(f.replace(".json", "")));
  }

  /** Start any session: a scenario in a mode, or an authored flashpoint. */
  newGame(options: NewGameOptions): WorldState {
    const { playerCountryId, seed, leaderName, difficulty = "STATESMAN" } = options;
    if (options.flashpointId) {
      const fp = this.loadFlashpoint(options.flashpointId);
      if (!fp.playable.some((p) => p.countryId === playerCountryId)) {
        throw new Error(`${playerCountryId} is not playable in ${fp.title}`);
      }
      const world = this.initializeWorldState(fp.scenarioId, playerCountryId, seed, leaderName);
      this.applyFlashpoint(world, fp);
      world.mode = "FLASHPOINT";
      world.difficulty = difficulty;
      return world;
    }
    const world = this.initializeWorldState(options.scenarioId, playerCountryId, seed, leaderName);
    const mode = options.mode ?? "TERM";
    world.mode = mode;
    world.difficulty = difficulty;
    world.maxTurns = MODE_TURNS[mode];
    const player = world.countries.find((c) => c.id === playerCountryId);
    if (player && mode === "TERM" && player.politicalSystem.electionCycleMonths > 0) {
      // One electoral term: the election is the finale
      player.politicalSystem.nextElectionTurn = world.maxTurns - 1;
    }
    if (player && mode !== "LEGACY") {
      const electoral = player.politicalSystem.electionCycleMonths > 0;
      world.objective = {
        title: electoral ? "Win a second term" : "Survive the inner circle's review",
        briefing: electoral
          ? `Govern ${player.name} for four years and win re-election at the end.`
          : `No ballot box can remove you — but the ${player.politicalSystem.type === "ONE_PARTY_STATE" ? "Party" : "inner circle"} reviews your record at the end of four years. Deliver order, legitimacy and results.`,
        primary: electoral
          ? []
          : [
              {
                kind: "STAT_MIN",
                stat: "legitimacy",
                min: 40,
                label: "Legitimacy of 40%+ at the review",
              },
              {
                kind: "STAT_MIN",
                stat: "stability",
                min: 35,
                label: "Stability of 35%+ at the review",
              },
              { kind: "SCORE_PAR", min: 105, label: "Leadership score of 105+ at the review" },
            ],
        bonus: [
          { kind: "SCORE_PAR", min: 115, label: "Leadership score of 115+" },
          { kind: "STAT_MIN", stat: "approval", min: 60, label: "Leave with 60%+ approval" },
        ],
        par: 115,
        debrief: "",
      };
    }
    return world;
  }

  private applyFlashpoint(world: WorldState, fp: FlashpointData): void {
    world.flashpointId = fp.id;
    world.maxTurns = fp.turns;
    if (fp.date) world.date = fp.date;
    if (fp.globalTension !== undefined) world.globalTension = fp.globalTension;
    const byId = new Map(world.countries.map((c) => [c.id, c]));
    for (const w of fp.setup.wars) {
      const a = byId.get(w.attackerId);
      const d = byId.get(w.defenderId);
      if (!a || !d || a.atWarWith.includes(d.id)) continue;
      a.atWarWith.push(d.id);
      d.atWarWith.push(a.id);
      a.relations[d.id] = -100;
      d.relations[a.id] = -100;
      world.wars.push({
        id: `war_${a.id}_${d.id}_0`,
        attackerId: a.id,
        defenderId: d.id,
        startTurn: 0,
        frontline: w.frontline,
        attackerCasualties: 0,
        defenderCasualties: 0,
        exhaustion: 0,
      });
    }
    for (const r of fp.setup.relations) {
      const a = byId.get(r.a);
      const b = byId.get(r.b);
      if (a) a.relations[r.b] = r.value;
      if (b) b.relations[r.a] = r.value;
    }
    for (const [id, o] of Object.entries(fp.setup.countries)) {
      const c = byId.get(id);
      if (!c) continue;
      if (o.stability !== undefined) c.stability = o.stability;
      if (o.approval !== undefined) c.approval = o.approval;
      if (o.legitimacy !== undefined) c.legitimacy = o.legitimacy;
      if (o.mobilization !== undefined) c.mobilizationLevel = o.mobilization;
      if (o.growthRate !== undefined) c.growthRate = o.growthRate;
      if (o.insurgencyLevel) c.insurgencyLevel = o.insurgencyLevel as InsurgencyLevel;
      if (o.nuclearStatus) c.nuclear.status = o.nuclearStatus as NuclearStatus;
      if (o.nuclearProgress !== undefined) {
        c.nuclear.progress = o.nuclearProgress;
        c.nuclear.funded = c.nuclear.status === "DEVELOPING";
      }
    }
    const player = byId.get(world.playerCountryId);
    if (player && player.politicalSystem.nextElectionTurn !== null) {
      // Short sessions are about the crisis, not the electoral calendar
      player.politicalSystem.nextElectionTurn = Math.max(
        player.politicalSystem.nextElectionTurn,
        fp.turns + 1,
      );
    }
    world.objective = fp.objectives[world.playerCountryId] ?? null;
    if (world.objective && !world.objective.debrief) world.objective.debrief = fp.debrief;
    world.director.scheduled = (fp.scripted[world.playerCountryId] ?? []).map((sc) => ({
      templateId: sc.templateId,
      turn: sc.turn,
      headline: sc.headline,
      text: sc.text,
      decision: {
        ...sc.decision,
        id: `dec_${sc.templateId}`,
        turn: sc.turn,
        deadlineTurn: sc.turn + 1,
        templateId: sc.decision.templateId ?? sc.templateId,
      },
    }));
    updateBeliefs(world, new SeededRandom(combineSeed(world.seed, 4242)));
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
      name: isPlayer
        ? (playerLeaderName ?? generateLeaderName(profile.id, rng))
        : (scenarioLeader?.name ?? generateLeaderName(profile.id, rng)),
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

      capital: profile.geo?.capital?.coordinates,
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
      scenarioId,
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
