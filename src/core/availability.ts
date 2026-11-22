import { actionCostM, actionCostPC, MAX_ORDERS, PC_CAP, politicalCapitalIncome } from "./costs.js";
import { eraAbsent, opposingCamps, worldYear } from "./era.js";
import { allianceOdds, canDeclareWar } from "./systems/diplomacy.js";
import { monthlyDefenseBudgetM } from "./systems/military.js";
import { possessive, withArticle } from "./text.js";
import type { Action, CountryState, WorldState } from "./types.js";

/**
 * Order availability: why an order can or can't be given, as a machine-readable
 * code plus one line of copy, a fix and the on-screen element it refers to.
 *
 * Two layers compose into one result (design-orders.md §3):
 *  - the rule layer (`orderRules`) reads the world only: wars, pacts, warheads, stability;
 *  - the month layer (`monthBlock`) reads the unsent month: queued orders, capital, budgets.
 * The engine's Execute-time checks in `turn.ts` call the same functions, so the
 * preview and the engine cannot disagree. Pure reads, no RNG.
 *
 * `ui/src/store/gameStore.ts` re-declares these types (types are duplicated, see CLAUDE.md).
 */
export type OrderBlockCode =
  // month layer (budgets): the "unaffordable" state
  | "NO_CAPITAL"
  | "NO_DEFENSE_BUDGET"
  | "ORDER_LIMIT"
  // selection
  | "DUPLICATE"
  | "NEEDS_TARGET"
  // rule layer: the "invalid" state
  | "GAME_OVER"
  | "SELF_TARGET"
  | "TARGET_COLLAPSED"
  | "NOT_A_STATE"
  | "INVALID_VALUE"
  | "AT_WAR"
  | "NOT_AT_WAR"
  | "ALREADY_AT_WAR"
  | "TARGET_NOT_AT_WAR"
  | "PARTY_TO_WAR"
  | "NOT_ALLIED"
  | "PACT_REFUSED"
  | "RELATIONS_MAXED"
  | "NO_WARHEADS"
  | "PROGRAM_MAXED"
  | "FULLY_MOBILIZED"
  | "TOO_PROTECTED"
  | "TOO_STABLE"
  | "NO_TROOPS";

export type PointTarget =
  | "capital"
  | "orders"
  | "meetings"
  | "defense"
  | "tray"
  | "target"
  | "mission";

export interface OrderBlock {
  code: OrderBlockCode;
  /** One line, glossary words: "Needs ◆ 2, you have ◆ 1." */
  reason: string;
  /** One line: "Remove an order (frees ◆ 1), or wait: +2 next month". */
  fix: string | null;
  /** The element the reason refers to. */
  points: PointTarget | null;
  /** A valid order to offer instead. */
  alt?: { type: string; params?: Record<string, unknown> };
  /** Budgets only, for the meter callout. */
  need?: { have: number; need: number; refill?: number };
}

export interface OrderAvailability {
  state: "available" | "unaffordable" | "invalid" | "queued";
  block: OrderBlock | null;
}

/** The unsent month, as the month layer sees it. */
export interface MonthState {
  /** Political capital left after queued orders and crisis/meeting answers. */
  pcLeft: number;
  ordersUsed: number;
  /** `orderKey()` of every queued order. */
  queuedKeys: string[];
  /** Share (0-1) of this month's defense budget the queued orders use. */
  defenseShareUsed: number;
  /** Exact $M used, when known (the engine rounds each order's cost); wins over the share. */
  defenseUsedM?: number;
  /** ◆ cost of each queued order, so NO_CAPITAL can offer "Remove an order (frees ◆ n)". */
  queuedCosts?: number[];
}

/** Codes of the month layer: budgets and selection, never the world. */
export const MONTH_CODES: ReadonlySet<OrderBlockCode> = new Set([
  "NO_CAPITAL",
  "NO_DEFENSE_BUDGET",
  "ORDER_LIMIT",
  "DUPLICATE",
]);

