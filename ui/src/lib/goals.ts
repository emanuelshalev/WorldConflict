import { create } from 'zustand';
import type { ConditionStatus, ObjectiveCondition, ObjectiveState } from '../store/gameStore';
import { withArticle } from './format';

/**
 * Goal line helpers (design-month.md 3.3): an objective's state, its metric in words, now and
 * need, this month's step, and the step highlight shared by the cards and the advisors.
 */

/** Which objective the player asked to see highlighted (the step tap), for 2.4 s. */
export const useGoalHighlight = create<{ index: number | null; nonce: number; point: (i: number) => void }>((set) => ({
  index: null,
  nonce: 0,
  point: (i) => {
    const nonce = Date.now();
    set({ index: i, nonce });
    window.setTimeout(() => {
      if (useGoalHighlight.getState().nonce === nonce) set({ index: null });
    }, 2400);
  },
}));

export const STATE_WORD: Record<ObjectiveState, string> = { on_track: 'On track', close: 'Close', off_track: 'Off track', failed: 'Failed' };

/** A condition's state, also for older payloads without one. */
/**
 * The goal line's summary, shared by the desk and the Mission sheet: "3 of 4 on track · month 2
 * of 12", or the month alone when the session has no primary goals (a Term), never "0 of 0"
 * (QA3R-2e).
 */
export function missionSummary(status: ConditionStatus[], turn: number, maxTurns: number): string {
  const primary = status.filter((c) => !c.bonus);
  const onTrack = primary.filter((c) => stateOf(c) === 'on_track').length;
  const month = Math.min(turn + 1, maxTurns);
  return primary.length ? `${onTrack} of ${primary.length} on track · month ${month} of ${maxTurns}` : `Month ${month} of ${maxTurns}`;
}

/**
 * The state band's mission words (design-layout section 5): "3 of 5 goals on track", or null when
 * the session has no primary goals (a Term), never "0 of 0" (QA3R-2e). Same count as missionSummary.
 */
export function goalsLine(status: ConditionStatus[]): string | null {
  const primary = status.filter((c) => !c.bonus);
  if (!primary.length) return null;
  return `${primary.filter((c) => stateOf(c) === 'on_track').length} of ${primary.length} goals on track`;
}

export function stateOf(c: ConditionStatus): ObjectiveState {
  return c.state ?? (c.failed ? 'failed' : c.met ? 'on_track' : 'off_track');
}

/** The metric a condition counts, in words: "stability", "front", "score", "US relations". */
/** What metricWord needs from the world to name a relation goal's direction. */
export interface GoalWorld {
  objective?: { primary: ObjectiveCondition[]; bonus?: ObjectiveCondition[] } | null;
  countries: Array<{ id: string; name: string }>;
}

/**
 * A relation goal is judged on YOUR view of the country (objectives.ts RELATION_MIN reads
 * me.relations[target]); the result card's country facts are THEIR view of you. Both numbers
 * are right, so the goal's number names its direction (F-04-3): "your view of the United States".
 */
export function viewWords(c: ConditionStatus, world?: GoalWorld | null): string | null {
  if (c.unit !== 'view' || !world?.objective) return null;
  const conds = [...world.objective.primary, ...(world.objective.bonus ?? [])];
  const cond = conds.find((x) => x.kind === 'RELATION_MIN' && x.label === c.label);
  const name = cond?.targetId ? world.countries.find((x) => x.id === cond.targetId)?.name : undefined;
  return name ? `your view of ${withArticle(name)}` : null;
}

export function metricWord(c: ConditionStatus, world?: GoalWorld | null): string {
  const view = viewWords(c, world);
  if (view) return view;
  const inner = /\(([^)]+)\)/.exec(c.label)?.[1] ?? '';
  if (c.unit === '%') {
    const stat = /approval|stability|legitimacy/i.exec(inner || c.label)?.[0];
    return stat ? stat.toLowerCase() : (c.short ?? 'it');
  }
  if (c.unit === 'front') return 'front';
  if (c.unit === 'score') return 'score';
  if (c.unit === 'view') {
    const who = inner.replace(/[\d+%-]+.*$/, '').trim();
    // "US relations 70+" names the country; a bare "relations 61+" leaves it to the label
    return who && who.toLowerCase() !== 'relations' ? who : `${c.short ?? 'their view of you'}:`;
  }
  return c.short ?? c.label;
}

const fmt = (v: number, unit?: string) => `${Math.round(v)}${unit === '%' ? '%' : ''}`;

