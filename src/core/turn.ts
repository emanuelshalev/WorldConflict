import { collectPendingDecisions, EventEngine } from "./events.js";
import { generateNewspaper } from "./newspaper.js";
import { updateScore } from "./scoring.js";
import { combineSeed, SeededRandom } from "./seed.js";
import { COVERT_COSTS_M, covertEvent, resolveCovertOp } from "./systems/covert.js";
import {
  applyDiplomaticDrift,
  breakAlliance,
  canDeclareWar,
  denounce,
  IMPROVE_RELATIONS_COST_M,
  improveRelations,
  proposeAlliance,
  proposeCeasefire,
} from "./systems/diplomacy.js";
import { autoBudgetResponse, updateEconomies } from "./systems/economy.js";
import type { GovernmentChange } from "./systems/government.js";
import { runGovernmentDynamics } from "./systems/government.js";
import { buildPlayerView, updateBeliefs } from "./systems/intelligence.js";
import type { AirstrikeTarget, WarMonthSummary } from "./systems/military.js";
import {
  activateDefensivePacts,
  applyBorderTensions,
  deployToBorder,
  executeAirstrike,
  monthlyDefenseBudgetM,
  resolveWarMonth,
  startWar,
  withdrawFromBorder,
} from "./systems/military.js";
import {
  executeNuclearStrike,
  NUCLEAR_RESEARCH_COST_M,
  progressNuclearPrograms,
  startNuclearProgram,
} from "./systems/nuclear.js";
import { applyPropaganda, applyReform, updateDomestic } from "./systems/stability.js";
import type {
  Action,
  CountryIntent,
  CountryState,
  GameEvent,
  GameOver,
  NewspaperEntry,
  PendingDecision,
  WorldState,
} from "./types.js";

export interface DecisionChoice {
  decisionId: string;
  optionId: string;
}

export interface TurnResult {
  newState: WorldState;
  events: GameEvent[];
  newspaper: NewspaperEntry[];
  resolvedActions: Map<string, Action[]>;
  rejectedActions: Map<string, { action: Action; reason: string }[]>;
  governmentChanges: GovernmentChange[];
  gameOver: GameOver | null;
}

export function actionCostM(action: Action): number {
  switch (action.type) {
    case "DIPLOMACY_IMPROVE_RELATIONS":
      return IMPROVE_RELATIONS_COST_M;
    case "MILITARY_MOBILIZE":
      return 200;
    case "MILITARY_PROCURE":
      return action.value ?? 500;
    case "MILITARY_AIRSTRIKE":
      return 150;
    case "MILITARY_DEPLOY_BORDER":
      return 100;
    case "NUCLEAR_FUND_PROGRAM":
      return NUCLEAR_RESEARCH_COST_M;
    case "DOMESTIC_REFORM":
      return 250;
    case "DOMESTIC_PROPAGANDA":
      return 75;
    default:
      return COVERT_COSTS_M[action.type] ?? 0;
  }
}

export class TurnEngine {
  private eventEngine = new EventEngine();

