import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import {
  buildAdvice,
  isMissionOrder,
  MAX_CALLS,
  RESERVE_MAX,
  RESERVE_PC,
  STAFF_ORDERS,
} from "../../src/core/advisors.js";
import { monthStateFor } from "../../src/core/availability.js";
import { actionCostPC, PUSH_PC } from "../../src/core/costs.js";
import { itemPrices, optionImpact } from "../../src/core/missionImpact.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { PendingDecision, WorldState } from "../../src/core/types.js";
import { staffMonth } from "../../scripts/policies.js";
import { CONTROL_SEEDS, FLASHPOINT_CONTROL, newControlWorld, playControl } from "../fixtures/control.js";

/**
 * D-84 "Your call": Accept all recommended covers the routine; the mission crisis and the mission
 * move are the player's calls (at most 2 a month); two named advisers back different cards and
 * none backs a goal-hurting card when a safe one exists (D-72); the mission side of an item costs
 * PUSH_PC more when another answer helps no goal; the opt-in setting gives the full one-press
 * month back. Guards run on every control seed (D-76).
 */

const hurts = (c: { hurts: string[]; breaks: string[]; bonusHurts: string[] }) =>
  c.hurts.length + c.breaks.length + c.bonusHurts.length > 0;

const months = (policy: "staff" | "guided" = "staff") =>
  CONTROL_SEEDS.flatMap((code) => playControl(code, policy).months.map((m) => ({ code, ...m })));

describe("D84-CLASSIFY: routine against Your call, every control seed month", () => {
  it("at most 2 calls, each crisis is a call or routine (never both), Accept all counts the routine only", () => {
    for (const { code, before, advice } of [...months("staff"), ...months("guided")]) {
      const where = `${code} m${before.turn + 1}`;
      expect(advice.calls.length, where).toBeLessThanOrEqual(MAX_CALLS);
      expect(advice.calls.filter((c) => c.kind === "move").length, where).toBeLessThanOrEqual(1);
      const callIds = new Set(advice.calls.map((c) => c.id));
      const routineCrises = advice.routine.filter((r) => r.kind === "crisis").map((r) => r.id);
      for (const id of routineCrises) expect(callIds.has(id), where).toBe(false);
      for (const d of before.pendingDecisions)
        expect(callIds.has(d.id) !== routineCrises.includes(d.id), `${where} ${d.title}`).toBe(true);
      // The routine is what Accept all decides: crises, meetings, deputies, upkeep orders
      expect(advice.routine.filter((r) => r.kind === "order").length).toBe(advice.staffOrders.length);
      // A crisis call's answers differ for the mission
      for (const call of advice.calls.filter((c) => c.kind === "crisis")) {
        expect(call.gap, where).toBeGreaterThan(0);
        expect(call.skip.optionId, where).toBeTruthy();
      }
    }
  });

  it("a crisis whose answers are all the same for the mission is routine", () => {
    for (const { before, advice } of months("staff"))
      for (const d of before.pendingDecisions) {
        const scores = new Set(d.options.map((o) => JSON.stringify(optionImpact(before, o).links)));
        if (scores.size === 1) expect(advice.calls.some((c) => c.id === d.id)).toBe(false);
      }
  });

  it("calls exist in at least 80% of months 2 to 12 on the flashpoint control seeds (staff path)", () => {
    const late = FLASHPOINT_CONTROL.flatMap((code) => playControl(code, "staff").months).filter(
      (m) => m.before.turn >= 1,
    );
    const withCall = late.filter((m) => m.advice.calls.length > 0).length;
    expect(withCall / late.length).toBeGreaterThanOrEqual(0.8);
  });
});

