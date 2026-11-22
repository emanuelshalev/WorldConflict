import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CodexEntrySchema,
  CodexFileSchema,
  codexForGame,
  codexIssues,
  SituationSchema,
  validAt,
} from "../../src/core/codex.js";
import { createDataLoader } from "../../src/core/data-loader.js";

const DATA = join(__dirname, "../../data");
const loader = createDataLoader(DATA);

const entry = (over: Record<string, unknown> = {}) => ({
  id: "fortress-belt",
  kind: "place",
  name: "The fortress belt",
  aliases: ["fortress belt"],
  obscurity: 3,
  short: "Four fortified cities.",
  valid: { from: "2022-09" },
  asOf: "2026-11-22",
  ...over,
});

describe("codex schema", () => {
  it("accepts a minimal entry and fills defaults", () => {
    const e = CodexEntrySchema.parse(entry());
    expect(e.avoid).toEqual([]);
    expect(e.related).toEqual([]);
    expect(e.eras).toEqual({});
    expect(e.sources).toEqual([]);
  });

  it("accepts object aliases with defaults", () => {
    const e = CodexEntrySchema.parse(entry({ aliases: [{ text: "STC", caseSensitive: true }] }));
    expect(e.aliases[0]).toEqual({ text: "STC", caseSensitive: true, wholeWord: true });
  });

  it.each([
    ["an id with capitals", { id: "Fortress" }],
    ["an unknown kind", { kind: "situation" }],
    ["no aliases", { aliases: [] }],
    ["obscurity 4", { obscurity: 4 }],
    ["a short line over 140 chars", { short: "x".repeat(141) }],
    ["a long text over 600 chars", { long: "x".repeat(601) }],
    ["a bad valid date", { valid: { from: "2022" } }],
    ["a bad asOf", { asOf: "2026-11" }],
    ["a non-URL source", { sources: ["wikipedia"] }],
    ["a lower-case countryId", { countryId: "ukr" }],
    ["an unknown field (typo guard)", { shrot: "x" }],
  ])("rejects %s", (_label, over) => {
    expect(CodexEntrySchema.safeParse(entry(over)).success).toBe(false);
  });

  it("rejects situations with too few who-is-who rows or timeline rows", () => {
    const base = {
      id: "x",
      title: "X",
      oneLine: "x",
      whoIsWho: [
        { entryId: "a", stance: "s" },
        { entryId: "b", stance: "s" },
      ],
      whyItMatters: "x",
      timeline: [
        { date: "2014", text: "a" },
        { date: "2015", text: "b" },
        { date: "2016", text: "c" },
      ],
      gameStarts: "2026-11",
      sources: ["https://example.org/"],
      asOf: "2026-11-22",
    };
    expect(SituationSchema.safeParse(base).success).toBe(true);
    expect(SituationSchema.safeParse({ ...base, whoIsWho: base.whoIsWho.slice(0, 1) }).success).toBe(
      false,
    );
    expect(SituationSchema.safeParse({ ...base, timeline: base.timeline.slice(0, 2) }).success).toBe(
      false,
    );
    expect(SituationSchema.safeParse({ ...base, sources: [] }).success).toBe(false);
  });
});

