// Guards for the iteration 4 customer-round fix-now clusters (runs/iter-04/triage.md, F-04-k).
// UI words are checked against the real engine's numbers on the customers' seats; components are
// rendered with react-dom/server on the desk's store (the DR-INT-2 pattern), no browser.
import React, { createElement } from "../../ui/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../ui/node_modules/react-dom/server.node.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAdvice, deskImpact, missionStatus, suggestionImpact } from "../../src/core/advisors.js";
import { politicalCapitalIncome, PC_CAP } from "../../src/core/costs.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { newControlWorld, playControl, playerRel, UKR_CONTROL } from "../fixtures/control.js";

const loader = createDataLoader();

/** Visible text of server-rendered markup (tags dropped, entities decoded, spaces folded). */
export const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function stubBrowser(width = 1920, height = 1080) {
  vi.stubGlobal("window", {
    location: { search: "" },
    innerWidth: width,
    innerHeight: height,
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
}

/** The desk's store on an engine world, with these answers and these orders chosen. */
async function desk(world: WorldState, choices: Record<string, string> = {}, orders: Action[] = []) {
  const store = await import("../../ui/src/store/gameStore.js");
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
  // react-dom/server reads the server snapshot (zustand: the store's initial state): render the
  // live state instead, so a component shows the world set above
  (React as unknown as { useSyncExternalStore: unknown }).useSyncExternalStore = (_s: unknown, get: () => unknown) => get();
  return { store, advice };
}

describe("F-04-10: the Finance Minister reads debt as a percent of GDP", () => {
  it("prints each seat's own debt figure and warns only above 100% (RUS and USA)", async () => {
    const { financeBriefing } = await import("../../ui/src/lib/financeBrief.js");
    const world = loader.newGame({ scenarioId: "2026", playerCountryId: "RUS", seed: 1 });
    for (const id of ["RUS", "USA"]) {
      const c = world.countries.find((x) => x.id === id);
      if (!c) throw new Error(id);
      const brief = financeBriefing({
        gdp: c.gdp,
        realGrowth: 0.01,
        debtGdpRatio: c.debtGdpRatio,
        militaryBudgetPercent: c.militaryBudgetPercent,
      });
      expect(brief.analysis).toContain(`Debt-to-GDP ratio is ${Math.round(c.debtGdpRatio)}%.`);
      const debtWarning = brief.warnings.some((w) => w.includes("National debt"));
      expect(debtWarning, `${id} debt ${c.debtGdpRatio}`).toBe(c.debtGdpRatio > 100);
      // the number on the page is never the percent multiplied again
      expect(brief.analysis).not.toContain(`${Math.round(c.debtGdpRatio * 100)}%`);
    }
  });
});

describe("F-04-4: the state band names its capital number as what is left", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-4: Political capital left ◆ n of 6, n the plan's left, with orders and answers chosen", async () => {
    // CO-UKR-RUTH1 month 1 (a customer's seed): a 1-capital order chosen, so now and left differ
    const world = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "UKR",
      seed: 7,
      mode: "FLASHPOINT",
      flashpointId: "ceasefire-or-collapse",
    });
    await desk(world, {}, [{ type: "DOMESTIC_PROPAGANDA" } as Action]);
    const budget = await import("../../ui/src/lib/budget.js");
    const { StateBand } = await import("../../ui/src/components/StateBand.js");
    const o = budget.capitalOutlook();
    expect(o && o.now !== o.left, "the case must show two different numbers").toBe(true);
    const text = textOf(renderToStaticMarkup(createElement(StateBand)));
    expect(text).toContain(`Political capital left ◆ ${o?.left} of 6`);
    expect(text).not.toContain("what orders cost");
  });
});

/** The result card of one engine month, rendered on the desk's store as the app shows it. */
async function resultCardText(after: WorldState): Promise<string> {
  const { store } = await desk(after);
  store.useGameStore.setState({ objectiveStatus: missionStatus(after, buildAdvice(after).suggestions) as never });
  const { ResultCard } = await import("../../ui/src/scenes/ResultCard.js");
  const report = after.turnReport;
  if (!report) throw new Error("no report");
  const noop = () => {};
  return textOf(
    renderToStaticMarkup(
      createElement(ResultCard, {
        report: report as never,
        world: after as never,
        home: after.playerCountryId,
        onNext: noop,
        onEverything: noop,
        onPaper: noop,
      }),
    ),
  );
}