/** Orders that act on a country (the rest act at home). Mirrors `applyAction` in turn.ts. */
const UNTARGETED: ReadonlySet<string> = new Set([
  "MILITARY_MOBILIZE",
  "MILITARY_DEMOBILIZE",
  "MILITARY_PROCURE",
  "NUCLEAR_FUND_PROGRAM",
  "ECONOMY_ADJUST_MILITARY_BUDGET",
  "INTEL_COUNTER_INTEL",
  "DOMESTIC_PROPAGANDA",
  "DOMESTIC_REFORM",
  "DOMESTIC_POLICING",
]);

export function needsTarget(type: string): boolean {
  return !UNTARGETED.has(type);
}

/** One of each order per target per month: the key that tells two orders apart. */
export function orderKey(action: {
  type: string;
  targetCountryId?: string;
  params?: Record<string, unknown>;
}): string {
  return `${action.type}:${action.targetCountryId ?? ""}:${String(action.params?.targetType ?? action.params?.tactic ?? "")}`;
}

/** Largest procurement the engine accepts, in $M. */
export const MAX_PROCURE_M = 50_000;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function block(
  code: OrderBlockCode,
  reason: string,
  fix: string | null = null,
  points: PointTarget | null = null,
  extra: Partial<OrderBlock> = {},
): OrderBlock {
  return { code, reason, fix, points, ...extra };
}

/**
 * The rule layer for any actor: the world-state reasons an order is invalid,
 * or null. The engine applies it to the player's own orders at Execute.
 */
