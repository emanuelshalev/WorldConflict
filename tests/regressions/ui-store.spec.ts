import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guards for two iteration 0 QA reproductions (runs/iter-00/qa-repro.md):
 * - B-08 / QA repro #2 (Leo): the "Not enough political capital" toast never cleared and a stale
 *   message outlived the next attempt. The toast now clears itself after 6 s and collapses repeats.
 * - QA repro #7: after approving the staff pick the badge read "Your call", which reads like
 *   "still up to you". A crisis is always named Recommended, Accepted or Your pick (one verb, D-72).
 */

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440 });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("B-08: the toast never outlives its moment", () => {
  it("clears itself after TOAST_MS (6 s) and a repeat within 10 s collapses into a count", async () => {
    vi.useFakeTimers();
    const { useGameStore, TOAST_MS } = await import("../../ui/src/store/gameStore.js");
    expect(TOAST_MS).toBeLessThanOrEqual(6000);
    useGameStore.getState().setError("Failed to fetch");
    expect(useGameStore.getState().error).toBe("Failed to fetch");
    useGameStore.getState().setError("Failed to fetch");
    expect(useGameStore.getState().error).toBe("Failed to fetch ×2");
    vi.advanceTimersByTime(TOAST_MS - 100);
    expect(useGameStore.getState().error).toBe("Failed to fetch ×2");
    vi.advanceTimersByTime(200);
    expect(useGameStore.getState().error).toBeNull();
  });

  it("a new message restarts the clock instead of stacking under the old one", async () => {
    vi.useFakeTimers();
    const { useGameStore, TOAST_MS } = await import("../../ui/src/store/gameStore.js");
    useGameStore.getState().setError("Server busy");
    vi.advanceTimersByTime(TOAST_MS - 1000);
    useGameStore.getState().setError("Connection lost");
    expect(useGameStore.getState().error).toBe("Connection lost");
    vi.advanceTimersByTime(TOAST_MS - 100);
    expect(useGameStore.getState().error).toBe("Connection lost");
    vi.advanceTimersByTime(200);
    expect(useGameStore.getState().error).toBeNull();
  });
});

describe("QA repro #7: a crisis is never labelled 'Your call'", () => {
  it("names the selection Recommended, Accepted or Your pick", async () => {
    const { useGameStore } = await import("../../ui/src/store/gameStore.js");
    const { crisisSelection } = await import("../../ui/src/lib/month.js");
    const opt = (id: string, label: string) => ({ id, label, description: "", effects: {}, tensionDelta: 0, actions: [], backedBy: [] });
    const d = {
      id: "d1",
      turn: 1,
      title: "Sanctions on Iran",
      situation: "",
      affectedCountries: [],
      options: [opt("abstain", "Abstain"), opt("join", "Join the sanctions")],
      deadlineTurn: 1,
      templateId: "t",
      urgency: "URGENT" as const,
      defaultOptionId: "abstain",
    };
    useGameStore.setState({ advice: { cabinetPicks: { d1: "abstain" }, missionPicks: {}, meetingPicks: {} } as never });
    // A crisis with no answer (a call left open, D-84) shows none and says what leaving it does
    // (design-review-your-call.md RC-1); it is never labelled Your call either
    const cases = [
      crisisSelection(d, { d1: "abstain" }, {}),
      crisisSelection(d, { d1: "abstain" }, { d1: true }),
      crisisSelection(d, { d1: "join" }, { d1: true }),
      crisisSelection(d, {}, {}),
    ];
    // D-73: the recommended answer chosen reads "You chose" (no "Accepted" for a recommendation);
    // N-3: the leave sentence says "no answer" once
    expect(cases.map((c) => c.text)).toEqual([
      "Recommended: Abstain",
      "You chose: Abstain",
      "Your pick: Join the sanctions",
      "No answer yet. If you leave it, the crisis passes with no effect",
    ]);
    for (const c of cases) expect(`${c.text} ${c.word}`).not.toMatch(/your call/i);
  });
});

/**
 * QA4-S2-2 (iter-04 qa-verify, same root as F-02-4): "Free ◆ 1" on an unaffordable order card
 * removed Reform program, an unapproved staff proposal that holds nothing, instead of the order
 * holding the capital. The block's slots count committed orders only (monthView), while
 * removePendingAction indexes every pendingAction, proposals included.
 */
describe("QA4-S2-2: Free ◆ n removes the order its label names", () => {
  it("frees the committed order, keeps the proposal, and the blocked order becomes affordable", async () => {
    const store = await import("../../ui/src/store/gameStore.js");
    const { availabilityOf } = await import("../../ui/src/lib/availability.js");
    const { useGameStore, monthView } = store;
    useGameStore.setState({
      worldState: {
        turn: 1,
        politicalCapital: 1,
        playerCountryId: "USA",
        countries: [{ id: "USA", gdp: 2.5e13, militaryBudgetPercent: 3.4 }],
        agenda: [],
      } as never,
      pendingDecisions: [],
      decisionChoices: {},
      pcIncome: 2,
      pcCap: 6,
      pendingActions: [
        { type: "DOMESTIC_REFORM", label: "Reform program", origin: "staff", proposed: true } as never,
        { type: "INTEL_GATHER", targetCountryId: "IRN", label: "Spy on Iran", origin: "player" } as never,
      ],
    });
    const strike = { type: "MILITARY_AIRSTRIKE", targetCountryId: "IRN", params: { targetType: "NUCLEAR" }, targeted: true };
    const before = availabilityOf(strike, monthView());
    expect(before.state).toBe("unaffordable");
    const slot = before.block?.slots?.[0];
    expect(slot).toBe(0);
    // The label the card shows is the committed order's (MonthView counts committed orders)
    expect(monthView().queuedLabels[slot as number]).toBe("Spy on Iran");
    expect(store.committedIndex(useGameStore.getState().pendingActions, slot as number)).toBe(1);
    store.removeQueuedSlot(slot as number);
    expect(useGameStore.getState().pendingActions.map((a) => a.label)).toEqual(["Reform program"]);
    expect(availabilityOf(strike, monthView()).state).toBe("available");
  });

  it("every Free / Remove fix on an order card goes through the slot translation", () => {
    const card = readFileSync("ui/src/components/orders/OrderCard.tsx", "utf-8");
    expect(card).not.toMatch(/\bremove\(slot\)/);
    expect(card.match(/removeQueuedSlot\(slot\)/g)?.length).toBe(2);
  });
});
