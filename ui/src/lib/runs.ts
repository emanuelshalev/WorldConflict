import type { Difficulty, RunRecord } from '../store/gameStore';

/**
 * Local run history (design-reveal.md 2.7): every finished run on this browser, so the reveal can
 * show your record on a seat, the ghost of your best run, Compare runs and "Your record" on the
 * title screen. Stored in localStorage['worldconflict.runs'] (capped at 200, oldest dropped) and
 * mirrored to POST /api/runs when the backend is up. Every storage call is guarded: with storage
 * blocked the reveal still renders, just without history.
 */

export interface StoredRun extends RunRecord {
  date: string; // ISO
}

const KEY = 'worldconflict.runs';
const CAP = 200;
const CAREER_FACTOR: Record<Difficulty, number> = { ANALYST: 0.85, STATESMAN: 1, STRONGMAN: 1.15 };

export function loadRuns(): StoredRun[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw.filter((r) => r && typeof r === 'object' && 'seatKey' in r) as StoredRun[]) : [];
  } catch {
    return [];
  }
}

function saveRuns(runs: StoredRun[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(runs.slice(-CAP)));
  } catch {
    /* storage full or blocked: history is a convenience */
  }
}

/** Add (or replace, by saveId) a finished run; returns the stored run. */
export function recordRun(run: RunRecord, date = new Date().toISOString()): StoredRun {
  const runs = loadRuns();
  const existing = run.saveId ? runs.find((r) => r.saveId === run.saveId) : undefined;
  const stored: StoredRun = { ...run, date: existing?.date ?? run.date ?? date };
  const rest = runs.filter((r) => !(run.saveId && r.saveId === run.saveId));
  saveRuns([...rest, stored]);
  return stored;
}

/** Runs on one seat (and difficulty when given), newest first. */
export function runsForSeat(seatKey: string, difficulty?: Difficulty, runs = loadRuns()): StoredRun[] {
  return runs
    .filter((r) => r.seatKey === seatKey && (!difficulty || r.difficulty === difficulty))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Your best earlier run on this seat (not this save). */
export function previousBest(seatKey: string, difficulty: Difficulty, excludeSaveId?: string, runs = loadRuns()): StoredRun | null {
  const prior = runsForSeat(seatKey, difficulty, runs).filter((r) => !excludeSaveId || r.saveId !== excludeSaveId);
  return prior.reduce<StoredRun | null>((best, r) => (!best || r.presidencyScore > best.presidencyScore ? r : best), null);
}

/** Rank of a score among your runs on the seat: "#1 of your 3 runs". */
export function rankAmong(score: number, runs: StoredRun[]): { position: number; of: number } {
  return { position: 1 + runs.filter((r) => r.presidencyScore > score).length, of: Math.max(1, runs.length) };
}

/** Merge runs the server knows (GET /api/runs) into local history, so a new browser sees them. */
export function mergeRemoteRuns(remote: Array<Record<string, unknown>>): void {
  if (!remote.length) return;
  const runs = loadRuns();
  const have = new Set(runs.map((r) => r.saveId).filter(Boolean));
  let changed = false;
  for (const r of remote) {
    const saveId = typeof r.saveId === 'string' ? r.saveId : undefined;
    if (!saveId || have.has(saveId)) continue;
    const detail = (r.detail ?? {}) as Record<string, unknown>;
    const parts = Array.isArray(r.parts) ? (r.parts as number[]) : [0, 0, 0, 0];
    const seatKey = String(r.seatKey ?? '');
    const [fp, ...rest] = seatKey.split(':');
    runs.push({
      seatKey,
      seed: Number(r.seed ?? 0),
      seedCode: String(detail.seedCode ?? ''),
      difficulty: (r.difficulty as Difficulty) ?? 'STATESMAN',
      mode: (detail.mode as RunRecord['mode']) ?? (rest.length === 1 ? 'FLASHPOINT' : 'TERM'),
      scenarioId: rest.length === 2 ? fp : '2026',
      flashpointId: rest.length === 1 ? fp : null,
      countryId: String(detail.countryId ?? rest[rest.length - 1] ?? ''),
      presidencyScore: Number(r.score ?? 0),
      parts: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0],
      grade: String(r.grade ?? '-'),
      stars: Number(r.stars ?? 0),
      verdict: String(r.verdict ?? ''),
      victory: Boolean(detail.victory),
      achievements: Array.isArray(r.achievements) ? (r.achievements as string[]) : [],
      series: (detail.series as RunRecord['series']) ?? { approval: [], score: [] },
      choices: (detail.choices as RunRecord['choices']) ?? [],
      aiTier: String(detail.aiTier ?? 'ALGORITHMIC'),
      saveId,
      date: String(r.createdAt ?? new Date(0).toISOString()),
    });
    have.add(saveId);
    changed = true;
  }
  if (changed) saveRuns(runs.sort((a, b) => a.date.localeCompare(b.date)));
}

export interface ChoiceSplit {
  turn: number;
  month: number;
  title: string;
  a: string;
  b: string;
}

/** The first month two runs' crisis choices differ (null when they never split). */
export function firstSplit(a: Pick<RunRecord, 'choices'>, b: Pick<RunRecord, 'choices'>): ChoiceSplit | null {
  const byTurn = (r: Pick<RunRecord, 'choices'>) => {
    const m = new Map<number, { title: string; choice: string }>();
    for (const c of r.choices ?? []) if (!m.has(c.turn)) m.set(c.turn, c);
    return m;
  };
  const ma = byTurn(a);
  const mb = byTurn(b);
  const turns = [...new Set([...ma.keys(), ...mb.keys()])].sort((x, y) => x - y);
  for (const t of turns) {
    const ca = ma.get(t);
    const cb = mb.get(t);
    if (ca?.choice !== cb?.choice || ca?.title !== cb?.title) {
      return { turn: t, month: t + 1, title: ca?.title ?? cb?.title ?? '', a: ca?.choice ?? 'no crisis', b: cb?.choice ?? 'no crisis' };
    }
  }
  return null;
}

