/**
 * Headless playtest harness: plays games end-to-end without the UI and reports
 * pacing/difficulty metrics (game length, endings, score arc, tension arc, close calls).
 *
 *   npx tsx scripts/simulate.ts --scenario 2025 --country ISR --games 20 --turns 120 --policy ai
 *
 * Policies for the player's own country:
 *   passive  — only domestic propaganda each month (a do-nothing player)
 *   ai       — the player's country is driven by the same PersonalityAI as everyone else
 *   hawk     — mobilizes, strikes rivals, declares war on the main rival when possible
 *   dove     — improves relations with everyone, reforms at home
 */
import { generateDeterministicIntents, PersonalityAI } from "../src/agents/fallback.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { combineSeed, SeededRandom } from "../src/core/seed.js";
import { TurnEngine } from "../src/core/turn.js";
import type { Action, WorldState } from "../src/core/types.js";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}
const scenario = args.get("scenario") ?? "2025";
const country = args.get("country") ?? "USA";
const games = Number(args.get("games") ?? 10);
const maxTurns = Number(args.get("turns") ?? 120);
const policy = args.get("policy") ?? "ai";
const verbose = args.get("verbose") === "1";

function playerActions(world: WorldState): Action[] {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return [];
  const rival = me.history.historicalRivals.find((id) =>
    world.countries.some((c) => c.id === id && !c.collapsed),
  );
  switch (policy) {
    case "passive":
      return [{ type: "DOMESTIC_PROPAGANDA" }];
    case "dove": {
      const worst = Object.entries(me.relations).sort((a, b) => a[1] - b[1])[0]?.[0];
      return [
        { type: "DOMESTIC_REFORM" },
        ...(worst ? [{ type: "DIPLOMACY_IMPROVE_RELATIONS" as const, targetCountryId: worst }] : []),
      ];
    }
    case "hawk": {
      if (!rival) return [{ type: "MILITARY_MOBILIZE" }];
      if (me.atWarWith.length > 0) return [{ type: "MILITARY_MOBILIZE" }];
      if (me.mobilizationLevel < 60) return [{ type: "MILITARY_MOBILIZE" }];
      return [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: rival }];
    }
    default: {
      const rng = new SeededRandom(combineSeed(world.seed + 17, world.turn));
      return new PersonalityAI().generateIntent(me, world, rng).actions;
    }
  }
}

interface GameMetrics {
  seed: number;
  turns: number;
  ending: string;
  finalScore: number;
  minScore: number;
  maxScore: number;
  minStability: number;
  minApproval: number;
  closeCalls: number; // months where approval or stability dipped below 25
  comebacks: number; // close call followed by recovery above 45
  peakTension: number;
  wars: number;
  playerWars: number;
  crises: number;
  govChanges: number;
  quietMonths: number; // months with no MAJOR/CRITICAL event involving anyone
}

const loader = createDataLoader();
const results: GameMetrics[] = [];

for (let g = 0; g < games; g++) {
  const seed = 1000 + g * 7919;
  let world = loader.initializeWorldState(scenario, country, seed);
  const engine = new TurnEngine();
  const m: GameMetrics = {
    seed,
    turns: 0,
    ending: "RUNNING",
    finalScore: 0,
    minScore: 200,
    maxScore: 0,
    minStability: 100,
    minApproval: 100,
    closeCalls: 0,
    comebacks: 0,
    peakTension: 0,
    wars: 0,
    playerWars: 0,
    crises: 0,
    govChanges: 0,
    quietMonths: 0,
  };
  let inDanger = false;
  for (let t = 0; t < maxTurns; t++) {
    const intents = generateDeterministicIntents(world);
    const decisions = world.pendingDecisions.map((d) => ({
      decisionId: d.id,
      optionId: d.options[Math.min(1, d.options.length - 1)].id,
    }));
    const result = engine.executeTurn(world, playerActions(world), intents, decisions);
    world = result.newState;
    const me = world.countries.find((c) => c.id === country);
    if (!me) break;
    m.turns = world.turn;
    m.minScore = Math.min(m.minScore, world.score.total);
    m.maxScore = Math.max(m.maxScore, world.score.total);
    m.minStability = Math.min(m.minStability, me.stability);
    m.minApproval = Math.min(m.minApproval, me.approval);
    m.peakTension = Math.max(m.peakTension, world.globalTension);
    m.wars += result.events.filter((e) => e.type === "WAR" && e.title.startsWith("WAR:")).length;
    m.playerWars += result.events.filter(
      (e) => e.title.startsWith("WAR:") && e.affectedCountries.includes(country),
    ).length;
    m.crises += world.pendingDecisions.length;
    m.govChanges += result.governmentChanges.length;
    if (!result.events.some((e) => e.severity === "MAJOR" || e.severity === "CRITICAL"))
      m.quietMonths++;
    const danger = me.approval < 25 || me.stability < 25;
    if (danger && !inDanger) m.closeCalls++;
    if (inDanger && me.approval > 45 && me.stability > 45) {
      m.comebacks++;
      inDanger = false;
    }
    if (danger) inDanger = true;
    if (verbose) {
      console.log(
        `T${world.turn} ${world.date} score=${world.score.total.toFixed(0)} appr=${me.approval.toFixed(0)} stab=${me.stability.toFixed(0)} tension=${world.globalTension.toFixed(0)} | ${result.events
          .filter((e) => e.severity !== "MINOR")
          .map((e) => e.title)
          .slice(0, 3)
          .join(" · ")}`,
      );
    }
    if (world.gameOver) {
      m.ending = world.gameOver.reason;
      break;
    }
  }
  m.finalScore = world.score.total;
  results.push(m);
}

const avg = (k: keyof GameMetrics) =>
  (results.reduce((s, r) => s + (r[k] as number), 0) / results.length).toFixed(1);
const endings = results.reduce<Record<string, number>>((acc, r) => {
  acc[r.ending] = (acc[r.ending] ?? 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      scenario,
      country,
      policy,
      games,
      maxTurns,
      endings,
      avg: {
        turns: avg("turns"),
        finalScore: avg("finalScore"),
        minScore: avg("minScore"),
        maxScore: avg("maxScore"),
        minStability: avg("minStability"),
        minApproval: avg("minApproval"),
        closeCalls: avg("closeCalls"),
        comebacks: avg("comebacks"),
        peakTension: avg("peakTension"),
        worldWars: avg("wars"),
        playerWars: avg("playerWars"),
        crisesOffered: avg("crises"),
        govChanges: avg("govChanges"),
        quietMonths: avg("quietMonths"),
      },
    },
    null,
    2,
  ),
);