describe("F-04-3: a relation goal on the result card names whose view it is", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-3: the mission line reads your view of <country> with the engine's number (Ukraine control seeds)", async () => {
    let checked = 0;
    for (const code of UKR_CONTROL) {
      for (const m of playControl(code, "chief").months) {
        const after = m.after;
        const report = after.turnReport;
        if (!report?.missionBefore || !after.objective) continue;
        const status = missionStatus(after, buildAdvice(after).suggestions);
        // the row the card shows: the relation goal that moved this month (if any)
        const conds = [...after.objective.primary, ...(after.objective.bonus ?? [])];
        const moved = status
          .map((c, i) => ({ c, i, before: report.missionBefore?.[i] }))
          .filter((x) => x.c.unit === "view" && x.before != null && Math.round(x.before) !== Math.round(x.c.now ?? 0));
        if (!moved.length) continue;
        const text = await resultCardText(after);
        const mission = /Mission[^:]*: ([^.]*)/.exec(text)?.[1] ?? "";
        const row = moved.find((x) => mission.includes(`${Math.round(x.before ?? 0)} → ${Math.round(x.c.now ?? 0)}`));
        if (!row) continue; // another goal moved more and leads the line
        const cond = conds.find((c) => c.label === row.c.label);
        const name = after.countries.find((c) => c.id === cond?.targetId)?.name ?? "?";
        const at = `${code} month ${after.turn}: "${mission}"`;
        expect(mission, at).toMatch(new RegExp(`your view of (the )?${name}`));
        expect(Math.round(row.c.now ?? 0), at).toBe(Math.round(playerRel(after, cond?.targetId ?? "")));
        checked++;
      }
    }
    expect(checked, "months whose mission line is a relation goal").toBeGreaterThanOrEqual(3);
  });
});

describe("F-04-7: the country you struck leads its card with the strike, not the call", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-7: a call and an airstrike on one country the same month: the card's headline is the strike (control seeds)", async () => {
    const { generateDeterministicIntents } = await import("../../src/agents/fallback.js");
    const { TurnEngine } = await import("../../src/core/turn.js");
    const { staffMonth } = await import("../../scripts/policies.js");
    const engine = new TurnEngine();
    let checked = 0;
    for (const code of ["CO-UKR-MAYA1", "CA-USA-OLIV1", "SL-CHN-SAM01", "QU-CHN-LEO01"]) {
      let w = newControlWorld(code);
      for (let t = 0; t < 12 && !w.gameOver; t++) {
        const s = staffMonth(w, "chief");
        const call = w.agenda.find(
          (m) => (m.kind === "CALL" || m.kind === "VISIT") && m.withCountry && m.withCountry !== w.playerCountryId && s.decisions.some((d) => d.decisionId === m.id),
        );
        if (call?.withCountry) {
          const strike: Action = { type: "MILITARY_AIRSTRIKE", targetCountryId: call.withCountry, params: { targetType: "MILITARY" } };
          const after = engine.executeTurn(w, [...s.orders, strike], generateDeterministicIntents(w), s.decisions).newState;
          const o = after.turnReport?.orders.find((x) => x.type === "MILITARY_AIRSTRIKE");
          if (o && o.status !== "REFUSED") {
            await desk(after);
            const { buildPages } = await import("../../ui/src/lib/debrief.js");
            const pages = buildPages(after.turnReport as never, after as never);
            const card = pages.flatMap((p) => p.cards).find((c) => c.key === `c-${call.withCountry}`);
            const at = `${code} month ${t + 1}, strike on ${call.withCountry} after "${call.title}"`;
            expect(card?.headline?.startsWith(o.label), `${at}: "${card?.headline}"`).toBe(true);
            expect(card?.reaction?.tone, at).not.toBe("warm");
            checked++;
            break;
          }
        }
        w = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), s.decisions).newState;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(2);
  });
});

describe("F-04-2: the result card of an Execute with nothing chosen", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-2: HC-ARE-NOAH1 months 1 to 6 with nothing chosen: a crisis that ran on its default is Left open, never A quiet month", async () => {
    let checked = 0;
    for (const m of playControl("HC-ARE-NOAH1", "none", 6).months) {
      const report = m.after.turnReport;
      const ran = report?.decisions.find((d) => d.kind === "CRISIS" && /\(no decision taken\)$/.test(d.choice));
      if (!ran) continue;
      const text = await resultCardText(m.after);
      const at = `month ${m.after.turn}: ${text.slice(0, 240)}`;
      expect(text, at).not.toContain("A quiet month");
      expect(text, at).toMatch(/Left open: /);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });
});

