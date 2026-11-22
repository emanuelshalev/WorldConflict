import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_ODDS as ENGINE_MIN_ODDS, RESERVE_PC as ENGINE_RESERVE, STAFF_ORDERS as ENGINE_STAFF } from "../src/core/advisors.js";
import { createDataLoader } from "../src/core/data-loader.js";
// The UI store reads window and localStorage when its module loads (lib/month imports it)
vi.hoisted(() => {
  const m = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.window ??= { location: { search: "" }, innerWidth: 1440 };
  g.localStorage ??= { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
});
import { guideLede } from "../ui/src/lib/month.js";
import { goalPhrase, missionSentence } from "../ui/src/lib/goals.js";
import { mapMenuShown } from "../ui/src/lib/ease.js";

/**
 * Iteration 3, fix-newcomers. F-02-1 (Olivia, Noah: briefing wall, unknown goal), F-02-4 (Priya,
 * Dan: staff pre-spend capital), F-02-5 (Sam: map and desk cards differ, Desk switch dead with a
 * map menu open), QA AC3 (in-game globe fit). The learn-store rule (no auto-open) is in
 * tests/ui-learn.spec.ts, the kind ranking in tests/ui-numbers.spec.ts.
 */
const ui = (f: string) => readFileSync(`ui/src/${f}`, "utf-8");
const loader = createDataLoader();

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

describe("F-02-1: month 1 states the one goal in one plain sentence (Noah)", () => {
  it("Hormuz as the US names every goal judged, Israel included, and the month it is judged", () => {
    const w = loader.newGame({ scenarioId: "2026", flashpointId: "hormuz-convoy", playerCountryId: "USA", seed: 1 });
    const m = missionSentence({ objective: w.objective, maxTurns: w.maxTurns });
    // Noah failed on "Israel relations 5.5 short" and never knew that was the thing
    expect(m.text).toContain("Israel stays on side (relations 61+)");
    expect(m.text).toMatch(/^You win if all five hold at the end of month 12: /);
    expect(m.goals).toHaveLength(w.objective?.primary.length ?? 0);
    // One sentence: a single full stop at the end
    expect(m.text.replace(/\d\.\d/g, "").split(". ").length).toBe(1);
    expect(m.text).not.toMatch(/\u2014/);
  });
  it("every flashpoint side gets a sentence that names each primary goal", () => {
    for (const f of ["hormuz-convoy", "ceasefire-or-collapse", "quarantine", "caracas-after-maduro"]) {
      const fp = JSON.parse(readFileSync(`data/flashpoints/${f}.json`, "utf-8"));
      for (const [side, obj] of Object.entries(fp.objectives as Record<string, { title: string; primary: Array<{ label: string }> }>)) {
        const m = missionSentence({ objective: obj, maxTurns: 12 });
        expect(m.goals.length, `${f} ${side}`).toBe(obj.primary.length);
        for (const c of obj.primary) expect(m.text).toContain(goalPhrase(c));
      }
    }
  });
  it("Term seats: the election, the review, and Legacy have a plain sentence too", () => {
    expect(missionSentence({ objective: { title: "Win the coming election", primary: [] }, maxTurns: 48 }).text).toBe(
      "You win if you are still in office after the election in month 48.",
    );
    const review = missionSentence({
      objective: { title: "Survive the review", primary: [{ label: "Legitimacy of 40%+ at the review" }, { label: "Stability of 35%+ at the review" }] },
      maxTurns: 48,
    });
    expect(review.text).toBe("You win if all two hold at the review in month 48: legitimacy of 40%+ and stability of 35%+.");
    expect(missionSentence({ objective: null, maxTurns: 120 }).text).toMatch(/no set mission/);
  });
  it("the desk mounts the sentence above the crisis in month 1 and the goal line links to it", () => {
    const desk = ui("components/Desk.tsx");
    expect(desk.indexOf("<MissionLine />")).toBeGreaterThan(-1);
    expect(desk.indexOf("<MissionLine />")).toBeLessThan(desk.indexOf("<FocusView />"));
    const line = ui("components/desk/GoalLine.tsx");
    expect(line).toContain("data-goal-link");
    expect(line).toContain("showMissionSentence");
    expect(line).toContain("world.turn !== 0");
  });
});

describe("F-02-1: Guide me shows fewer words before the first choice (Olivia, Noah)", () => {
  const hormuz = loader.newGame({ scenarioId: "2026", flashpointId: "hormuz-convoy", playerCountryId: "USA", seed: 1 });
  it("the lede keeps at most 16 words and says it was cut", () => {
    const long = "Striking now shows strength, ends your own pause and hands the new Congress a fresh war vote it did not ask for in January.";
    const g = guideLede(long);
    expect(g.trimmed).toBe(true);
    expect(g.short.replace("…", "").split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(g.short.endsWith("…")).toBe(true);
    expect(guideLede("Short and plain.")).toEqual({ short: "Short and plain.", trimmed: false });
  });
  it("the real month-1 crisis text gets shorter at Guide me", () => {
    const d = hormuz.pendingDecisions[0];
    expect(d).toBeDefined();
    const first = d.situation.split(/(?<=[.!?])\s+/)[0];
    expect(guideLede(first).short.replace("…", "").split(/\s+/).length).toBeLessThanOrEqual(16);
  });
  it("Guide me hides option descriptions until More and opens no panel by itself", () => {
    const move = ui("components/desk/YourMove.tsx");
    expect(move).toContain("const brief = guide && !more;");
    expect(move).toMatch(/description=\{brief \? undefined/);
    expect(ui("lib/learn.ts")).toContain("return s.prefs.autoBrief === true;");
    expect(ui("components/learn/explain.ts")).not.toMatch(/open the briefing on each new crisis/);
  });
});

describe("F-02-4: staff propose, the player spends (Priya, Dan)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440, setTimeout, clearTimeout });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const store = await import("../ui/src/store/gameStore.js");
    const budget = await import("../ui/src/lib/budget.js");
    const month = await import("../ui/src/lib/month.js");
    const world = loader.newGame({ scenarioId: "2026", flashpointId: "hormuz-convoy", playerCountryId: "USA", seed: 1 });
    world.politicalCapital = 3;
    world.pendingDecisions = [];
    world.agenda = [];
    store.useGameStore.setState({
      worldState: world as never,
      saveId: "s1",
      pendingDecisions: [],
      decisionChoices: {},
      reviewed: {},
      pendingActions: [
        { type: "DOMESTIC_PROPAGANDA", label: "National address", origin: "staff", why: "Chief of Staff: rally", proposed: true },
        { type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court Israel", targetCountryId: "ISR", origin: "staff", why: "Foreign Minister: mission", proposed: true },
      ],
    });
    return { store, budget, month, world };
  }

  it("a proposal holds no political capital, order slot or defense money until approved", async () => {
    const { store, budget } = await setup();
    // Priya: "In month 2 I had two seals and both were already spent"
    expect(store.capitalLeft()).toBe(3);
    const b = budget.budgetStatus();
    expect(b?.pc.left).toBe(3);
    expect(b?.pc.orders).toBe(0);
    expect(b?.orders.used).toBe(0);
    expect(b?.proposed.count).toBe(2);
    expect(b?.proposed.pc).toBeGreaterThan(0);
    expect(store.monthView().queuedKeys).toEqual([]);
  });

  it("approving one spends it; Approve all approves the rest that fit (the harness's staff policy)", async () => {
    const { store, month } = await setup();
    const cost0 = 3 - store.capitalLeft();
    expect(cost0).toBe(0);
    expect(store.approveProposal(0).ok).toBe(true);
    expect(store.useGameStore.getState().pendingActions[0].proposed).toBe(false);
    const afterOne = store.capitalLeft();
    expect(afterOne).toBeLessThan(3);
    expect(month.pendingApprovals().orders).toEqual([1]);
    month.approveAll();
    expect(store.useGameStore.getState().pendingActions.every((a) => !a.proposed)).toBe(true);
    expect(store.capitalLeft()).toBeLessThan(afterOne);
  });

  it("Execute sends approved orders only: an unapproved proposal never runs", async () => {
    const { store } = await setup();
    store.approveProposal(1);
    const spy = vi.fn(async () => ({ status: 200, json: async () => ({ success: false, error: "stop" }) }));
    vi.stubGlobal("fetch", spy);
    await store.executeTurn();
    const body = JSON.parse((spy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.playerActions.map((a: { type: string }) => a.type)).toEqual(["DIPLOMACY_IMPROVE_RELATIONS"]);
  });

  it("giving the same order from any card approves the proposal instead of refusing a duplicate", async () => {
    const { store } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: false }) })));
    const r = await store.queueOrder({ type: "DOMESTIC_PROPAGANDA", label: "National address", origin: "player" });
    expect(r.ok).toBe(true);
    const acts = store.useGameStore.getState().pendingActions;
    expect(acts).toHaveLength(2);
    expect(acts[0].proposed).toBe(false);
  });

  it("an approval past the capital is refused with the meter it names", async () => {
    const { store } = await setup();
    const w = store.useGameStore.getState().worldState;
    store.useGameStore.setState({ worldState: { ...(w as object), politicalCapital: 0 } as never });
    const r = store.approveProposal(0);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.block?.code).toBe("NO_CAPITAL");
  });

  it("the desk's staff rule mirrors the engine's (advisors.ts), which the balance harness plays", () => {
    const src = ui("lib/month.ts");
    expect(src).toContain(`export const STAFF_ORDERS = ${ENGINE_STAFF};`);
    expect(src).toContain(`export const RESERVE_PC = ${ENGINE_RESERVE};`);
    expect(src).toContain(`export const MIN_ODDS = ${ENGINE_MIN_ODDS / 100};`);
    // Staff orders arrive as proposals, and the setup counts the proposed costs against the reserve
    expect(src).toMatch(/origin: 'staff', why: [^\n]*, proposed: true \}/);
    expect(src).toContain("capitalLeft(now) - proposedPc - RESERVE_PC");
  });

  it("each staff pick shows what it will change before Approve, in the tray and on the card", () => {
    expect(ui("components/desk/CommandRail.tsx")).toContain("proposalEffects(a)");
    expect(ui("components/orders/OrderCard.tsx")).toContain("Will change: {proposalFx}");
    expect(ui("components/desk/CommandRail.tsx")).toContain("proposed={proposed}");
  });
});

