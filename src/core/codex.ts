import { z } from "zod";

/**
 * The codex: real-world explanations of the names, places, groups, terms and events that
 * crisis and briefing text mentions (design-learn.md §7, G12). Pure: schemas and filters only,
 * no I/O (the loader reads `data/codex/**`, the route serves it). Not part of `WorldState`:
 * saves and determinism are untouched.
 *
 * Files (validated on load):
 * - `data/codex/*.json`: each file is a JSON array of `CodexEntry` (any file name; by convention
 *   people.json, places.json, groups.json, terms.json, events.json).
 * - `data/codex/situations/<id>.json`: one `Situation` per file, `id` equals the file name
 *   (a flashpoint id, or `scenario-<scenarioId>` for a scenario).
 */

const YEAR_MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CODEX_KINDS = ["person", "place", "group", "term", "event"] as const;
export const CodexKindSchema = z.enum(CODEX_KINDS);
export type CodexKind = z.infer<typeof CodexKindSchema>;

/** 1 widely known (metonyms like "Moscow"), 2 news followers, 3 specialist. */
export const ObscuritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** A plain string is case-insensitive and whole-word. */
export const CodexAliasSchema = z.union([
  z.string().min(1),
  z
    .object({
      text: z.string().min(1),
      caseSensitive: z.boolean().default(false),
      wholeWord: z.boolean().default(true),
    })
    .strict(),
]);
export type CodexAlias = z.infer<typeof CodexAliasSchema>;

export const CodexMapSchema = z
  .object({
    countries: z.array(z.string()).default([]), // Natural Earth ADM0_A3 codes to highlight
    points: z
      .array(
        z
          .object({
            name: z.string(),
            lon: z.number().min(-180).max(180),
            lat: z.number().min(-90).max(90),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
export type CodexMap = z.infer<typeof CodexMapSchema>;

/** Per-era override, keyed by scenario id ("1960", "1990", "2025", "2026"). */
export const CodexEraSchema = z
  .object({
    name: z.string().optional(),
    aliases: z.array(CodexAliasSchema).optional(), // added to the base aliases in that era
    short: z.string().max(140).optional(),
    long: z.string().max(600).optional(),
    obscurity: ObscuritySchema.optional(),
  })
  .strict();

export const CodexEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/), // "fortress-belt", "volodymyr-zelensky"
    kind: CodexKindSchema,
    name: z.string().min(1), // display name
    aliases: z.array(CodexAliasSchema).min(1), // what the matcher looks for
    avoid: z.array(z.string().min(1)).default([]), // phrases that block a match ("Georgia, USA")
    countryId: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(), // flag disc and "Place · Ukraine"
    obscurity: ObscuritySchema,
    short: z.string().min(1).max(140), // layer 1: one line
    long: z.string().max(600).optional(), // layer 2: 2 to 4 short sentences
    related: z.array(z.string()).default([]), // entry ids
    map: CodexMapSchema.optional(),
    valid: z
      .object({
        from: z.string().regex(YEAR_MONTH), // first month the entry is true
        to: z.string().regex(YEAR_MONTH).optional(), // last month (omit: still true)
      })
      .strict(),
    eras: z.record(z.string(), CodexEraSchema).default({}),
    sources: z.array(z.string().url()).default([]), // at least 1 for person and event (codexIssues)
    asOf: z.string().regex(DATE), // when the text was last checked against the world
    reviewedBy: z.string().optional(),
  })
  .strict();
export type CodexEntry = z.infer<typeof CodexEntrySchema>;

export const SituationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/), // flashpoint id or "scenario-2026"
    title: z.string().min(1),
    oneLine: z.string().min(1).max(220),
    whoIsWho: z
      .array(z.object({ entryId: z.string(), stance: z.string().max(110) }).strict())
      .min(2)
      .max(6),
    whyItMatters: z.string().max(320),
    timeline: z
      .array(
        z
          .object({
            date: z.string().min(4), // "2022-02-24", "2014-03" or "2014"
            text: z.string().max(90),
            source: z.string().url().optional(),
          })
          .strict(),
      )
      .min(3)
      .max(8),
    gameStarts: z.string().regex(YEAR_MONTH), // "2026-11": "From November 2026 on, this is your game."
    map: CodexMapSchema.optional(),
    onThisCard: z.array(z.string()).default([]), // extra entry ids worth listing even if not named
    sources: z.array(z.string().url()).min(1),
    asOf: z.string().regex(DATE),
    reviewedBy: z.string().optional(),
  })
  .strict();
export type Situation = z.infer<typeof SituationSchema>;

export const CodexFileSchema = z.array(CodexEntrySchema);

/** Everything on disk, before any era filter. */
export interface Codex {
  entries: CodexEntry[];
  situations: Situation[];
}

/** An entry as served for one game: era override applied, authoring fields dropped. */
export type CodexEntryView = Omit<CodexEntry, "eras" | "reviewedBy">;
export type SituationView = Omit<Situation, "reviewedBy">;

