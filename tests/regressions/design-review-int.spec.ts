import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { buildAdvice, deskImpact, missionStatus, suggestionImpact } from "../../src/core/advisors.js";
import { politicalCapitalIncome, PC_CAP } from "../../src/core/costs.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { CONTROL_SEEDS, playControl } from "../fixtures/control.js";

/**
 * Guards for the design review of the integrated build (runs/iter-04/design-review-integrated.md)
 * that need no browser: the words are checked against the real engine's numbers, never a second
 * copy of the rule.
 * - DR-INT-2: political capital sentences (the plan's line, the Hold card) say what the engine
 *   will do: the bank now, what the month's choices spend, what is left, what next month starts at.
 * - DR-INT-3: an adviser's quote on a "Your call" card never says "puts no goal at stake" on an
 *   answer that hurts a goal, and names the goals it hurts.
 * - DR-INT-4: the mission tag's "+n more" after Hurts counts only goals hurt; the goals the answer
 *   helps are named as helps, the same goals "Your goals in this call" lists.
 */

const loader = createDataLoader();
const engine = new TurnEngine();

/** Hormuz Convoy as the United States, seed 4242 (the guards' seat), its first `n` months, no orders. */
function hormuz(n = 4): WorldState[] {
  let world = loader.newGame({ scenarioId: "2026", flashpointId: "hormuz-convoy", playerCountryId: "USA", seed: 4242, mode: "FLASHPOINT" });
  const out: WorldState[] = [];
  for (let t = 0; t < n && !world.gameOver; t++) {
    out.push(world);
    world = engine.executeTurn(world, [], generateDeterministicIntents(world), []).newState;
  }
  return out;
}

/** Hormuz plus every control seed's first 4 months (staff path): the worlds the guards read. */
function worlds(): Array<{ where: string; world: WorldState }> {
  const out = hormuz(4).map((world) => ({ where: `hormuz-usa m${world.turn + 1}`, world }));
  for (const code of CONTROL_SEEDS)
    for (const m of playControl(code, "staff", 4).months) out.push({ where: `${code} m${m.before.turn + 1}`, world: m.before });
  return out;
}

describe("DR-INT-3: an adviser's quote never contradicts its card", () => {
  it("no 'puts no goal at stake' on a card that hurts a goal, and every hurt goal is named", () => {
    let hurtingBacked = 0;
    for (const { where, world } of worlds()) {
      for (const call of buildAdvice(world).calls.filter((c) => c.kind === "crisis")) {
        for (const card of call.cards) {
          if (!card.why) continue;
          const at = `${where} "${call.title}" / ${card.label}: "${card.why}"`;
          const lost = [...card.breaks, ...card.hurts, ...card.bonusHurts];
          if (!lost.length) {
            expect(card.why, at).not.toMatch(/\bhurts\b/);
            continue;
          }
          hurtingBacked++;
          expect(card.why, at).not.toMatch(/no goal at stake/);
          for (const g of lost) expect(card.why, at).toContain(g);
        }
      }
    }
    // The case the review saw (Hormuz month 1, More escorts, no strikes) is in the corpus
    expect(hurtingBacked).toBeGreaterThan(0);
  });
});

