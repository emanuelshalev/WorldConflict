import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { LLMClient } from "../agents/llmClient.js";
import { createDataLoader, FlashpointSchema } from "../core/data-loader.js";
import { CountryProfileSchema } from "../core/types.js";

/**
 * World scan: keeps the game's picture of the world current.
 *
 * `scan` reads news feeds (or a file of headlines), tags each item with the countries and the kind
 * of event it is about, and writes a reviewable proposal: new history entries per country, leader
 * changes, crisis patterns the game does not cover yet, and flashpoint candidates (optionally
 * drafted in full by an LLM). Nothing changes in the game until `apply` merges the items a
 * human marked `"accept": true`. Pure functions here; the CLIs live in scripts/.
 */

export interface FeedItem {
  title: string;
  summary: string;
  link: string;
  date: string; // YYYY-MM-DD ("" when unknown)
  source: string;
}

export interface TaggedItem extends FeedItem {
  countries: string[];
  kinds: string[];
  salience: number;
}

// ----------------------------------------------------------------------------
// Feeds
// ----------------------------------------------------------------------------

function decode(s: string): string {
  return (
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      // Feeds often escape the HTML inside descriptions: unescape it, then strip the tags
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;|&#8217;|&rsquo;/g, "'")
      .replace(/&#8216;|&lsquo;/g, "'")
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
      .replace(/&#8211;|&ndash;/g, "-")
      .replace(/&#8212;|&mdash;|—/g, ", ")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
      .replace(/\s+/g, " ")
      .trim()
  );
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function isoDate(raw: string): string {
  const t = Date.parse(raw);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

/** RSS 2.0 and Atom, without a dependency: titles, links, dates, summaries. */
export function parseFeed(xml: string, source: string): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks) {
    const title = tag(b, "title");
    if (!title) continue;
    const href = b.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    out.push({
      title,
      summary: tag(b, "description") || tag(b, "summary") || tag(b, "content"),
      link: href ?? tag(b, "link"),
      date: isoDate(
        tag(b, "pubDate") || tag(b, "updated") || tag(b, "published") || tag(b, "dc:date"),
      ),
      source,
    });
  }
  return out;
}

/** A plain list: one headline per line, or a JSON array of strings or items, or feed XML. */
export function parseInput(text: string, source = "input"): FeedItem[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) return parseFeed(trimmed, source);
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as Array<string | Partial<FeedItem>>;
    return arr.map((x) =>
      typeof x === "string"
        ? { title: x, summary: "", link: "", date: "", source }
        : {
            title: x.title ?? "",
            summary: x.summary ?? "",
            link: x.link ?? "",
            date: x.date ?? "",
            source: x.source ?? source,
          },
    );
  }
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      // "2026-11-18 | headline | link" or just a headline
      const parts = l.split("|").map((p) => p.trim());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? (parts.shift() as string) : "";
      return { title: parts[0], summary: "", link: parts[1] ?? "", date, source };
    });
}

// ----------------------------------------------------------------------------
// Tagging
// ----------------------------------------------------------------------------

