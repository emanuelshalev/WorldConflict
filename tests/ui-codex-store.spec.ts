import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The codex block of the store: one fetch per game, learn state persisted locally only. */
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

const PAYLOAD = {
  success: true,
  version: "abc",
  scenarioId: "2026",
  flashpointId: "ceasefire-or-collapse",
  date: "2026-11",
  entries: [],
  situations: [],
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", fakeStorage());
  vi.stubGlobal("window", { location: { search: "" } });
  fetchSpy = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD }));
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

const world = (flashpointId: string | null, turn = 0) =>
  ({ scenarioId: "2026", flashpointId, turn }) as never;

describe("codex store block", () => {
  it("fetches the codex once when a game arrives, with only scenario and flashpoint", async () => {
    const { useGameStore } = await import("../ui/src/store/gameStore.js");
    useGameStore.setState({ worldState: world("ceasefire-or-collapse") });
    await vi.waitFor(() => expect(useGameStore.getState().codexStatus).toBe("ready"));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/codex?scenario=2026&flashpoint=ceasefire-or-collapse");
    expect(useGameStore.getState().codex?.version).toBe("abc");
    expect("success" in (useGameStore.getState().codex ?? {})).toBe(false);
    // Next month of the same game: no new request
    useGameStore.setState({ worldState: world("ceasefire-or-collapse", 1) });
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the game playable when the codex fails to load", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("offline");
    });
    const { useGameStore } = await import("../ui/src/store/gameStore.js");
    useGameStore.setState({ worldState: world(null) });
    await vi.waitFor(() => expect(useGameStore.getState().codexStatus).toBe("error"));
    expect(useGameStore.getState().codex).toBeNull();
  });

  it("persists learn changes locally, bumps the known version only when the known set changes", async () => {
    const { useGameStore, codexMarksOn } = await import("../ui/src/store/gameStore.js");
    const s = useGameStore.getState();
    expect(s.learn.level).toBe("some");
    expect(codexMarksOn(useGameStore.getState())).toBe(false);
    s.setLearnLevel("guide");
    expect(codexMarksOn(useGameStore.getState())).toBe(true);
    useGameStore.getState().toggleCodexMarks();
    expect(codexMarksOn(useGameStore.getState())).toBe(false);
    const met = useGameStore.getState().noteCodexSeen(["nato", "moscow"], { title: "t", date: "2026-11" });
    expect(met).toEqual(["nato", "moscow"]);
    const v = useGameStore.getState().codexKnownVersion;
    useGameStore.getState().noteCodexOpened("nato", 2);
    expect(useGameStore.getState().codexKnownVersion).toBe(v);
    useGameStore.getState().markCodexLearned("nato");
    expect(useGameStore.getState().codexKnownVersion).toBe(v + 1);
    expect(useGameStore.getState().codexKnown.has("nato")).toBe(true);
    const stored = JSON.parse(localStorage.getItem("worldconflict.learn.v1") ?? "{}");
    expect(stored.level).toBe("guide");
    expect(stored.entries.nato.learnedAt).toBeTypeOf("number");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