describe("DR-INT-4: the mission tag counts hurts as hurts and names what it helps", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1920 });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("on every crisis and meeting answer: Hurts +n counts breaks and hurts only, helps are named", async () => {
    const { missionTag, goalName } = await import("../../ui/src/lib/month.js");
    let mixed = 0;
    for (const { where, world } of worlds()) {
      const status = missionStatus(world);
      const impacts = deskImpact(world);
      for (const d of [...world.pendingDecisions, ...(world.agenda ?? [])])
        for (const o of d.options) {
          const i = impacts[d.id]?.[o.id];
          if (!i) continue;
          const tag = missionTag(i as never, status as never);
          const at = `${where} "${d.title}" / ${o.label}`;
          const risk = i.breaks.length + i.hurts.length;
          if (!risk) continue;
          expect(tag?.tone, at).toBe("risk");
          // The number after a red Breaks / Hurts is the other goals it breaks or hurts, nothing else
          expect(1 + (tag?.more ?? 0), `${at}: ${tag?.text} (+${tag?.more} more)`).toBe(risk);
          const helped = i.links.filter((l) => l.effect === "helps" && !l.bonus).map((l) => goalName(status[l.index] as never, ""));
          if (!helped.length) continue;
          mixed++;
          // What it helps is said, by name, the goals "Your goals in this call" lists as helped
          expect(tag?.also?.tone, at).toBe("help");
          for (const g of helped.slice(0, 2)) expect(tag?.also?.text, at).toContain(g);
          if (helped.length > 2) expect(tag?.also?.text, at).toContain(`and ${helped.length - 2} more`);
        }
    }
    expect(mixed).toBeGreaterThan(0);
  });
});

describe("DR-INT-2: every political capital number on the desk is the engine's", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1920, setTimeout, clearTimeout });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  /** The desk's store on an engine world, with these answers and these orders chosen. */
  async function desk(world: WorldState, choices: Record<string, string>, orders: Action[]) {
    const store = await import("../../ui/src/store/gameStore.js");
    const budget = await import("../../ui/src/lib/budget.js");
    const agenda = await import("../../ui/src/lib/agenda.js");
    const advice = buildAdvice(world);
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    store.useGameStore.setState({
      worldState: world as never,
      saveId: "s1",
      pendingDecisions: world.pendingDecisions as never,
      advice: advice as never,
      missionImpact: deskImpact(world) as never,
      orderImpact: suggestionImpact(world, advice.suggestions) as never,
      objectiveStatus: missionStatus(world, advice.suggestions) as never,
      pcIncome: me ? politicalCapitalIncome(world, me) : 2,
      pcCap: PC_CAP,
      decisionChoices: choices,
      reviewed: Object.fromEntries(Object.keys(choices).map((k) => [k, true])),
      skipped: {},
      deskShown: true,
      pendingActions: orders.map((a) => ({ ...a, label: a.type, origin: "player" })) as never,
    });
    return { store, budget, agenda, advice };
  }

  /** What the engine leaves the player at the start of next month. */
  const engineNext = (world: WorldState, choices: Record<string, string>, orders: Action[]) =>
    engine.executeTurn(
      world,
      orders,
      generateDeterministicIntents(world),
      Object.entries(choices).map(([decisionId, optionId]) => ({ decisionId, optionId })),
    ).newState.politicalCapital;

  it("the plan's capital line and the Hold card name next month's capital as the engine leaves it", async () => {
    const cases: Array<{ where: string; world: WorldState; choices: Record<string, string>; orders: Action[] }> = [];
    for (const world of hormuz(4)) {
      const where = `hormuz-usa m${world.turn + 1}`;
      cases.push({ where: `${where} nothing chosen`, world, choices: {}, orders: [] });
      // Every crisis on its mission answer (the priced side), plus a 1 and a 2 capital order
      const advice = buildAdvice(world);
      const mission = Object.fromEntries(world.pendingDecisions.map((d) => [d.id, advice.missionPicks[d.id] ?? d.options[0].id]));
      cases.push({ where: `${where} mission answers`, world, choices: mission, orders: [] });
      cases.push({
        where: `${where} answers and orders`,
        world,
        choices: mission,
        orders: [{ type: "DOMESTIC_PROPAGANDA" }, { type: "INTEL_COUNTER_INTEL" }],
      });
    }
    let checked = 0;
    for (const c of cases) {
      const { budget, agenda } = await desk(c.world, c.choices, c.orders);
      const next = engineNext(c.world, c.choices, c.orders);
      const o = budget.capitalOutlook?.();
      const at = `${c.where} (engine starts next month with ${next})`;
      expect(o?.next, at).toBe(next);
      expect(o?.now, at).toBe(c.world.politicalCapital);
      const line = budget.capitalLine?.() ?? "";
      expect(line, at).toContain(`◆ ${o?.left} left`);
      expect(line, at).toContain(`start next month with ◆ ${next}`);
      // The Hold card (Skip of the mission move): what holding keeps, never the bank before the choices
      const move = agenda.agendaItems().find((x) => x.kind === "move");
      if (move) {
        const hold = agenda.skipMeaning(move).means;
        expect(hold, at).toContain(`start next month with ◆ ${next}`);
        expect(hold, at).not.toMatch(/Political capital \d+ stays/);
      }
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(12);
  });
});

