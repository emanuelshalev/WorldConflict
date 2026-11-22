/**
 * Codex matcher (design-learn.md §6, §7.4; decision D-53). Pure, no React, no network.
 *
 * Finds codex entries (people, places, groups, terms, events) named in a piece of text, so the
 * UI can mark them (Guide me only, names the player has not met) or list them behind the
 * paragraph "i" (every level). `compile()` once per codex version, then `match()` /
 * `matchCard()` per text; results are memoized in a small LRU per compiled codex.
 *
 * Types mirror `src/core/codex.ts` (`CodexEntryView`, `SituationView`, `CodexPayload`).
 */

export type CodexKind = 'person' | 'place' | 'group' | 'term' | 'event';
export type CodexAlias = string | { text: string; caseSensitive: boolean; wholeWord: boolean };

export interface CodexMap {
  countries: string[];
  points: Array<{ name: string; lon: number; lat: number }>;
}

export interface CodexEntry {
  id: string;
  kind: CodexKind;
  name: string;
  aliases: CodexAlias[];
  avoid: string[];
  countryId?: string;
  obscurity: 1 | 2 | 3;
  short: string;
  long?: string;
  related: string[];
  map?: CodexMap;
  valid: { from: string; to?: string };
  sources: string[];
  asOf: string;
}

export interface Situation {
  id: string;
  title: string;
  oneLine: string;
  whoIsWho: Array<{ entryId: string; stance: string }>;
  whyItMatters: string;
  timeline: Array<{ date: string; text: string; source?: string }>;
  gameStarts: string;
  map?: CodexMap;
  onThisCard: string[];
  sources: string[];
  asOf: string;
}

/** `GET /api/codex` body (minus `success`). */
export interface CodexPayload {
  version: string;
  scenarioId: string;
  flashpointId: string | null;
  date: string;
  entries: CodexEntry[];
  situations: Situation[];
}

export type LearnLevel = 'guide' | 'some' | 'know';

/**
 * What each familiarity level marks in text (D-53): underlines only at Guide me, and only for
 * names the player has not met. Every level keeps the paragraph "i" and the codex.
 */
export const LEVEL_RULES: Record<LearnLevel, { marks: boolean; minObscurity: 1 | 2 | 3 }> = {
  guide: { marks: true, minObscurity: 1 },
  some: { marks: false, minObscurity: 2 },
  know: { marks: false, minObscurity: 3 },
};

/** One mark per this many words of a text block, at most (density rule 2). */
export const WORDS_PER_MARK = 12;
const LRU_SIZE = 500;

export interface CodexSpan {
  start: number;
  end: number;
  id: string;
  text: string;
}

export interface MatchResult {
  /** The text to render: the input with any `[[id|label]]` markup replaced by its label. */
  text: string;
  /** Sorted by `start`, never overlapping, offsets into `text`. */
  spans: CodexSpan[];
}

export interface MatchOptions {
  level: LearnLevel;
  /** `marks`: what to underline (level, met and density rules). `all`: every mention found. */
  mode?: 'marks' | 'all';
  /** Entries the player has met (learn.ts `knownIds`): never marked. */
  known?: ReadonlySet<string>;
  /** Bump when `known` changes; without it a call that passes `known` is not memoized. */
  knownVersion?: number;
  /** Never returned: the player's own country, the subject already on screen. */
  exclude?: readonly string[];
}

export interface CompiledCodex {
  version: string;
  entries: CodexEntry[];
  byId: Map<string, CodexEntry>;
  /** Internal: alias index, avoid lists, memo. */
  readonly _: {
    /** First word of an alias (lower case) → aliases starting with it, longest first. */
    index: Map<string, AliasRec[]>;
    /** Aliases that are not whole-word or do not start with a letter or digit. */
    loose: RegExp | null;
    looseLookup: Map<string, AliasRec>;
    avoid: Map<string, string[]>;
    memo: Map<string, MatchResult[]>;
  };
}

interface AliasRec {
  id: string;
  /** Alias with runs of whitespace collapsed to one space. */
  lit: string;
  low: string;
  cs: boolean;
}

const WORD = /[\p{L}\p{N}_]+/gu;
const WORD_CHAR = /[\p{L}\p{N}_]/u;
const SPACE = /\s/;
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aliasParts(a: CodexAlias): { text: string; caseSensitive: boolean; wholeWord: boolean } {
  return typeof a === 'string' ? { text: a, caseSensitive: false, wholeWord: true } : a;
}

