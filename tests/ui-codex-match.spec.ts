import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { codexForGame } from "../src/core/codex.js";
import { createDataLoader } from "../src/core/data-loader.js";
import {
  type CodexEntry,
  compile,
  entriesIn,
  match,
  matchCard,
  searchCodex,
  stripMarkup,
} from "../ui/src/lib/codexMatch.js";

/** Matcher rules (design-learn.md §6, §7.4) on a hand-made codex, independent of content. */
const e = (id: string, aliases: CodexEntry["aliases"], obscurity: 1 | 2 | 3, extra: Partial<CodexEntry> = {}) =>
  ({
    id,
    kind: "place",
    name: id,
    aliases,
    avoid: [],
    obscurity,
    short: `${id} short`,
    related: [],
    valid: { from: "2000-01" },
    sources: [],
    asOf: "2026-11-22",
    ...extra,
  }) as CodexEntry;

const ENTRIES: CodexEntry[] = [
  e("fortress-belt", ["fortress belt"], 3, { related: ["kramatorsk", "sloviansk"] }),
  e("kramatorsk", ["Kramatorsk"], 3, { related: ["fortress-belt"] }),
  e("sloviansk", ["Sloviansk"], 3, { related: ["fortress-belt"] }),
  e("donetsk-oblast", ["Donetsk oblast", "Donetsk"], 2),
  e("midterms", ["the midterms", "midterms"], 2, { kind: "event" }),
  e("referendum", ["referendum"], 2, { kind: "term" }),
  e("rada", ["Verkhovna Rada", { text: "Rada", caseSensitive: true, wholeWord: true }], 2, { kind: "group" }),
  e("nato", [{ text: "NATO", caseSensitive: true, wholeWord: true }], 1, { kind: "group" }),
  e("moscow", [{ text: "Moscow", caseSensitive: true, wholeWord: true }], 1),
  e("washington", [{ text: "Washington", caseSensitive: true, wholeWord: true }], 1, {
    avoid: ["George Washington", "Washington State"],
  }),
  e("erdogan", ["Recep Tayyip Erdoğan", "Erdoğan"], 1, { kind: "person", name: "Recep Tayyip Erdoğan" }),
  e("zelensky", ["Zelensky", "Zelenskyy"], 1, { kind: "person", name: "Volodymyr Zelensky" }),
  e("ukraine", ["Ukraine"], 1),
];
const codex = compile(ENTRIES, "test");
const ids = (r: { spans: Array<{ id: string }> }) => r.spans.map((s) => s.id);

const CRISIS =
  "Washington wants an answer before the midterms. Accepting in principle keeps the Americans close but hands Moscow the fortress belt without a shot. Demanding a referendum first is constitutionally correct and politically safe, and the White House will read it as a no.";

describe("finding aliases", () => {
  it("matches whole words, case-insensitively by default, and returns exact offsets", () => {
    const r = match(codex, "Shelling near KRAMATORSK's station and the Fortress Belt.", { level: "guide", mode: "all" });
    expect(ids(r)).toEqual(["kramatorsk", "fortress-belt"]);
    for (const s of r.spans) expect(r.text.slice(s.start, s.end)).toBe(s.text);
    expect(ids(match(codex, "Kramatorskyi district", { level: "guide", mode: "all" }))).toEqual([]);
  });

  it("respects case-sensitive aliases", () => {
    expect(ids(match(codex, "NATO and the Rada", { level: "guide", mode: "all" }))).toEqual(["nato", "rada"]);
    expect(ids(match(codex, "nato and the rada", { level: "guide", mode: "all" }))).toEqual([]);
  });

  it("handles non-ASCII names at word boundaries", () => {
    expect(ids(match(codex, "Erdoğan said no.", { level: "guide", mode: "all" }))).toEqual(["erdogan"]);
    expect(ids(match(codex, "The Erdoğanist line.", { level: "guide", mode: "all" }))).toEqual([]);
    const r = match(codex, "Recep Tayyip Erdoğan spoke.", { level: "guide", mode: "all" });
    expect(r.spans[0].text).toBe("Recep Tayyip Erdoğan");
  });

  it("prefers the longest alias and tolerates line breaks inside it", () => {
    const r = match(codex, "All of Donetsk oblast, and the fortress\nbelt.", { level: "guide", mode: "all" });
    expect(r.spans.map((s) => s.text)).toEqual(["Donetsk oblast", "fortress\nbelt"]);
  });

  it("skips phrases listed in avoid", () => {
    expect(ids(match(codex, "A statue of George Washington.", { level: "guide", mode: "all" }))).toEqual([]);
    expect(ids(match(codex, "Washington State voted. Washington called.", { level: "guide", mode: "all" }))).toEqual([
      "washington",
    ]);
  });
});

