import { actionRules, orderKey } from "./availability.js";
import { actionCostM, actionCostPC, MAX_ORDERS, PC_CAP, politicalCapitalIncome } from "./costs.js";
import { applyEffects, raiseCrisis, runDirector, scheduleFollowUp } from "./crises.js";
import { EventEngine } from "./events.js";
import { sharesLandBorder } from "./geography.js";
import { generateAgenda, MEETING_SLOTS } from "./meetings.js";
import { generateNewspaper } from "./newspaper.js";
import { computeOutcome, earlyFailure } from "./objectives.js";
import { engineOrderFor } from "./orders.js";
import { failStory, ledgerEntry, orderFacts, orderStory, snapshot } from "./outcomes.js";
import {
  bandOf,
  crisisReaction,
  findCountry,
  hashParts,
  meetingReaction,
  orderReaction,
  outcomeHeadline,
  toneOf,
  watchLine,
} from "./reactions.js";
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
import { updateHotspots } from "./systems/hotspots.js";
import { buildPlayerView, updateBeliefs } from "./systems/intelligence.js";
import type { AirstrikeTarget, WarMonthSummary } from "./systems/military.js";
import {
  activateDefensivePacts,
  applyBorderTensions,
  deployToBorder,
  endWar,
  executeAirstrike,
  monthlyDefenseBudgetM,
  resolveWarMonth,
  startWar,
  withdrawFromBorder,
} from "./systems/military.js";
import {
  applyFallout,
  executeNuclearStrike,
  progressNuclearPrograms,
  startNuclearProgram,
} from "./systems/nuclear.js";
import { applyPropaganda, applyReform, updateDomestic } from "./systems/stability.js";
import { possessive, withArticle } from "./text.js";
import type {
  Action,
  CountryIntent,
  CountryState,
  GameEvent,
  GameOver,
  Hotspot,
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
    const gdpAtStart = new Map(world.countries.map((c) => [c.id, c.gdp]));
    const tensionBefore = world.globalTension;

    const governmentChanges: GovernmentChange[] = [];
    const rejectedActions = new Map<string, { action: Action; reason: string }[]>();
    const resolvedActions = new Map<string, Action[]>();
    const events: GameEvent[] = [];
    const playerBefore = world.countries.find((c) => c.id === world.playerCountryId);
    // For the story: who was our ally and which states stood, before this month
    const alliesBefore = [...(playerBefore?.alliances ?? [])];
    const collapsedBefore = new Set(world.countries.filter((c) => c.collapsed).map((c) => c.id));
    const report: PlayerTurnReport = {
      turn: world.turn,
      orders: [],
      decisions: [],
      deltas: {},
      causes: [],
      moments: [],
      relations: [],
      world: [],
      wars: [],
      hot: [],
    };
    // The month's starting picture, for the debrief (others' view of us, fronts, hot zones)
    this.start = {
      rel: new Map(world.countries.map((c) => [c.id, c.relations[world.playerCountryId] ?? 0])),
      front: new Map(world.wars.map((w) => [w.id, w.frontline])),
      hot: new Map(world.hotspots.map((h) => [h.id, { ...h }])),
      tension: world.globalTension,
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
      const ordered = new Set<string>();
      let orderCount = 0;

      for (const action of intent.actions) {
        // One of each order per target per month, and at most MAX_ORDERS orders: the desk is
        // a month of a leader's attention, not a macro to spam. The player's own orders go
        // through the same availability checks the preview shows (availability.ts), so a
        // predictable refusal carries the same code the UI displayed.
        const playerOrder = isPlayer && !injected.has(action);
        if (playerOrder) {
          const key = orderKey(action);
          const limit = ordered.has(key)
            ? "DUPLICATE"
            : orderCount >= MAX_ORDERS
              ? "ORDER_LIMIT"
              : null;
          if (limit) {
            const reason =
              limit === "DUPLICATE"
                ? "Already ordered this month"
                : `At most ${MAX_ORDERS} orders a month`;
            push(rejectedActions, actor.id, { action, reason });
            report.orders.push({
              ...orderTag(world, action),
              ok: false,
              detail: reason,
              code: limit,
            });
            continue;
          }
          ordered.add(key);
          orderCount++;
          const rule = actionRules(world, actor, action);
          if (rule) {
            push(rejectedActions, actor.id, { action, reason: rule.reason });
            report.orders.push({
              ...orderTag(world, action),
              ok: false,
              detail: rule.reason,
              code: rule.code,
            });
            continue;
          }
        }
        if (
          action.value !== undefined &&
          (!Number.isFinite(action.value) || action.value < 0) &&
          action.type !== "ECONOMY_ADJUST_MILITARY_BUDGET"
        ) {
          push(rejectedActions, actor.id, { action, reason: "Invalid order value" });
          if (isPlayer)
            report.orders.push({
              ...orderTag(world, action),
              ok: false,
              detail: "Invalid order value",
              code: "INVALID_VALUE",
            });
          continue;
        }
        const cost = actionCostM(action, actor);
        // Orders that come from crisis decisions were already paid for by the choice
        const pc = playerOrder ? actionCostPC(action) : 0;
        if (playerOrder && cost > budgetLeft) {
          const reason = `Insufficient defense budget ($${Math.round(budgetLeft)}M left, needs $${cost}M)`;
          push(rejectedActions, actor.id, { action, reason });
          report.orders.push({
            ...orderTag(world, action),
            ok: false,
            detail: reason,
            code: "NO_DEFENSE_BUDGET",
          });
          continue;
        }
        if (pc > world.politicalCapital) {
          const reason = `Not enough political capital (${world.politicalCapital} left, needs ${pc})`;
          push(rejectedActions, actor.id, { action, reason });
          report.orders.push({
            ...orderTag(world, action),
            ok: false,
            detail: reason,
            code: "NO_CAPITAL",
          });
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
        const reported = isPlayer && !injected.has(action);
        const orderTarget = action.targetCountryId
          ? world.countries.find((c) => c.id === action.targetCountryId)
          : undefined;
        const snapBefore = reported ? snapshot(world, actor, orderTarget) : null;
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
          // A war entered through a crisis answer (honoring a pact) is not a war of choice
          const key =
            injected.has(action) && action.type === "DIPLOMACY_DECLARE_WAR"
              ? "DIPLOMACY_DECLARE_WAR:ally"
              : action.type;
          rec[`${key}:tried`] = (rec[`${key}:tried`] ?? 0) + 1;
          if (outcome.ok) rec[key] = (rec[key] ?? 0) + 1;
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
          const snapAfter = snapshot(world, actor, orderTarget);
          const facts = snapBefore
            ? orderFacts(action.type, orderTarget?.name ?? "", snapBefore, snapAfter)
            : [];
          const done = covert ? covert.success : outcome.ok;
          const count = world.director.record[action.type] ?? 0;
          const story = !snapBefore
            ? ""
            : done && !covert
              ? orderStory(action, actor, orderTarget, snapBefore, snapAfter, count, world.turn)
              : !done
                ? failStory(action, orderTarget, outcome.reason, snapAfter, world.turn)
                : "";
          if (done) {
            const value = ledgerEntry(action.type, snapAfter);
            if (value !== null) {
              world.director.ledger[action.type] ??= [];
              const line = world.director.ledger[action.type];
              line.push({
                turn: world.turn,
                value,
                ...(orderTarget ? { target: orderTarget.id } : {}),
              });
              if (line.length > 24) line.splice(0, line.length - 24);
            }
          }
          report.orders.push({
            ...orderTag(world, action),
            ok: done,
            detail: covert
              ? `${covert.success ? "Success" : "Failed"}: ${outcome.reason}`
              : outcome.ok
                ? outcome.reason || "Carried out"
                : outcome.reason,
            ...(story ? { story } : {}),
            ...(facts.length ? { facts } : {}),
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
    // Co-belligerents go home when the war they joined is over
    for (const war of [...world.wars]) {
      if (!war.alliedWith) continue;
      const helper = [war.attackerId, war.defenderId].find((id) => id !== war.alliedWith);
      const enemy = helper === war.attackerId ? war.defenderId : war.attackerId;
      const principal = world.countries.find((c) => c.id === war.alliedWith);
      if (principal && !principal.collapsed && principal.atWarWith.includes(enemy)) continue;
      const ended = endWar(world, war, null, null, rng);
      warSummaries.push({ war, delta: 0, attackerCasualties: 0, defenderCasualties: 0, ended });
    }
    for (const war of [...world.wars]) {
      const summary = resolveWarMonth(world, war, rng);
      if (summary) {
        warSummaries.push(summary);
        if (summary.ended?.loserId) {
          // Losing a war can topple a government, handled by dynamics below via crashed stats
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
    events.push(...applyFallout(world));
    events.push(...updateHotspots(world));
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
    // Even an eventful month only moves the global mood so far, unless war or
    // nuclear use shocked the system
    const hadShock = events.some(
      (e) => e.severity === "CRITICAL" && (e.type === "WAR" || e.type === "NUCLEAR"),
    );
    world.globalTension = Math.min(
      world.globalTension,
      Math.min(100, tensionBefore + (hadShock ? 30 : 8)),
    );
    // ...and calms only so fast: one ceasefire must not wipe out a world still at war
    world.globalTension = Math.max(
      world.globalTension,
      tensionBefore - 12,
      Math.min(tensionFloor, tensionBefore) * 0.85,
    );

    // ------------------------------------------------------------------
    // Phase 7: government dynamics (elections, coups, revolutions)
    // ------------------------------------------------------------------
    const govResult = runGovernmentDynamics(world, rng);
    governmentChanges.push(...govResult.changes);
    events.push(...govResult.events);

    // ------------------------------------------------------------------
    // What actually happened to each economy this month (growth, war damage, crisis
    // hits, reparations), annualised and smoothed: the HUD, voters and the score all
    // read this, so the growth they show matches the GDP they see.
    for (const c of world.countries) {
      const before = gdpAtStart.get(c.id) ?? c.gdp;
      if (before <= 0) continue;
      const annual = Math.max(-0.6, Math.min(0.3, (c.gdp / before) ** 12 - 1));
      // Heavily smoothed: a one-off hit annualised x12 must not read as a recession
      c.realGrowth = (c.realGrowth ?? c.growthRate) * 0.85 + annual * 0.15;
    }

    // Phase 8: scoring & timeline
    // ------------------------------------------------------------------
    updateScore(world);
    this.recordTimeline(world, events, warSummaries, governmentChanges);

    // ------------------------------------------------------------------
    // Phase 9: newspaper
    // ------------------------------------------------------------------
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (player && before) this.finishReport(world, player, before, events, resolvedActions);
    const newspaper = generateNewspaper(world, events, warSummaries, governmentChanges, rng);
    const lead = player ? playerLead(world, player, report) : null;
    if (lead) newspaper.unshift(lead);
    // The player's own catastrophes and gambles own the front page
    if (player) {
      const mine = (n: NewspaperEntry) =>
        n.relatedCountries.includes(player.id) &&
        (n.category === "GOVERNMENT" ||
          n.category === "NUCLEAR" ||
          n.headline.startsWith(`WAR: ${player.name} attacks`) ||
          (n.headline.startsWith(`WAR: `) && n.headline.endsWith(` attacks ${player.name}`)));
      const dramatic = newspaper.filter((n) => n !== lead && mine(n));
      if (dramatic.length > 0)
        world.newspaper = [...dramatic, ...newspaper.filter((n) => !dramatic.includes(n))];
      else world.newspaper = newspaper;
    } else world.newspaper = newspaper;
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

    if (player)
      this.recordShocks(
        world,
        player,
        alliesBefore,
        collapsedBefore,
        governmentChanges,
        playerActions,
      );

    world.turn += 1;
    world.date = advanceMonth(world.date);
    world.eventQueue = events;
    // Next month's calendar, built from the world as it now stands
    world.agenda = world.gameOver ? [] : generateAgenda(world);

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
  private start: {
    rel: Map<string, number>;
    front: Map<string, number>;
    hot: Map<string, Hotspot>;
    tension: number;
  } | null = null;

  private resolveDecisions(world: WorldState, choices: DecisionChoice[]): Action[] {
    const injected: Action[] = [];
    const player = world.countries.find((c) => c.id === world.playerCountryId);
    if (!player) return injected;

    for (const pending of [...world.pendingDecisions]) {
      let choice = choices.find((c) => c.decisionId === pending.id);
      const byDefault = !choice;
      if (!choice && world.turn > pending.deadlineTurn - 1) {
        // Ignored crises resolve themselves: usually not in your favor
        choice = {
          decisionId: pending.id,
          optionId: pending.defaultOptionId ?? pending.options[0]?.id ?? "",
        };
      }
      if (!choice) continue;
      const option = pending.options.find((o) => o.id === choice?.optionId) ?? pending.options[0];
      if (!option) continue;

      const snapBefore = outcomeSnap(world, player);
      applyEffects(world, player, option.effects);
      world.globalTension = clamp01(world.globalTension + option.tensionDelta);
      injected.push(...option.actions);
      if (option.followUp)
        scheduleFollowUp(world, option.followUp.templateId, option.followUp.delay);
      const relKey = Object.keys(option.effects).find((k) => k.startsWith("relations:"));
      const otherId =
        relKey?.split(":")[1] ?? pending.affectedCountries.find((id) => id !== player.id);
      const them = findCountry(world, otherId);
      const facts = decisionFacts(
        world,
        option.effects,
        option.tensionDelta,
        snapBefore,
        outcomeSnap(world, player),
      );
      const seed = hashParts(world.seed, world.turn, pending.id, option.id);
      const reaction = crisisReaction(option.effects, { them, player }, facts, seed);
      this.report?.decisions.push({
        title: pending.title,
        choice: byDefault ? `${option.label} (no decision taken)` : option.label,
        templateId: pending.templateId,
        kind: "CRISIS",
        optionId: option.id,
        withCountry: them?.id,
        attended: !byDefault,
        headline: outcomeHeadline(
          "CRISIS",
          reaction?.tone ?? "neutral",
          { them, player, title: pending.title, choice: option.label },
          seed,
        ),
        facts,
        reaction,
        watch: watchLine({ followUpDelay: option.followUp?.delay }),
      });
      world.pendingDecisions = world.pendingDecisions.filter((d) => d.id !== pending.id);
    }

    // The calendar: the player attends at most MEETING_SLOTS meetings; the rest go to a deputy
    let attended = 0;
    for (const meeting of world.agenda) {
      const picked = choices.find((c) => c.decisionId === meeting.id);
      const deputy = meeting.options.find((o) => o.id === meeting.defaultOptionId);
      let option = picked ? meeting.options.find((o) => o.id === picked.optionId) : undefined;
      if (option && option !== deputy) {
        if (attended >= MEETING_SLOTS) option = undefined;
        else attended++;
      }
      option ??= deputy;
      if (!option) continue;
      const them = findCountry(world, meeting.withCountry);
      const bandBefore = bandOf(player, them);
      const snapBefore = outcomeSnap(world, player);
      applyEffects(world, player, option.effects);
      world.globalTension = clamp01(world.globalTension + option.tensionDelta);
      const facts = decisionFacts(
        world,
        option.effects,
        option.tensionDelta,
        snapBefore,
        outcomeSnap(world, player),
      );
      const attendedIt = option !== deputy;
      const seed = hashParts(world.seed, world.turn, meeting.id, option.id);
      // The tone follows the measured change: their view of us, else our approval
      const relFact = them
        ? facts.find((f) => f.label === `${possessive(them.name)} view of you`)
        : undefined;
      const apprFact = facts.find((f) => f.label === "Approval");
      const delta = relFact
        ? relFact.after - relFact.before
        : apprFact
          ? apprFact.after - apprFact.before
          : 0;
      const reaction = attendedIt
        ? meetingReaction(meeting.kind, { them, player, speaker: meeting.speaker }, delta, seed)
        : undefined;
      this.report?.decisions.push({
        title: meeting.title,
        choice: attendedIt ? option.label : `${option.label} (you did not attend)`,
        templateId: meeting.templateId,
        kind: meeting.kind,
        optionId: option.id,
        withCountry: them?.id,
        speaker: meeting.speaker,
        attended: attendedIt,
        headline: attendedIt
          ? outcomeHeadline(
              meeting.kind,
              toneOf(delta),
              {
                them,
                player,
                speaker: meeting.speaker,
                title: meeting.title,
                choice: option.label,
              },
              seed,
            )
          : `${meeting.speaker}: handled by your staff`,
        facts,
        reaction,
        watch: watchLine({
          bandBefore,
          bandAfter: bandOf(player, them),
          country: them?.name,
          deputyCaller: !attendedIt && meeting.kind === "CALL" ? meeting.speaker : undefined,
          staffHold: meeting.kind === "STAFF" && /^(hold|deputy|course|wait)$/.test(option.id),
        }),
      });
    }
    world.agenda = [];
    return injected;
  }

  /**
   * Turning points the player must answer next month (emergency meetings, meetings.ts):
   * a coup or revolution in a country that matters to us, a state that collapsed, an ally lost.
   */
  private recordShocks(
    world: WorldState,
    player: CountryState,
    alliesBefore: string[],
    collapsedBefore: Set<string>,
    changes: GovernmentChange[],
    playerActions: Action[],
  ): void {
    const shocks = world.director.shocks;
    const matters = (id: string) =>
      alliesBefore.includes(id) ||
      player.alliances.includes(id) ||
      player.atWarWith.includes(id) ||
      sharesLandBorder(id, player.id) === true ||
      (player.history.historicalRivals ?? []).includes(id) ||
      Math.abs(player.relations[id] ?? 0) >= 40 ||
      ["USA", "CHN", "RUS"].includes(id);
    for (const g of changes) {
      if (g.isPlayerDeposed || g.countryId === player.id) continue;
      if (!["COUP", "REVOLUTION", "ASSASSINATION", "FOREIGN_IMPOSED"].includes(g.kind)) continue;
      if (matters(g.countryId))
        shocks.push({ kind: "REGIME_CHANGE", by: g.kind, target: g.countryId, turn: world.turn });
    }
    for (const c of world.countries) {
      if (c.collapsed && !collapsedBefore.has(c.id) && c.id !== player.id && matters(c.id))
        shocks.push({ kind: "COLLAPSE", target: c.id, turn: world.turn });
    }
    for (const id of alliesBefore) {
      if (player.alliances.includes(id)) continue;
      // Breaking the pact ourselves is a choice, not a shock
      if (
        playerActions.some((a) => a.type === "DIPLOMACY_BREAK_ALLIANCE" && a.targetCountryId === id)
      )
        continue;
      shocks.push({ kind: "ALLY_LOST", target: id, turn: world.turn });
    }
    if (shocks.length > 40) shocks.splice(0, shocks.length - 40);
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
          return { ok: false, reason: "At war, propose a ceasefire first" };
        if ((actor.relations[target.id] ?? 0) >= 95)
          return { ok: false, reason: "Relations are already as good as they get" };
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
          ? world.director.denounceTurns.filter((t) => t < world.turn && world.turn - t < 6).length
          : 0;
        // Only the first denunciation each month moves voters; more is just noise
        const already = isPlayer && world.director.denounceTurns.includes(world.turn);
        const delta = already
          ? denounce(world, actor, target, recent, 0)
          : denounce(world, actor, target, recent);
        if (isPlayer) {
          // One entry per month: two denunciations this month count as one repeat next month
          world.director.denounceTurns = [
            ...world.director.denounceTurns.filter((t) => world.turn - t < 6 && t !== world.turn),
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
        // Nobody signs the player into a pact: the offer lands on the desk as a crisis card
        if (target.id === world.playerCountryId && actor.id !== world.playerCountryId) {
          const lastOffer = world.director.lastUsed.pact_offer ?? -99;
          if ((target.relations[actor.id] ?? 0) >= 40 && world.turn - lastOffer >= 9) {
            world.director.pactSuitor = actor.id;
            const offer = raiseCrisis(world, "pact_offer", rng);
            if (offer) events.push(offer);
          }
          return { ok: false, reason: "Offer sent to the player's desk" };
        }
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
        // Only a real principal counts: a country already at war with this target
        const principalId = action.params?.alliedWith;
        if (
          typeof principalId === "string" &&
          world.countries.find((c) => c.id === principalId)?.atWarWith.includes(target.id)
        )
          war.alliedWith = principalId;
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
          }${check.nuclearStandoff ? " Both belligerents possess nuclear weapons, the world stands at the brink." : ""}`,
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
            description: `Following ${possessive(actor.name)} initiative, the guns have fallen silent. The peace is fragile, but it is peace.`,
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
        const spend = action.value ?? 500;
        if (!Number.isFinite(spend) || spend <= 0 || spend > 50_000)
          return { ok: false, reason: "Invalid purchase amount" };
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
        const troops = Math.round(action.value ?? 50000);
        if (troops <= 0 || troops > actor.manpower)
          return {
            ok: false,
            reason: `You can deploy at most ${actor.manpower.toLocaleString()} troops`,
          };
        deployToBorder(actor, target.id, troops);
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
              : `Diminishing returns, the public has heard it before (${Math.round(effect * 100)}% effect)`,
        };
      }
      case "DOMESTIC_REFORM": {
        const isPlayer = actor.id === world.playerCountryId;
        // Reform fatigue is a long-game effect: a 12-month crisis is when you push reform hardest
        const recent =
          isPlayer && world.mode !== "FLASHPOINT"
            ? world.director.reformTurns.filter((t) => t < world.turn && world.turn - t < 6).length
            : 0;
        const k = REFORM_DECAY ** recent;
        applyReform(actor, k);
        if (isPlayer) {
          world.director.reformTurns = [
            ...world.director.reformTurns.filter((t) => world.turn - t < 6 && t !== world.turn),
            world.turn,
          ];
          // Reforms pay off slowly: each one lifts the economy's long-run trend a little
          const base = actor.economyProfile?.growthRate ?? actor.trendGrowth ?? 0.02;
          actor.trendGrowth = Math.min(base + 0.012, (actor.trendGrowth ?? base) + 0.0015 * k);
        }
        return {
          ok: true,
          reason:
            recent > 0
              ? `Reform fatigue: ${Math.round(k * 100)}% effect; the long-run growth trend edges up`
              : "Stability now, growth later: the long-run trend edges up",
        };
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
    resolved: Map<string, Action[]> = new Map(),
  ): void {
    const report = this.report;
    if (!report) return;
    this.monthContext(world, player, report, resolved);
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
    if ((player.realGrowth ?? player.growthRate) < 0)
      report.causes.push("A shrinking economy erodes approval");
    else if ((player.realGrowth ?? player.growthRate) > 0.025)
      report.causes.push("Strong growth lifts the national mood");

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

  /**
   * The month around the player, for the debrief: who changed their view of us, what the AI did
   * that touches us, how the fronts and hot zones moved, and the single most important outcome.
   */
  private monthContext(
    world: WorldState,
    player: CountryState,
    report: PlayerTurnReport,
    resolved: Map<string, Action[]>,
  ): void {
    const start = this.start;
    if (!start) return;
    const name = (id: string) => world.countries.find((c) => c.id === id)?.name ?? id;
    // Others' view of us: the five biggest movers
    report.relations = world.countries
      .filter((c) => c.id !== player.id && !c.collapsed)
      .map((c) => ({
        id: c.id,
        before: start.rel.get(c.id) ?? 0,
        after: c.relations[player.id] ?? 0,
      }))
      .filter((r) => Math.abs(r.after - r.before) >= 1)
      .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
      .slice(0, 5)
      .map((r) => ({ ...r, before: Math.round(r.before), after: Math.round(r.after) }));
    // AI moves that touch us: aimed at us or an ally, or by a country at war with us
    const rank = (t: string) =>
      t === "NUCLEAR_STRIKE"
        ? 0
        : t === "DIPLOMACY_DECLARE_WAR"
          ? 1
          : t.startsWith("MILITARY_AIRSTRIKE")
            ? 2
            : t === "DIPLOMACY_DENOUNCE"
              ? 4
              : t.startsWith("MILITARY")
                ? 3
                : t.startsWith("INTEL")
                  ? 5
                  : 6;
    const moves: Array<{ actor: string; type: string; target?: string; label: string; r: number }> =
      [];
    for (const [actor, actions] of resolved) {
      if (actor === player.id) continue;
      for (const a of actions) {
        const t = a.targetCountryId;
        const touches =
          t === player.id ||
          (t && player.alliances.includes(t)) ||
          player.atWarWith.includes(actor);
        if (!touches || a.type === "ECONOMY_ADJUST_MILITARY_BUDGET") continue;
        moves.push({
          actor,
          type: a.type,
          target: t,
          label: `${name(actor)}: ${orderLabel(world, a)}`,
          r: rank(a.type),
        });
      }
    }
    report.world = moves
      .sort((a, b) => a.r - b.r)
      .slice(0, 12)
      .map(({ r: _r, ...m }) => m);
    // Our wars: the front from our side, start and end of the month
    const ours = (w: { attackerId: string; defenderId: string }) =>
      w.attackerId === player.id || w.defenderId === player.id;
    for (const [id, front] of start.front) {
      const now = world.wars.find((w) => w.id === id);
      const attacker = id.split("_")[1];
      const defender = id.split("_")[2];
      if (attacker !== player.id && defender !== player.id) continue;
      const mine = (f: number) => (attacker === player.id ? f : 100 - f);
      report.wars.push({
        vs: attacker === player.id ? defender : attacker,
        frontBefore: Math.round(mine(front)),
        frontAfter: Math.round(mine(now?.frontline ?? front)),
        ended: !now,
      });
    }
    for (const w of world.wars.filter((x) => ours(x) && !start.front.has(x.id))) {
      report.wars.push({
        vs: w.attackerId === player.id ? w.defenderId : w.attackerId,
        frontBefore: 50,
        frontAfter: Math.round(w.attackerId === player.id ? w.frontline : 100 - w.frontline),
        ended: false,
      });
    }
    // Hot zones: the metrics that moved most
    for (const h of world.hotspots) {
      const was = start.hot.get(h.id);
      // Only the governments that carry these places get them in their debrief
      if (!was || ![h.occupier, h.people, "EGY", "USA"].includes(player.id)) continue;
      const moved = (["violence", "humanitarian", "aid", "governance", "control"] as const)
        .map((m) => ({
          id: h.id,
          name: h.name,
          metric: m,
          before: Math.round(was[m]),
          after: Math.round(h[m]),
          phase: h.phase,
        }))
        .filter((x) => Math.abs(x.after - x.before) >= 5 || was.phase !== h.phase)
        .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
        .slice(0, 2);
      report.hot.push(...moved);
    }
    report.tension = { before: Math.round(start.tension), after: Math.round(world.globalTension) };
    // Orders: the target's real answer this month, else a line by how its view of us moved
    report.orders.forEach((o, i) => {
      if (!o.target || o.target === player.id) return;
      const them = findCountry(world, o.target);
      if (!them) return;
      const real = (resolved.get(o.target) ?? []).find((a) => a.targetCountryId === player.id);
      const d = (them.relations[player.id] ?? 0) - (start.rel.get(o.target) ?? 0);
      o.reaction = orderReaction(
        { them, player },
        d,
        real ? orderLabel(world, real).replace(/^./, (c) => c.toLowerCase()) : undefined,
        hashParts(world.seed, world.turn, o.label, i),
      );
    });
    // The highlight: the outcome that moved the most
    const size = (facts: Array<{ label: string; before: number; after: number }> = []) =>
      facts.reduce(
        (s, f) =>
          s +
          (/view of you/.test(f.label)
            ? Math.abs(f.after - f.before) / 2
            : /Approval|Stability|Legitimacy/.test(f.label)
              ? Math.abs(f.after - f.before)
              : 0),
        0,
      );
    let best: PlayerTurnReport["highlight"];
    let bestScore = -1;
    report.decisions.forEach((d, i) => {
      if (d.attended === false) return;
      const sc = size(d.facts) + (d.kind === "CRISIS" ? 8 : 0);
      if (sc > bestScore) [best, bestScore] = [{ ref: "decision", index: i }, sc];
    });
    report.orders.forEach((o, i) => {
      const sc = size(o.facts) + (/war|ceasefire|pact|strike|coup/i.test(o.label) && o.ok ? 15 : 0);
      if (sc > bestScore) [best, bestScore] = [{ ref: "order", index: i }, sc];
    });
    report.wars.forEach((w, i) => {
      // A war that ends is the story of the month
      const sc = w.ended
        ? 60
        : Math.abs(w.frontAfter - w.frontBefore) >= 5
          ? 10 + Math.abs(w.frontAfter - w.frontBefore)
          : 0;
      if (sc > bestScore) [best, bestScore] = [{ ref: "war", index: i }, sc];
    });
    report.highlight = best;
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
      // No leadership score survives the end of the world
      const s = world.score;
      s.economic = Math.min(s.economic, 2);
      s.security = 0;
      s.approval = Math.min(s.approval, 2);
      s.prestige = 0;
      s.total = Math.round(s.economic + s.security + s.approval + s.prestige);
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
      const electoral = player.politicalSystem.electionCycleMonths > 0 && world.mode === "TERM";
      return {
        reason: "TERM_COMPLETED",
        description: electoral
          ? `After a full term at the helm of ${withArticle(player.name)}, the voters gave you another. History will now judge your record.`
          : `${span} at the helm of ${withArticle(player.name)}, you are still standing. History will now judge your record.`,
        turn: world.turn,
      };
    }

    return null;
  }
}

// --------------------------------------------------------------------
/** Each reform in the last 6 months cuts the next one's effect to this share. */
const REFORM_DECAY = 0.8;

/** A spy hunt protects the player for this many months… */
const COUNTER_INTEL_MONTHS = 3;
/** …and foils this share of the foreign operations aimed at them meanwhile. */
const COUNTER_INTEL_FOIL = 0.6;

/** Labels for orders outside the player's registry (AI-only order types). */
const ORDER_VERBS: Partial<Record<Action["type"], string>> = {
  ECONOMY_ADJUST_MILITARY_BUDGET: "Set defense budget",
  INTEL_PROPAGANDA: "Covert propaganda in",
};

/** One label everywhere: the order registry's (`orders.ts`, mirrored by the UI), else ORDER_VERBS. */
export function orderLabel(world: WorldState, action: Action): string {
  const def = engineOrderFor(action);
  const verb = def?.verb ?? ORDER_VERBS[action.type] ?? action.type;
  const target = action.targetCountryId
    ? world.countries.find((c) => c.id === action.targetCountryId)?.name
    : undefined;
  if (def && !def.targeted) return def.verb;
  return target ? `${verb} ${target}` : verb;
}

/** Label plus the action type and target, so the UI can stage the right scene. */
function orderTag(world: WorldState, action: Action) {
  return {
    label: orderLabel(world, action),
    type: action.type,
    ...(action.targetCountryId ? { target: action.targetCountryId } : {}),
  };
}

/** The numbers a decision can move, read just before and after its effects apply. */
function outcomeSnap(world: WorldState, player: CountryState): Record<string, number> {
  const s: Record<string, number> = {
    approval: player.approval,
    stability: player.stability,
    legitimacy: player.legitimacy,
    mobilization: player.mobilizationLevel,
    intel: player.counterIntelLevel,
    pc: world.politicalCapital,
    gdp: player.gdp,
    tension: world.globalTension,
  };
  for (const c of world.countries)
    if (c.id !== player.id) s[`relations:${c.id}`] = c.relations[player.id] ?? 0;
  for (const h of world.hotspots)
    for (const m of ["violence", "humanitarian", "aid", "control", "governance"] as const)
      s[`hot:${h.id}:${m}`] = h[m];
  return s;
}

const ZONE_METRIC: Record<string, string> = {
  violence: "violence",
  humanitarian: "hunger",
  aid: "aid getting in",
  control: "ground held",
  governance: "civil order",
};

/** Up to three measured facts for a decision, biggest first. */
function decisionFacts(
  world: WorldState,
  effects: Record<string, number>,
  tensionDelta: number,
  before: Record<string, number>,
  after: Record<string, number>,
): Array<{ label: string; before: number; after: number; unit?: string; good?: boolean }> {
  const keys = new Set(Object.keys(effects).filter((k) => k in before));
  if (tensionDelta) keys.add("tension");
  const out: Array<{
    label: string;
    before: number;
    after: number;
    unit?: string;
    good?: boolean;
    w: number;
  }> = [];
  for (const k of keys) {
    let b = before[k];
    let a = after[k];
    if (Math.abs(a - b) < 0.5 && k !== "gdp") continue;
    let label = k;
    let unit: string | undefined = "%";
    let good = true;
    let w = Math.abs(a - b);
    if (k.startsWith("relations:")) {
      label = `${possessive(world.countries.find((c) => c.id === k.split(":")[1])?.name ?? k)} view of you`;
      unit = undefined;
      w /= 1.5;
    } else if (k.startsWith("hot:")) {
      const [, id, m] = k.split(":");
      label = `${id === "GAZA" ? "Gaza" : "West Bank"}: ${ZONE_METRIC[m] ?? m}`;
      unit = undefined;
      good = !/violence|humanitarian|control/.test(m);
    } else if (k === "gdp") {
      if (Math.abs(a / b - 1) < 0.0005) continue;
      label = "Economy";
      unit = "$B";
      w = Math.abs(a / b - 1) * 600;
      b /= 1e9;
      a /= 1e9;
    } else if (k === "pc") {
      label = "Political capital";
      unit = "◆";
    } else if (k === "tension") {
      label = "World tension";
      unit = undefined;
      good = false;
    } else if (k === "mobilization") label = "Mobilization";
    else if (k === "intel") label = "Counter-intelligence";
    else label = k.charAt(0).toUpperCase() + k.slice(1);
    out.push({
      label,
      before: Math.round(b * 10) / 10,
      after: Math.round(a * 10) / 10,
      unit,
      good,
      w,
    });
  }
  return out
    .sort((x, y) => y.w - x.w)
    .slice(0, 3)
    .map(({ w: _w, ...f }) => f);
}

/**
 * The front-page lead: the month's highlight told as a story, with the numbers it moved, the
 * reply it drew, what else the leader did and what comes next. Never a list of option labels.
 */
function playerLead(
  world: WorldState,
  player: CountryState,
  report: PlayerTurnReport,
): NewspaperEntry | null {
  const parts = player.leader.name.split(" ").filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p));
  const surname = parts.at(-1) ?? player.leader.name;
  const who = `${player.leader.title} ${surname}`;
  const h = report.highlight;
  if (!h) return null;
  const fmt = (f: { label: string; before: number; after: number; unit?: string }) => {
    const n = (v: number) =>
      f.unit === "$B" ? `$${Math.round(v)}B` : `${Math.round(v)}${f.unit === "%" ? "%" : ""}`;
    const verb = f.after > f.before ? "rose" : "fell";
    return `${f.label} ${verb} from ${n(f.before)} to ${n(f.after)}`;
  };
  let headline = "";
  let lede = "";
  let quote = "";
  let next = "";
  const related = [player.id];
  if (h.ref === "decision") {
    const d = report.decisions[h.index];
    headline = d.headline ?? d.title;
    lede = `On ${d.title.replace(/[.?:]$/, "").replace(/^./, (c) => c.toLowerCase())}, ${who} decided: ${d.choice.replace(/\.$/, "").replace(/ \(no decision taken\)$/, " (by default)")}.${d.facts?.[0] ? ` ${fmt(d.facts[0])}.` : ""}`;
    if (d.reaction)
      quote = `${d.reaction.who}: "${d.reaction.line.replace(/^'|'$/g, "").replace(/"/g, "'")}"`;
    next = d.watch ?? "";
    if (d.withCountry) related.push(d.withCountry);
  } else if (h.ref === "order") {
    const o = report.orders[h.index];
    headline = `${player.name}: ${o.label}${o.ok ? "" : ", and it fails"}`;
    lede = `${o.story ?? o.detail}`.replace(/\.\.+/g, ".").replace(/([^.!?])$/, "$1.");
    if (o.reaction)
      quote = `${o.reaction.who}: "${o.reaction.line.replace(/^'|'$/g, "").replace(/"/g, "'")}"`;
    if (o.target) related.push(o.target);
  } else {
    const w = report.wars[h.index];
    const them = world.countries.find((c) => c.id === w.vs)?.name ?? w.vs;
    const moved = w.frontAfter - w.frontBefore;
    headline = w.ended
      ? `The war with ${them} is over`
      : moved >= 0
        ? `${player.name} gains ground against ${them}`
        : `${them} pushes ${possessive(player.name)} forces back`;
    lede = w.ended
      ? `After months of fighting, the guns fall silent on the ${player.name}-${them} front.`
      : `The front moved ${Math.abs(moved)} points ${moved >= 0 ? "in our favour" : "against us"} this month (now ${w.frontAfter} of 100 from our side).`;
    related.push(w.vs);
  }
  // Context: up to two other things the leader did this month, each phrased on its own terms
  const cname = (id?: string) => withArticle(world.countries.find((c) => c.id === id)?.name ?? "");
  const others = [
    ...report.decisions
      .filter((d, i) => d.attended !== false && !(h.ref === "decision" && i === h.index))
      .map((d) =>
        d.kind === "CALL"
          ? `took a call from ${cname(d.withCountry)} ("${d.choice.replace(/\.$/, "")}")`
          : d.kind === "VISIT"
            ? `hosted ${cname(d.withCountry)} ("${d.choice.replace(/\.$/, "")}")`
            : `answered "${d.title.replace(/[.?:]$/, "")}" with "${d.choice.replace(/\.$/, "")}"`,
      ),
    ...report.orders
      .filter((o, i) => o.ok && !(h.ref === "order" && i === h.index))
      .map((o) => `ordered "${o.label}"`),
  ].slice(0, 2);
  const context = others.length ? `Elsewhere, ${surname} ${others.join(" and ")}.` : "";
  const description = [lede, quote, context, next ? `What next: ${next}` : ""]
    .filter(Boolean)
    .join(" ");
  return {
    headline,
    description,
    relatedCountries: related,
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