export function actionRules(
  world: WorldState,
  actor: CountryState,
  action: Action,
): OrderBlock | null {
  if (world.gameOver) return block("GAME_OVER", "The game is over.");
  const targeted = needsTarget(action.type);
  const target = action.targetCountryId
    ? world.countries.find((c) => c.id === action.targetCountryId)
    : undefined;
  if (targeted && !target)
    return block("NEEDS_TARGET", "Pick a country first.", "Pick a country", "target");
  if (target && target.id === actor.id)
    return block("SELF_TARGET", "You can't target your own country.");
  const T = target ? withArticle(target.name) : "";
  if (target?.collapsed)
    return block(
      "TARGET_COLLAPSED",
      `${cap(T)} has collapsed: there is no government to deal with.`,
    );
  if (target && eraAbsent(target))
    return block("NOT_A_STATE", `${cap(T)} is not a sovereign state in ${worldYear(world)}.`);
  if (
    action.value !== undefined &&
    (!Number.isFinite(action.value) || action.value < 0) &&
    action.type !== "ECONOMY_ADJUST_MILITARY_BUDGET"
  )
    return block("INVALID_VALUE", "That amount isn't allowed.");

  switch (action.type) {
    case "DIPLOMACY_IMPROVE_RELATIONS":
      if (!target) break;
      if (actor.atWarWith.includes(target.id))
        return block("AT_WAR", `You are at war with ${T}.`, "Propose a ceasefire instead", null, {
          alt: { type: "DIPLOMACY_PROPOSE_CEASEFIRE" },
        });
      if ((actor.relations[target.id] ?? 0) >= 95)
        return block("RELATIONS_MAXED", `Relations with ${T} are as good as they get.`);
      break;
    case "DIPLOMACY_PROPOSE_ALLIANCE": {
      if (!target) break;
      if (opposingCamps(world, actor.id, target.id))
        return block("PACT_REFUSED", `${cap(T)} will not sign a pact across the bloc line.`);
      const odds = allianceOdds(actor, target);
      if (odds.refusal) return block("PACT_REFUSED", odds.refusal);
      break;
    }
    case "DIPLOMACY_BREAK_ALLIANCE":
      if (target && !actor.alliances.includes(target.id))
        return block("NOT_ALLIED", `You have no defense pact with ${T}.`);
      break;
    case "DIPLOMACY_DECLARE_WAR": {
      if (!target) break;
      const check = canDeclareWar(actor, target);
      if (!check.allowed)
        return block(
          "ALREADY_AT_WAR",
          `You are already at war with ${T}.`,
          "Strike military targets instead",
          null,
          { alt: { type: "MILITARY_AIRSTRIKE", params: { targetType: "MILITARY" } } },
        );
      break;
    }
    case "DIPLOMACY_PROPOSE_CEASEFIRE": {
      if (!target) break;
      const war = world.wars.find(
        (w) =>
          (w.attackerId === actor.id && w.defenderId === target.id) ||
          (w.attackerId === target.id && w.defenderId === actor.id),
      );
      if (!war) return block("NOT_AT_WAR", `You are not at war with ${T}.`);
      break;
    }
    case "DIPLOMACY_MEDIATE": {
      if (!target) break;
      const war = world.wars.find((w) => w.attackerId === target.id || w.defenderId === target.id);
      if (!war) return block("TARGET_NOT_AT_WAR", `${cap(T)} is not at war.`);
      if (war.attackerId === actor.id || war.defenderId === actor.id)
        return block(
          "PARTY_TO_WAR",
          "You are fighting this war: propose a ceasefire instead.",
          "Propose a ceasefire",
          null,
          { alt: { type: "DIPLOMACY_PROPOSE_CEASEFIRE" } },
        );
      break;
    }
    case "MILITARY_PROCURE": {
      const spend = action.value ?? 500;
      if (!Number.isFinite(spend) || spend <= 0 || spend > MAX_PROCURE_M)
        return block("INVALID_VALUE", "That amount isn't allowed.");
      break;
    }
    case "MILITARY_DEPLOY_BORDER": {
      const troops = Math.round(action.value ?? 50000);
      if (troops <= 0) return block("INVALID_VALUE", "That amount isn't allowed.");
      if (troops > actor.manpower)
        return block(
          "NO_TROOPS",
          `You can deploy at most ${actor.manpower.toLocaleString("en-US")} troops.`,
        );
      break;
    }
    case "MILITARY_MOBILIZE":
      // Mobilization caps at 100: another call-up would only cost stability
      if (actor.mobilizationLevel >= 100)
        return block("FULLY_MOBILIZED", "Your forces are already fully mobilized.");
      break;
    case "NUCLEAR_FUND_PROGRAM":
      if (actor.nuclear.status === "TESTED")
        return block("PROGRAM_MAXED", "Your nuclear program can't go further.");
      break;
    case "NUCLEAR_STRIKE": {
      if (!target) break;
      if (actor.nuclear.status !== "ARMED" || actor.nuclear.warheads < 1) {
        const canFund = ["LATENT", "DEVELOPING", "ARMED"].includes(actor.nuclear.status);
        return block(
          "NO_WARHEADS",
          "You have no deliverable warheads.",
          canFund ? "Fund the nuclear program" : null,
          null,
          canFund ? { alt: { type: "NUCLEAR_FUND_PROGRAM" } } : {},
        );
      }
      if (!actor.atWarWith.includes(target.id))
        return block("NOT_AT_WAR", `Only in wartime. You are not at war with ${T}.`);
      break;
    }
    case "INTEL_ASSASSINATE":
      // Ground truth, as the engine does; the copy states the requirement, never the number
      if (target && !(target.stability < 40 || target.insurgencyLevel !== "NONE"))
        return block(
          "TOO_PROTECTED",
          `${cap(possessive(T))} leadership is too well protected: needs stability under 40 or active unrest.`,
          "Weaken them first: Destabilize or Arm rebels",
          null,
          { alt: { type: "INTEL_DESTABILIZE" } },
        );
      break;
    case "INTEL_COUP":
      if (target && !(target.insurgencyLevel === "GUERILLA" || target.stability < 25))
        return block(
          "TOO_STABLE",
          `${cap(T)} is too stable for a coup: needs an armed insurgency or stability under 25.`,
          "Arm rebels first",
          null,
          { alt: { type: "INTEL_SUPPORT_REBELS" } },
        );
      break;
  }
  return null;
}

/** The rule layer for the player's orders. */
export function orderRules(world: WorldState, action: Action): OrderBlock | null {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return block("GAME_OVER", "The game is over.");
  return actionRules(world, me, action);
}

/** The refill line: the real monthly income, or the cap when the bank is full. */
function refillLine(world: WorldState, me: CountryState): string {
  if (world.politicalCapital >= PC_CAP)
    return `Political capital is full: you can't save more than ◆ ${PC_CAP}`;
  return `+${politicalCapitalIncome(world, me)} next month`;
}

/**
 * The month layer: budgets and selection for the player's unsent month, or null.
 * Order of checks: DUPLICATE (rendered as queued), ORDER_LIMIT, NO_CAPITAL, NO_DEFENSE_BUDGET.
 */