describe("D84-ADVISERS: two named advisers, none backs a goal-hurting card (D-72)", () => {
  it("on every call at least two different advisers are named, and backed cards are safe when a safe card exists", () => {
    for (const { code, before, advice } of months("staff"))
      for (const call of advice.calls) {
        const where = `${code} m${before.turn + 1} ${call.title}`;
        const names = new Set(call.cards.flatMap((c) => c.advisers));
        expect(names.size, where).toBeGreaterThanOrEqual(2);
        const anySafe = call.cards.some((c) => !hurts(c));
        for (const c of call.cards.filter((x) => x.advisers.length))
          if (anySafe) expect(hurts(c), `${where}: ${c.label}`).toBe(false);
        expect(call.cards.some((c) => c.id === call.missionCard)).toBe(true);
        expect(call.cards.some((c) => c.id === call.calmCard)).toBe(true);
        expect(call.guide.length).toBeGreaterThan(10);
      }
  });

  it("the mission move holds only orders that push the mission, plus Hold this month", () => {
    let seen = 0;
    for (const { before, advice } of months("staff"))
      for (const call of advice.calls.filter((c) => c.kind === "move")) {
        seen++;
        const orders = call.cards.filter((c) => c.action);
        expect(orders.length).toBeGreaterThan(0);
        for (const c of orders) expect(isMissionOrder(before, c.action!)).toBe(true);
        expect(call.cards.at(-1)?.id).toBe("hold");
        expect(call.skip.label).toBe("Hold this month");
      }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("D84-UPKEEP: the staff propose up to 3 upkeep orders, never a mission order, and leave the reserve", () => {
  it("on every control seed month", () => {
    for (const { code, before, advice } of months("staff")) {
      const where = `${code} m${before.turn + 1}`;
      expect(advice.staffOrders.length, where).toBeLessThanOrEqual(STAFF_ORDERS);
      for (const o of advice.staffOrders) expect(isMissionOrder(before, o.action), `${where} ${o.label}`).toBe(false);
      expect(advice.reserve).toBeGreaterThanOrEqual(RESERVE_PC);
      expect(advice.reserve).toBeLessThanOrEqual(RESERVE_MAX);
      const dearest = Math.max(0, ...advice.calls.flatMap((c) => c.cards.map((x) => x.pc)));
      expect(advice.reserve).toBe(Math.min(RESERVE_MAX, Math.max(RESERVE_PC, dearest)));
      // What Accept all spends leaves the reserve standing
      const decisions = advice.routine.filter((r) => r.kind === "crisis" && r.optionId).map((r) => ({ decisionId: r.id, optionId: r.optionId! }));
      const left = monthStateFor(before, advice.staffOrders.map(({ action: { label: _l, ...a } }) => a), decisions).pcLeft;
      const spent = advice.staffOrders.reduce((s, o) => s + actionCostPC(o.action), 0);
      if (spent > 0) expect(left, where).toBeGreaterThanOrEqual(advice.reserve);
    }
  });
});

/** A control world with a crafted crisis: one answer courts a primary RELATION_MIN target, one does nothing. */
function pricedWorld(bank: number): { world: WorldState; d: PendingDecision } {
  for (const code of CONTROL_SEEDS) {
    const world = newControlWorld(code);
    const goal = (world.objective?.primary ?? []).find((c) => c.kind === "RELATION_MIN" && c.targetId);
    if (!goal?.targetId) continue;
    const opt = (id: string, effects: Record<string, number>) => ({ id, label: id, description: "", effects, tensionDelta: 0, actions: [], backedBy: [] });
    const d: PendingDecision = {
      id: "d84-price",
      turn: world.turn,
      title: "A test of the price",
      situation: "",
      affectedCountries: [goal.targetId],
      options: [opt("push", { [`relations:${goal.targetId}`]: 12 }), opt("calm", {})],
      deadlineTurn: world.turn,
      templateId: "generic",
      urgency: "URGENT",
      defaultOptionId: "calm",
    };
    world.pendingDecisions = [d];
    world.agenda = [];
    world.politicalCapital = bank;
    if (itemPrices(world, d).push === PUSH_PC) return { world, d };
  }
  throw new Error("no control seed with a primary relation goal");
}

describe("D84-PRICE: the mission side costs PUSH_PC when another answer helps no goal", () => {
  const run = (world: WorldState, optionId: string) =>
    new TurnEngine().executeTurn(world, [], generateDeterministicIntents(world), [{ decisionId: "d84-price", optionId }]).newState;

  it("prices only the answer that helps a goal, and the engine charges it", () => {
    const { world, d } = pricedWorld(2);
    expect(PUSH_PC).toBe(1);
    expect(itemPrices(world, d)).toEqual({ push: 1 });
    expect(run(world, "push").politicalCapital).toBe(run(world, "calm").politicalCapital - 1);
    // The desk's capital left counts it before Execute
    expect(monthStateFor(world, [], [{ decisionId: d.id, optionId: "push" }]).pcLeft).toBe(1);
    // The advice shows the card's full cost and the price
    const call = buildAdvice(world).calls.find((c) => c.id === d.id);
    expect(call?.cards.find((c) => c.id === "push")).toMatchObject({ pc: 1, price: 1, blocked: null });
  });

  it("a card the bank cannot pay is blocked before the press, and the engine does not take it", () => {
    const { world, d } = pricedWorld(0);
    const call = buildAdvice(world).calls.find((c) => c.id === d.id);
    const push = call?.cards.find((c) => c.id === "push");
    expect(push?.blocked?.reason).toMatch(/political capital 1, you have 0/);
    expect(push?.blocked?.fix.length).toBeGreaterThan(0);
    expect(call?.chiefPick).toBe("calm");
    const after = run(world, "push");
    expect(after.turnReport?.causes.some((c) => /not enough political capital/.test(c))).toBe(true);
    expect(after.turnReport?.decisions.find((x) => x.title === d.title)?.optionId).toBe("calm");
  });

  it("is deterministic: same world and choices, same month", () => {
    const { world } = pricedWorld(3);
    expect(JSON.stringify(run(world, "push"))).toBe(JSON.stringify(run(world, "push")));
  });
});

describe("D84-SETTING: Let the Chief of Staff make my calls restores the full one-press month", () => {
  it("engine: with the setting every call is decided (crisis picks and the mission move's first order)", () => {
    for (const { code, before, advice } of months("staff")) {
      const where = `${code} m${before.turn + 1}`;
      const chief = staffMonth(before, "chief");
      const staff = staffMonth(before, "staff");
      for (const call of advice.calls) {
        if (call.kind === "crisis") {
          if (call.chiefPick) expect(chief.decisions.some((x) => x.decisionId === call.id && x.optionId === call.chiefPick), where).toBe(true);
          expect(staff.decisions.some((x) => x.decisionId === call.id), where).toBe(false);
        } else if (call.chiefPick) {
          const card = call.cards.find((c) => c.id === call.chiefPick)!;
          expect(chief.orders.some((o) => o.type === card.action?.type && o.targetCountryId === card.action?.targetCountryId), where).toBe(true);
        }
      }
      // Nothing Accept all decided without the setting is lost with it
      for (const x of staff.decisions) expect(chief.decisions).toContainEqual(x);
      for (const o of staff.orders) expect(chief.orders).toContainEqual(o);
    }
  });

  describe("desk (ui/src/lib/month.ts)", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440 });
      vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    });
    afterEach(() => vi.unstubAllGlobals());

    const opt = (id: string) => ({ id, label: id, description: "", effects: {}, tensionDelta: 0, actions: [], backedBy: [] });
    const crisis = (id: string) => ({ id, turn: 1, title: id, situation: "", affectedCountries: [], options: [opt("a"), opt("b")], deadlineTurn: 1, templateId: "t", urgency: "URGENT" as const, defaultOptionId: "a" });
    const setup = async (chiefCalls: boolean) => {
      const { useGameStore } = await import("../../ui/src/store/gameStore.js");
      const month = await import("../../ui/src/lib/month.js");
      useGameStore.setState({
        worldState: { turn: 1, politicalCapital: 4, agenda: [], countries: [], playerCountryId: "USA" } as never,
        pendingDecisions: [crisis("routine"), crisis("call")] as never,
        pendingActions: [],
        decisionChoices: {},
        reviewed: {},
        chiefCalls,
        advice: {
          cabinetPicks: { routine: "a", call: "a" },
          missionPicks: { call: "b" },
          meetingPicks: {},
          deputies: [],
          staffOrders: [],
          calls: [{ id: "call", kind: "crisis", title: "call", cards: [], missionCard: "b", calmCard: "a", chiefPick: "b", guide: "", skip: { label: "Skip", text: "", optionId: "a", hurts: [], breaks: [], bonusHurts: [] }, gap: 3, trade: true }],
          routine: [{ kind: "crisis", id: "routine", optionId: "a", label: "a" }],
          chief: { decisions: { call: "b" }, orders: [] },
          prices: {},
          reserve: 1,
        } as never,
      });
      return { useGameStore, month };
    };

    it("off (default): Accept all leaves the call open", async () => {
      const { useGameStore, month } = await setup(false);
      expect(month.pendingApprovals().crises).toEqual(["routine"]);
      month.approveAll();
      expect(useGameStore.getState().reviewed.call).toBeUndefined();
      expect(useGameStore.getState().decisionChoices.call).toBeUndefined();
    });

    it("on: Accept all also makes the call with the Chief of Staff's pick", async () => {
      const { useGameStore, month } = await setup(true);
      expect(month.pendingApprovals().crises).toEqual(["routine", "call"]);
      month.approveAll();
      expect(useGameStore.getState().reviewed.call).toBe(true);
      expect(useGameStore.getState().decisionChoices.call).toBe("b");
    });

    it("the setting is off by default and stored like the other settings", async () => {
      const { useGameStore } = await import("../../ui/src/store/gameStore.js");
      expect(useGameStore.getState().chiefCalls).toBe(false);
    });
  });
});

describe("D84-BANDS-CONTROL: Accept all alone does not win the control seeds; guided play spends its capital", () => {
  it("staff (calls skipped) wins at most 2 of the 7 flashpoint control seeds", () => {
    const won = FLASHPOINT_CONTROL.filter((code) => playControl(code, "staff").final.outcome?.victory);
    expect(won.length, won.join(", ")).toBeLessThanOrEqual(2);
  });

  it("guided sits at the capital cap in at most 30 of 84 control-seed months (QA3R-4b)", () => {
    let capped = 0;
    let total = 0;
    for (const code of FLASHPOINT_CONTROL)
      for (const m of playControl(code, "guided").months) {
        total++;
        if (m.after.politicalCapital >= 6) capped++;
      }
    expect(total).toBe(84);
    expect(capped).toBeLessThanOrEqual(30);
  });
});