/**
 * Compile a codex once per version. The first entry to claim an alias wins. Whole-word aliases
 * (nearly all) go into a first-word index, so matching costs one map lookup per word of text
 * instead of one regex alternative per alias per character.
 */
export function compile(entries: readonly CodexEntry[], version = ''): CompiledCodex {
  const index = new Map<string, AliasRec[]>();
  const looseLookup = new Map<string, AliasRec>();
  const loose: string[] = [];
  const claimed = new Set<string>();
  const avoid = new Map<string, string[]>();
  const byId = new Map<string, CodexEntry>();
  for (const e of entries) {
    byId.set(e.id, e);
    if (e.avoid?.length) avoid.set(e.id, e.avoid.map((p) => p.toLowerCase()));
    for (const a of e.aliases) {
      const p = aliasParts(a);
      const lit = p.text.trim().replace(/\s+/g, ' ');
      if (!lit) continue;
      const low = lit.toLowerCase();
      const claim = p.caseSensitive ? `s:${lit}` : `i:${low}`;
      if (claimed.has(claim)) continue;
      claimed.add(claim);
      const rec: AliasRec = { id: e.id, lit, low, cs: p.caseSensitive };
      const first = low.match(WORD)?.[0];
      if (p.wholeWord && first && low.startsWith(first)) {
        const list = index.get(first) ?? [];
        list.push(rec);
        index.set(first, list);
      } else {
        loose.push(escape(lit).replace(/ /g, '\\s+'));
        looseLookup.set(p.caseSensitive ? lit : low, rec);
      }
    }
  }
  for (const list of index.values()) list.sort((a, b) => b.lit.length - a.lit.length);
  return {
    version,
    entries: [...entries],
    byId,
    _: {
      index,
      loose: loose.length ? new RegExp(loose.sort((a, b) => b.length - a.length).join('|'), 'giu') : null,
      looseLookup,
      avoid,
      memo: new Map(),
    },
  };
}

const compiledByPayload = new WeakMap<object, CompiledCodex>();

/** The compiled matcher for a payload from the store, compiled on first use. */
export function compiledFor(payload: CodexPayload): CompiledCodex {
  let c = compiledByPayload.get(payload);
  if (!c) {
    c = compile(payload.entries, payload.version);
    compiledByPayload.set(payload, c);
  }
  return c;
}

const MARKUP = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Authored markup `[[fortress-belt|fortress belt]]` (or `[[fortress-belt]]`, shown as the entry
 * name) forces a match. Returns the plain text and the forced spans in it.
 */
export function stripMarkup(text: string, codex?: CompiledCodex): { text: string; forced: CodexSpan[] } {
  if (!text.includes('[[')) return { text, forced: [] };
  const forced: CodexSpan[] = [];
  let out = '';
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    const id = m[1];
    const label = m[2] ?? codex?.byId.get(id)?.name ?? id;
    out += text.slice(last, m.index);
    forced.push({ start: out.length, end: out.length + label.length, id, text: label });
    out += label;
    last = (m.index ?? 0) + m[0].length;
  }
  out += text.slice(last);
  return { text: out, forced };
}

/**
 * End offset of `rec` in `text` starting at `start`, or -1. One space in the alias matches any
 * run of whitespace in the text (line breaks, double spaces).
 */
function aliasEnd(text: string, low: string, start: number, rec: AliasRec): number {
  const pat = rec.cs ? rec.lit : rec.low;
  const src = rec.cs ? text : low;
  let j = start;
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] === ' ') {
      if (!SPACE.test(src[j] ?? '')) return -1;
      while (SPACE.test(src[j] ?? '')) j++;
    } else if (src[j] === pat[i]) j++;
    else return -1;
  }
  return j;
}

/** Lower case with the same length as `text`, so offsets line up (rare scripts change length). */
function lowerSameLength(text: string): string {
  const lowered = text.toLowerCase();
  if (lowered.length === text.length) return lowered;
  let out = '';
  for (const c of text) {
    const l = c.toLowerCase();
    out += l.length === c.length ? l : c;
  }
  return out;
}

