/**
 * The nine control seeds (devloop/instances/world-conflict/scenarios/scenarios.yaml `control:`,
 * D-59) played headless with the harness policies, deterministic: same seed and choices give the
 * same months. D-76: guards on engine findings run on this corpus, not on one seat.
 */
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { buildAdvice } from "../../src/core/advisors.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { parseSeedCode } from "../../src/core/reveal.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { staffMonth } from "../../scripts/policies.js";

export const CONTROL_SEEDS = [
  "CO-UKR-MAYA1",
  "CA-USA-OLIV1",
  "CO-UKR-RUTH1",
  "HC-ARE-NOAH1",
  "CO-UKR-PRIY1",
  "T2026-RUS-DAN01",
  "SL-CHN-SAM01",
  "QU-CHN-LEO01",
  "T1990-USA-MARC1",
] as const;

export const FLASHPOINT_CONTROL = CONTROL_SEEDS.filter((c) => !c.startsWith("T"));
export const UKR_CONTROL = CONTROL_SEEDS.filter((c) => c.startsWith("CO-UKR"));

/**
 * staff = Accept all recommended (D-84: the routine, every call skipped); staffswitch = the same
 * with the Chief of Staff making the calls (the opt-in setting; chief is its new name); guided =
 * Accept all plus the Guide me line on every call; callpush / callhold = the two fixed rules
 * (scripts/policies.ts); picks = the routine answers, no orders; none = nothing; cease = the full
 * one-press month (chief, the pre-D-84 Accept all) plus a ceasefire proposal to Russia every month
 * of the war; war = chief, war on Japan in month 2.
 */
export type ControlPolicy =
  | "staff"
  | "staffswitch"
  | "chief"
  | "guided"
  | "callpush"
  | "callhold"
  | "picks"
  | "none"
  | "cease"
  | "war";
const STAFF_LIKE = new Set(["staffswitch", "chief", "guided", "callpush", "callhold"]);
/** The staff month each control policy builds on (cease and war keep the full one-press month). */
const BASE: Partial<Record<ControlPolicy, string>> = { cease: "chief", war: "chief" };

export interface ControlMonth {
  /** The world the player saw at the start of the month (advice computed on it). */
  before: WorldState;
  advice: ReturnType<typeof buildAdvice>;
  orders: Action[];
  /** The world after the month resolved (its turnReport is this month's report). */
  after: WorldState;
}

export interface ControlGame {
  code: string;
  months: ControlMonth[];
  final: WorldState;
}

const loader = createDataLoader();
const cache = new Map<string, ControlGame>();

export function newControlWorld(code: string): WorldState {
  const p = parseSeedCode(code, loader.loadAvailableFlashpoints());
  if (!p) throw new Error(`bad control seed ${code}`);
  return loader.newGame({
    scenarioId: p.scenarioId,
    playerCountryId: p.playerCountryId,
    seed: p.seed,
    mode: p.mode,
    flashpointId: p.flashpointId,
  });
}

export function playControl(
  code: string,
  policy: ControlPolicy = "staff",
  months = 12,
): ControlGame {
  const key = `${code}|${policy}|${months}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let world = newControlWorld(code);
  const engine = new TurnEngine();
  const out: ControlMonth[] = [];
  for (let t = 0; t < months && !world.gameOver; t++) {
    const advice = buildAdvice(world);
    const staff = staffMonth(world, BASE[policy] ?? (STAFF_LIKE.has(policy) ? policy : "staff"));
    let orders: Action[] = policy === "none" || policy === "picks" ? [] : staff.orders;
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    if (policy === "cease" && me?.atWarWith.includes("RUS"))
      orders = [
        ...orders.filter((o) => o.type !== "DIPLOMACY_PROPOSE_CEASEFIRE"),
        { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "RUS" },
      ];
    if (policy === "war" && t === 1)
      orders = [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "JPN" }];
    const decisions = policy === "none" ? [] : staff.decisions;
    const before = world;
    world = engine.executeTurn(world, orders, generateDeterministicIntents(world), decisions)
      .newState;
    out.push({ before, advice, orders, after: world });
  }
  const game = { code, months: out, final: world };
  cache.set(key, game);
  return game;
}

/** The player's own relation toward a country (the number RELATION_MIN missions measure). */
export function playerRel(world: WorldState, id: string): number {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  return me?.relations[id] ?? 0;
}
