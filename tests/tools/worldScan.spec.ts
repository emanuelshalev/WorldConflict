import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CRISIS_TEMPLATE_IDS } from "../../src/core/crises.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import {
  applyProposal,
  buildMatchers,
  buildProposal,
  classify,
  loadWorldContext,
  parseFeed,
  parseInput,
  tagItems,
} from "../../src/tools/worldScan.js";

const DATA = resolve("data");
const ctx = loadWorldContext(DATA, CRISIS_TEMPLATE_IDS);
const aliases = JSON.parse(readFileSync(join(DATA, "world-scan", "aliases.json"), "utf-8")).aliases;
const matchers = buildMatchers(ctx.names, aliases, ctx.leaders);
const tmp = mkdtempSync(join(tmpdir(), "wc-scan-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const HEADLINES = `
2026-11-18 | Russian drone strikes hit Ukrainian power grid as front line shifts
2026-11-17 | China coast guard blocks Philippine resupply mission at Second Thomas Shoal
2026-11-17 | Philippines protests after Chinese vessels use water cannon near Scarborough
2026-11-14 | New prime minister sworn in in Japan after ruling party leadership vote
2026-11-10 | Let us hope for peace, says the pope
`;

describe("world scan", () => {
  it("reads RSS and Atom feeds", () => {
    const rss = `<rss><channel><item><title><![CDATA[Coup in Niger &amp; curfew]]></title><link>https://x/1</link><pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Soldiers&lt;/p&gt;</description></item></channel></rss>`;
    const atom = `<feed><entry><title>Summit in Cairo</title><link href="https://x/2"/><updated>2026-11-16T08:00:00Z</updated><summary>Talks</summary></entry></feed>`;
    expect(parseFeed(rss, "r")[0]).toMatchObject({ title: "Coup in Niger & curfew", link: "https://x/1", date: "2026-11-17", summary: "Soldiers" });
    expect(parseFeed(atom, "a")[0]).toMatchObject({ title: "Summit in Cairo", link: "https://x/2", date: "2026-11-16" });
  });

  it("tags countries and kinds, and never reads 'us' as the United States", () => {
    const items = tagItems(parseInput(HEADLINES), matchers);
    const pope = items.find((i) => i.title.startsWith("Let us"));
    expect(pope?.countries).toEqual([]);
    expect(items.find((i) => i.title.startsWith("China coast"))?.countries.sort()).toEqual(["CHN", "PHL"]);
    expect(classify("Junta seizes power after coup")).toContain("coup");
    expect(classify("Ceasefire talks stall")).toContain("ceasefire");
  });

  it("proposes history, leader changes and flashpoints, and knows what the game already has", () => {
    const p = buildProposal(tagItems(parseInput(HEADLINES), matchers), ctx, "2026-11-20", [{ name: "t", items: 5 }]);
    expect(p.history.some((h) => h.country === "JPN")).toBe(true);
    expect(p.leaders.find((l) => l.country === "JPN")).toBeTruthy();
    const scar = p.flashpoints.find((f) => f.sides.includes("CHN") && f.sides.includes("PHL"));
    expect(scar?.coveredBy).toBe("scarborough-line");
    // An event already in a profile is not proposed again
    const known = ctx.keyEvents.UKR[0].event;
    const again = buildProposal(tagItems([{ title: `${known} war offensive`, summary: "", link: "", date: "", source: "t" }], matchers), ctx, "2026-11-20", []);
    expect(again.history.filter((h) => h.country === "UKR")).toEqual([]);
  });

  it("applies only accepted items, keeps the files valid, and adds playable flashpoints", () => {
    cpSync(DATA, join(tmp, "data"), { recursive: true });
    const data = join(tmp, "data");
    const p = buildProposal(tagItems(parseInput(HEADLINES), matchers), ctx, "2026-11-20", []);
    const jp = p.history.find((h) => h.country === "JPN");
    if (!jp) throw new Error("no JPN entry");
    jp.accept = true;
    jp.impact = "A new government takes office.";
    const lead = p.leaders.find((l) => l.country === "JPN");
    if (lead) Object.assign(lead, { name: "Test Leader", title: "Prime Minister", accept: true });
    const fp = JSON.parse(readFileSync(join(DATA, "flashpoints", "scarborough-line.json"), "utf-8"));
    p.flashpoints.push({ id: "f-test", title: "Test", sides: ["CHN", "PHL"], hook: "", evidence: [], coveredBy: null, draft: { ...fp, id: "test-shoal", title: "Test Shoal" }, accept: true });
    const res = applyProposal(p, data);
    expect(res.changed.some((c) => c.startsWith("countries/JPN.json"))).toBe(true);
    expect(res.changed.some((c) => c.startsWith("flashpoints/test-shoal.json"))).toBe(true);
    const loader = createDataLoader(data);
    expect(loader.loadCountry("JPN").history.keyEvents.at(-1)?.impact).toBe("A new government takes office.");
    expect(loader.loadScenario("2026").leaders.JPN.name).toBe("Test Leader");
    expect(loader.loadAvailableFlashpoints().some((f) => f.id === "test-shoal")).toBe(true);
    // Untouched countries stay byte-identical
    expect(readFileSync(join(data, "countries", "USA.json"), "utf-8")).toBe(readFileSync(join(DATA, "countries", "USA.json"), "utf-8"));
  });
});