  executeTurn(
    currentState: WorldState,
    playerActions: Action[],
    aiIntents: CountryIntent[],
    decisionChoices: DecisionChoice[] = [],
  ): TurnResult {
    const turnSeed = combineSeed(currentState.seed, currentState.turn);
    const rng = new SeededRandom(turnSeed);
    const world = structuredClone(currentState);
    const tensionBefore = world.globalTension;

    const governmentChanges: GovernmentChange[] = [];
    const rejectedActions = new Map<string, { action: Action; reason: string }[]>();
    const resolvedActions = new Map<string, Action[]>();
    const events: GameEvent[] = [];

    // ------------------------------------------------------------------
    // Phase 0: resolve the player's pending crisis decisions
    // ------------------------------------------------------------------
    const injectedActions: Action[] = this.resolveDecisions(world, decisionChoices);

    // ------------------------------------------------------------------
    // Phase 1: world events (historical-pattern engine)
    // ------------------------------------------------------------------
    const newEvents = this.eventEngine.generateEvents(world, rng);
    events.push(...newEvents);
    world.pendingDecisions = collectPendingDecisions(newEvents);

    // ------------------------------------------------------------------
    // Phase 2: intelligence picture updates (asymmetric information)
    // ------------------------------------------------------------------
    updateBeliefs(world, rng);

    // ------------------------------------------------------------------
    // Phase 3: resolve actions (player first, then AI countries)
    // ------------------------------------------------------------------
    const allIntents: CountryIntent[] = [
      { countryId: world.playerCountryId, actions: [...playerActions, ...injectedActions] },
      ...aiIntents.filter((i) => i.countryId !== world.playerCountryId),
    ];

    for (const intent of allIntents) {
      const actor = world.countries.find((c) => c.id === intent.countryId);
      if (!actor || actor.collapsed) continue;
      const isPlayer = actor.id === world.playerCountryId;
      let budgetLeft = monthlyDefenseBudgetM(actor);

      for (const action of intent.actions) {
        const cost = actionCostM(action);
        if (isPlayer && cost > budgetLeft) {
          push(rejectedActions, actor.id, {
            action,
            reason: `Insufficient budget ($${Math.round(budgetLeft)}M left, needs $${cost}M)`,
          });
          continue;
        }
        const outcome = this.applyAction(world, actor, action, rng, events, governmentChanges);
        if (outcome.ok) {
          budgetLeft -= cost;
          push2(resolvedActions, actor.id, action);
        } else {
          push(rejectedActions, actor.id, { action, reason: outcome.reason });
        }
      }
    }

    // ------------------------------------------------------------------
    // Phase 4: war resolution
    // ------------------------------------------------------------------
    const warSummaries: WarMonthSummary[] = [];
    for (const war of [...world.wars]) {
      const summary = resolveWarMonth(world, war, rng);
      if (summary) {
        warSummaries.push(summary);
        if (summary.ended?.loserId) {
          // Losing a war can topple a government — handled by dynamics below via crashed stats
        }
      }
    }
    applyBorderTensions(world);

    // ------------------------------------------------------------------
    // Phase 5: nuclear programs progress
    // ------------------------------------------------------------------
    events.push(...progressNuclearPrograms(world, rng));

    // ------------------------------------------------------------------
    // Phase 6: economy, domestic stability, diplomacy drift
    // ------------------------------------------------------------------
    updateEconomies(world);
    autoBudgetResponse(world);
    events.push(...updateDomestic(world, rng));
    applyDiplomaticDrift(world);
    // Tension naturally relaxes toward a baseline absent fresh provocations
    const tensionFloor = Math.min(70, 30 + world.wars.length * 8);
    world.globalTension = Math.max(
      tensionFloor > world.globalTension ? world.globalTension : tensionFloor,
      world.globalTension - Math.max(0, (world.globalTension - tensionFloor) * 0.12),
    );
    // Even an eventful month only moves the global mood so far — unless war or
    // nuclear use shocked the system
    const hadShock = events.some(
      (e) => e.severity === "CRITICAL" && (e.type === "WAR" || e.type === "NUCLEAR"),
    );
    world.globalTension = Math.min(
      world.globalTension,
      Math.min(100, tensionBefore + (hadShock ? 30 : 8)),
    );

    // ------------------------------------------------------------------
    // Phase 7: government dynamics (elections, coups, revolutions)
    // ------------------------------------------------------------------
    const govResult = runGovernmentDynamics(world, rng);
    governmentChanges.push(...govResult.changes);
    events.push(...govResult.events);

    // ------------------------------------------------------------------
    // Phase 8: scoring & timeline
    // ------------------------------------------------------------------
    updateScore(world);
    this.recordTimeline(world, events, warSummaries, governmentChanges);

    // ------------------------------------------------------------------
    // Phase 9: newspaper
    // ------------------------------------------------------------------
    const newspaper = generateNewspaper(world, events, warSummaries, governmentChanges, rng);
    world.newspaper = newspaper;

    // ------------------------------------------------------------------
    // Phase 10: game-over checks & advance clock
    // ------------------------------------------------------------------
    const gameOver = this.checkGameOver(world, governmentChanges);
    world.gameOver = gameOver;

    world.turn += 1;
    world.date = advanceMonth(world.date);
    world.eventQueue = events;

    return {
      newState: world,
      events,
      newspaper,
      resolvedActions,
      rejectedActions,
      governmentChanges,
      gameOver,
    };
  }

