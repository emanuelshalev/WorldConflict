/**
 * Replay and "Branch from this month" (F-02-6). A save keeps how it started (`world.origin`) and
 * what the player sent each month (`world.inputs`); the engine is deterministic, so rebuilding
 * the opening and re-running the first N months with the same inputs and the same AI intents
 * gives back the exact world of month N. No per-month snapshots are stored.
 *
 * Pure apart from the data loader (which reads the static JSON). The AI intents come from the
 * caller: the turn log of the original save when it has them (exact even when LLMs drove the
 * rivals), else the deterministic PersonalityAI.
 */
import type { DataLoader } from "./data-loader.js";
import { TurnEngine } from "./turn.js";
import type { Action, CountryIntent, MonthInput, WorldState } from "./types.js";

/** A month's inputs, deep-copied so later mutation by the engine cannot change the record. */
export function monthInput(
  actions: Action[],
  decisions: Array<{ decisionId: string; optionId: string }>,
): MonthInput {
  return {
    actions: structuredClone(actions),
    decisions: decisions.map((d) => ({ decisionId: d.decisionId, optionId: d.optionId })),
  };
}

/** Append a resolved month's inputs to the world, and note which AI tier drove the rivals. */
export function recordMonth(world: WorldState, input: MonthInput, tier = "ALGORITHMIC"): void {
  world.inputs = [...(world.inputs ?? []), tier === "ALGORITHMIC" ? input : { ...input, tier }];
  const chronicle = world.chronicle;
  if (chronicle && !chronicle.aiTiersUsed.includes(tier)) chronicle.aiTiersUsed.push(tier);
}

/** Why a save cannot be branched at a month, or null when it can. */
export function branchRefusal(world: WorldState, month: number): string | null {
  if (!world.origin) return "This save was made before branching existed: it has no replay record.";
  if (!Number.isInteger(month) || month < 0) return "Pick a month of this game.";
  const last = world.gameOver ? world.turn - 1 : world.turn;
  if (month > last) return `Month ${month} is not a month you can branch from (0 to ${last}).`;
  if ((world.inputs?.length ?? 0) < month) return "This save's replay record is incomplete.";
  return null;
}

/**
 * The world as it stood at the start of `month` (0 = the opening desk), rebuilt from the
 * save's origin and inputs. `intentsFor(i, world)` gives the AI intents of month i+1.
 */
export function replayTo(
  loader: DataLoader,
  source: WorldState,
  month: number,
  intentsFor: (index: number, world: WorldState) => CountryIntent[],
): WorldState {
  const refusal = branchRefusal(source, month);
  if (refusal || !source.origin) throw new Error(refusal ?? "No replay record");
  const o = source.origin;
  let world = loader.newGame({
    scenarioId: o.scenarioId,
    playerCountryId: o.playerCountryId,
    seed: o.seed,
    leaderName: o.leaderName,
    mode: o.mode,
    difficulty: o.difficulty,
    flashpointId: o.flashpointId ?? undefined,
    whatIf: o.whatIf,
    opening: o.opening,
  });
  const engine = new TurnEngine();
  for (let i = 0; i < month; i++) {
    const input = source.inputs[i];
    if (!input) break;
    const result = engine.executeTurn(
      world,
      structuredClone(input.actions),
      intentsFor(i, world),
      input.decisions,
    );
    world = result.newState;
    recordMonth(world, monthInput(input.actions, input.decisions), input.tier);
  }
  return world;
}
