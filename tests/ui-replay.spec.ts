import { describe, expect, it } from "vitest";
import { seedCodeOf } from "../src/core/reveal.js";
import { type GuestStores, resolveGuestId } from "../ui/src/lib/guest.js";
import { branchLabel, branchMonths, replayRequestOf, saveMonth, seedCodeFor } from "../ui/src/lib/runs.js";

/** A browser stand-in: localStorage and a cookie jar that clear independently. */
function browser() {
  const local = new Map<string, string>();
  let cookie = "";
  const stores: GuestStores = {
    getItem: (k) => local.get(k) ?? null,
    setItem: (k, v) => void local.set(k, v),
    readCookie: () => cookie,
    writeCookie: (c) => {
      cookie = c.split(";")[0];
    },
  };
  return { stores, clearStorage: () => local.clear(), local };
}

describe("guest id survives cleared storage (F-02-6, Marcus's lost month-11 save)", () => {
  it("a guest keeps the same id after localStorage is cleared, so Saved games still finds the games", () => {
    const b = browser();
    let n = 0;
    const make = () => `guest-test-${++n}`;
    const first = resolveGuestId(b.stores, make);
    expect(first).toBe("guest-test-1");
    // The test driver (and a player clearing site data) wipes localStorage on restart
    b.clearStorage();
    expect(resolveGuestId(b.stores, make)).toBe(first);
    expect(b.local.get("worldconflict.guest")).toBe(first);
  });

  it("an existing localStorage id wins and is mirrored to the cookie; junk is ignored", () => {
    const b = browser();
    b.local.set("worldconflict.guest", "guest-abcd-1234");
    expect(resolveGuestId(b.stores, () => "guest-new-0000")).toBe("guest-abcd-1234");
    b.clearStorage();
    expect(resolveGuestId(b.stores, () => "guest-new-0000")).toBe("guest-abcd-1234");
    const c = browser();
    c.local.set("worldconflict.guest", "<script>");
    expect(resolveGuestId(c.stores, () => "guest-new-0000")).toBe("guest-new-0000");
  });

  it("still works with storage and cookies blocked", () => {
    const blocked: GuestStores = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      readCookie: () => {
        throw new Error("blocked");
      },
      writeCookie: () => {
        throw new Error("blocked");
      },
    };
    expect(resolveGuestId(blocked, () => "guest-only-1")).toBe("guest-only-1");
  });
});

describe("Saved games: seed codes, replay and branch months", () => {
  it("the client seed code matches the server's for flashpoints and Terms", () => {
    const cases = [
      { flashpointId: "hormuz-convoy", scenarioId: "2026", mode: "FLASHPOINT" as const, playerCountryId: "USA", seed: 4242 },
      { flashpointId: null, scenarioId: "1960", mode: "TERM" as const, playerCountryId: "UKR", seed: 2_000_000_123 },
      { flashpointId: null, scenarioId: "2026", mode: "LEGACY" as const, playerCountryId: "PSX", seed: 7 },
    ];
    for (const c of cases) expect(seedCodeFor({ ...c, playerCountry: c.playerCountryId })).toBe(seedCodeOf(c));
  });

  it("offers every month from the opening to now, and not the final month of a finished game", () => {
    expect(branchMonths({ turn: 3 })).toEqual([0, 1, 2, 3]);
    expect(branchMonths({ turn: 12, gameOver: true })).toHaveLength(12);
    expect(branchMonths({ turn: 0 })).toEqual([0]);
  });

  it("counts months like the HUD and the reveal in Saved games and the branch picker (QA3-S3-4)", () => {
    // A new game sits on the desk of month 1 (HUD "Month 1 of 48"), not "month 0"
    expect(saveMonth({ turn: 0, maxTurns: 48 })).toBe(1);
    expect(saveMonth({ turn: 9, maxTurns: 12 })).toBe(10);
    expect(saveMonth({ turn: 12, maxTurns: 12, gameOver: true })).toBe(12);
    // Deposed after month 7: the reveal's last month is 7
    expect(saveMonth({ turn: 7, maxTurns: 48, gameOver: true })).toBe(7);
    // Branching at 10 months done opens HUD "Month 11 of 12": the option says Month 11 and its date
    const save = { turn: 12, date: "2027-11", gameOver: true };
    expect(branchLabel(10, save)).toBe("Month 11, Sep 2027: before your choices");
    expect(branchLabel(0, save)).toBe("Month 1, Nov 2026: before your choices (the opening)");
    expect(branchMonths(save).map((m) => branchLabel(m, save).match(/^Month (\d+)/)?.[1])).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(branchLabel(3, { turn: 3 })).toBe("Month 4: before your choices");
  });

  it("Replay from Your record starts the same seat with the same seed", () => {
    expect(
      replayRequestOf({ mode: "TERM", countryId: "USA", flashpointId: null, scenarioId: "2026", difficulty: "STATESMAN", seed: 9 }),
    ).toEqual({ mode: "TERM", playerCountryId: "USA", flashpointId: undefined, scenarioId: "2026", difficulty: "STATESMAN", seed: 9 });
  });
});