/** Every alias occurrence in one plain text, overlaps resolved (earliest, then longest). */
function findAll(codex: CompiledCodex, text: string): CodexSpan[] {
  const { index, loose, looseLookup, avoid } = codex._;
  const found: CodexSpan[] = [];
  const low = lowerSameLength(text);
  for (const m of low.matchAll(WORD)) {
    const recs = index.get(m[0]);
    if (!recs) continue;
    const start = m.index ?? 0;
    for (const rec of recs) {
      const end = aliasEnd(text, low, start, rec);
      if (end < 0 || WORD_CHAR.test(text[end] ?? '')) continue;
      found.push({ start, end, id: rec.id, text: text.slice(start, end) });
      break;
    }
  }
  if (loose) {
    loose.lastIndex = 0;
    for (const m of text.matchAll(loose)) {
      const norm = m[0].replace(/\s+/g, ' ');
      const rec = looseLookup.get(norm) ?? looseLookup.get(norm.toLowerCase());
      if (rec && (!rec.cs || rec.lit === norm)) {
        found.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, id: rec.id, text: m[0] });
      }
    }
  }
  if (found.length === 0) return found;
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: CodexSpan[] = [];
  let reach = -1;
  for (const s of found) {
    if (s.start < reach) continue;
    const blockers = avoid.get(s.id);
    if (blockers?.some((p) => covered(low, p, s))) continue;
    out.push(s);
    reach = s.end;
  }
  return out;
}

/** True when an occurrence of `phrase` in `lower` contains the span. */
function covered(lower: string, phrase: string, s: CodexSpan): boolean {
  let i = lower.indexOf(phrase, Math.max(0, s.end - phrase.length));
  while (i !== -1 && i <= s.start) {
    if (i + phrase.length >= s.end) return true;
    i = lower.indexOf(phrase, i + 1);
  }
  return false;
}

