import { useMemo } from 'react';
import { create } from 'zustand';
import { type CodexEntry, type CodexPayload, type CompiledCodex, type LearnLevel, LEVEL_RULES, type Situation, compiledFor } from '../../lib/codexMatch';
import type { TermId } from '../../lib/glossary';
import { flag } from '../../lib/format';
import { countryName, fetchCodex, useGameStore } from '../../store/gameStore';

/**
 * Shared state of the learning aids (design-learn.md §4, decision D-53): which explainer is open
 * (one portal for the whole app), the situation briefing, the codex page in focus, and the
 * entries met this page session (for the end screen line). Nothing here leaves the browser.
 */

export type ExplainTarget =
  | { kind: 'entry'; id: string }
  /** "In this paragraph": the entries found in one paragraph (the "i"). */
  | { kind: 'list'; ids: string[]; title?: string }
  /** A game rule from the glossary (`TERMS`). */
  | { kind: 'term'; id: TermId }
  /** A leader who came to power in this game: no codex entry, built from game state. */
  | { kind: 'fictional'; countryId: string };

export interface BriefingRequest {
  situationId: string;
  /** Text of the card that asked (crisis situation and options): the "On this card" list. */
  blocks?: string[];
  /** The card's title, for "On this card". */
  cardTitle?: string;
}

interface ExplainStore {
  target: ExplainTarget | null;
  /** List the entry was opened from, so the card can go back to it. */
  from: ExplainTarget | null;
  anchor: HTMLElement | null;
  briefing: BriefingRequest | null;
  /** Codex entry to show when the codex drawer opens. */
  codexFocus: string | null;
  /** Bumped on each openCodex: the codex page remounts on its focus. */
  codexNonce: number;
  /** Entries met for the first time in this page session. */
  metThisSession: string[];
  openExplainer: (target: ExplainTarget, anchor: HTMLElement | null) => void;
  /** Open an entry from inside the card (keeps the anchor, remembers the list to go back to). */
  drill: (target: ExplainTarget) => void;
  back: () => void;
  closeExplainer: () => void;
  openBriefing: (req: BriefingRequest) => void;
  closeBriefing: () => void;
  openCodex: (id?: string | null) => void;
}

export const useExplain = create<ExplainStore>((set, get) => ({
  target: null,
  from: null,
  anchor: null,
  briefing: null,
  codexFocus: null,
  codexNonce: 0,
  metThisSession: [],
  openExplainer: (target, anchor) => set({ target, anchor, from: null }),
  drill: (target) => set((s) => ({ target, from: s.target })),
  back: () => set((s) => (s.from ? { target: s.from, from: null } : {})),
  closeExplainer: () => {
    const a = get().anchor;
    set({ target: null, from: null, anchor: null });
    // Focus goes back to the word or "i" that opened the card (design-learn.md §9)
    if (a?.isConnected) a.focus({ preventScroll: true });
  },
  openBriefing: (briefing) => set({ briefing, target: null, from: null, anchor: null }),
  closeBriefing: () => set({ briefing: null }),
  openCodex: (id = null) => {
    set((s) => ({ codexFocus: id, codexNonce: s.codexNonce + 1, target: null, from: null, anchor: null, briefing: null }));
    useGameStore.getState().setDrawer('codex');
  },
}));

/** The compiled codex for the current game (null until `/api/codex` answers). */
export function useCodex(): CompiledCodex | null {
  const payload = useGameStore((s) => s.codex);
  return useMemo(() => (payload ? compiledFor(payload) : null), [payload]);
}

/** Match options for the current level: underlines only at Guide me and not hidden with `I`. */
export function useMarkState() {
  const level = useGameStore((s) => s.learn.level);
  const hidden = useGameStore((s) => s.codexMarksHidden);
  const known = useGameStore((s) => s.codexKnown);
  const knownVersion = useGameStore((s) => s.codexKnownVersion);
  const marks = !hidden && LEVEL_RULES[level].marks;
  return { level, marks, known, knownVersion };
}

/** The situation briefing for the current game: the flashpoint's, else the scenario's. */
export function situationFor(
  situations: readonly Situation[] | undefined,
  flashpointId: string | null | undefined,
  scenarioId?: string | null,
): Situation | null {
  if (!situations?.length) return null;
  if (flashpointId) {
    const s = situations.find((x) => x.id === flashpointId);
    if (s) return s;
  }
  return situations.find((x) => x.id === `scenario-${scenarioId}`) ?? (flashpointId ? null : situations[0]) ?? null;
}

/**
 * What an era situation's `codexId` opens (B-26): the situation briefing when it names a codex
 * situation (a flashpoint or scenario briefing), else the explainer for a codex entry valid in
 * the era. Null when the loaded codex has neither.
 */
export type CodexTarget = { kind: 'briefing'; situationId: string } | { kind: 'entry'; id: string };

