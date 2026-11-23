import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDataLoader } from "../src/core/data-loader.js";

/**
 * RS-005 (CEO playtest, D-64): "There is a button to approve the staff picks, but it is unclear
 * what these are ... in map mode ... nothing related visible." The list next to every Approve
 * control is staffPickItems(); the button's count and subtitle come from it. The browser guard is
 * devloop/instances/world-conflict/scenarios-qa/regressions/RS-005.mjs.
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

describe("RS-005: staff picks are listed next to their Approve button", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440, setTimeout, clearTimeout });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const store = await import("../ui/src/store/gameStore.js");
    const month = await import("../ui/src/lib/month.js");
    const world = loader.newGame({ scenarioId: "2026", flashpointId: "hormuz-convoy", playerCountryId: "USA", seed: 1 });
    world.politicalCapital = 3;
    // Month 2: from then on the meetings are the player's (month 1 hands them to the ministers)
    world.turn = 1;
    const d = world.pendingDecisions[0];
    expect(d, "Hormuz opens with a crisis").toBeTruthy();
    world.agenda = [
      {
        ...d,
        id: "meet-1",
        title: "Staff meeting: the front",
        kind: "STAFF",
        speaker: "Chief of Staff",
        defaultOptionId: d.options[0].id,
      } as never,
    ];
    store.useGameStore.setState({
      worldState: world as never,
      saveId: "s1",
      pendingDecisions: world.pendingDecisions as never,
      decisionChoices: { [d.id]: d.options[0].id },
      reviewed: {},
      pendingActions: [
        { type: "DOMESTIC_PROPAGANDA", label: "National address", origin: "staff", why: "Chief of Staff: rally", proposed: true },
        { type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court Israel", targetCountryId: "ISR", origin: "staff", why: "Foreign Minister: mission", proposed: true },
      ],
    });
    return { store, month, d };
  }

  it("lists every pick Approve all takes, each saying what it is, and counts exactly those", async () => {
    const { month } = await setup();
    const items = month.staffPickItems();
    const kinds = items.map((x) => x.kind);
    expect(kinds[0]).toBe("crisis");
    expect(kinds.filter((k) => k === "order")).toHaveLength(2);
    expect(kinds.some((k) => k === "meeting" || k === "deputy")).toBe(true);
    // design-agenda 0.4: "Your <minister> takes", never "deputy"
    for (const it of items) expect(it.title).toMatch(/^(Crisis answer|Order|Meeting|Your [A-Za-z ]+ takes): /);
    // Every recommendation names its adviser (D-72: "Recommended by <role>", never bare)
    for (const it of items) expect(it.by).toMatch(/^(Foreign|Defense|Finance|Interior) Minister$|^Intelligence Chief$|^Chief of Staff$/);
    expect(items.find((x) => x.kind === "order")?.by).toBe("Chief of Staff");
    // Truthful with the first-use line: a crisis answer goes ahead
    expect(items[0].what).toMatch(/^Crisis: .* · goes ahead unless you change it$/);
    expect(items.find((x) => x.kind === "order")?.what).toMatch(/^(Spends ◆ \d if chosen|Free)$/);
    // The count matches what Approve all does
    const a = month.pendingApprovals();
    const counted = items.filter((x) => x.fits).length;
    expect(counted).toBe(a.crises.length + a.orders.length + a.meetings.length + a.deputies.length);
  });

  it("names the button with its count and a breakdown, singular when one", async () => {
    const { month } = await setup();
    expect(month.approveLabel(4)).toBe("Choose all recommended (4)");
    expect(month.approveLabel(1)).toBe("Choose all recommended (1)");
    const line = month.staffPicksBreakdown(month.staffPickItems());
    expect(line).toMatch(/^1 crisis answer, 2 orders, /);
  });

  it("approving one pick takes it off the list; Approve all empties it", async () => {
    const { month, store, d } = await setup();
    const before = month.staffPickItems();
    const crisis = before.find((x) => x.kind === "crisis");
    expect(crisis && month.approveStaffPick(crisis).ok).toBe(true);
    expect(store.useGameStore.getState().reviewed[d.id]).toBe(true);
    const order = month.staffPickItems().find((x) => x.kind === "order");
    expect(order && month.approveStaffPick(order).ok).toBe(true);
    expect(month.staffPickItems().filter((x) => x.fits)).toHaveLength(before.filter((x) => x.fits).length - 2);
    month.approveAll();
    expect(month.staffPickItems()).toEqual([]);
  });

  it("a proposal that no longer fits is shown but not counted", async () => {
    const { month, store } = await setup();
    store.useGameStore.setState({ worldState: { ...store.useGameStore.getState().worldState, politicalCapital: 0 } as never });
    const orders = month.staffPickItems().filter((x) => x.kind === "order");
    const off = orders.filter((x) => !x.fits);
    expect(off.length).toBeGreaterThan(0);
    for (const o of off) expect(o.reason).toMatch(/Needs ◆ \d, you have ◆ 0/);
  });

  it("month 1: the ministers take the meetings, so Choose all recommends none of them (design-layout section 4)", async () => {
    const { month, store } = await setup();
    store.useGameStore.setState({ worldState: { ...store.useGameStore.getState().worldState, turn: 0 } as never, deskShown: false });
    const kinds = month.staffPickItems().map((x) => x.kind);
    expect(kinds).not.toContain("meeting");
    expect(kinds).not.toContain("deputy");
    expect(kinds).toContain("crisis");
    // "See the meetings anyway" brings them back
    store.useGameStore.setState({ deskShown: true });
    expect(month.staffPickItems().some((x) => x.kind === "meeting" || x.kind === "deputy")).toBe(true);
  });

  it("a skipped thing is not still to do: Choose all leaves it (design-agenda 0.12)", async () => {
    const { month, store, d } = await setup();
    store.useGameStore.setState({ skipped: { [`crisis:${d.id}`]: true, orders: true } });
    const a = month.pendingApprovals();
    expect(a.crises).not.toContain(d.id);
    expect(a.orders).toEqual([]);
    month.approveAll();
    expect(store.useGameStore.getState().reviewed[d.id]).toBeUndefined();
    expect(store.useGameStore.getState().pendingActions.every((x) => x.proposed)).toBe(true);
  });

  it("D-84: a call is never chosen by Choose all; the Chief of Staff setting restores one press", async () => {
    const { month, store, d } = await setup();
    // A crisis whose answers differ for the mission is a call (the engine's mission note), and a
    // recommended order that helps a goal is the mission move
    const help = { helps: ["g"], hurts: [], breaks: [], bonusHelps: [] };
    store.useGameStore.setState({
      advice: { cabinetPicks: {}, missionPicks: {}, meetingPicks: {}, deputies: [], suggestions: [], staffOrders: [], missionNotes: { [d.id]: { optionId: d.options[1].id, kind: "best", text: "Best for your mission", helps: [], costs: [], switchFrom: null } } } as never,
      orderImpact: { "Court Israel": help } as never,
      decisionChoices: {},
    });
    const calls = month.callSet();
    expect([...calls.crises]).toEqual([d.id]);
    expect(calls.moves.size).toBe(1);
    const a = month.pendingApprovals();
    expect(a.crises).not.toContain(d.id);
    expect(a.orders.map((i) => store.useGameStore.getState().pendingActions[i].label)).toEqual(["National address"]);
    expect(month.staffPickItems().some((x) => x.kind === "crisis" || x.title === "Order: Court Israel")).toBe(false);
    month.approveAll();
    const st = store.useGameStore.getState();
    expect(st.reviewed[d.id]).toBeUndefined();
    expect(st.decisionChoices[d.id]).toBeUndefined();
    expect(st.pendingActions.find((x) => x.label === "Court Israel")?.proposed).toBe(true);
    // "Let the Chief of Staff make my calls": Choose all decides them too, the calm way
    store.useGameStore.setState({ chiefCalls: true });
    month.approveAll();
    const after = store.useGameStore.getState();
    expect(after.reviewed[d.id]).toBe(true);
    expect(after.decisionChoices[d.id]).toBeDefined();
  });

  it("D-84: the agenda marks the calls, skipping one leaves it to the engine's default, the review lists it", async () => {
    const { store, d } = await setup();
    const agenda = await import("../ui/src/lib/agenda.js");
    store.useGameStore.setState({
      advice: { cabinetPicks: {}, missionPicks: {}, meetingPicks: {}, deputies: [], suggestions: [], staffOrders: [], missionNotes: { [d.id]: { optionId: d.options[1].id, kind: "best", text: "Best for your mission", helps: [], costs: [], switchFrom: null } } } as never,
      decisionChoices: {},
    });
    const items = agenda.agendaItems();
    const crisis = items.find((x) => x.key === `crisis:${d.id}`);
    expect(crisis?.call).toBe(true);
    expect(items[0].key).toBe(`crisis:${d.id}`);
    expect(agenda.openCalls(items).map((x) => x.key)).toContain(`crisis:${d.id}`);
    expect(agenda.executeNow()[0]).toMatch(/^Your call, .+, is open: /);
    // Two named sides, no single star; the Guide me sentence names both aims
    const sides = agenda.callSides(crisis!);
    expect(sides.sides.length).toBe(2);
    expect(new Set(sides.sides.map((x) => x.who)).size).toBe(2);
    expect(sides.guide).toMatch(/^For your mission: .+\. To keep things calm: .+\.$/);
    expect(agenda.skipMeaning(crisis!).label).toBe("Skip: the cabinet waits");
    agenda.skipItem(crisis!);
    expect(store.useGameStore.getState().decisionChoices[d.id]).toBeUndefined();
    expect(agenda.executeNow()[0]).toMatch(/^You skipped your call, .+: /);
  });

  it("F-02-4 counts: the state band and the advisors count chosen orders only", () => {
    // QA: the Full desk said "Orders this month 2 of 6 / 2 added by staff" while the rail said 0 of 6.
    // The navigator and the rail are gone (D-80): the one count is the state band's, from budgetStatus
    const band = ui("components/StateBand.tsx");
    expect(band).toContain("b?.orders.used ?? 0} of ${b?.orders.max ?? 6}");
    expect(band).not.toMatch(/added by staff/);
    const adv = ui("components/desk/AdvisorList.tsx");
    expect(adv).not.toMatch(/\bactions\.length\b/);
    expect(ui("lib/budget.ts")).toContain("Staff proposals spend nothing until approved");
  });

  it("every Choose all control sits inside the Recommended group (Plan rail, float, bar panel)", () => {
    const plan = ui("components/desk/Plan.tsx");
    // One component (L-19): the rail and the float render the group; the bar opens it as a panel first (D-72 D4)
    expect(plan).toContain('data-staff-picks=""');
    expect(plan).toContain('data-choose-all=""');
    expect(plan).toContain("<Recommended compact onOpen={() => setOpen(false)} />");
    expect(plan).toContain("TERMS.reviewRecommended.name.replace('{n}', String(n))");
    expect(plan).toMatch(/className="wc-btn pbar-review" aria-expanded=\{open\}/);
    expect(plan).toContain("Nothing to choose: every recommendation is decided");
    expect(plan).toContain("TERMS.approveAll.definition");
    // Choose all is counted by the same list it covers
    expect(plan).toContain("approveLabel(n)");
    // The Plan never scrolls (QA3-S3-3 superseded by the fit rule, L-10)
    const css = ui("styles/layout.css");
    expect(css).not.toMatch(/\.sp-list[^{]*\{[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.plan-list \{[^}]*overflow: hidden/);
  });
});