/** Index of the sentence each offset falls in (". ", "! ", "? ", line breaks end a sentence). */
function sentenceOf(text: string): (pos: number) => number {
  const ends: number[] = [];
  for (const m of text.matchAll(/[.!?]+["')\]]*\s+|\n+/g)) ends.push((m.index ?? 0) + m[0].length);
  return (pos) => {
    let n = 0;
    while (n < ends.length && ends[n] <= pos) n++;
    return n;
  };
}

function wordCount(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

function memoKey(blocks: readonly string[], o: MatchOptions): string | null {
  if (o.known && o.knownVersion === undefined) return null;
  return `${o.mode ?? 'marks'}|${o.level}|${o.knownVersion ?? -1}|${(o.exclude ?? []).join(',')}\u0002${blocks.join('\u0001')}`;
}

/**
 * Match the text blocks of one card (a crisis card: situation and option descriptions; a story;
 * an outcome card). In `marks` mode the density rules apply across the card: each entry at its
 * first mention only, related entries in the same sentence not both, at most one mark per
 * 12 words of a block (highest obscurity kept).
 */
export function matchCard(codex: CompiledCodex, blocks: readonly string[], opts: MatchOptions): MatchResult[] {
  const key = memoKey(blocks, opts);
  const memo = codex._.memo;
  if (key !== null) {
    const hit = memo.get(key);
    if (hit) {
      memo.delete(key);
      memo.set(key, hit);
      return hit;
    }
  }
  const result = compute(codex, blocks, opts);
  if (key !== null) {
    memo.set(key, result);
    if (memo.size > LRU_SIZE) memo.delete(memo.keys().next().value as string);
  }
  return result;
}

/** Match one block as its own card. */
export function match(codex: CompiledCodex, text: string, opts: MatchOptions): MatchResult {
  return matchCard(codex, [text], opts)[0];
}

function compute(codex: CompiledCodex, blocks: readonly string[], opts: MatchOptions): MatchResult[] {
  const exclude = new Set(opts.exclude ?? []);
  const mode = opts.mode ?? 'marks';
  const rule = LEVEL_RULES[opts.level] ?? LEVEL_RULES.some;
  const firstSeen = new Set<string>();
  return blocks.map((raw) => {
    const { text, forced } = stripMarkup(raw, codex);
    const forcedIds = new Set(forced.map((f) => f.id));
    let spans = mergeForced(findAll(codex, text), forced).filter(
      (s) => !exclude.has(s.id) && codex.byId.has(s.id),
    );
    if (mode === 'all') return { text, spans };
    if (!rule.marks) return { text, spans: [] };
    spans = spans.filter((s) => {
      const e = codex.byId.get(s.id) as CodexEntry;
      if (opts.known?.has(s.id)) return false;
      if (e.obscurity < rule.minObscurity && !forcedIds.has(s.id)) return false;
      if (firstSeen.has(s.id)) return false;
      firstSeen.add(s.id);
      return true;
    });
    if (spans.length > 1) spans = dropRelated(codex, text, spans);
    const budget = Math.max(1, Math.floor(wordCount(text) / WORDS_PER_MARK));
    if (spans.length > budget) {
      const keep = new Set(
        [...spans]
          .sort((a, b) => obscurity(codex, b) - obscurity(codex, a) || a.start - b.start)
          .slice(0, budget),
      );
      spans = spans.filter((s) => keep.has(s));
    }
    return { text, spans };
  });
}

function obscurity(codex: CompiledCodex, s: CodexSpan): number {
  return codex.byId.get(s.id)?.obscurity ?? 0;
}

function mergeForced(found: CodexSpan[], forced: CodexSpan[]): CodexSpan[] {
  if (forced.length === 0) return found;
  const kept = found.filter((s) => !forced.some((f) => s.start < f.end && f.start < s.end));
  return [...kept, ...forced].sort((a, b) => a.start - b.start);
}

/**
 * Density rule 3: of two related entries in one sentence only one is marked. The entry whose
 * `related` lists the other covers it ("the fortress belt" covers Kramatorsk); if both or
 * neither list each other, the higher obscurity (then the earlier mention) stays.
 */
function dropRelated(codex: CompiledCodex, text: string, spans: CodexSpan[]): CodexSpan[] {
  const sentence = sentenceOf(text);
  const drop = new Set<CodexSpan>();
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i];
      const b = spans[j];
      if (drop.has(a) || drop.has(b)) continue;
      if (sentence(a.start) !== sentence(b.start)) continue;
      const ea = codex.byId.get(a.id) as CodexEntry;
      const eb = codex.byId.get(b.id) as CodexEntry;
      const aCovers = ea.related.includes(b.id);
      const bCovers = eb.related.includes(a.id);
      if (!aCovers && !bCovers) continue;
      if (aCovers && !bCovers) drop.add(b);
      else if (bCovers && !aCovers) drop.add(a);
      else drop.add(eb.obscurity > ea.obscurity ? a : b);
    }
  }
  return drop.size ? spans.filter((s) => !drop.has(s)) : spans;
}

/** Distinct entries named in the blocks, in order of first mention (the "i" list). */
export function entriesIn(
  codex: CompiledCodex,
  blocks: string | readonly string[],
  opts: Pick<MatchOptions, 'exclude'> = {},
): CodexEntry[] {
  const list = typeof blocks === 'string' ? [blocks] : blocks;
  const seen = new Set<string>();
  const out: CodexEntry[] = [];
  for (const r of matchCard(codex, list, { level: 'know', mode: 'all', exclude: opts.exclude })) {
    for (const s of r.spans) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(codex.byId.get(s.id) as CodexEntry);
    }
  }
  return out;
}

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Codex search: by name or any alias, accent-insensitive ("Erdogan" finds "Erdoğan"). Exact
 * name or alias first, then prefixes, word prefixes, substrings, and last matches in `short`.
 */
export function searchCodex(codex: CompiledCodex, query: string, limit = 20): CodexEntry[] {
  const q = fold(query);
  if (!q) return [];
  const ranked: Array<{ e: CodexEntry; rank: number }> = [];
  for (const e of codex.entries) {
    let best = Infinity;
    for (const label of [e.name, ...e.aliases.map((a) => aliasParts(a).text)]) {
      const f = fold(label);
      const r = f === q ? 0 : f.startsWith(q) ? 1 : f.includes(` ${q}`) ? 2 : f.includes(q) ? 3 : Infinity;
      if (r < best) best = r;
    }
    if (best === Infinity && fold(e.short).includes(q)) best = 4;
    if (best !== Infinity) ranked.push({ e, rank: best });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.e.name.localeCompare(b.e.name));
  return ranked.slice(0, limit).map((r) => r.e);
}
