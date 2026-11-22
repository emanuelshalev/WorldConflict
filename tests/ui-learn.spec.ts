import { afterEach, describe, expect, it, vi } from "vitest";
import {
  autoBriefOn,
  clearProgress,
  defaultLearn,
  dueNudge,
  FADE_AFTER_SCREENS,
  isMet,
  isNew,
  knownIds,
  LEARN_KEY,
  loadLearn,
  markAsked,
  markLearned,
  markStyle,
  metCount,
  noteNudge,
  noteOpened,
  noteSeen,
  noteSession,
  preferLayer2,
  resetLearned,
  sanitizeLearn,
  saveLearn,
  setLevel,
  setPref,
} from "../ui/src/lib/learn.js";

/** The local learn store (design-learn.md §8, D-53). */
const WHERE = { title: "The free economic zone", date: "2026-11" };

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("defaults and settings", () => {
  it("starts at Some help, not asked, briefing auto-open off (D-53)", () => {
    const s = defaultLearn();
    expect(s.level).toBe("some");
    expect(s.asked).toBe(false);
    expect(autoBriefOn(s)).toBe(false);
  });

  it("auto-opens the briefing at Guide me unless the player turned it off", () => {
    const guide = setLevel(defaultLearn(), "guide");
    expect(guide.asked).toBe(true);
    expect(autoBriefOn(guide)).toBe(true);
    expect(autoBriefOn(setPref(guide, "autoBrief", false))).toBe(false);
    expect(autoBriefOn(setPref(defaultLearn(), "autoBrief", true))).toBe(true);
  });

  it("markAsked keeps the preselected level", () => {
    const s = markAsked(defaultLearn());
    expect(s.asked).toBe(true);
    expect(s.level).toBe("some");
  });
});

describe("meeting, opening and learning entries", () => {
  it("records first meetings with where and when, once per screen", () => {
    const r = noteSeen(defaultLearn(), ["fortress-belt", "kramatorsk", "fortress-belt"], WHERE);
    expect(r.newlyMet).toEqual(["fortress-belt", "kramatorsk"]);
    expect(r.state.entries["fortress-belt"].seen).toBe(1);
    expect(r.state.entries["fortress-belt"].firstMet).toEqual(WHERE);
    const again = noteSeen(r.state, ["fortress-belt"], { title: "Later", date: "2026-12" });
    expect(again.newlyMet).toEqual([]);
    expect(again.state.entries["fortress-belt"].firstMet).toEqual(WHERE);
    expect(isMet(again.state, "fortress-belt")).toBe(true);
    expect(isNew(again.state, "fortress-belt", "2026-11")).toBe(true);
    expect(isNew(again.state, "fortress-belt", "2026-12")).toBe(false);
    expect(metCount(again.state)).toBe(2);
    expect(metCount(again.state, ["fortress-belt", "nato"])).toBe(1);
  });

  it("fades an opened entry out after a few more screens", () => {
    let s = noteSeen(defaultLearn(), ["x"], WHERE).state;
    expect(markStyle(s, "x")).toBe("full");
    s = noteOpened(s, "x");
    expect(markStyle(s, "x")).toBe("faint");
    for (let i = 0; i < FADE_AFTER_SCREENS - 1; i++) s = noteSeen(s, ["x"], WHERE).state;
    expect(knownIds(s).has("x")).toBe(false);
    s = noteSeen(s, ["x"], WHERE).state;
    expect(knownIds(s).has("x")).toBe(true);
    expect(markStyle(s, "x")).toBe("none");
  });

  it("does not fade when the setting is off", () => {
    let s = setPref(defaultLearn(), "fadeKnown", false);
    s = noteOpened(s, "x");
    for (let i = 0; i < 10; i++) s = noteSeen(s, ["x"], WHERE).state;
    expect(knownIds(s).size).toBe(0);
    expect(markStyle(s, "x")).toBe("full");
  });

  it("Stop marking learns at once; Mark names again forgets learning but keeps the collection", () => {
    let s = noteSeen(defaultLearn(), ["x", "y"], WHERE).state;
    s = markLearned(s, "x", 123);
    expect([...knownIds(s)]).toEqual(["x"]);
    s = resetLearned(s);
    expect(knownIds(s).size).toBe(0);
    expect(isMet(s, "x")).toBe(true);
    expect(s.entries.x.firstMet).toEqual(WHERE);
    s = clearProgress(s);
    expect(isMet(s, "x")).toBe(false);
  });

  it("opens at layer 2 after More on 3 of the last 5 opens", () => {
    let s = defaultLearn();
    for (const layer of [2, 1, 2, 1] as const) s = noteOpened(s, "x", layer);
    expect(preferLayer2(s)).toBe(false);
    s = noteOpened(s, "y", 2);
    expect(preferLayer2(s)).toBe(true);
    for (let i = 0; i < 3; i++) s = noteOpened(s, "z", 1);
    expect(preferLayer2(s)).toBe(false);
    expect(s.totalOpens).toBe(8);
  });
});

describe("nudges", () => {
  it("suggests hiding marks after 3 sessions without an open at Guide me, once", () => {
    let s = setLevel(defaultLearn(), "guide");
    for (let i = 0; i < 3; i++) s = noteSession(s);
    expect(dueNudge(s, { opensThisSession: 0, quiet: false })).toBe("hide-marks");
    expect(dueNudge(s, { opensThisSession: 0, quiet: true })).toBe(null);
    s = noteNudge(s, "hide-marks");
    expect(dueNudge(s, { opensThisSession: 0, quiet: false })).toBe(null);
  });

  it("suggests more help to an expert who keeps opening explanations", () => {
    const s = setLevel(defaultLearn(), "know");
    expect(dueNudge(s, { opensThisSession: 4, quiet: false })).toBe(null);
    expect(dueNudge(s, { opensThisSession: 5, quiet: false })).toBe("try-some-help");
  });
});

describe("storage", () => {
  it("round-trips through localStorage under its own key", () => {
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    const s = noteOpened(setLevel(defaultLearn(), "guide"), "nato", 2);
    saveLearn(s);
    expect(storage.getItem(LEARN_KEY)).not.toBeNull();
    expect(loadLearn()).toEqual(s);
  });

  it("works without storage or with broken data", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadLearn()).toEqual(defaultLearn());
    expect(() => saveLearn(defaultLearn())).not.toThrow();
    vi.unstubAllGlobals();
    // No localStorage at all (node)
    expect(loadLearn()).toEqual(defaultLearn());
    const junk = sanitizeLearn({
      level: "expert",
      prefs: { autoBrief: "yes", largeText: true },
      entries: { a: { seen: -3, opened: "x" }, b: null, c: { seen: 2, opened: 1, learnedAt: 5 } },
      recentLayers: [2, 7, 1],
    });
    expect(junk.level).toBe("some");
    expect(junk.prefs.autoBrief).toBe(null);
    expect(junk.prefs.largeText).toBe(true);
    expect(junk.entries).toEqual({ a: { seen: 0, opened: 0 }, c: { seen: 2, opened: 1, learnedAt: 5 } });
    expect(junk.recentLayers).toEqual([2, 1]);
    expect(sanitizeLearn("nonsense")).toEqual(defaultLearn());
  });

  it("never touches the network", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("localStorage", fakeStorage());
    let s = loadLearn();
    for (let i = 0; i < 10; i++) {
      s = noteOpened(noteSeen(s, [`e${i}`], WHERE).state, `e${i}`, 2);
      saveLearn(s);
    }
    loadLearn();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
