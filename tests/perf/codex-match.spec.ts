import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { codexForGame } from "../../src/core/codex.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { type CodexEntry, compile, matchCard } from "../../ui/src/lib/codexMatch.js";

/**
 * Matcher budget (design-learn.md §10): under 2 ms for one desk screen, under 20 ms for all
 * flashpoint text. The real codex is padded to a realistic size (~250 entries) with every
 * country and every scenario leader, so the test stays meaningful while content grows.
 */
const DATA = join(__dirname, "../../data");
const loader = createDataLoader(DATA);

function realisticCodex(): CodexEntry[] {
  const base = codexForGame(loader.loadCodex(), { scenarioId: "2026", date: "2026-11" }).entries as CodexEntry[];
  const taken = new Set(base.flatMap((e) => e.aliases.map((a) => (typeof a === "string" ? a : a.text).toLowerCase())));
  const extra: CodexEntry[] = [];
  const add = (id: string, alias: string, obscurity: 1 | 2 | 3) => {
    if (taken.has(alias.toLowerCase())) return;
    taken.add(alias.toLowerCase());
    extra.push({
      id,
      kind: "place",
      name: alias,
      aliases: [alias],
      avoid: [],
      obscurity,
      short: alias,
      related: [],
      valid: { from: "1945-01" },
      sources: [],
      asOf: "2026-11-22",
    });
  };
  for (const c of loader.loadAllCountries()) add(`pad-${c.id.toLowerCase()}`, c.name, 1);
  for (const s of loader.loadAvailableScenarios()) {
    for (const [cid, l] of Object.entries(s.leaders)) {
      add(`pad-${s.id}-${cid.toLowerCase()}`, l.name, 2);
      const surname = l.name.split(" ").at(-1);
      if (surname && surname.length > 3) add(`pad-${s.id}-${cid.toLowerCase()}-s`, surname, 2);
    }
  }
  return [...base, ...extra];
}

/** Every string in a JSON value, grouped by the object that holds it (one "card" each). */
function cards(value: unknown, out: string[][] = []): string[][] {
  if (Array.isArray(value)) for (const v of value) cards(v, out);
  else if (value && typeof value === "object") {
    const strings = Object.values(value).filter((v): v is string => typeof v === "string" && v.includes(" "));
    if (strings.length) out.push(strings);
    for (const v of Object.values(value)) if (typeof v === "object") cards(v, out);
  }
  return out;
}

const entries = realisticCodex();
const flashpointCards = readdirSync(join(DATA, "flashpoints"))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => cards(JSON.parse(readFileSync(join(DATA, "flashpoints", f), "utf-8"))));

function best(runs: number, fn: () => void): number {
  fn(); // warm-up: let the JIT compile the hot paths before timing (the full suite runs files in parallel)
  let min = Infinity;
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    min = Math.min(min, performance.now() - t);
  }
  return min;
}

describe("codex matcher performance", () => {
  it("has a realistic codex and corpus", () => {
    expect(entries.length).toBeGreaterThan(150);
    expect(flashpointCards.length).toBeGreaterThan(100);
  });

  it("matches all flashpoint text in under 20 ms (uncached)", () => {
    const ms = best(5, () => {
      const c = compile(entries); // fresh memo each run
      for (const card of flashpointCards) {
        matchCard(c, card, { level: "guide" });
        matchCard(c, card, { level: "know", mode: "all" });
      }
    });
    console.info(`codex match, all flashpoint text: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(20);
  });

  it("matches one desk screen (opening crisis card and briefing) in under 2 ms (uncached)", () => {
    const fp = JSON.parse(readFileSync(join(DATA, "flashpoints/ceasefire-or-collapse.json"), "utf-8"));
    const d = fp.scripted.UKR[0].decision;
    const screen = [fp.hook, fp.tagline, d.situation, ...d.options.map((o: { description: string }) => o.description)];
    const compiled = Array.from({ length: 8 }, () => compile(entries)); // 7 timed runs + 1 warm-up
    let i = 0;
    const ms = best(7, () => {
      const c = compiled[i++];
      matchCard(c, screen, { level: "guide" });
      matchCard(c, screen, { level: "know", mode: "all" });
    });
    console.info(`codex match, one desk screen: ${ms.toFixed(3)} ms`);
    expect(ms).toBeLessThan(2);
  });

  it("compiles a codex in under 20 ms", () => {
    expect(best(3, () => compile(entries))).toBeLessThan(20);
  });
});