describe("F-02-5: map and desk show one order card; the Desk switch always answers (Sam)", () => {
  it("the map menu is shown only in Map mode, so pressing Desk puts it away", () => {
    const menu = { turn: 3 };
    const world = { turn: 3, gameOver: null };
    expect(mapMenuShown(menu, world, "map")).toBe(true);
    expect(mapMenuShown(menu, world, "desk")).toBe(false);
    expect(mapMenuShown(menu, { turn: 4 }, "map")).toBe(false);
    expect(mapMenuShown(null, world, "map")).toBe(false);
    const view = ui("components/MapView.tsx");
    expect(view).toContain("mapMenuShown(menu, worldState, deskMode)");
    expect(view).toMatch(/st\.deskMode === 'desk' && prev\.deskMode !== 'desk'\) setMenu\(null\)/);
  });
  it("no map-menu control is named like the Desk switch (Sam's click went to 'same list as the desk')", () => {
    const src = ui("components/MapActionMenu.tsx");
    expect(src).not.toMatch(/same list as the desk/);
    // Visible text with "desk" inside the menu would steal a by-name press on the Desk button
    const visible = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").match(/>[^<>{}]*\bdesk\b[^<>{}]*</gi) ?? [];
    expect(visible).toEqual([]);
  });
  it("advisor suggestions on the desk, the full desk and the map strip use the shared OrderCard", () => {
    const list = ui("components/desk/AdvisorList.tsx");
    expect(list).toContain("<OrderCard");
    expect(list).toContain("<AdvisorCardRow key={r.key} r={r} compact={compact} />");
    expect(ui("components/desk/Detail.tsx")).toContain("<AdvisorCardRow key={r.key} r={r} />");
    expect(ui("components/desk/CommandRail.tsx")).toContain("<AdvisorList compact max={2} />");
    expect(ui("components/MapActionMenu.tsx")).toContain("<OrderCard");
  });
});

describe("QA AC3: the in-game globe fit", () => {
  it("counts the goal line, and the map advisor row starts collapsed", () => {
    expect(ui("lib/globeFit.ts")).toContain("['.hud', '.goal-line']");
    expect(ui("components/desk/CommandRail.tsx")).toContain("const [tray, setTray] = useState(false);");
    expect(ui("styles/ease.css")).toMatch(/\.cmd-strip:not\(\.tray-open\) \{ grid-template-areas: 'chips act'; row-gap: 0; \}/);
  });
});
