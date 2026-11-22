import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { crisisLede, outcomeHeadline } from "../../src/core/reactions.js";
import { TurnEngine } from "../../src/core/turn.js";

/** Every crisis title the game can show: authored flashpoint crises plus generated templates. */
function allCrisisTitles(): string[] {
  const titles = new Set<string>();
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.title === "string" && Array.isArray(o.options)) titles.add(o.title);
      Object.values(o).forEach(walk);
    }
  };
  const dir = join(process.cwd(), "data", "flashpoints");
  for (const f of readdirSync(dir)) walk(JSON.parse(readFileSync(join(dir, f), "utf8")));
  const loader = createDataLoader();
  for (const [c, seed] of [
    ["USA", 5],
    ["DEU", 9],
    ["BRA", 3],
    ["ISR", 4],
    ["PAK", 2],
    ["RUS", 8],
  ] as const) {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: c, seed, mode: "TERM" });
    for (let t = 0; t < 30 && !w.gameOver; t++) {
      for (const d of w.pendingDecisions) titles.add(d.title);
      w = new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), []).newState;
    }
  }
  return [...titles];
}

describe("crisis headlines and ledes read naturally for every title (QA B-10)", () => {
  const loader = createDataLoader();
  const w = loader.newGame({ scenarioId: "2026", playerCountryId: "SAU", seed: 1, mode: "TERM" });
  const player = w.countries.find((c) => c.id === "SAU");
  if (!player) throw new Error("no player");
  const titles = allCrisisTitles();

  it("collects a broad set of titles", () => {
    expect(titles.length).toBeGreaterThan(60);
    expect(titles).toContain("After the Riyadh airport strike");
  });

  it("never splices the title into the headline", () => {
    titles.forEach((title, i) => {
      const h = outcomeHeadline("CRISIS", "neutral", { player, title, choice: "Back channel via Muscat" }, i * 7919);
      expect(h).not.toContain(title);
      expect(h).toMatch(/^\S.*( answer| chooses| decides): Back channel via Muscat$/);
      expect(h).not.toMatch(/ on [A-Z]/);
    });
  });

  it("quotes the title in the lede, so a question or a clause still reads", () => {
    for (const title of titles) {
      const lede = crisisLede("Crown Prince Salman", title, "Back channel via Muscat");
      expect(lede.startsWith("In the crisis \"")).toBe(true);
      expect(lede).toContain(`"${title.replace(/[.:;,]+$/, "")}"`);
      expect(lede).not.toMatch(/^On [a-z]/);
      expect(lede.endsWith("decided: Back channel via Muscat.")).toBe(true);
    }
    expect(crisisLede("X", "After the Riyadh airport strike", "Pay (no decision taken)")).toBe(
      'In the crisis "After the Riyadh airport strike", X decided: Pay (by default).',
    );
  });
});