/**
 * F-04-9 (REGRESSED F-00-1): the paper listed "REFUSED Court United Kingdom" with the reason only
 * in a hover title (Priya, CO-UKR-PRIY1, months 3 to 12), the advisers recommended that court at
 * 94 against a cap of 95, and Dan's staff suggested a pact with China that was blocked every month.
 */
describe("F-04-9: a refusal is explained in the paper, and the staff never suggest a blocked order", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-9: CO-UKR-PRIY1 with Court United Kingdom every month: every REFUSED or FAILED row of the paper prints the engine's reason", async () => {
    const { generateDeterministicIntents } = await import("../../src/agents/fallback.js");
    const { TurnEngine } = await import("../../src/core/turn.js");
    const { staffMonth } = await import("../../scripts/policies.js");
    const { paperStatusItems } = await import("../../ui/src/lib/outcome.js");
    const engine = new TurnEngine();
    let w = newControlWorld("CO-UKR-PRIY1");
    let refused = 0;
    for (let t = 0; t < 12 && !w.gameOver; t++) {
      const s = staffMonth(w, "chief");
      const court: Action = { type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "GBR" };
      const orders = [court];
      w = engine.executeTurn(w, orders, generateDeterministicIntents(w), s.decisions).newState;
      const report = w.turnReport!;
      for (const row of paperStatusItems(report as never, 99)) {
        if (row.s !== "REFUSED" && row.s !== "FAILED") continue;
        expect(row.shownWhy, `month ${t + 1} ${row.s} ${row.label}`).toBeTruthy();
        if (row.s === "REFUSED") refused++;
      }
      const o = report.orders.find((x) => x.type === court.type && x.target === "GBR");
      if (o?.status === "REFUSED")
        expect(paperStatusItems(report as never, 99).find((r) => r.label === o.label)?.shownWhy).toMatch(/as good as they get/);
    }
    expect(refused, "Court United Kingdom refused at the cap").toBeGreaterThanOrEqual(3);
  });

  it("F-04-9: no staff suggestion is an order the engine refuses, and no court of a met goal near the cap (control seeds, chief)", async () => {
    const { orderRules, RELATIONS_MAX } = await import("../../src/core/availability.js");
    let months = 0;
    for (const code of ["CO-UKR-PRIY1", "CO-UKR-MAYA1", "T2026-RUS-DAN01", "QU-CHN-LEO01", "HC-ARE-NOAH1"]) {
      for (const m of playControl(code, "chief").months) {
        const w = m.before;
        const me = w.countries.find((c) => c.id === w.playerCountryId);
        for (const s of m.advice.suggestions) {
          const at = `${code} month ${w.turn + 1}: ${s.label}`;
          expect(orderRules(w, s.action as Action)?.reason ?? null, at).toBeNull();
          if (s.action.type === "DIPLOMACY_IMPROVE_RELATIONS" && s.action.targetCountryId) {
            const goal = [...(w.objective?.primary ?? []), ...(w.objective?.bonus ?? [])].find(
              (c) => c.kind === "RELATION_MIN" && c.targetId === s.action.targetCountryId,
            );
            const now = me?.relations[s.action.targetCountryId] ?? 0;
            if (goal && now >= (goal.min ?? 0)) expect(now, at).toBeLessThan(RELATIONS_MAX - 5);
          }
        }
        months++;
      }
    }
    expect(months).toBeGreaterThan(40);
  });
});