describe("codex data files", () => {
  const dir = join(DATA, "codex");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("every data/codex/*.json is an array of valid entries", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const parsed = CodexFileSchema.safeParse(JSON.parse(readFileSync(join(dir, f), "utf-8")));
      expect(parsed.success, `${f}: ${parsed.success ? "" : parsed.error.message}`).toBe(true);
    }
  });

  it("the loaded codex is consistent (ids, references, sources, alias collisions)", () => {
    const codex = loader.loadCodex();
    expect(codex.entries.length).toBeGreaterThan(0);
    expect(codexIssues(codex)).toEqual([]);
  });

  it("loadCodex returns a deep copy", () => {
    const a = loader.loadCodex();
    a.entries[0].name = "mutated";
    a.situations.length = 0;
    const b = loader.loadCodex();
    expect(b.entries[0].name).not.toBe("mutated");
    expect(b.situations.length).toBeGreaterThan(0);
  });

  it("every short line is at most 140 characters and has no em dash", () => {
    for (const e of loader.loadCodex().entries) {
      expect(e.short.length).toBeLessThanOrEqual(140);
      expect(JSON.stringify(e)).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe("codexIssues", () => {
  const parse = (o: Record<string, unknown>) => CodexEntrySchema.parse(entry(o));

  it("flags duplicates, dangling references, missing sources and alias collisions", () => {
    const issues = codexIssues({
      entries: [
        parse({ id: "a", aliases: ["Kyiv"], related: ["nope"] }),
        parse({ id: "a", aliases: ["kyiv"] }),
        parse({ id: "p", kind: "person", aliases: ["Someone"] }),
      ],
      situations: [],
    });
    expect(issues.some((i) => i.includes('duplicate entry id "a"'))).toBe(true);
    expect(issues.some((i) => i.includes('related "nope"'))).toBe(true);
    expect(issues.some((i) => i.includes("p: a person entry needs at least one source"))).toBe(true);
  });

  it("allows the same alias in entries that are never valid at the same time", () => {
    const issues = codexIssues({
      entries: [
        parse({ id: "ussr-leader", aliases: ["the General Secretary"], valid: { from: "1960-01", to: "1991-12" } }),
        parse({ id: "cn-leader", aliases: ["the General Secretary"], valid: { from: "2012-11" } }),
      ],
      situations: [],
    });
    expect(issues).toEqual([]);
  });

  it("allows case-sensitive aliases that differ only in case", () => {
    const issues = codexIssues({
      entries: [
        parse({ id: "turkey-country", aliases: [{ text: "Turkey", caseSensitive: true }] }),
        parse({ id: "turkey-bird", aliases: [{ text: "turkey", caseSensitive: true }] }),
      ],
      situations: [],
    });
    expect(issues).toEqual([]);
  });
});

describe("codexForGame", () => {
  const codex = {
    entries: [
      CodexEntrySchema.parse(
        entry({
          id: "nato",
          aliases: ["NATO"],
          short: "32 members.",
          valid: { from: "1949-04" },
          eras: { "1960": { short: "15 members.", aliases: ["the Western alliance"] } },
          reviewedBy: "content",
        }),
      ),
      CodexEntrySchema.parse(entry({ id: "new", valid: { from: "2022-09" } })),
      CodexEntrySchema.parse(entry({ id: "old", valid: { from: "1950-01", to: "1991-12" } })),
    ],
    situations: [],
  };

  it("filters by validity and applies the era override", () => {
    const g1960 = codexForGame(codex, { scenarioId: "1960", date: "1960-01" });
    expect(g1960.entries.map((e) => e.id)).toEqual(["nato", "old"]);
    expect(g1960.entries[0].short).toBe("15 members.");
    expect(g1960.entries[0].aliases).toEqual(["NATO", "the Western alliance"]);
    expect("eras" in g1960.entries[0]).toBe(false);
    expect("reviewedBy" in g1960.entries[0]).toBe(false);
    const g2026 = codexForGame(codex, { scenarioId: "2026", date: "2026-11" });
    expect(g2026.entries.map((e) => e.id)).toEqual(["nato", "new"]);
    expect(g2026.entries[0].short).toBe("32 members.");
    expect(codex.entries[0].eras["1960"].short).toBe("15 members."); // input untouched
  });

  it("validAt is inclusive at both ends", () => {
    const v = { valid: { from: "2020-01", to: "2020-12" } };
    expect(validAt(v, "2020-01")).toBe(true);
    expect(validAt(v, "2020-12")).toBe(true);
    expect(validAt(v, "2021-01")).toBe(false);
  });
});