/**
 * QA4-S2-3 (iter-04 qa-verify, REGRESSED class of DR-INT-3 and D84-ADVISERS): Ask your staff, "The
 * Qatari text: what do you advise?", had the Chief of Staff recommend "Accept the framework" (hurts
 * two goals) while the desk said the Chief of Staff recommends, and will apply, "Counter: zero
 * enrichment". ui/src/utils/advisorBrain.ts ranked the answers with its own scoring. An adviser's
 * pick for a call now comes from the engine's call cards (advice.calls), setting on and off.
 */
describe("QA4-S2-3: Ask your staff names the desk's card for every call", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1920 });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("each adviser names the card the desk says they back (the Chief of Staff's pick when they make the calls), never a goal-hurting card while a safe one exists", async () => {
    const { answerQuestion } = await import("../../ui/src/utils/advisorBrain.js");
    const { ADVISOR_NAMES } = await import("../../ui/src/lib/format.js");
    const corpus = [
      ...hormuz(12).map((world) => ({ where: `hormuz-usa m${world.turn + 1}`, world })),
      ...CONTROL_SEEDS.flatMap((code) =>
        (["staff", "staffswitch"] as const).flatMap((p) => playControl(code, p, 6).months.map((m) => ({ where: `${code} ${p} m${m.before.turn + 1}`, world: m.before }))),
      ),
    ];
    let asked = 0;
    let unsafeAvoided = 0;
    for (const { where, world } of corpus) {
      const advice = buildAdvice(world);
      const player = world.countries.find((c) => c.id === world.playerCountryId);
      for (const call of advice.calls.filter((c) => c.kind === "crisis")) {
        const lost = (c: (typeof call.cards)[number]) => c.hurts.length + c.breaks.length + c.bonusHurts.length;
        const safeExists = call.cards.some((c) => lost(c) === 0);
        for (const chiefCalls of [false, true]) {
          for (const [role, name] of Object.entries(ADVISOR_NAMES)) {
            const reply = answerQuestion(role, `${call.title}: what do you advise?`, {
              worldState: world as never,
              playerView: [],
              player: player as never,
              advice: advice as never,
              chiefCalls,
            });
            const at = `${where} "${call.title}" ${name} (setting ${chiefCalls ? "on" : "off"}): ${reply}`;
            const chief = chiefCalls ? call.cards.find((c) => c.id === call.chiefPick) : undefined;
            const expected = name === "Chief of Staff" && chief ? chief : call.cards.find((c) => c.advisers.includes(name));
            asked++;
            for (const card of call.cards) {
              if (card === expected) continue;
              // No other card is named as this adviser's recommendation
              expect(reply, at).not.toContain(`my recommendation is: ${card.label}.`);
            }
            if (expected) {
              expect(reply, at).toContain(`my recommendation is: ${expected.label}.`);
              if (safeExists) {
                expect(lost(expected), at).toBe(0);
                unsafeAvoided++;
              }
            } else expect(reply, at).not.toMatch(/my recommendation is/);
            // With the setting on, the reply says which answer applies, the plan's sentence
            if (chief) expect(reply, at).toContain(chief.label);
          }
        }
      }
    }
    expect(asked).toBeGreaterThan(100);
    expect(unsafeAvoided).toBeGreaterThan(0);
  });
});