export function codexTargetFor(
  codexId: string | undefined,
  payload: Pick<CodexPayload, 'situations' | 'entries'> | null | undefined,
): CodexTarget | null {
  if (!codexId || !payload) return null;
  if (payload.situations.some((s) => s.id === codexId)) return { kind: 'briefing', situationId: codexId };
  if (payload.entries.some((e) => e.id === codexId)) return { kind: 'entry', id: codexId };
  return null;
}

/**
 * Opens the explainer for an era situation from the title globe's card. A briefing that belongs
 * to a flashpoint is not in the era's codex: it loads that flashpoint's codex first (one request).
 * Returns false when there is nothing to open.
 */
export async function openSituationCodex(
  situation: { codexId?: string; flashpointId?: string; title?: string },
  scenarioId: string,
  anchor: HTMLElement | null,
): Promise<boolean> {
  const { codexId, flashpointId } = situation;
  if (!codexId) return false;
  let target = codexTargetFor(codexId, useGameStore.getState().codex);
  if (!target && flashpointId === codexId) {
    await fetchCodex(scenarioId, flashpointId);
    target = codexTargetFor(codexId, useGameStore.getState().codex);
  }
  if (!target) return false;
  const ex = useExplain.getState();
  if (target.kind === 'briefing') ex.openBriefing({ situationId: target.situationId, cardTitle: situation.title });
  else ex.openExplainer({ kind: 'entry', id: target.id }, anchor);
  return true;
}

export function useSituation(): Situation | null {
  const payload = useGameStore((s) => s.codex);
  const fp = useGameStore((s) => s.worldState?.flashpointId ?? null);
  const sc = useGameStore((s) => s.worldState?.scenarioId ?? null);
  return useMemo(() => situationFor(payload?.situations, fp, sc), [payload, fp, sc]);
}

export const KIND_WORD: Record<CodexEntry['kind'], string> = {
  person: 'Person',
  place: 'Place',
  group: 'Group',
  term: 'Term',
  event: 'Event',
};

/** "VZ" from "Volodymyr Zelensky". */
export function initials(name: string): string {
  const parts = name.replace(/^the\s+/i, '').split(/[\s-]+/).filter((p) => /^\p{L}/u.test(p));
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** "Nov 2026" from "2026-11-22" or "2026-11". */
export function asOfLabel(date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (!y) return date;
  if (!m) return String(y);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Timeline dates: "Feb 2022", "24 Feb 2022", "2024". */
export function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!m) return String(y ?? date);
  const mon = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return d ? `${d} ${mon} ${y}` : `${mon} ${y}`;
}

/** Where entries are met: the game month, or the scenario date before a game starts. */
export function gameDate(): string {
  const s = useGameStore.getState();
  return s.worldState?.date ?? s.codex?.date ?? '';
}

/**
 * Note entries as met (codex collection) and remember the first-time ones for this session.
 * Calls within a quarter second count as one screen, so a card with four paragraphs moves the
 * fading counter once, not four times.
 */
let pending: Set<string> | null = null;
let pendingTitle = '';
export function noteMet(ids: string[], title: string): void {
  if (ids.length === 0) return;
  if (!pending) {
    pending = new Set();
    pendingTitle = title;
    setTimeout(flushMet, 250);
  }
  for (const id of ids) pending.add(id);
}

function flushMet(): void {
  const ids = pending ? [...pending] : [];
  pending = null;
  if (ids.length === 0) return;
  const met = useGameStore.getState().noteCodexSeen(ids, { title: pendingTitle, date: gameDate() });
  if (met.length) useExplain.setState((s) => ({ metThisSession: [...s.metThisSession, ...met] }));
}

/** Country name in or out of a game (the title screen has no world yet: the codex names it). */
export function placeName(id: string): string {
  const n = countryName(id);
  if (n && n !== id) return n;
  // No game yet (title screen): the browser's own country names, via the flag's ISO 3166 code
  const code = [...flag(id)].map((c) => String.fromCharCode((c.codePointAt(0) ?? 0) - 0x1f1e6 + 65)).join('');
  if (/^[A-Z]{2}$/.test(code)) {
    try {
      const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
      if (name) return name.replace(/^Palestinian Territories$/, 'West Bank');
    } catch {
      // Older browsers: fall through to the code
    }
  }
  return id;
}


/** Names compared without accents, case or punctuation. */
export const foldName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim();

/** Same person: full names equal, or the surname matches (Zelensky / Zelenskyy, Erdoğan / Erdogan). */
export function samePerson(a: string, b: string): boolean {
  const x = foldName(a);
  const y = foldName(b);
  if (x === y) return true;
  const lx = x.split(' ').pop() ?? '';
  const ly = y.split(' ').pop() ?? '';
  return lx.length > 3 && (lx.startsWith(ly.slice(0, -1)) || ly.startsWith(lx.slice(0, -1)));
}

