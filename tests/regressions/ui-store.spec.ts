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
