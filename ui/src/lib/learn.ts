/**
 * Local learn store (design-learn.md §8, decision D-53). What the player has met, opened and
 * learned in the codex, their familiarity level and explanation settings. Lives only in this
 * browser's localStorage (`worldconflict.learn.v1`): no network request ever carries it, and
 * every read and write is wrapped so the game works without storage.
 *
 * The functions are pure (state in, new state out); `loadLearn` / `saveLearn` do the I/O.
 */
import type { LearnLevel } from './codexMatch';

export const LEARN_KEY = 'worldconflict.learn.v1';
/** After opening an entry, it stays marked (faint) for this many more screens. */
export const FADE_AFTER_SCREENS = 3;
const RECENT_LAYERS = 5;

export interface LearnEntry {
  /** Screens on which the entry was shown (marked or listed). */
  seen: number;
  /** Times the player opened its explainer. */
  opened: number;
  /** Screens seen since the first open (drives fading). */
  seenSinceOpen?: number;
  /** Where and when (game date) it was first met: the codex "NEW" tag and "first met in". */
  firstMet?: { title: string; date: string };
  /** "Stop marking" (or faded out): epoch ms. */
  learnedAt?: number;
}

export interface LearnPrefs {
  /** Open the situation briefing on a flashpoint's first crisis. Opt-in only (F-02-1): null or false is off at every level. */
  autoBrief: boolean | null;
  liveLines: boolean;
  fadeKnown: boolean;
  largeText: boolean;
}

export interface LearnState {
  v: 1;
  level: LearnLevel;
  /** The familiarity question was answered (or skipped with "Take office"). */
  asked: boolean;
  prefs: LearnPrefs;
  entries: Record<string, LearnEntry>;
  /** One-time nudges shown: key → epoch ms. */
  nudges: Record<string, number>;
  /** Layer the player ended on for their last opens (1 short, 2 More). */
  recentLayers: Array<1 | 2>;
  /** Page sessions with the game open (for nudges). */
  sessions: number;
  /** Explainer opens across all sessions. */
  totalOpens: number;
}

export function defaultLearn(): LearnState {
  return {
    v: 1,
    level: 'some',
    asked: false,
    prefs: { autoBrief: null, liveLines: true, fadeKnown: true, largeText: false },
    entries: {},
    nudges: {},
    recentLayers: [],
    sessions: 0,
    totalOpens: 0,
  };
}

const LEVELS: readonly LearnLevel[] = ['guide', 'some', 'know'];

/** Coerce anything read from storage into a valid state (unknown or broken fields fall back). */
export function sanitizeLearn(raw: unknown): LearnState {
  const d = defaultLearn();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<LearnState>;
  const prefs = (r.prefs ?? {}) as Partial<LearnPrefs>;
  const bool = (v: unknown, dflt: boolean) => (typeof v === 'boolean' ? v : dflt);
  const entries: Record<string, LearnEntry> = {};
  if (r.entries && typeof r.entries === 'object') {
    for (const [id, e] of Object.entries(r.entries)) {
      if (!e || typeof e !== 'object') continue;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
      const clean: LearnEntry = { seen: num(e.seen), opened: num(e.opened) };
      if (e.seenSinceOpen !== undefined) clean.seenSinceOpen = num(e.seenSinceOpen);
      if (e.firstMet && typeof e.firstMet.title === 'string' && typeof e.firstMet.date === 'string') {
        clean.firstMet = { title: e.firstMet.title, date: e.firstMet.date };
      }
      if (typeof e.learnedAt === 'number') clean.learnedAt = e.learnedAt;
      entries[id] = clean;
    }
  }
  return {
    v: 1,
    level: LEVELS.includes(r.level as LearnLevel) ? (r.level as LearnLevel) : d.level,
    asked: bool(r.asked, false),
    prefs: {
      autoBrief: typeof prefs.autoBrief === 'boolean' ? prefs.autoBrief : null,
      liveLines: bool(prefs.liveLines, d.prefs.liveLines),
      fadeKnown: bool(prefs.fadeKnown, d.prefs.fadeKnown),
      largeText: bool(prefs.largeText, d.prefs.largeText),
    },
    entries,
    nudges: r.nudges && typeof r.nudges === 'object' ? { ...r.nudges } : {},
    recentLayers: Array.isArray(r.recentLayers)
      ? r.recentLayers.filter((l): l is 1 | 2 => l === 1 || l === 2).slice(-RECENT_LAYERS)
      : [],
    sessions: typeof r.sessions === 'number' ? r.sessions : 0,
    totalOpens: typeof r.totalOpens === 'number' ? r.totalOpens : 0,
  };
}

export function loadLearn(): LearnState {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    return raw ? sanitizeLearn(JSON.parse(raw)) : defaultLearn();
  } catch {
    return defaultLearn();
  }
}

export function saveLearn(state: LearnState): void {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the game keeps working with the in-memory state
  }
}

// ---------------------------------------------------------------------------
// Settings

export function setLevel(s: LearnState, level: LearnLevel): LearnState {
  return { ...s, level, asked: true };
}

export function markAsked(s: LearnState): LearnState {
  return s.asked ? s : { ...s, asked: true };
}

export function setPref<K extends keyof LearnPrefs>(s: LearnState, key: K, value: LearnPrefs[K]): LearnState {
  return { ...s, prefs: { ...s.prefs, [key]: value } };
}

/**
 * Whether the situation briefing opens by itself. Opt-in only, at every familiarity level
 * (F-02-1: at Guide me it covered half the screen before the first choice and newcomers left).
 * Only the Settings toggle turns it on; "What is going on here?" opens it on demand.
 */
export function autoBriefOn(s: LearnState): boolean {
  return s.prefs.autoBrief === true;
}