/** "stability 62%, needs 78%", or null when the condition has no number. */
export function nowNeed(c: ConditionStatus, world?: GoalWorld | null): string | null {
  if (c.now === undefined || c.need === undefined) return null;
  return `${metricWord(c, world)} ${fmt(c.now, c.unit)}, needs ${fmt(c.need, c.unit)}`;
}

/** This month's step: the engine's pick, else the off-track objective with the largest gap. */
export function stepObjective(status: ConditionStatus[]): number {
  const marked = status.findIndex((c) => c.step && !c.bonus);
  if (marked >= 0) return marked;
  let best = -1;
  let gap = -1;
  status.forEach((c, i) => {
    if (c.bonus || stateOf(c) === 'on_track' || stateOf(c) === 'failed' || c.now === undefined || c.need === undefined) return;
    const g = Math.abs(c.need - c.now) / Math.max(1, Math.abs(c.need));
    if (g > gap) {
      gap = g;
      best = i;
    }
  });
  return best;
}

// ---------------------------------------------------------------------------
// The one goal in one sentence (F-02-1)

/** What a mission sentence needs from the world (a subset, so tests can pass plain objects). */
export interface MissionSentenceInput {
  objective: { title: string; primary: Array<{ label: string; short?: string }> } | null;
  maxTurns: number;
}

export interface MissionSentence {
  /** "You win if all five hold at the end of month 12: " */
  lead: string;
  /** Each primary goal in plain words, with its objectiveStatus index (primary goals come first). */
  goals: Array<{ text: string; index: number }>;
  /** The whole sentence as text. */
  text: string;
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** First words that are not names, so they read lower case inside the sentence. */
const COMMON_FIRST = /^(The|A|An|No|Voters|Your|Keep|Stay|Hold|End|Win|Score|Stability|Legitimacy|Approval|Make|Mend|Front|Never|Peace|Survive|Our|At|Get|Stop|Protect|Defend|Avoid|Reach|Bring)\b/;

/** A goal name inside a sentence: "voters stay on side", but "Taipei comes to the table". */
export function goalInSentence(name: string): string {
  return COMMON_FIRST.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name;
}

/** One goal in plain words: the short label, plus the number it is judged on when the label has one. */
export function goalPhrase(c: { label: string; short?: string }): string {
  const cut = (c.short ?? c.label.split(/[(:]/)[0]).trim() || c.label;
  const base = cut.replace(/\s+(at the review|at the end|by the end)$/i, '');
  // A negative floor reads as words, never a raw "-90+" (QA3R-7a): "relations kept above -90"
  const inner = /\(([^)]*\d[^)]*)\)/
    .exec(c.label)?.[1]
    ?.replace(/\s*→\s*/, ' to ')
    .replace(/(\w+)\s+(-\d+(?:\.\d+)?)\+/g, '$1 kept above $2');
  const text = inner && !base.includes(inner) ? `${base} (${inner})` : base;
  return COMMON_FIRST.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/**
 * The one goal the player is judged on, as one plain sentence above month 1's crisis (F-02-1:
 * Noah failed on "Israel stays on side" and never knew it was the thing). Every primary goal must
 * hold at the end, so the sentence names them all, in the goal line's order.
 */
/** The punctuation that follows goal i of n in the sentence ("," / "" before "and" / "."). */
export function goalPunct(i: number, n: number): { after: string; join: string } {
  if (i === n - 1) return { after: '.', join: '' };
  if (i === n - 2) return { after: '', join: ' and ' };
  return { after: ',', join: ' ' };
}

export function missionSentence(w: MissionSentenceInput): MissionSentence {
  const end = w.maxTurns;
  const primary = w.objective?.primary ?? [];
  if (!w.objective) {
    const text = `There is no set mission: stay in power for ${end} months and build the strongest country you can.`;
    return { lead: text, goals: [], text };
  }
  if (primary.length === 0) {
    const text = /election/i.test(w.objective.title)
      ? `You win if you are still in office after the election in month ${end}.`
      : `You win if you are still in office at the end of month ${end}.`;
    return { lead: text, goals: [], text };
  }
  const review = primary.some((c) => /at the review/i.test(c.label));
  const when = review ? `at the review in month ${end}` : `at the end of month ${end}`;
  const goals = primary.map((c, index) => ({ text: goalPhrase(c), index }));
  const lead = goals.length === 1 ? `You win if this holds ${when}: ` : `You win if all ${NUMBER_WORDS[goals.length] ?? goals.length} hold ${when}: `;
  const list = goals.length === 1 ? goals[0].text : `${goals.slice(0, -1).map((g) => g.text).join(', ')} and ${goals[goals.length - 1].text}`;
  return { lead, goals, text: `${lead}${list}.` };
}