export function monthBlock(
  world: WorldState,
  action: Action,
  month: MonthState,
): OrderBlock | null {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return null;
  if (month.queuedKeys.includes(orderKey(action)))
    return block("DUPLICATE", "In this month.", "Remove", "tray");
  if (month.ordersUsed >= MAX_ORDERS)
    return block(
      "ORDER_LIMIT",
      `All ${MAX_ORDERS} orders this month are used.`,
      "Remove an order",
      "orders",
    );
  const pc = actionCostPC(action);
  const have = Math.max(0, month.pcLeft);
  if (pc > have) {
    const gap = pc - have;
    const frees = (month.queuedCosts ?? []).filter((c) => c >= gap).sort((a, b) => a - b)[0];
    const refill = refillLine(world, me);
    const fix = frees
      ? `Remove an order (frees ◆ ${frees}), or wait: ${refill}`
      : world.politicalCapital >= PC_CAP
        ? refill
        : `Wait: ${refill}`;
    return block("NO_CAPITAL", `Needs ◆ ${pc}, you have ◆ ${have}.`, fix, "capital", {
      need: { have, need: pc, refill: politicalCapitalIncome(world, me) },
    });
  }
  const costM = actionCostM(action, me);
  if (costM > 0) {
    const budgetM = monthlyDefenseBudgetM(me);
    const usedM = month.defenseUsedM ?? month.defenseShareUsed * budgetM;
    const leftM = budgetM - usedM;
    if (costM > leftM) {
      const p = Math.round((costM / Math.max(1e-9, budgetM)) * 100);
      const q = Math.max(0, Math.round((leftM / Math.max(1e-9, budgetM)) * 100));
      return block(
        "NO_DEFENSE_BUDGET",
        `Needs ${p}% of the defense budget, ${q}% is left.`,
        "Remove a military order",
        "defense",
        { need: { have: q, need: p } },
      );
    }
  }
  return null;
}

/** A decision answer, as `POST /api/turn` receives it. */
interface Choice {
  decisionId: string;
  optionId: string;
}

/**
 * Build the month layer's view from a queue of player orders and crisis/meeting
 * answers. Conservative on capital: a crisis answer that costs ◆ counts even if
 * its deadline is later (the engine may resolve it this month), one that gives
 * ◆ only counts when the player picked it.
 */
export function monthStateFor(
  world: WorldState,
  queued: Action[],
  choices: Choice[] = [],
): MonthState {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  const pick = (id: string) => choices.find((c) => c.decisionId === id)?.optionId;
  let answers = 0;
  for (const d of world.pendingDecisions) {
    const chosen = pick(d.id);
    const o = d.options.find((x) => x.id === (chosen ?? d.defaultOptionId ?? d.options[0]?.id));
    const pc = o?.effects.pc ?? 0;
    if (pc < 0 || chosen) answers += pc;
  }
  for (const m of world.agenda ?? []) {
    const chosen = pick(m.id);
    const o = m.options.find((x) => x.id === (chosen ?? m.defaultOptionId));
    const pc = o?.effects.pc ?? 0;
    if (pc < 0 || chosen) answers += pc;
  }
  const costs = queued.map((a) => actionCostPC(a));
  const pcLeft = Math.max(0, world.politicalCapital + answers) - costs.reduce((s, c) => s + c, 0);
  const defenseUsedM = me ? queued.reduce((s, a) => s + actionCostM(a, me), 0) : 0;
  const budgetM = me ? monthlyDefenseBudgetM(me) : 0;
  return {
    pcLeft,
    ordersUsed: queued.length,
    queuedKeys: queued.map(orderKey),
    defenseShareUsed: budgetM > 0 ? defenseUsedM / budgetM : 0,
    defenseUsedM,
    queuedCosts: costs,
  };
}

/** Both layers, in precedence order: the permanent reason wins over a budget. */
export function orderAvailability(
  world: WorldState,
  action: Action,
  month: MonthState,
): OrderAvailability {
  const rule = orderRules(world, action);
  if (rule) return { state: "invalid", block: rule };
  const m = monthBlock(world, action, month);
  if (!m) return { state: "available", block: null };
  return { state: m.code === "DUPLICATE" ? "queued" : "unaffordable", block: m };
}