export function noteSession(s: LearnState): LearnState {
  return { ...s, sessions: s.sessions + 1 };
}

// ---------------------------------------------------------------------------
// Meeting, opening, learning entries

/**
 * Entries rendered on one screen (marked or listed). Counts a screen once per entry, records
 * where each was first met and fades opened entries out after FADE_AFTER_SCREENS more screens
 * (when `fadeKnown` is on). Returns the new state and the ids met for the first time.
 */
export function noteSeen(
  s: LearnState,
  ids: Iterable<string>,
  where: { title: string; date: string },
  now = Date.now(),
): { state: LearnState; newlyMet: string[] } {
  const entries = { ...s.entries };
  const newlyMet: string[] = [];
  for (const id of new Set(ids)) {
    const prev = entries[id];
    const e: LearnEntry = prev ? { ...prev } : { seen: 0, opened: 0 };
    if (!prev) newlyMet.push(id);
    e.seen += 1;
    e.firstMet ??= { title: where.title, date: where.date };
    if (e.opened > 0 && e.learnedAt === undefined) {
      e.seenSinceOpen = (e.seenSinceOpen ?? 0) + 1;
      if (s.prefs.fadeKnown && e.seenSinceOpen >= FADE_AFTER_SCREENS) e.learnedAt = now;
    }
    entries[id] = e;
  }
  return { state: { ...s, entries }, newlyMet };
}

/** The player opened an explainer and ended on `layer` (2 = pressed More). */
export function noteOpened(s: LearnState, id: string, layer: 1 | 2 = 1): LearnState {
  const prev = s.entries[id] ?? { seen: 0, opened: 0 };
  return {
    ...s,
    entries: { ...s.entries, [id]: { ...prev, opened: prev.opened + 1, seenSinceOpen: prev.seenSinceOpen ?? 0 } },
    recentLayers: [...s.recentLayers, layer].slice(-RECENT_LAYERS),
    totalOpens: s.totalOpens + 1,
  };
}

/** "Stop marking": learned at once. It stays reachable by the "i" and the codex. */
export function markLearned(s: LearnState, id: string, now = Date.now()): LearnState {
  const prev = s.entries[id] ?? { seen: 0, opened: 0 };
  return { ...s, entries: { ...s.entries, [id]: { ...prev, learnedAt: now } } };
}

/** "Mark names again": forget learned and fading, keep what was met (the codex collection). */
export function resetLearned(s: LearnState): LearnState {
  const entries: Record<string, LearnEntry> = {};
  for (const [id, e] of Object.entries(s.entries)) {
    entries[id] = { seen: e.seen, opened: 0, ...(e.firstMet ? { firstMet: e.firstMet } : {}) };
  }
  return { ...s, entries, recentLayers: [] };
}

/** "Clear codex progress": forget every entry, keep level and settings. */
export function clearProgress(s: LearnState): LearnState {
  return { ...s, entries: {}, recentLayers: [], totalOpens: 0 };
}

// ---------------------------------------------------------------------------
// Queries

/** Met: shown on a screen at least once (codex collection). */
export function isMet(s: LearnState, id: string): boolean {
  return (s.entries[id]?.seen ?? 0) > 0;
}

/** Entries no longer marked in text: learned or faded out. Pass to `match({ known })`. */
export function knownIds(s: LearnState): Set<string> {
  const out = new Set<string>();
  for (const [id, e] of Object.entries(s.entries)) if (e.learnedAt !== undefined) out.add(id);
  return out;
}

/** How a mark looks: full, faint (opened, fading out) or none (learned). */
export function markStyle(s: LearnState, id: string): 'full' | 'faint' | 'none' {
  const e = s.entries[id];
  if (!e) return 'full';
  if (e.learnedAt !== undefined) return 'none';
  return e.opened > 0 && s.prefs.fadeKnown ? 'faint' : 'full';
}

/** Open explainers at layer 2 when the player pressed More on 3 of their last 5 opens. */
export function preferLayer2(s: LearnState): boolean {
  return s.recentLayers.filter((l) => l === 2).length >= 3;
}

/** Entries met so far, optionally only among `ids` (e.g. the current flashpoint's entries). */
export function metCount(s: LearnState, ids?: Iterable<string>): number {
  if (!ids) return Object.values(s.entries).filter((e) => e.seen > 0).length;
  let n = 0;
  for (const id of new Set(ids)) if (isMet(s, id)) n++;
  return n;
}

/** Met for the first time in the given game month: the codex "NEW" tag. */
export function isNew(s: LearnState, id: string, gameDate: string): boolean {
  return s.entries[id]?.firstMet?.date === gameDate;
}

// ---------------------------------------------------------------------------
// One-time nudges (design-learn.md §8.4): each at most once per device

export type NudgeKey = 'hide-marks' | 'try-some-help';

export function nudgeShown(s: LearnState, key: NudgeKey): boolean {
  return s.nudges[key] !== undefined;
}

export function noteNudge(s: LearnState, key: NudgeKey, now = Date.now()): LearnState {
  return { ...s, nudges: { ...s.nudges, [key]: now } };
}

/**
 * Which nudge, if any, is due. `opensThisSession` is counted by the caller; never during the
 * first month of a Flashpoint (`quiet`).
 */
export function dueNudge(s: LearnState, ctx: { opensThisSession: number; quiet: boolean }): NudgeKey | null {
  if (ctx.quiet) return null;
  if (s.level === 'guide' && s.totalOpens === 0 && s.sessions >= 3 && !nudgeShown(s, 'hide-marks')) {
    return 'hide-marks';
  }
  if (s.level === 'know' && ctx.opensThisSession >= 5 && !nudgeShown(s, 'try-some-help')) {
    return 'try-some-help';
  }
  return null;
}