export interface CountryMatcher {
  id: string;
  name: string;
  /** Names, demonyms, capitals, leaders: case-insensitive. */
  loose: RegExp | null;
  /** Short acronyms (US, UK, UAE): case-sensitive, so "us" never matches. */
  strict: RegExp | null;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (list: string[], flags: string) =>
  list.length ? new RegExp(`(?<![\\w])(?:${list.map(esc).join("|")})(?![\\w])`, flags) : null;

export function buildMatchers(
  names: Record<string, string>,
  aliases: Record<string, string[]>,
  leaders: Record<string, string> = {},
): CountryMatcher[] {
  return Object.entries(names).map(([id, name]) => {
    const all = [name, ...(aliases[id] ?? [])];
    const surname = leaders[id]
      ?.split(" ")
      .filter((w) => w.length > 3)
      .pop();
    if (surname) all.push(surname);
    const caps = all.filter((w) => /^[A-Z.]{2,4}$/.test(w));
    return {
      id,
      name,
      loose: wordRe(
        all.filter((w) => !caps.includes(w)),
        "i",
      ),
      strict: wordRe(caps, ""),
    };
  });
}

export function tagCountries(text: string, matchers: CountryMatcher[]): string[] {
  return matchers.filter((m) => m.loose?.test(text) || m.strict?.test(text)).map((m) => m.id);
}

/** Event kinds, their weight in the salience score, and the crisis templates that already cover them. */
export const KINDS: Array<{ kind: string; re: RegExp; weight: number; covers: RegExp }> = [
  {
    kind: "war",
    re: /\b(war|invasion|invade[sd]?|offensive|shelling|airstrikes?|missile strikes?|drone strikes?|troops? (?:cross|advance)|front ?line|bombard|clash(?:es|ed)?|skirmish|mass(?:es|ing)? troops|border (?:clash|tension)|rammed|ramming|water cannon)/i,
    weight: 3,
    covers: /incident|standoff|ultimatum|ally_war|losing|war|gaza_flare/,
  },
  {
    kind: "ceasefire",
    re: /\b(ceasefire|cease-fire|truce|armistice|peace (?:deal|talks|plan|agreement))\b/i,
    weight: 3,
    covers: /ceasefire|peace|mediat|world_reacts/,
  },
  {
    kind: "coup",
    re: /\b(coup|junta|mutiny|seized power|martial law)\b/i,
    weight: 4,
    covers: /coup/,
  },
  {
    kind: "election",
    re: /\b(election|elections|vote|referendum|polls? (?:open|close)|ballot|run-?off)\b/i,
    weight: 2,
    covers: /election|polls/,
  },
  {
    kind: "leadership",
    re: /\b(sworn in|inaugurat|resign(?:s|ed|ation)?|steps? down|new (?:prime minister|president|leader)|appointed (?:prime minister|president)|succession)\b/i,
    weight: 3,
    covers: /regime|leader/,
  },
  {
    kind: "sanctions",
    re: /\b(sanctions?|embargo|tariffs?|trade war|export (?:ban|controls?))\b/i,
    weight: 2,
    covers: /sanction|trade|tariff|energy/,
  },
  {
    kind: "nuclear",
    re: /\b(nuclear|enrichment|uranium|warhead|IAEA|atomic)\b/i,
    weight: 3,
    covers: /nuclear|proliferat/,
  },
  {
    kind: "unrest",
    re: /\b(protests?|protesters|riots?|demonstrat|general strike|uprising|crackdown)\b/i,
    weight: 2,
    covers: /strike|streets|protest|unrest/,
  },
  {
    kind: "disaster",
    re: /\b(earthquake|flood(?:s|ing)?|hurricane|typhoon|cyclone|wildfires?|drought|famine|epidemic|outbreak)\b/i,
    weight: 2,
    covers: /disaster|pandemic|typhoon|famine|crossings/,
  },
  {
    kind: "diplomacy",
    re: /\b(summit|state visit|talks with|meets? with|treaty|alliance|accord|normali[sz]ation)\b/i,
    weight: 1,
    covers: /summit|pact|visit/,
  },
  {
    kind: "assassination",
    re: /\b(assassinat|killed in (?:an )?(?:attack|strike)|car bomb)\b/i,
    weight: 3,
    covers: /assassination/,
  },
  {
    kind: "blockade",
    re: /\b(blockade|blocks? (?:a |the )?(?:resupply|ships?|vessels?|convoy)|quarantine|strait|shipping lanes?|naval standoff|coast guard)\b/i,
    weight: 3,
    covers: /blockade|strait|convoy|quarantine|shipping/,
  },
  {
    kind: "hostage",
    re: /\b(hostages?|kidnap|detained (?:journalist|citizen)|prisoner swap)\b/i,
    weight: 2,
    covers: /hostage/,
  },
  {
    kind: "cyber",
    re: /\b(cyber ?attack|hack(?:ers|ed)?|ransomware|data breach)\b/i,
    weight: 2,
    covers: /cyber/,
  },
  {
    kind: "refugees",
    re: /\b(refugees?|migrants?|displaced|asylum)\b/i,
    weight: 1,
    covers: /refugee/,
  },
  {
    kind: "terror",
    re: /\b(terror(?:ist|ism)?|suicide bomb|jihadist|ISIS|al-Qaeda)\b/i,
    weight: 3,
    covers: /terror/,
  },
  {
    kind: "economy",
    re: /\b(recession|inflation|default|currency (?:crash|collapse)|bailout|IMF)\b/i,
    weight: 1,
    covers: /market|crash|debt|economy/,
  },
];

export function classify(text: string): string[] {
  return KINDS.filter((k) => k.re.test(text)).map((k) => k.kind);
}

export function tagItems(items: FeedItem[], matchers: CountryMatcher[]): TaggedItem[] {
  const seen = new Set<string>();
  const out: TaggedItem[] = [];
  for (const it of items) {
    const key = it.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .slice(0, 80);
    if (!it.title || seen.has(key)) continue;
    seen.add(key);
    const text = `${it.title}. ${it.summary}`;
    const countries = tagCountries(text, matchers);
    const kinds = classify(text);
    const salience =
      kinds.reduce((s, k) => s + (KINDS.find((x) => x.kind === k)?.weight ?? 0), 0) +
      Math.min(2, countries.length);
    out.push({ ...it, countries, kinds, salience });
  }
  return out.sort((a, b) => b.salience - a.salience);
}

// ----------------------------------------------------------------------------
// Proposal
// ----------------------------------------------------------------------------

const ProposalHistorySchema = z.object({
  id: z.string(),
  country: z.string(),
  year: z.number(),
  event: z.string(),
  impact: z.string().default(""),
  sources: z.array(z.string()).default([]),
  accept: z.boolean().default(false),
});
const ProposalLeaderSchema = z.object({
  id: z.string(),
  country: z.string(),
  name: z.string(),
  title: z.string(),
  since: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  accept: z.boolean().default(false),
});
const ProposalCrisisSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  countries: z.array(z.string()),
  pattern: z.string().default(""),
  examples: z.array(z.string()).default([]),
  coveredBy: z.array(z.string()).default([]),
  accept: z.boolean().default(false),
});
const ProposalFlashpointSchema = z.object({
  id: z.string(),
  title: z.string(),
  sides: z.array(z.string()),
  hook: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  coveredBy: z.string().nullable().default(null),
  draft: z.unknown().optional(),
  accept: z.boolean().default(false),
});
export const ProposalSchema = z.object({
  date: z.string(),
  generatedBy: z.string(),
  sources: z.array(z.object({ name: z.string(), items: z.number(), error: z.string().optional() })),
  stats: z.object({ items: z.number(), tagged: z.number() }),
  history: z.array(ProposalHistorySchema),
  leaders: z.array(ProposalLeaderSchema),
  crises: z.array(ProposalCrisisSchema),
  flashpoints: z.array(ProposalFlashpointSchema),
  briefing: z.array(z.string()).default([]),
});
export type Proposal = z.infer<typeof ProposalSchema>;

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}
function overlap(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

export interface WorldContext {
  names: Record<string, string>;
  keyEvents: Record<string, Array<{ year: number; event: string }>>;
  leaders: Record<string, string>;
  flashpoints: Array<{ id: string; title: string; countries: string[] }>;
  templateIds: string[];
}

const HISTORY_KINDS = new Set([
  "war",
  "ceasefire",
  "coup",
  "leadership",
  "election",
  "nuclear",
  "assassination",
  "blockade",
  "sanctions",
  "terror",
]);
const CONFLICT_KINDS = new Set([
  "war",
  "ceasefire",
  "blockade",
  "nuclear",
  "sanctions",
  "coup",
  "assassination",
  "terror",
]);

/** Turn tagged items into the reviewable proposal (no LLM needed). */
export function buildProposal(
  items: TaggedItem[],
  ctx: WorldContext,
  date: string,
  sources: Proposal["sources"],
): Proposal {
  const year = Number(date.slice(0, 4));
  // History: the most salient item per country and kind, not already in the profile
  const history: Proposal["history"] = [];
  const perCountry = new Map<string, number>();
  for (const it of items) {
    if (!it.kinds.some((k) => HISTORY_KINDS.has(k)) || it.salience < 4) continue;
    for (const c of it.countries.slice(0, 2)) {
      if ((perCountry.get(c) ?? 0) >= 2) continue;
      const known = (ctx.keyEvents[c] ?? []).some((e) => overlap(e.event, it.title) >= 0.5);
      const dup = history.some((h) => h.country === c && overlap(h.event, it.title) >= 0.5);
      if (known || dup) continue;
      perCountry.set(c, (perCountry.get(c) ?? 0) + 1);
      history.push({
        id: `h-${c}-${slug(it.title).slice(0, 24)}`,
        country: c,
        year: it.date ? Number(it.date.slice(0, 4)) : year,
        event: it.title,
        impact: "",
        sources: it.link ? [it.link] : [],
        accept: false,
      });
    }
  }
  // Leaders: a leadership headline that names a country (the name itself needs a human or an LLM)
  const leaders: Proposal["leaders"] = [];
  for (const it of items.filter((x) => x.kinds.includes("leadership"))) {
    const c = it.countries[0];
    if (!c || leaders.some((l) => l.country === c)) continue;
    leaders.push({
      id: `l-${c}`,
      country: c,
      name: "",
      title: "",
      since: it.date.slice(0, 7),
      evidence: [it.title],
      accept: false,
    });
  }
  // Crisis patterns: every kind seen, with the templates that already cover it
  const crises: Proposal["crises"] = [];
  for (const k of KINDS) {
    const hits = items.filter((x) => x.kinds.includes(k.kind));
    if (hits.length < 2) continue;
    const coveredBy = ctx.templateIds.filter((t) => k.covers.test(t));
    const countries = [...new Set(hits.flatMap((h) => h.countries))].slice(0, 6);
    crises.push({
      id: `c-${k.kind}`,
      kind: k.kind,
      title: coveredBy.length
        ? `${k.kind}: covered (${coveredBy.slice(0, 3).join(", ")})`
        : `${k.kind}: no crisis card yet`,
      countries,
      pattern: "",
      examples: hits.slice(0, 4).map((h) => h.title),
      coveredBy,
      accept: false,
    });
  }
  // Flashpoints: pairs of countries named together in conflict headlines
  const pairs = new Map<string, TaggedItem[]>();
  for (const it of items) {
    if (!it.kinds.some((k) => CONFLICT_KINDS.has(k)) || it.countries.length < 2) continue;
    const [a, b] = it.countries.slice(0, 2).sort();
    const key = `${a}-${b}`;
    pairs.set(key, [...(pairs.get(key) ?? []), it]);
  }
  const flashpoints: Proposal["flashpoints"] = [...pairs.entries()]
    .filter(([, v]) => v.length >= 2)
    .sort((x, y) => y[1].length - x[1].length)
    .slice(0, 6)
    .map(([key, v]) => {
      const sides = key.split("-");
      const covered = ctx.flashpoints.find((f) => sides.every((s) => f.countries.includes(s)));
      return {
        id: `f-${key.toLowerCase()}`,
        title: `${ctx.names[sides[0]] ?? sides[0]} and ${ctx.names[sides[1]] ?? sides[1]}`,
        sides,
        hook: v[0].title,
        evidence: v.slice(0, 5).map((h) => h.title),
        coveredBy: covered?.id ?? null,
        accept: false,
      };
    });
  const briefing = items
    .filter((x) => x.salience >= 5)
    .slice(0, 5)
    .map((x) => x.title);
  return ProposalSchema.parse({
    date,
    generatedBy: "heuristics",
    sources,
    stats: { items: items.length, tagged: items.filter((x) => x.countries.length).length },
    history,
    leaders,
    crises,
    flashpoints,
    briefing,
  });
}

// ----------------------------------------------------------------------------
// LLM refinement (optional): better wording, impacts, leader names, new crisis ideas, drafts
// ----------------------------------------------------------------------------

const RefineSchema = z.object({
  history: z
    .array(
      z.object({ country: z.string(), year: z.number(), event: z.string(), impact: z.string() }),
    )
    .default([]),
  leaders: z
    .array(
      z.object({
        country: z.string(),
        name: z.string(),
        title: z.string(),
        since: z.string().default(""),
      }),
    )
    .default([]),
  crises: z
    .array(
      z.object({
        kind: z.string(),
        title: z.string(),
        countries: z.array(z.string()),
        pattern: z.string(),
      }),
    )
    .default([]),
  flashpoints: z
    .array(z.object({ title: z.string(), sides: z.array(z.string()).min(2), hook: z.string() }))
    .default([]),
  briefing: z.array(z.string()).default([]),
});

export async function refineWithLLM(
  p: Proposal,
  items: TaggedItem[],
  ctx: WorldContext,
  llm: LLMClient,
): Promise<Proposal> {
  const lines = items
    .filter((x) => x.countries.length)
    .slice(0, 80)
    .map(
      (x) =>
        `- [${x.date || "?"}] (${x.countries.join(",")}; ${x.kinds.join(",") || "news"}) ${x.title}`,
    )
    .join("\n");
  const ids = Object.entries(ctx.names)
    .map(([id, n]) => `${id}=${n}`)
    .join(", ");
  const r = await llm.chatWithSchema(
    [
      {
        role: "system",
        content:
          "You maintain the world data of a geopolitical strategy game. From news headlines, extract only facts the headlines support. Write in plain, neutral English with no em dashes. Use only these country codes: " +
          ids,
      },
      {
        role: "user",
        content: `Headlines (newest first):\n${lines}\n\nCurrent leaders in the game: ${JSON.stringify(ctx.leaders)}\nCrisis card ids the game already has: ${ctx.templateIds.join(", ")}\nFlashpoints the game already has: ${ctx.flashpoints.map((f) => f.title).join(", ")}\n\nReturn JSON with: history (up to 12 entries worth keeping in a country's history: country, year, event (one sentence), impact (one sentence on why it matters)); leaders (only real changes of head of government or state vs the current list); crises (up to 5 recurring decision patterns a national leader faces that the existing cards do not cover: kind, title, countries, pattern (two sentences: the dilemma and 2 or 3 options)); flashpoints (up to 3 live two-sided crises worth a playable 12-month scenario that the game does not have yet: title, sides (2+ codes), hook (two sentences)); briefing (up to 5 one-line state-of-the-world lines).`,
      },
    ],
    RefineSchema,
  );
  const known = (c: string) => !!ctx.names[c];
  const out: Proposal = { ...p, generatedBy: "heuristics + llm" };
  for (const h of r.history.filter((x) => known(x.country))) {
    const i = out.history.findIndex(
      (x) => x.country === h.country && overlap(x.event, h.event) >= 0.4,
    );
    const entry = {
      id: `h-${h.country}-${slug(h.event).slice(0, 24)}`,
      country: h.country,
      year: h.year,
      event: h.event,
      impact: h.impact,
      sources: i >= 0 ? out.history[i].sources : [],
      accept: false,
    };
    if (i >= 0) out.history[i] = entry;
    else if (!(ctx.keyEvents[h.country] ?? []).some((e) => overlap(e.event, h.event) >= 0.5))
      out.history.push(entry);
  }
  out.leaders = r.leaders
    .filter((l) => known(l.country) && l.name && l.name !== ctx.leaders[l.country])
    .map((l) => ({
      id: `l-${l.country}`,
      country: l.country,
      name: l.name,
      title: l.title,
      since: l.since,
      evidence: p.leaders.find((x) => x.country === l.country)?.evidence ?? [],
      accept: false,
    }));
  for (const c of r.crises)
    out.crises.push({
      id: `c-new-${slug(c.title)}`,
      kind: c.kind,
      title: c.title,
      countries: c.countries.filter(known),
      pattern: c.pattern,
      examples: [],
      coveredBy: [],
      accept: false,
    });
  for (const f of r.flashpoints) {
    const sides = f.sides.filter(known);
    if (sides.length < 2) continue;
    const covered = ctx.flashpoints.find((x) => sides.every((s) => x.countries.includes(s)));
    out.flashpoints.unshift({
      id: `f-${slug(f.title)}`,
      title: f.title,
      sides,
      hook: f.hook,
      evidence: [],
      coveredBy: covered?.id ?? null,
      accept: false,
    });
  }
  if (r.briefing.length) out.briefing = r.briefing;
  return ProposalSchema.parse(out);
}

/** Ask the LLM for a complete, schema-valid flashpoint file for one candidate (validated here). */
export async function draftFlashpoint(
  f: Proposal["flashpoints"][number],
  ctx: WorldContext,
  llm: LLMClient,
  example: unknown,
  date: string,
): Promise<unknown> {
  const raw = await llm.chatWithSchema(
    [
      {
        role: "system",
        content:
          "You write scenario files for a geopolitical strategy game. Output one JSON object that matches the example's structure exactly. Plain neutral English, no em dashes. Objective condition kinds: SURVIVE, NO_NUCLEAR, NO_WAR_WITH, WAR_RESULT, STAT_MIN, RELATION_MIN, SCORE_PAR, NOT_COLLAPSED, WAR_ENDED, INSURGENCY_MAX. Leave scripted empty ({}).",
      },
      {
        role: "user",
        content: `Example file:\n${JSON.stringify(example).slice(0, 6000)}\n\nWrite a new flashpoint: "${f.title}". Sides: ${f.sides.map((s) => `${s} (${ctx.names[s]})`).join(", ")}. Situation: ${f.hook} Evidence: ${f.evidence.join(" | ")}. Use scenarioId "2026", date "${date.slice(0, 7)}", turns 12, an id in kebab-case, a playable entry and an objectives entry for each side.`,
      },
    ],
    FlashpointSchema.passthrough(),
  );
  return FlashpointSchema.parse({ ...(raw as object), scripted: {} });
}

// ----------------------------------------------------------------------------
// Context from the game data, and apply
// ----------------------------------------------------------------------------

export function loadWorldContext(dataPath: string, templateIds: string[]): WorldContext {
  const loader = createDataLoader(dataPath);
  const profiles = loader.loadAllCountries();
  const scenario = loader.loadScenario("2026");
  return {
    names: Object.fromEntries(profiles.map((p) => [p.id, p.name])),
    keyEvents: Object.fromEntries(profiles.map((p) => [p.id, p.history.keyEvents])),
    leaders: Object.fromEntries(
      Object.entries(scenario.leaders).map(([id, l]) => [id, l.name ?? ""]),
    ),
    flashpoints: loader
      .loadAvailableFlashpoints()
      .map((f) => ({ id: f.id, title: f.title, countries: f.playable.map((p) => p.countryId) })),
    templateIds,
  };
}

export interface ApplyResult {
  changed: string[];
  skipped: string[];
}

/** Merge accepted items into data/ (history lines, 2026 leaders and briefing, flashpoint files). */
export function applyProposal(p: Proposal, dataPath: string, only?: Set<string>): ApplyResult {
  const take = <T extends { id: string; accept: boolean }>(x: T) =>
    only ? only.has(x.id) : x.accept;
  const res: ApplyResult = { changed: [], skipped: [] };
  const clean = (s: string) => s.replace(/—|–/g, ", ").replace(/"/g, "'").trim();

  for (const h of p.history.filter(take)) {
    const file = join(dataPath, "countries", `${h.country}.json`);
    let text: string;
    try {
      text = readFileSync(file, "utf-8");
    } catch {
      res.skipped.push(`${h.id}: no country ${h.country}`);
      continue;
    }
    const line = `      { "year": ${h.year}, "event": "${clean(h.event)}", "impact": "${clean(h.impact || "Added by the world scan; impact to be written")}" }`;
    // Append to keyEvents, keeping the hand-formatted file layout
    const m = text.match(/("keyEvents":\s*\[)([\s\S]*?)(\n\s*\])/);
    if (!m || m.index === undefined) {
      res.skipped.push(`${h.id}: keyEvents not found`);
      continue;
    }
    const body = m[2].replace(/\s+$/, "");
    const next = `${m[1]}${body}${body.trim() ? "," : ""}\n${line}${m[3]}`;
    const updated = text.slice(0, m.index) + next + text.slice(m.index + m[0].length);
    CountryProfileSchema.parse(JSON.parse(updated));
    writeFileSync(file, updated);
    res.changed.push(`countries/${h.country}.json: ${h.event}`);
  }

  const leaders = p.leaders.filter(take).filter((l) => l.name && l.title);
  const briefing = only ? p.briefing.filter((_, i) => only.has(`b-${i}`)) : [];
  if (leaders.length || briefing.length) {
    const file = join(dataPath, "scenarios", "2026.json");
    const scenario = JSON.parse(readFileSync(file, "utf-8"));
    for (const l of leaders) {
      scenario.leaders[l.country] = {
        ...(scenario.leaders[l.country] ?? {}),
        name: l.name,
        title: l.title,
        ...(l.since ? { sinceDate: l.since } : {}),
      };
      res.changed.push(`scenarios/2026.json: ${l.country} leader ${l.name}`);
    }
    if (briefing.length) {
      scenario.briefing = briefing.map(clean);
      res.changed.push("scenarios/2026.json: briefing");
    }
    writeFileSync(file, `${JSON.stringify(scenario, null, 2)}\n`);
  }

  const existing = new Set(
    readdirSync(join(dataPath, "flashpoints")).filter((f) => f.endsWith(".json")),
  );
  for (const f of p.flashpoints.filter(take)) {
    if (!f.draft) {
      res.skipped.push(`${f.id}: no draft (run the scan with --llm --draft, or author it by hand)`);
      continue;
    }
    const fp = FlashpointSchema.parse(f.draft);
    const name = `${fp.id}.json`;
    if (existing.has(name)) {
      res.skipped.push(`${f.id}: flashpoints/${name} exists`);
      continue;
    }
    writeFileSync(join(dataPath, "flashpoints", name), `${JSON.stringify(fp, null, 2)}\n`);
    res.changed.push(`flashpoints/${name}: ${fp.title}`);
  }
  for (const c of p.crises.filter(take))
    res.skipped.push(
      `${c.id}: crisis cards are code (src/core/crises.ts); see the report for the pattern`,
    );
  return res;
}

/** The human-readable report written next to the proposal. */
export function proposalMarkdown(p: Proposal, names: Record<string, string>): string {
  const n = (c: string) => names[c] ?? c;
  const out: string[] = [];
  out.push(
    `# World scan ${p.date}`,
    "",
    `Generated by ${p.generatedBy}. ${p.stats.items} items, ${p.stats.tagged} about game countries.`,
    "",
  );
  out.push(
    'Review the JSON next to this file: set `"accept": true` on what you want, then run `npm run world:apply -- <file>`.',
    "",
  );
  out.push(
    "## Sources",
    ...p.sources.map((s) => `- ${s.name}: ${s.error ? `failed (${s.error})` : `${s.items} items`}`),
    "",
  );
  out.push(
    "## History entries",
    ...(p.history.length
      ? p.history.map(
          (h) =>
            `- \`${h.id}\` ${n(h.country)} ${h.year}: ${h.event}${h.impact ? ` (${h.impact})` : ""}`,
        )
      : ["- none"]),
    "",
  );
  out.push(
    "## Leader changes",
    ...(p.leaders.length
      ? p.leaders.map(
          (l) =>
            `- \`${l.id}\` ${n(l.country)}: ${l.name || "(name to confirm)"} ${l.title} ${l.since}. Evidence: ${l.evidence.join(" | ")}`,
        )
      : ["- none"]),
    "",
  );
  out.push(
    "## Crisis patterns",
    ...(p.crises.length
      ? p.crises.map(
          (c) =>
            `- \`${c.id}\` ${c.title}${c.pattern ? `: ${c.pattern}` : ""}${c.examples.length ? ` e.g. "${c.examples[0]}"` : ""}`,
        )
      : ["- none"]),
    "",
  );
  out.push(
    "## Flashpoint candidates",
    ...(p.flashpoints.length
      ? p.flashpoints.map(
          (f) =>
            `- \`${f.id}\` ${f.title}${f.coveredBy ? ` (already playable: ${f.coveredBy})` : ""}${f.draft ? " [draft ready]" : ""}: ${f.hook}`,
        )
      : ["- none"]),
    "",
  );
  out.push(
    "## Briefing lines",
    ...(p.briefing.length ? p.briefing.map((b, i) => `- \`b-${i}\` ${b}`) : ["- none"]),
    "",
  );
  return out.join("\n").replace(/—/g, ", ");
}