/** `GET /api/codex` response body. */
export interface CodexPayload {
  version: string; // content hash, also the ETag
  scenarioId: string;
  flashpointId: string | null;
  date: string; // "YYYY-MM": the game's start month, entries are valid at it
  entries: CodexEntryView[];
  situations: SituationView[];
}

/** True when the entry describes the world at `date` ("YYYY-MM"). */
export function validAt(entry: Pick<CodexEntry, "valid">, date: string): boolean {
  return entry.valid.from <= date && (!entry.valid.to || date <= entry.valid.to);
}

export function situationIdFor(scenarioId: string): string {
  return `scenario-${scenarioId}`;
}

/**
 * The codex for one game: entries valid at the start date with the scenario's era override
 * applied, and the situations for the flashpoint and the scenario (flashpoint first).
 * Returns new objects; the input is not touched.
 */
export function codexForGame(
  codex: Codex,
  opts: { scenarioId: string; date: string; flashpointId?: string | null },
): Omit<CodexPayload, "version"> {
  const entries: CodexEntryView[] = [];
  for (const entry of codex.entries) {
    if (!validAt(entry, opts.date)) continue;
    const { eras, reviewedBy: _r, ...base } = entry;
    const era = eras[opts.scenarioId];
    const view: CodexEntryView = structuredClone(base);
    if (era) {
      if (era.name) view.name = era.name;
      if (era.aliases) view.aliases = [...view.aliases, ...structuredClone(era.aliases)];
      if (era.short) view.short = era.short;
      if (era.long) view.long = era.long;
      if (era.obscurity) view.obscurity = era.obscurity;
    }
    entries.push(view);
  }
  const wanted = [opts.flashpointId, situationIdFor(opts.scenarioId)].filter(
    (id): id is string => !!id,
  );
  const situations = wanted
    .map((id) => codex.situations.find((s) => s.id === id))
    .filter((s): s is Situation => !!s)
    .map(({ reviewedBy: _r, ...s }) => structuredClone(s));
  return {
    scenarioId: opts.scenarioId,
    flashpointId: opts.flashpointId ?? null,
    date: opts.date,
    entries,
    situations,
  };
}

export function aliasText(alias: CodexAlias): string {
  return typeof alias === "string" ? alias : alias.text;
}

function overlaps(a: CodexEntry["valid"], b: CodexEntry["valid"]): boolean {
  return a.from <= (b.to ?? "9999-12") && b.from <= (a.to ?? "9999-12");
}

/**
 * Cross-file checks the schema cannot express. Empty when the codex is consistent:
 * unique ids, `related` / `whoIsWho` / `onThisCard` resolve, person and event entries have a
 * source, `valid.to` not before `valid.from`, and no alias is claimed by two entries whose
 * validity overlaps (case-insensitive unless both sides are case-sensitive).
 */
export function codexIssues(codex: Codex): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const e of codex.entries) {
    if (ids.has(e.id)) issues.push(`duplicate entry id "${e.id}"`);
    ids.add(e.id);
  }
  for (const e of codex.entries) {
    for (const r of e.related) {
      if (!ids.has(r)) issues.push(`${e.id}: related "${r}" does not exist`);
      if (r === e.id) issues.push(`${e.id}: related to itself`);
    }
    if ((e.kind === "person" || e.kind === "event") && e.sources.length === 0) {
      issues.push(`${e.id}: a ${e.kind} entry needs at least one source`);
    }
    if (e.valid.to && e.valid.to < e.valid.from) issues.push(`${e.id}: valid.to before valid.from`);
  }
  const sitIds = new Set<string>();
  for (const s of codex.situations) {
    if (sitIds.has(s.id)) issues.push(`duplicate situation id "${s.id}"`);
    sitIds.add(s.id);
    for (const w of s.whoIsWho) {
      if (!ids.has(w.entryId)) issues.push(`situation ${s.id}: whoIsWho "${w.entryId}" missing`);
    }
    for (const o of s.onThisCard) {
      if (!ids.has(o)) issues.push(`situation ${s.id}: onThisCard "${o}" missing`);
    }
  }
  // Alias collisions between entries valid at the same time
  type Claim = { entry: CodexEntry; caseSensitive: boolean; text: string };
  const claims = new Map<string, Claim[]>();
  for (const e of codex.entries) {
    const all = [...e.aliases, ...Object.values(e.eras).flatMap((era) => era.aliases ?? [])];
    for (const a of all) {
      const text = aliasText(a);
      const key = text.toLocaleLowerCase();
      const list = claims.get(key) ?? [];
      list.push({ entry: e, caseSensitive: typeof a !== "string" && a.caseSensitive, text });
      claims.set(key, list);
    }
  }
  for (const [key, list] of claims) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.entry.id === b.entry.id) continue;
        if (a.caseSensitive && b.caseSensitive && a.text !== b.text) continue;
        if (!overlaps(a.entry.valid, b.entry.valid)) continue;
        issues.push(`alias "${key}" claimed by both ${a.entry.id} and ${b.entry.id}`);
      }
    }
  }
  return issues;
}
