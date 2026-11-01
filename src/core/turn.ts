import { actionCostM, actionCostPC, PC_CAP, politicalCapitalIncome } from "./costs.js";
import { applyEffects, raiseCrisis, runDirector, scheduleFollowUp } from "./crises.js";
import { EventEngine } from "./events.js";
import { generateNewspaper } from "./newspaper.js";
import { computeOutcome, earlyFailure } from "./objectives.js";
import { updateScore } from "./scoring.js";
import { combineSeed, SeededRandom } from "./seed.js";
import { covertEvent, resolveCovertOp } from "./systems/covert.js";
import {
  applyDiplomaticDrift,
  breakAlliance,
  canDeclareWar,
  denounce,
  improveRelations,
  mediate,
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
  progressNuclearPrograms,
  startNuclearProgram,
} from "./systems/nuclear.js";
import { applyPropaganda, applyReform, updateDomestic } from "./systems/stability.js";
import { possessive } from "./text.js";
import type {
  Action,
  CountryIntent,
  CountryState,
  GameEvent,
  GameOver,
  NewspaperEntry,
  PlayerTurnReport,
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

export { actionCostM, actionCostPC } from "./costs.js";

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
    const playerBefore = world.countries.find((c) => c.id === world.playerCountryId);
    const report: PlayerTurnReport = {
      turn: world.turn,
      orders: [],
      decisions: [],
      deltas: {},
      causes: [],
      moments: [],
    };
    const before = playerBefore
      ? {
          approval: playerBefore.approval,
          stability: playerBefore.stability,
          legitimacy: playerBefore.legitimacy,
          gdp: playerBefore.gdp,
          score: world.score.total,
        }
      : null;
    this.report = report;

    // ------------------------------------------------------------------
    // Phase 0: resolve the player's pending crisis decisions
    // ------------------------------------------------------------------
    const injectedActions: Action[] = this.resolveDecisions(world, decisionChoices);

    // ------------------------------------------------------------------
    // Phase 1: world events + the player's crises (drama director)
    // ------------------------------------------------------------------
    events.push(...this.eventEngine.generateEvents(world, rng));
    const directed = runDirector(world, rng);
    events.push(...directed.events);
    world.pendingDecisions = directed.decisions;

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

    const playerState = world.countries.find((c) => c.id === world.playerCountryId);
    let covertDamage = 0;
    let tensionAfterPlayer = world.globalTension;
    const covertHits = new Map<string, number>(); // stability lost to covert ops, per target
    const foiled: string[] = []; // foreign services caught by the player's spy hunt
    for (const intent of allIntents) {
      const actor = world.countries.find((c) => c.id === intent.countryId);
      if (!actor || actor.collapsed) continue;
      const isPlayer = actor.id === world.playerCountryId;
      let budgetLeft = monthlyDefenseBudgetM(actor);
      const injected = new Set(isPlayer ? injectedActions : []);

      for (const action of intent.actions) {
        const cost = actionCostM(action, actor);
        // Orders that come from crisis decisions were already paid for by the choice
        const pc = isPlayer && !injected.has(action) ? actionCostPC(action) : 0;
        if (isPlayer && !injected.has(action) && cost > budgetLeft) {
          const reason = `Insufficient defense budget ($${Math.round(budgetLeft)}M left, needs $${cost}M)`;
          push(rejectedActions, actor.id, { action, reason });
          report.orders.push({ label: orderLabel(world, action), ok: false, detail: reason });
          continue;
        }
        if (pc > world.politicalCapital) {
          const reason = `Not enough political capital (${world.politicalCapital} left, needs ${pc})`;
          push(rejectedActions, actor.id, { action, reason });
          report.orders.push({ label: orderLabel(world, action), ok: false, detail: reason });
          continue;
        }
        const hitsPlayer =
          !isPlayer &&
          action.targetCountryId === world.playerCountryId &&
          action.type.startsWith("INTEL_");
        const covertTarget =
          !isPlayer && !hitsPlayer && action.type.startsWith("INTEL_") && action.targetCountryId
            ? world.countries.find((c) => c.id === action.targetCountryId)
            : undefined;
        if (
          hitsPlayer &&
          world.turn <= world.director.counterIntelUntil &&
          rng.next() < COUNTER_INTEL_FOIL
        ) {
          foiled.push(actor.name);
          push(rejectedActions, actor.id, { action, reason: "Foiled by counter-intelligence" });
          continue;
        }
        const stabilityBefore = playerState?.stability ?? 0;
        const targetStabilityBefore = covertTarget?.stability ?? 0;
        const outcome = this.applyAction(world, actor, action, rng, events, governmentChanges);
        if (hitsPlayer && playerState) {
          covertDamage += Math.max(0, stabilityBefore - playerState.stability);
        } else if (covertTarget) {
          // Several services piling onto one AI state: cap its monthly damage at 8
          const lost = Math.max(0, targetStabilityBefore - covertTarget.stability);
          const soFar = covertHits.get(covertTarget.id) ?? 0;
          const allowed = Math.max(0, 8 - soFar);
          if (lost > allowed)
            covertTarget.stability = clamp01(covertTarget.stability + (lost - allowed));
          covertHits.set(covertTarget.id, soFar + Math.min(lost, allowed));
        }
        if (isPlayer) {
          const rec = world.director.record;
          rec[`${action.type}:tried`] = (rec[`${action.type}:tried`] ?? 0) + 1;
          if (outcome.ok) rec[action.type] = (rec[action.type] ?? 0) + 1;
          if (outcome.ok && action.type === "DOMESTIC_POLICING" && action.params?.tactic === "HARD")
            rec["DOMESTIC_POLICING:hard"] = (rec["DOMESTIC_POLICING:hard"] ?? 0) + 1;
        }
        if (outcome.ok) {
          budgetLeft -= cost;
          if (isPlayer) world.politicalCapital -= pc;
          push2(resolvedActions, actor.id, action);
        } else {
          push(rejectedActions, actor.id, { action, reason: outcome.reason });
        }
        if (isPlayer) tensionAfterPlayer = world.globalTension;
        if (isPlayer && !injected.has(action)) {
          const covert = outcome.covert;
          report.orders.push({
            label: orderLabel(world, action),
            ok: covert ? covert.success : outcome.ok,
            detail: covert
              ? `${covert.success ? "Success" : "Failed"}: ${outcome.reason}`
              : outcome.ok
                ? outcome.reason || "Carried out"
                : outcome.reason,
          });
          if (covert?.toppled)
            report.moments.push(action.type === "INTEL_COUP" ? "REGIME CHANGE" : "ASSASSINATION");
        }
      }
    }

    // AI states posture constantly (denunciations, deployments, strikes inside
    // existing wars): count half of the tension they generate this month
    if (world.globalTension > tensionAfterPlayer) {
      world.globalTension = tensionAfterPlayer + (world.globalTension - tensionAfterPlayer) * 0.5;
    }

    if (foiled.length > 0) {
      const who = [...new Set(foiled)];
      report.causes.push(
        `Counter-intelligence rolled up ${foiled.length === 1 ? "an operation" : `${foiled.length} operations`} run by ${who.join(", ")}`,
      );
    }
    // Hidden foreign meddling: cap the monthly damage and surface it
    if (playerState && covertDamage > 0) {
      const excess = Math.max(0, covertDamage - 8);
      playerState.stability = clamp01(playerState.stability + excess);
      report.causes.push(
        `Foreign covert operations destabilized the country (stability −${Math.round(covertDamage - excess)})`,
      );
      const last = world.director.lastUsed.foreign_interference ?? -99;
      if (world.turn - last >= 6 && world.pendingDecisions.length < 2) {
        const warning = raiseCrisis(world, "foreign_interference", rng);
        if (warning) events.push(warning);
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
    const tensionFloor = Math.min(60, 25 + world.wars.length * 6);
    const nuclearUse = events.some((e) => e.type === "NUCLEAR" && e.severity === "CRITICAL");
    if (!nuclearUse)
      world.globalTension = Math.max(
        tensionFloor > world.globalTension ? world.globalTension : tensionFloor,
        world.globalTension - Math.max(0, (world.globalTension - tensionFloor) * 0.26),
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
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (player && before) this.finishReport(world, player, before, events);
    const newspaper = generateNewspaper(world, events, warSummaries, governmentChanges, rng);
    const lead = player ? playerHeadline(world, player, report) : null;
    if (lead) newspaper.unshift(lead);
    world.newspaper = newspaper;
    world.turnReport = report;

    // ------------------------------------------------------------------
    // Phase 10: game-over checks & advance clock
    // ------------------------------------------------------------------
    const gameOver = this.checkGameOver(world, governmentChanges);
    world.gameOver = gameOver;
    if (gameOver) world.outcome = computeOutcome(world);
    if (player) {
      world.politicalCapital = Math.min(
        PC_CAP,
        world.politicalCapital + politicalCapitalIncome(world, player),
      );
    }

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
  private report: PlayerTurnReport | null = null;

  private resolveDecisions(world: WorldState, choices: DecisionChoice[]): Action[] {
    const injected: Action[] = [];
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (!player) return injected;

    for (const pending of [...world.pendingDecisions]) {
      let choice = choices.find((c) => c.decisionId === pending.id);
      const byDefault = !choice;
      if (!choice && world.turn > pending.deadlineTurn - 1) {
        // Ignored crises resolve themselves — usually not in your favor
        choice = {
          decisionId: pending.id,
          optionId: pending.defaultOptionId ?? pending.options[0]?.id ?? "",
        };
      }
      if (!choice) continue;
      const option = pending.options.find((o) => o.id === choice?.optionId) ?? pending.options[0];
      if (!option) continue;

      applyEffects(world, player, option.effects);
      world.globalTension = clamp01(world.globalTension + option.tensionDelta);
      injected.push(...option.actions);
      if (option.followUp)
        scheduleFollowUp(world, option.followUp.templateId, option.followUp.delay);
      this.report?.decisions.push({
        title: pending.title,
        choice: byDefault ? `${option.label} (no decision taken)` : option.label,
      });
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
  ): {
    ok: boolean;
    reason: string;
    covert?: { success: boolean; exposed: boolean; toppled: boolean };
  } {
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
        const relBefore = actor.relations[target.id] ?? 0;
        improveRelations(actor, target);
        const relAfter = actor.relations[target.id] ?? 0;
        return {
          ok: true,
          reason: `Relations ${Math.round(relBefore)} → ${Math.round(relAfter)} (drift and events still apply)`,
        };
      }
      case "DIPLOMACY_DENOUNCE": {
        if (!target) return { ok: false, reason: "No target" };
        const isPlayer = actor.id === world.playerCountryId;
        const recent = isPlayer
          ? world.director.denounceTurns.filter((t) => world.turn - t < 6).length
          : 0;
        const delta = denounce(world, actor, target, recent);
        if (isPlayer) {
          world.director.denounceTurns = [
            ...world.director.denounceTurns.filter((t) => world.turn - t < 6),
            world.turn,
          ];
        }
        const mood =
          delta > 0
            ? `Approval +${delta}: the public enjoys strength`
            : delta < 0
              ? `Approval ${delta}: voters see grandstanding`
              : "No effect on approval";
        return { ok: true, reason: mood };
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
        if (target.id === world.playerCountryId) {
          // Rally 'round the flag: being attacked unites a nation, for a while
          target.approval = clamp01(target.approval + 8);
          target.legitimacy = clamp01(target.legitimacy + 4);
          this.report?.causes.push(
            `Rally 'round the flag after ${possessive(actor.name)} attack (approval +8)`,
          );
          this.report?.moments.push("UNDER ATTACK");
        }
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
            description: `Following ${possessive(actor.name)} initiative, the guns have fallen silent. The peace is fragile — but it is peace.`,
            affectedCountries: [actor.id, target.id],
            turn: world.turn,
            severity: "MAJOR",
          });
        }
        return accepted
          ? { ok: true, reason: "" }
          : { ok: false, reason: `${target.name} rejected the ceasefire proposal` };
      }
      case "DIPLOMACY_MEDIATE": {
        if (!target) return { ok: false, reason: "No target" };
        const result = mediate(world, actor, target, rng);
        if (result.ended && result.otherId) {
          const other = world.countries.find((c) => c.id === result.otherId);
          if (actor.id === world.playerCountryId) {
            actor.approval = clamp01(actor.approval + 5);
            this.report?.moments.push("PEACEMAKER");
          }
          events.push({
            id: `evt_mediation_${actor.id}_${target.id}_${world.turn}`,
            type: "DIPLOMACY",
            title: `${actor.name} brokers ceasefire between ${target.name} and ${other?.name ?? result.otherId}`,
            description: `After marathon talks hosted by ${actor.leader.title} ${actor.leader.name}, ${target.name} and ${other?.name ?? result.otherId} agreed to stop fighting along current lines. Diplomats call it fragile; the guns are silent for now.`,
            affectedCountries: [actor.id, target.id, result.otherId],
            turn: world.turn,
            severity: "MAJOR",
          });
        }
        return { ok: result.ok, reason: result.reason };
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
            ? `${actor.name} CRIPPLES ${possessive(target.name)} NUCLEAR PROGRAM`
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
          Math.min(40, action.value ?? actor.militaryBudgetPercent),
        );
        return { ok: true, reason: "" };
      }
      case "INTEL_COUNTER_INTEL": {
        actor.counterIntelLevel = clamp01(actor.counterIntelLevel + 10);
        if (actor.id === world.playerCountryId) {
          // This month and the next two
          world.director.counterIntelUntil = world.turn + COUNTER_INTEL_MONTHS - 1;
          return {
            ok: true,
            reason: `Spy hunt under way: most foreign operations against us fail for ${COUNTER_INTEL_MONTHS} months`,
          };
        }
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
        // The order was carried out (and paid for) either way; the report says how it went
        const exposure = outcome.exposed ? ` ${target.name} knows it was us.` : "";
        return {
          ok: true,
          reason: `${outcome.description}${exposure}`,
          covert: {
            success: outcome.success,
            exposed: outcome.exposed,
            toppled: !!outcome.governmentChange,
          },
        };
      }
      case "DOMESTIC_PROPAGANDA": {
        if (actor.id !== world.playerCountryId) {
          applyPropaganda(actor);
          return { ok: true, reason: "" };
        }
        // Repetition dulls the message: each recent use cuts the effect by 40%
        const recent = world.director.propagandaTurns.filter((t) => world.turn - t < 6).length;
        const effect = 0.6 ** recent;
        applyPropaganda(actor, effect);
        world.director.propagandaTurns = [
          ...world.director.propagandaTurns.filter((t) => world.turn - t < 6),
          world.turn,
        ];
        if (recent >= 2 && actor.regimeType === "DEMOCRACY") {
          actor.legitimacy = clamp01(actor.legitimacy - 2);
          this.report?.causes.push("The press mocks your relentless spin (legitimacy −2)");
        }
        return {
          ok: true,
          reason:
            recent === 0
              ? "The nation rallies to your message"
              : `Diminishing returns — the public has heard it before (${Math.round(effect * 100)}% effect)`,
        };
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
  private finishReport(
    world: WorldState,
    player: CountryState,
    before: { approval: number; stability: number; legitimacy: number; gdp: number; score: number },
    events: GameEvent[],
  ): void {
    const report = this.report;
    if (!report) return;
    report.deltas = {
      approval: { before: before.approval, after: player.approval },
      stability: { before: before.stability, after: player.stability },
      legitimacy: { before: before.legitimacy, after: player.legitimacy },
      gdp: { before: before.gdp, after: player.gdp },
      score: { before: before.score, after: world.score.total },
    };
    // World events that touched the player explain part of the movement
    for (const e of events) {
      if (
        e.type !== "CRISIS" &&
        (e.severity === "MAJOR" || e.severity === "CRITICAL") &&
        e.affectedCountries.includes(player.id) &&
        e.affectedCountries.length < world.countries.length
      ) {
        report.causes.push(e.title);
      }
    }
    if (player.atWarWith.length > 0) report.causes.push("War weariness weighs on the public mood");
    if (player.growthRate < 0) report.causes.push("A shrinking economy erodes approval");
    else if (player.growthRate > 0.025) report.causes.push("Strong growth lifts the national mood");

    // Near-loss and comeback beats
    const d = world.director;
    const low = Math.min(player.approval, player.stability, player.legitimacy);
    d.lowPoint = Math.min(d.lowPoint, low);
    const election = player.politicalSystem.nextElectionTurn;
    const losingPolls =
      election !== null &&
      election - world.turn <= 6 &&
      election >= world.turn &&
      player.approval < 45;
    const plotWarned = world.pendingDecisions.some((p) =>
      ["coup_plot", "streets_boiling"].includes(p.templateId),
    );
    const danger = low < 28 || losingPolls || plotWarned;
    if (danger && !d.inDanger) {
      d.inDanger = true;
      d.closeCalls += 1;
      report.moments.push(losingPolls ? "TRAILING IN THE POLLS" : "CLOSE CALL");
    } else if (d.inDanger && !danger && low > 42) {
      d.inDanger = false;
      d.rallies += 1;
      report.moments.push("COMEBACK");
    }
    if (
      player.alliances.length > 0 &&
      !world.timeline.some((t) => t.description === "FIRST_PACT")
    ) {
      const newPact = events.some(
        (e) => e.title.includes("sign military pact") && e.affectedCountries.includes(player.id),
      );
      if (newPact) report.moments.push("NEW ALLIANCE");
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
          "The missiles flew. Civilization as we knew it has ended. There are no winners.",
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

    // Objective irrecoverably failed (e.g. the rival tested a bomb)
    const failed = earlyFailure(world);
    if (failed) {
      return {
        reason: "OBJECTIVE_FAILED",
        description: `Mission failed: ${failed.label}.`,
        turn: world.turn,
      };
    }

    // End of the session (turn counter advances after this check)
    if (world.turn + 1 >= world.maxTurns) {
      if (world.objective) {
        const outcome = computeOutcome({ ...world, gameOver: null });
        if (!outcome.victory) {
          const missed = outcome.conditions.find((c) => !c.met && !c.bonus);
          return {
            reason: "OBJECTIVE_FAILED",
            description: `Time is up. Objective not met: ${missed?.label ?? "mission objectives"}.`,
            turn: world.turn,
          };
        }
      }
      const span =
        world.mode === "FLASHPOINT"
          ? "Through the crisis"
          : world.mode === "TERM"
            ? "After a full term"
            : "After ten years";
      return {
        reason: "TERM_COMPLETED",
        description: `${span} at the helm of ${player.name}, you are still standing. History will now judge your record.`,
        turn: world.turn,
      };
    }

    return null;
  }
}

// --------------------------------------------------------------------
/** A spy hunt protects the player for this many months… */
const COUNTER_INTEL_MONTHS = 3;
/** …and foils this share of the foreign operations aimed at them meanwhile. */
const COUNTER_INTEL_FOIL = 0.6;

const ORDER_VERBS: Partial<Record<Action["type"], string>> = {
  DIPLOMACY_IMPROVE_RELATIONS: "Court",
  DIPLOMACY_DENOUNCE: "Denounce",
  DIPLOMACY_PROPOSE_ALLIANCE: "Offer pact to",
  DIPLOMACY_BREAK_ALLIANCE: "Break pact with",
  DIPLOMACY_DECLARE_WAR: "Declare war on",
  DIPLOMACY_PROPOSE_CEASEFIRE: "Propose ceasefire to",
  DIPLOMACY_MEDIATE: "Mediate peace for",
  MILITARY_MOBILIZE: "Mobilize forces",
  MILITARY_DEMOBILIZE: "Stand down forces",
  MILITARY_PROCURE: "Buy weapons",
  MILITARY_AIRSTRIKE: "Airstrike on",
  MILITARY_DEPLOY_BORDER: "Mass troops facing",
  MILITARY_WITHDRAW_BORDER: "Withdraw troops facing",
  NUCLEAR_FUND_PROGRAM: "Fund nuclear program",
  NUCLEAR_STRIKE: "NUCLEAR STRIKE on",
  ECONOMY_ADJUST_MILITARY_BUDGET: "Set defense budget",
  INTEL_GATHER: "Spy on",
  INTEL_SABOTAGE: "Sabotage",
  INTEL_DESTABILIZE: "Destabilize",
  INTEL_SUPPORT_REBELS: "Arm rebels in",
  INTEL_COUNTER_INTEL: "Hunt foreign spies",
  INTEL_MISINFORMATION: "Feed disinformation to",
  INTEL_PROPAGANDA: "Covert propaganda in",
  INTEL_ASSASSINATE: "Assassinate leader of",
  INTEL_COUP: "Back coup in",
  DOMESTIC_PROPAGANDA: "National address",
  DOMESTIC_REFORM: "Reform program",
  DOMESTIC_POLICING: "Change policing",
};

export function orderLabel(world: WorldState, action: Action): string {
  const verb = ORDER_VERBS[action.type] ?? action.type;
  const target = action.targetCountryId
    ? world.countries.find((c) => c.id === action.targetCountryId)?.name
    : undefined;
  if (action.type === "DOMESTIC_POLICING") {
    return `${(action.params?.tactic as string) === "HARD" ? "Hard" : "Soft"} policing`;
  }
  return target ? `${verb} ${target}` : verb;
}

function playerHeadline(
  world: WorldState,
  player: CountryState,
  report: PlayerTurnReport,
): NewspaperEntry | null {
  const who = `${player.leader.title} ${player.leader.name}`;
  const surname = player.leader.name.split(" ").at(-1) ?? player.leader.name;
  const decision = report.decisions[0];
  const order = report.orders.find((o) => o.ok) ?? report.orders[0];
  if (!decision && !order) return null;
  const headline = decision
    ? `${surname.toUpperCase()}'S ANSWER TO "${decision.title.toUpperCase()}": ${decision.choice.replace(" (no decision taken)", "").toUpperCase()}`
    : `${player.name.toUpperCase()}: ${order.label.toUpperCase()}${order.ok ? "" : " — BLOCKED"}`;
  const lines = [
    ...report.decisions.map((d) => `Faced with “${d.title}”, ${who} decided: ${d.choice}.`),
    ...report.orders.map((o) => `${o.label}: ${o.detail}.`),
  ];
  return {
    headline,
    description: lines.join(" "),
    relatedCountries: [player.id],
    turn: world.turn,
    category: "DOMESTIC",
  };
}

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