describe("F-04-1: an answer the player cannot afford says so on its card, before the press", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Noah's month 2 (HC-ARE-NOAH1, Execute with nothing chosen) with every ◆ spent on queued orders. */
  async function spentMonth() {
    const world = structuredClone(playControl("HC-ARE-NOAH1", "none", 2).months[1].before);
    const order = { type: "INTEL_COUNTER_INTEL" } as Action;
    let left = Number.NaN;
    for (let i = 0; i < 3 && left !== 0; i++) {
      const { store } = await desk(world, {}, [order]);
      left = store.monthView().pcLeft;
      world.politicalCapital = Math.max(0, world.politicalCapital - left);
    }
    const { store } = await desk(world, {}, [order]);
    expect(store.monthView().pcLeft, "the case is a month at ◆ 0 with an order queued").toBe(0);
    return store;
  }

  /** Each answer card of an agenda item, server-rendered: its markup and whether Choose is live. */
  async function cardsOf(store: Awaited<ReturnType<typeof spentMonth>>, key: string) {
    store.useGameStore.setState({ agendaKey: key } as never);
    const { Thing } = await import("../../ui/src/components/desk/YourMove.js");
    const html = renderToStaticMarkup(createElement(Thing));
    return [...html.matchAll(/<button type="button" class="opt[^"]*"[^>]*>[\s\S]*?<\/button>/g)].map((m) => ({
      html: m[0],
      text: textOf(m[0]),
      off: /\sdisabled=""/.test(m[0]),
    }));
  }

  it("F-04-1: the mission move's order cards at ◆ 0: disabled, the cost, what you have, the fix", async () => {
    const store = await spentMonth();
    const { agendaItems } = await import("../../ui/src/lib/agenda.js");
    const move = agendaItems().find((x) => x.kind === "move");
    expect(move, "Noah's month 2 has a mission move").toBeTruthy();
    const priced = (move?.yourCall?.cards ?? []).filter((c) => c.action && (c.pc ?? 0) > 0);
    expect(priced.length).toBeGreaterThan(0);
    const cards = await cardsOf(store, "move");
    for (const c of priced) {
      const card = cards.find((x) => x.text.includes(`Order: ${c.label}`));
      expect(card, c.label).toBeTruthy();
      expect(card?.off, `${c.label}: Choose is not live at ◆ 0`).toBe(true);
      expect(card?.text).toContain(`Needs ◆ ${c.pc}, you have ◆ 0.`);
      expect(card?.text).toMatch(/Remove an order \(frees ◆ 1\), or wait: \+\d next month/);
    }
    // the fix is a control beside the card, as on the order cards
    const html = renderToStaticMarkup(createElement((await import("../../ui/src/components/desk/YourMove.js")).Thing));
    expect(textOf(html)).toContain("Remove INTEL_COUNTER_INTEL (frees ◆ 1)");
  });

  it("F-04-1: crisis and meeting answers that cost more than is left are not live, and say why", async () => {
    const store = await spentMonth();
    const { agendaItems } = await import("../../ui/src/lib/agenda.js");
    let priced = 0;
    for (const item of agendaItems().filter((x) => x.kind === "crisis" || x.kind === "meeting")) {
      for (const card of await cardsOf(store, item.key)) {
        // a card that adds ◆ to the month says "costs ◆ n" with no "less than"/"as much as" against
        const adds = /costs ◆ \d+/.test(card.text) && !/less than|as much as/.test(card.text);
        if (!adds) continue;
        priced++;
        expect(card.off, `${item.title}: ${card.text.slice(0, 80)}`).toBe(true);
        expect(card.text).toMatch(/Needs ◆ \d+, you have ◆ 0\./);
      }
    }
    expect(priced, "the month has at least one answer that costs capital").toBeGreaterThan(0);
  });

  it("F-04-1: the order cards and the answer cards use one copy (ui and core availability)", async () => {
    const ui = await import("../../ui/src/lib/availability.js");
    const core = await import("../../src/core/availability.js");
    const world = newControlWorld("HC-ARE-NOAH1");
    world.politicalCapital = 2;
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    const m = {
      pcLeft: 0,
      bank: 2,
      pcIncome: me ? politicalCapitalIncome(world, me) : 2,
      pcCap: PC_CAP,
      ordersUsed: 1,
      queuedKeys: ["x"],
      queuedCosts: [2],
      queuedLabels: ["Order"],
      queuedStaff: [false],
      defenseUsedM: 0,
      budgetM: 0,
      gameOver: false,
    };
    const a = ui.answerBlock(2, 1, m);
    const b = core.answerBlock(world, 2, 1, 0, [2]);
    expect(a?.reason).toBe("Needs ◆ 2, you have ◆ 0.");
    expect(a?.reason).toBe(b?.reason);
    expect(a?.fix).toBe(b?.fix);
    // an answer whose own cost only empties the bank (no price, no order to lose) stays free
    expect(ui.answerBlock(2, 0, { ...m, queuedCosts: [], queuedKeys: [], queuedLabels: [], queuedStaff: [] })).toBeNull();
    expect(core.answerBlock(world, 2, 0, 0, [])).toBeNull();
  });
});