  // --------------------------------------------------------------------
  private resolveDecisions(world: WorldState, choices: DecisionChoice[]): Action[] {
    const injected: Action[] = [];
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (!player) return injected;

    for (const pending of [...world.pendingDecisions]) {
      let choice = choices.find((c) => c.decisionId === pending.id);
      if (!choice && world.turn > pending.deadlineTurn) {
        // Ignored crises resolve themselves — usually badly (first option)
        choice = { decisionId: pending.id, optionId: pending.options[0]?.id ?? "" };
      }
      if (!choice) continue;
      const option = pending.options.find((o) => o.id === choice?.optionId) ?? pending.options[0];
      if (!option) continue;

      for (const [key, value] of Object.entries(option.effects)) {
        if (key.startsWith("relations:")) {
          const targetId = key.split(":")[1];
          player.relations[targetId] = clampRel((player.relations[targetId] ?? 0) + value);
          const target = world.countries.find((c) => c.id === targetId);
          if (target)
            target.relations[player.id] = clampRel((target.relations[player.id] ?? 0) + value);
        } else if (key === "stability") {
          player.stability = clamp01(player.stability + value);
        } else if (key === "approval") {
          player.approval = clamp01(player.approval + value);
        } else if (key === "legitimacy") {
          player.legitimacy = clamp01(player.legitimacy + value);
        } else if (key === "gdp") {
          player.gdp = Math.max(0, player.gdp * (1 + value / 100));
        }
      }
      world.globalTension = clamp01(world.globalTension + option.tensionDelta);
      injected.push(...option.actions);
      world.pendingDecisions = world.pendingDecisions.filter((d) => d.id !== pending.id);
    }
    return injected;
  }