/** "hormuz-convoy:USA" is "Hormuz Convoy"; "2026:TERM:USA" is "2026 Term". */
export function seatName(seatKey: string): string {
  const parts = seatKey.split(':');
  if (parts.length === 2) return parts[0].split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  return `${parts[0]} ${parts[1] ? parts[1][0] + parts[1].slice(1).toLowerCase() : ''}`.trim();
}

export function seatCountry(seatKey: string): string {
  const parts = seatKey.split(':');
  return parts[parts.length - 1] ?? '';
}

export interface CareerSummary {
  runs: number;
  seats: number;
  stars: number;
  wins: number;
  /** Difficulty-weighted sum of your best run on each seat (x0.85 Analyst, x1 Statesman, x1.15 Strongman). */
  career: number;
  best: StoredRun | null;
  recent: StoredRun[];
  bestBySeat: StoredRun[];
}

export function careerSummary(runs = loadRuns()): CareerSummary {
  const bestBySeat = new Map<string, StoredRun>();
  for (const r of runs) {
    const k = `${r.seatKey}|${r.difficulty}`;
    const cur = bestBySeat.get(k);
    if (!cur || r.presidencyScore > cur.presidencyScore) bestBySeat.set(k, r);
  }
  const bests = [...bestBySeat.values()].sort((a, b) => b.presidencyScore - a.presidencyScore);
  return {
    runs: runs.length,
    seats: new Set(runs.map((r) => r.seatKey)).size,
    stars: runs.reduce((s, r) => s + (r.stars || 0), 0),
    wins: runs.filter((r) => r.victory).length,
    career: Math.round(bests.reduce((s, r) => s + r.presidencyScore * (CAREER_FACTOR[r.difficulty] ?? 1), 0)),
    best: bests[0] ?? null,
    recent: [...runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    bestBySeat: bests,
  };
}

/** Short local date for history rows: "19 Nov", or "Today". */
export function shortDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === now.toDateString()) return 'Today';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** A seed code typed by a player, normalised ("hc-usa-3px " is "HC-USA-3PX"); null when malformed. */
export function normaliseSeedCode(code: string): string | null {
  const c = code.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9]+-[A-Z]{3}-[0-9A-Z]+$/.test(c) ? c : null;
}

/** Mirrors src/core/reveal.ts seedCodeOf: "HC-USA-1A2B3" for a flashpoint, "T2026-USA-1A2B3" for a Term. */
export function seedCodeFor(s: { flashpointId?: string | null; scenarioId?: string; mode?: string; playerCountry: string; seed: number }): string {
  const words = (s.flashpointId ?? '').split('-').filter(Boolean);
  const head = s.flashpointId
    ? (words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? 'XX').slice(0, 2)).toUpperCase()
    : `${(s.mode ?? 'TERM')[0]}${s.scenarioId ?? ''}`;
  return `${head}-${s.playerCountry}-${(s.seed >>> 0).toString(36).toUpperCase()}`;
}

/** Replay same opening for a finished run: same seat, seed and difficulty (Your record). */
export function replayRequestOf(r: Pick<RunRecord, 'mode' | 'countryId' | 'flashpointId' | 'scenarioId' | 'difficulty' | 'seed'>) {
  return {
    mode: r.mode,
    playerCountryId: r.countryId,
    flashpointId: r.flashpointId ?? undefined,
    scenarioId: r.flashpointId ? undefined : r.scenarioId,
    difficulty: r.difficulty,
    seed: r.seed,
  };
}

/** The months a save can branch from: 0 (the opening desk) to the current month (the last played one when over). */
export function branchMonths(s: { turn: number; gameOver?: boolean }): number[] {
  const last = s.gameOver ? s.turn - 1 : s.turn;
  return Array.from({ length: Math.max(0, last + 1) }, (_, i) => i);
}

/** "YYYY-MM" moved by `delta` months. */
function shiftMonth(date: string, delta: number): string {
  const [y, m] = date.split('-').map(Number);
  const i = y * 12 + (m - 1) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

function shortMonth(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The month a save row names, counted like the HUD and the reveal (QA3-S3-4: the row counted months
 * done, "month 0 of 48" for a new game): the month on the desk, or the last month played when over.
 */
export function saveMonth(s: { turn: number; maxTurns?: number; gameOver?: boolean }): number {
  if (s.gameOver) return Math.max(1, s.turn);
  return s.maxTurns ? Math.min(s.turn + 1, s.maxTurns) : s.turn + 1;
}

/**
 * A branch picker option in HUD months (QA3-S3-4): branching at `m` months done opens the desk of
 * month m + 1 before its choices ("Month 10, Aug 2027: before your choices"). `date` is the save's
 * current world date (YYYY-MM), so the option can name the calendar month too.
 */
export function branchLabel(m: number, s: { turn: number; date?: string }): string {
  const when = s.date ? `, ${shortMonth(shiftMonth(s.date, m - s.turn))}` : '';
  return `Month ${m + 1}${when}: before your choices${m === 0 ? ' (the opening)' : ''}`;
}
