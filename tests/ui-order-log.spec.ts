import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Validation in real use (D-75): the client keeps a log of order picks and removals by registry
 * order id, readable by playtest session reports (window.wcOrderLog(), localStorage
 * worldconflict.orderLog), with no network.
 */
let storage: Record<string, string>;
beforeEach(() => {
  vi.resetModules();
  storage = {};
  vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440 });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
  });
  vi.stubGlobal("fetch", () => {
    throw new Error("the order log must not use the network");
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("order log (D-75)", () => {
  it("records picks, removals and recommendations accepted, by order id", async () => {
    const { useGameStore } = await import("../ui/src/store/gameStore.js");
    const { readOrderLog, summarizeOrderLog, ORDER_LOG_KEY } = await import("../ui/src/lib/orderLog.js");
    const s = useGameStore.getState();
    s.addPendingAction({ type: "MILITARY_AIRSTRIKE", params: { targetType: "NUCLEAR" }, targetCountryId: "IRN", label: "Strike nuclear sites in Iran", origin: "player" });
    s.addPendingAction({ type: "DOMESTIC_POLICING", params: { tactic: "HARD" }, label: "Hard crackdown", origin: "staff", proposed: true });
    useGameStore.getState().removePendingAction(0);
    useGameStore.getState().approvePendingAction(0);

    const log = readOrderLog();
    expect(log.map((e) => [e.kind, e.orderId, e.origin])).toEqual([
      ["pick", "airstrike-nuclear", "player"],
      ["remove", "airstrike-nuclear", "player"],
      ["pick", "policing-hard", "recommended"],
    ]);
    expect(log[0].target).toBe("IRN");
    expect(summarizeOrderLog(log)["airstrike-nuclear"]).toMatchObject({ pick: 1, remove: 1 });
    expect(JSON.parse(storage[ORDER_LOG_KEY])).toHaveLength(3);
    const w = window as unknown as { wcOrderLog: (() => unknown[]) & { clear: () => void } };
    expect(w.wcOrderLog()).toHaveLength(3);
    w.wcOrderLog.clear();
    expect(w.wcOrderLog()).toHaveLength(0);
  });

  it("caps the log and never throws when storage fails", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { logOrder, readOrderLog, MAX_ENTRIES } = await import("../ui/src/lib/orderLog.js");
    for (let i = 0; i < MAX_ENTRIES + 20; i++) logOrder("confirm-cancel", "coup");
    expect(readOrderLog()).toHaveLength(MAX_ENTRIES);
  });
});
