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
    for (const it of items) expect(it.title).toMatch(/^(Crisis answer|Order|Meeting|Deputy takes): /);
    // Every recommendation names its adviser (D-72: "Recommended by <role>", never bare)
    for (const it of items) expect(it.by).toMatch(/^(Foreign|Defense|Finance|Interior) Minister$|^Intelligence Chief$|^Chief of Staff$/);
    expect(items.find((x) => x.kind === "order")?.by).toBe("Chief of Staff");
    // Truthful next to "Nothing happens until you accept": a crisis answer goes ahead
    expect(items[0].what).toMatch(/^Crisis: .* · goes ahead unless you change it$/);
    expect(items.find((x) => x.kind === "order")?.what).toMatch(/^(Spends ◆ \d if accepted|Free)$/);
    // The count matches what Approve all does
    const a = month.pendingApprovals();
    const counted = items.filter((x) => x.fits).length;
    expect(counted).toBe(a.crises.length + a.orders.length + a.meetings.length + a.deputies.length);
  });

  it("names the button with its count and a breakdown, singular when one", async () => {
    const { month } = await setup();
    expect(month.approveLabel(4)).toBe("Accept all recommended (4)");
    expect(month.approveLabel(1)).toBe("Accept all recommended (1)");
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

  it("F-02-4 counts: the navigator and the advisors count approved orders only, like the rail", () => {
    const nav = ui("components/desk/Navigator.tsx");
    // QA: the Full desk said "Orders this month 2 of 6 / 2 added by staff" while the rail said 0 of 6
    expect(nav).toContain("const committed = committedActions(actions);");
    expect(nav).toContain("term('{n} of {m}', committed.length, 6)");
    expect(nav).not.toMatch(/added by staff/);
    expect(nav).toContain("recommended, not accepted");
    const adv = ui("components/desk/AdvisorList.tsx");
    expect(adv).not.toMatch(/\bactions\.length\b/);
    expect(ui("lib/budget.ts")).toContain("Staff proposals spend nothing until approved");
  });

  it("every Approve control sits inside the Staff picks group (desk rail, phone sheet, map strip)", () => {
    const rail = ui("components/desk/CommandRail.tsx");
    expect(rail).toContain('<StaffPicks variant="rail" />');
    expect(rail).toContain('<StaffPicks variant="sheet" onNavigate={() => setSheet(false)} />');
    expect(rail).toContain('{hasPicks && <StaffPicks variant="strip" />}');
    expect(rail).not.toMatch(/<ApproveButton/);
    const group = ui("components/desk/StaffPicks.tsx");
    // Folded in Map mode, the main button only unfolds the list
    expect(group).toMatch(/aria-expanded=\{false\} aria-controls=\{listId\}/);
    expect(group).toContain("Nothing to accept: every recommendation is decided");
    expect(group).toContain("TERMS.recommended.definition");
    // Map mode: folded behind "Review n recommended" by default
    expect(group).toContain("Review {n} recommended");
    expect(ui("lib/useStaffPicks.ts")).toContain("return localStorage.getItem(OPEN_KEY) === '1';");
    // QA AC3: folded, the button sits in the act row (no extra strip row over the globe)
    expect(rail).toContain('const hasPicks = picks.items.length > 0 && recOpen;');
    expect(rail).toContain('{!hasPicks && <StaffPicks variant="strip" />}');
  });
});