  // --------------------------------------------------------------------
  private applyAction(
    world: WorldState,
    actor: CountryState,
    action: Action,
    rng: SeededRandom,
    events: GameEvent[],
    governmentChanges: GovernmentChange[],
  ): { ok: boolean; reason: string } {
    const target = action.targetCountryId
      ? world.countries.find((c) => c.id === action.targetCountryId)
      : undefined;
    const needsTarget = ![
      "MILITARY_MOBILIZE",
      "MILITARY_DEMOBILIZE",
      "MILITARY_PROCURE",
      "NUCLEAR_FUND_PROGRAM",
      "ECONOMY_ADJUST_MILITARY_BUDGET",
      "INTEL_COUNTER_INTEL",
      "DOMESTIC_PROPAGANDA",
      "DOMESTIC_REFORM",
      "DOMESTIC_POLICING",
    ].includes(action.type);
    if (needsTarget && !target) return { ok: false, reason: "Target country not found" };
    if (target && target.id === actor.id) return { ok: false, reason: "Cannot target yourself" };
    if (target?.collapsed)
      return {
        ok: false,
        reason: `${target.name} has collapsed; there is no government to deal with`,
      };

    switch (action.type) {
      case "DIPLOMACY_IMPROVE_RELATIONS": {
        if (!target) return { ok: false, reason: "No target" };
        if (actor.atWarWith.includes(target.id))
          return { ok: false, reason: "At war — propose a ceasefire first" };
        improveRelations(actor, target);
        return { ok: true, reason: "" };
      }
      case "DIPLOMACY_DENOUNCE": {
        if (!target) return { ok: false, reason: "No target" };
        denounce(world, actor, target);
        return { ok: true, reason: "" };
      }
      case "DIPLOMACY_PROPOSE_ALLIANCE": {
        if (!target) return { ok: false, reason: "No target" };
        const result = proposeAlliance(actor, target, rng);
        if (result.accepted) {
          events.push({
            id: `evt_pact_${actor.id}_${target.id}_${world.turn}`,
            type: "DIPLOMACY",
            title: `${actor.name} and ${target.name} sign military pact`,
            description: `${actor.name} and ${target.name} concluded a mutual defense treaty. An attack on one is now an attack on both.`,
            affectedCountries: [actor.id, target.id],
            turn: world.turn,
            severity: "MAJOR",
          });
        }
        return { ok: result.accepted, reason: result.reason };
      }
      case "DIPLOMACY_BREAK_ALLIANCE": {
        if (!target) return { ok: false, reason: "No target" };
        if (!actor.alliances.includes(target.id)) return { ok: false, reason: "Not allied" };
        breakAlliance(world, actor, target);
        return { ok: true, reason: "" };
      }
      case "DIPLOMACY_DECLARE_WAR": {
        if (!target) return { ok: false, reason: "No target" };
        const check = canDeclareWar(actor, target);
        if (!check.allowed) return { ok: false, reason: check.reason };
        const war = startWar(world, actor.id, target.id);
        if (!war) return { ok: false, reason: "Could not start war" };
        const joined = activateDefensivePacts(world, war, rng);
        events.push({
          id: `evt_war_${actor.id}_${target.id}_${world.turn}`,
          type: "WAR",
          title: `WAR: ${actor.name} attacks ${target.name}`,
          description: `${actor.leader.title} ${actor.leader.name} ordered the invasion of ${target.name}.${
            joined.length > 0
              ? ` Honoring defense pacts, ${joined
                  .map((id) => world.countries.find((c) => c.id === id)?.name ?? id)
                  .join(", ")} declared war on ${actor.name}.`
              : ""
          }${check.nuclearStandoff ? " Both belligerents possess nuclear weapons — the world stands at the brink." : ""}`,
          affectedCountries: [actor.id, target.id, ...joined],
          turn: world.turn,
          severity: "CRITICAL",
        });
        return { ok: true, reason: "" };
      }
      case "DIPLOMACY_PROPOSE_CEASEFIRE": {
        if (!target) return { ok: false, reason: "No target" };
        const accepted = proposeCeasefire(world, actor, target, rng);
        if (accepted) {
          events.push({
            id: `evt_ceasefire_${actor.id}_${target.id}_${world.turn}`,
            type: "WAR",
            title: `Ceasefire between ${actor.name} and ${target.name}`,
            description: `Following ${actor.name}'s initiative, the guns have fallen silent. The peace is fragile — but it is peace.`,
            affectedCountries: [actor.id, target.id],
            turn: world.turn,
            severity: "MAJOR",
          });
        }
        return accepted
          ? { ok: true, reason: "" }
          : { ok: false, reason: `${target.name} rejected the ceasefire proposal` };
      }
      case "MILITARY_MOBILIZE": {
        actor.mobilizationLevel = clamp01(actor.mobilizationLevel + 20);
        actor.stability = clamp01(actor.stability - 2);
        // Mobilization frightens rivals and neighbors
        for (const rid of actor.history.historicalRivals ?? []) {
          const rival = world.countries.find((c) => c.id === rid);
          if (rival) rival.relations[actor.id] = clampRel((rival.relations[actor.id] ?? 0) - 3);
        }
        return { ok: true, reason: "" };
      }
      case "MILITARY_DEMOBILIZE": {
        actor.mobilizationLevel = clamp01(actor.mobilizationLevel - 20);
        actor.stability = clamp01(actor.stability + 1);
        return { ok: true, reason: "" };
      }
      case "MILITARY_PROCURE": {
        if (actor.underGlobalEmbargo) {
          // Private dealers gouge embargoed states
          actor.gdp -= (action.value ?? 500) * 2e6;
          actor.airpower += Math.floor((action.value ?? 500) / 100);
          return { ok: true, reason: "" };
        }
        actor.airpower += Math.floor((action.value ?? 500) / 50);
        actor.manpower += Math.floor((action.value ?? 500) * 20);
        return { ok: true, reason: "" };
      }
      case "MILITARY_AIRSTRIKE": {
        if (!target) return { ok: false, reason: "No target" };
        const targetType = ((action.params?.targetType as string) ?? "MILITARY") as AirstrikeTarget;
        const outcome = executeAirstrike(world, actor, target, targetType, rng);
        events.push({
          id: `evt_strike_${actor.id}_${target.id}_${world.turn}`,
          type: "WAR",
          title: outcome.crippledNuclearProgram
            ? `${actor.name} CRIPPLES ${target.name}'s NUCLEAR PROGRAM`
            : `${actor.name} launches airstrikes on ${target.name}`,
          description: outcome.description,
          affectedCountries: [actor.id, target.id],
          turn: world.turn,
          severity: outcome.crippledNuclearProgram ? "CRITICAL" : "MAJOR",
        });
        return { ok: true, reason: "" };
      }
      case "MILITARY_DEPLOY_BORDER": {
        if (!target) return { ok: false, reason: "No target" };
        deployToBorder(actor, target.id, action.value ?? 50000);
        target.relations[actor.id] = clampRel((target.relations[actor.id] ?? 0) - 8);
        return { ok: true, reason: "" };
      }
      case "MILITARY_WITHDRAW_BORDER": {
        if (!target) return { ok: false, reason: "No target" };
        withdrawFromBorder(actor, target.id);
        target.relations[actor.id] = clampRel((target.relations[actor.id] ?? 0) + 5);
        return { ok: true, reason: "" };
      }
      case "NUCLEAR_FUND_PROGRAM": {
        const started = startNuclearProgram(actor);
        return started
          ? { ok: true, reason: "" }
          : { ok: false, reason: "Nuclear program cannot be advanced further" };
      }
      case "NUCLEAR_STRIKE": {
        if (!target) return { ok: false, reason: "No target" };
        if (actor.nuclear.status !== "ARMED" || actor.nuclear.warheads < 1) {
          return { ok: false, reason: "No deliverable warheads" };
        }
        if (!actor.atWarWith.includes(target.id)) {
          return { ok: false, reason: "Nuclear release is only authorized in wartime" };
        }
        const result = executeNuclearStrike(world, actor, target, rng);
        events.push({
          id: `evt_nuke_${actor.id}_${target.id}_${world.turn}`,
          type: "NUCLEAR",
          title: result.holocaust
            ? "☢ GLOBAL NUCLEAR HOLOCAUST"
            : `☢ ${actor.name} USES NUCLEAR WEAPON`,
          description: result.description,
          affectedCountries: result.holocaust
            ? world.countries.map((c) => c.id)
            : [actor.id, target.id],
          turn: world.turn,
          severity: "CRITICAL",
        });
        return { ok: true, reason: "" };
      }
      case "ECONOMY_ADJUST_MILITARY_BUDGET": {
        actor.militaryBudgetPercent = Math.max(
          0.5,
          Math.min(20, action.value ?? actor.militaryBudgetPercent),
        );
        return { ok: true, reason: "" };
      }
      case "INTEL_COUNTER_INTEL": {
        actor.counterIntelLevel = clamp01(actor.counterIntelLevel + 10);
        return { ok: true, reason: "" };
      }
      case "INTEL_GATHER":
      case "INTEL_SABOTAGE":
      case "INTEL_DESTABILIZE":
      case "INTEL_SUPPORT_REBELS":
      case "INTEL_MISINFORMATION":
      case "INTEL_PROPAGANDA":
      case "INTEL_ASSASSINATE":
      case "INTEL_COUP": {
        if (!target) return { ok: false, reason: "No target" };
        const outcome = resolveCovertOp(world, actor, target, action.type, rng);
        if (outcome.governmentChange) governmentChanges.push(outcome.governmentChange);
        const event = covertEvent(world, actor, target, outcome, action.type);
        if (event) events.push(event);
        return { ok: true, reason: "" };
      }
      case "DOMESTIC_PROPAGANDA": {
        applyPropaganda(actor);
        return { ok: true, reason: "" };
      }
      case "DOMESTIC_REFORM": {
        applyReform(actor);
        return { ok: true, reason: "" };
      }
      case "DOMESTIC_POLICING": {
        const tactic = (action.params?.tactic as string) === "HARD" ? "HARD" : "SOFT";
        actor.policingTactic = tactic;
        return { ok: true, reason: "" };
      }
      default:
        return { ok: false, reason: `Unknown action type ${action.type}` };
    }
  }