/** The player's own country and own leader: never marked or listed (density rule 4). */
export function useOwnCountryIds(codex: CompiledCodex | null): string[] {
  const me = useGameStore((s) => s.worldState?.playerCountryId);
  const name = useGameStore((s) => s.worldState?.countries.find((c) => c.id === s.worldState?.playerCountryId)?.name);
  const leader = useGameStore((s) => s.worldState?.countries.find((c) => c.id === s.worldState?.playerCountryId)?.leader.name);
  return useMemo(() => {
    if (!codex || !me) return [];
    return codex.entries
      .filter((e) => e.countryId === me && ((e.kind === 'place' && e.name === name) || (e.kind === 'person' && !!leader && samePerson(e.name, leader))))
      .map((e) => e.id);
  }, [codex, me, name, leader]);
}


const GAP = 10;
const MARGIN = 12;

type Rect = { left: number; top: number; right: number; bottom: number };

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Where the popover goes (D-53): next to the word, never over the word itself, the option cards,
 * the command rail or Execute. Tries above, left, below, right and the left edge; a side that is
 * short of room gets a shorter card (it scrolls) rather than covering an action area.
 */
export function placePopover(anchor: Rect, size: { w: number; h: number }, view: { w: number; h: number }, avoid: Rect[]): { left: number; top: number; maxHeight: number } {
  const clampX = (x: number) => Math.max(MARGIN, Math.min(view.w - size.w - MARGIN, x));
  const full = Math.min(size.h, view.h - 2 * MARGIN);
  const midY = (anchor.top + anchor.bottom) / 2;
  const fit = (left: number, top: number, h: number): Rect => {
    const r = { left, top, right: left + size.w, bottom: top + h };
    // Slide sideways off an action area beside the word (the rail on the right)
    for (const a of avoid) {
      if (overlap(r, a) === 0) continue;
      if (a.left >= anchor.right - 1 && a.left - GAP - size.w >= MARGIN) {
        r.right = a.left - GAP;
        r.left = r.right - size.w;
      } else if (a.right <= anchor.left + 1 && a.right + GAP + size.w <= view.w - MARGIN) {
        r.left = a.right + GAP;
        r.right = r.left + size.w;
      }
    }
    // Trim against action areas above or below the word (the card then scrolls)
    for (const a of avoid) {
      if (overlap(r, a) === 0) continue;
      if (a.top >= anchor.bottom - 1) r.bottom = Math.min(r.bottom, a.top - GAP);
      else if (a.bottom <= anchor.top + 1) r.top = Math.max(r.top, a.bottom + GAP);
    }
    return r;
  };
  const side = (left: number): Rect => {
    const top = Math.max(MARGIN, Math.min(view.h - full - MARGIN, midY - full / 2));
    return fit(left, top, full);
  };
  const aboveH = Math.min(full, anchor.top - GAP - MARGIN);
  const candidates: Rect[] = [
    fit(clampX(anchor.left - 24), anchor.top - GAP - aboveH, aboveH),
    side(anchor.left - size.w - GAP),
    fit(clampX(anchor.left - 24), anchor.bottom + GAP, Math.min(full, view.h - MARGIN - anchor.bottom - GAP)),
    side(anchor.right + GAP),
    side(MARGIN),
  ];
  const minH = Math.min(full, 170);
  let best = candidates[candidates.length - 1];
  let bestCost = Infinity;
  for (const r of candidates) {
    const h = r.bottom - r.top;
    const off = r.left < MARGIN - 1 || r.top < MARGIN - 1 || r.right > view.w - MARGIN + 1 || r.bottom > view.h - MARGIN + 1;
    const cost = (off || h < minH ? 1e9 : 0) + avoid.reduce((n, a) => n + overlap(r, a), 0) + overlap(r, anchor) * 4 + (full - h) * 3;
    if (cost < bestCost) {
      best = r;
      bestCost = cost;
    }
  }
  return { left: Math.round(best.left), top: Math.round(best.top), maxHeight: Math.round(Math.max(minH, best.bottom - best.top)) };
}

export const LEVELS: Array<{ id: LearnLevel; name: string; blurb: string; short: string }> = [
  { id: 'guide', name: 'Guide me', short: 'Guide me', blurb: 'Underline names I may not know, and open the briefing on each new crisis.' },
  { id: 'some', name: 'Some help', short: 'Some help', blurb: 'Clean text. An "i" after each paragraph and "What is going on here?" on every crisis.' },
  { id: 'know', name: 'I know this', short: 'I know this', blurb: 'Clean text with a faint "i". The codex is there if I want it.' },
];

export const levelName = (l: LearnLevel) => LEVELS.find((x) => x.id === l)?.short ?? 'Some help';