describe("levels (D-53)", () => {
  it("Some help and I know this mark nothing; every level can list everything", () => {
    expect(match(codex, CRISIS, { level: "some" }).spans).toEqual([]);
    expect(match(codex, CRISIS, { level: "know" }).spans).toEqual([]);
    expect(ids(match(codex, CRISIS, { level: "know", mode: "all" }))).toEqual([
      "washington",
      "midterms",
      "moscow",
      "fortress-belt",
      "referendum",
    ]);
  });

  it("Guide me marks names including metonyms, within the density budget", () => {
    const r = match(codex, CRISIS, { level: "guide" });
    // 46 words: at most 3 marks, highest obscurity first
    expect(r.spans.length).toBe(3);
    expect(ids(r)).toEqual(["midterms", "fortress-belt", "referendum"]);
    const short = match(codex, "Washington and Moscow disagree.", { level: "guide" });
    expect(ids(short)).toEqual(["washington"]);
  });

  it("never marks names the player knows or ids excluded by the caller", () => {
    const known = new Set(["fortress-belt"]);
    expect(ids(match(codex, CRISIS, { level: "guide", known, knownVersion: 1 }))).not.toContain("fortress-belt");
    expect(ids(match(codex, "Ukraine and NATO talk.", { level: "guide", mode: "all", exclude: ["ukraine"] }))).toEqual([
      "nato",
    ]);
  });
});

describe("density rules", () => {
  it("marks an entry at its first mention on a card only", () => {
    const [a, b] = matchCard(
      codex,
      [
        "The referendum question divides the cabinet and the generals and the party in equal measure.",
        "A referendum takes months to organise under martial law, and the Rada must agree to it first.",
      ],
      { level: "guide" },
    );
    expect(ids(a)).toEqual(["referendum"]);
    expect(ids(b)).toEqual(["rada"]);
  });

  it("does not mark related entries in the same sentence, but does across sentences", () => {
    const same = match(
      codex,
      "Demilitarise the fortress belt of Kramatorsk and Sloviansk, say the Americans, and every general in the army objects loudly.",
      { level: "guide" },
    );
    expect(ids(same)).toEqual(["fortress-belt"]);
    const apart = match(
      codex,
      "The fortress belt has held for years against every assault the enemy threw at it. Kramatorsk is its biggest city and the seat of the regional government today.",
      { level: "guide" },
    );
    expect(ids(apart)).toEqual(["fortress-belt", "kramatorsk"]);
  });

  it("keeps at least one mark for a short text and never exceeds one per 12 words", () => {
    const text = "Kramatorsk, Sloviansk, Donetsk, NATO, Moscow.";
    expect(match(codex, text, { level: "guide" }).spans.length).toBe(1);
    const long = `${"word ".repeat(36)}Kramatorsk Moscow NATO Ukraine Zelensky referendum`;
    expect(match(codex, long, { level: "guide" }).spans.length).toBe(3);
  });
});

describe("markup, memo, lists and search", () => {
  it("strips [[id|label]] markup and forces the match", () => {
    const r = match(codex, "They hold [[fortress-belt|the belt]] and [[kramatorsk]].", { level: "guide", mode: "all" });
    expect(r.text).toBe("They hold the belt and kramatorsk.");
    expect(r.spans.map((s) => [s.id, r.text.slice(s.start, s.end)])).toEqual([
      ["fortress-belt", "the belt"],
      ["kramatorsk", "kramatorsk"],
    ]);
    expect(stripMarkup("no markup").forced).toEqual([]);
  });

  it("memoizes by text and options", () => {
    const a = match(codex, CRISIS, { level: "guide", known: new Set(), knownVersion: 3 });
    expect(match(codex, CRISIS, { level: "guide", known: new Set(), knownVersion: 3 })).toBe(a);
    expect(match(codex, CRISIS, { level: "guide", known: new Set(["midterms"]), knownVersion: 4 })).not.toBe(a);
  });

  it("lists distinct entries in order of first mention", () => {
    const list = entriesIn(codex, ["Moscow and Washington.", "Moscow again, then NATO."]);
    expect(list.map((x) => x.id)).toEqual(["moscow", "washington", "nato"]);
  });

  it("finds entries by any alias, ignoring case and accents", () => {
    expect(searchCodex(codex, "zelenskyy")[0].id).toBe("zelensky");
    expect(searchCodex(codex, "Zelensky")[0].id).toBe("zelensky");
    expect(searchCodex(codex, "erdogan")[0].id).toBe("erdogan");
    expect(searchCodex(codex, "")).toEqual([]);
  });
});

describe("real codex payload", () => {
  const loader = createDataLoader(join(__dirname, "../data"));
  const payload = codexForGame(loader.loadCodex(), {
    scenarioId: "2026",
    date: "2026-11",
    flashpointId: "ceasefire-or-collapse",
  });
  const real = compile(payload.entries, "real");
  const fp = JSON.parse(readFileSync(join(__dirname, "../data/flashpoints/ceasefire-or-collapse.json"), "utf-8"));
  const card = fp.scripted.UKR[0].decision;
  const blocks: string[] = [card.situation, ...card.options.map((o: { description: string }) => o.description)];

  it("compiles the served payload and matches the opening crisis card", () => {
    const all = matchCard(real, blocks, { level: "guide", mode: "all" });
    expect(all.flatMap((r) => r.spans).length).toBeGreaterThan(0);
    for (const r of all) {
      let reach = -1;
      for (const s of r.spans) {
        expect(r.text.slice(s.start, s.end)).toBe(s.text);
        expect(s.start).toBeGreaterThanOrEqual(reach);
        reach = s.end;
      }
    }
    const marks = matchCard(real, blocks, { level: "guide" });
    const markedIds = marks.flatMap(ids);
    expect(new Set(markedIds).size).toBe(markedIds.length); // each entry once per card
    expect(matchCard(real, blocks, { level: "some" }).every((r) => r.spans.length === 0)).toBe(true);
  });
});