  // --------------------------------------------------------------------
  private recordTimeline(
    world: WorldState,
    events: GameEvent[],
    warSummaries: WarMonthSummary[],
    governmentChanges: GovernmentChange[],
  ): void {
    for (const e of events) {
      if (e.severity === "MAJOR" || e.severity === "CRITICAL") {
        world.timeline.push({
          turn: world.turn,
          date: world.date,
          category:
            e.type === "NUCLEAR"
              ? "NUCLEAR"
              : e.type === "WAR"
                ? "WAR"
                : e.type === "COVERT"
                  ? "COVERT"
                  : e.type === "GOVERNMENT"
                    ? "GOVERNMENT"
                    : e.type === "ECONOMY"
                      ? "ECONOMY"
                      : "DIPLOMACY",
          description: e.title,
        });
      }
    }
    for (const s of warSummaries) {
      if (s.ended) {
        world.timeline.push({
          turn: world.turn,
          date: world.date,
          category: "WAR",
          description: s.ended.description,
        });
      }
    }
    for (const g of governmentChanges) {
      world.timeline.push({
        turn: world.turn,
        date: world.date,
        category: "GOVERNMENT",
        description: g.description,
      });
    }
  }

  // --------------------------------------------------------------------
  private checkGameOver(world: WorldState, governmentChanges: GovernmentChange[]): GameOver | null {
    if (world.gameOver) return world.gameOver;
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (!player) return null;

    // Nuclear holocaust ends everything
    const holocaustEvent = world.timeline.find((t) =>
      t.description.includes("GLOBAL NUCLEAR HOLOCAUST"),
    );
    if (holocaustEvent) {
      return {
        reason: "NUCLEAR_HOLOCAUST",
        description:
          "The missiles flew. Civilization as the twentieth century knew it has ended. There are no winners.",
        turn: world.turn,
      };
    }

    const playerDeposed = governmentChanges.find((g) => g.isPlayerDeposed);
    if (playerDeposed) {
      const reasonMap = {
        ELECTION: "LOST_ELECTION",
        COUP: "DEPOSED_COUP",
        REVOLUTION: "REVOLUTION",
        ASSASSINATION: "ASSASSINATED",
        IMPEACHMENT: "IMPEACHED",
        SUCCESSION: "ASSASSINATED",
        COLLAPSE: "COUNTRY_COLLAPSED",
        FOREIGN_IMPOSED: "DEPOSED_COUP",
      } as const;
      return {
        reason: reasonMap[playerDeposed.kind] ?? "DEPOSED_COUP",
        description: playerDeposed.description,
        turn: world.turn,
      };
    }

    if (player.collapsed) {
      return {
        reason: "COUNTRY_COLLAPSED",
        description: `${player.name} has disintegrated. Your government rules nothing but the presidential compound.`,
        turn: world.turn,
      };
    }

    // Full term completed: 10 years
    if (world.turn >= 120) {
      return {
        reason: "TERM_COMPLETED",
        description: `After ten years at the helm of ${player.name}, your term has come to its end. History will now judge it.`,
        turn: world.turn,
      };
    }

    return null;
  }
}

// --------------------------------------------------------------------
export function getPlayerView(world: WorldState) {
  return buildPlayerView(world);
}

function advanceMonth(date: string): string {
  const [yearStr, monthStr] = date.split("-");
  let year = Number(yearStr);
  let month = Number(monthStr) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(100, v));
}
function clampRel(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}
function push2(map: Map<string, Action[]>, key: string, value: Action): void {
  push(map, key, value);
}
