import type { RevealPayload, SeriesView } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { monthCells, type MonthCell, type RevealCardData, publicSite } from '../../lib/shareCard';
import { GLYPHS, glyphFor, INFAMY_HEX, TIER_HEX, tierRank } from './sealArt';
import type { StoredRun } from '../../lib/runs';
import type { SceneKind } from '../../scenes/kinds';

/** Pure helpers that turn a reveal payload into what the stages draw. */

export const STAGES = ['The count', 'The verdict', 'Achievements', 'The moments', 'How you were seen', 'The numbers', 'The truth', 'Ranking'] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The calendar month of each played month: the session date is one month past the last one played. */
export function monthDates(r: RevealPayload): Array<{ y: number; m: number }> {
  const n = r.perception.approval.values.length || r.seat.months;
  const [fy, fm] = r.seat.finalDate.split('-').map(Number);
  if (!fy || !fm) return [];
  return Array.from({ length: n }, (_, i) => {
    const back = n - i; // months before finalDate
    const idx = fy * 12 + (fm - 1) - back;
    return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
  });
}

export function monthLetters(r: RevealPayload): string[] {
  const d = monthDates(r);
  if (!d.length) return r.perception.approval.months.map(String);
  return d.map((x) => MONTHS[x.m - 1][0]);
}

export function spanLabel(r: RevealPayload): string {
  const d = monthDates(r);
  if (!d.length) return `${r.seat.months} months`;
  const a = d[0];
  const b = d[d.length - 1];
  return `${MONTHS_LONG[a.m - 1]} ${a.y} to ${MONTHS_LONG[b.m - 1]} ${b.y}`;
}

export function lastMonthLabel(r: RevealPayload, short = false): string {
  const d = monthDates(r);
  const b = d[d.length - 1];
  if (!b) return '';
  return short ? `${MONTHS[b.m - 1].toUpperCase()} ${b.y}` : `${MONTHS_LONG[b.m - 1]} ${b.y}`;
}

export function seriesById(r: RevealPayload, id: SeriesView['id']): SeriesView | undefined {
  return r.numbers.series.find((s) => s.id === id);
}

export function cellsFor(r: RevealPayload): MonthCell[] {
  const ap = r.perception.approval.values;
  const st = seriesById(r, 'stability')?.values ?? ap;
  return monthCells(
    ap.map((a, i) => ({ approval: a, stability: st[i] ?? a })),
    !r.verdict.victory && r.verdict.reason !== 'TERM_COMPLETED',
  );
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const numberWord = (n: number) => WORDS[n] ?? String(n);

/** The count's lower third: "Twelve months, 3 crises decided, 36 orders given." */
export function countLine(r: RevealPayload): string {
  const n = r.perception.approval.values.length || r.seat.months;
  const c = r.numbers.counts;
  return `${numberWord(n)} month${n === 1 ? '' : 's'}, ${c.crises} crisis decision${c.crises === 1 ? '' : 's'}, ${c.orders} order${c.orders === 1 ? '' : 's'}.`;
}

/** The moments headline: the war's end if there was one, else the best moment. */
export function momentsHeadline(r: RevealPayload): string {
  const end = [...r.moments.well, ...(r.moments.best ? [r.moments.best] : [])].find((m) => m.kind === 'WAR_END');
  if (end) return `The war ended in month ${end.month} of ${r.moments.months}.`;
  if (r.moments.best) return `${r.moments.best.title}, month ${r.moments.best.month}.`;
  if (r.moments.worst) return `${r.moments.worst.title}, month ${r.moments.worst.month}.`;
  return `${numberWord(r.moments.months)} months on the record.`;
}

/** How you were seen: a short serif headline from the approval curve. */
export function seenHeadline(r: RevealPayload): string {
  const a = r.perception.approval;
  if (!a.values.length) return 'How they saw you.';
  const lowIdx = a.values.indexOf(a.min);
  const d = monthDates(r);
  const when = (i: number) => (d[i] ? MONTHS_LONG[d[i].m - 1] : `month ${i + 1}`);
  if (a.end - a.start >= 8 && lowIdx > 0 && a.min < a.start) return `Doubted in ${when(lowIdx)}, thanked by ${when(a.values.length - 1)}.`;
  if (a.end - a.start >= 8) return `The country came round: ${a.start}% to ${a.end}%.`;
  if (a.start - a.end >= 8) return `The country cooled on you: ${a.start}% to ${a.end}%.`;
  return `A steady hand, ${a.start}% to ${a.end}%.`;
}

export function signed(n: number, digits = 0): string {
  const v = digits ? n.toFixed(digits) : String(Math.round(n));
  return n > 0 ? `+${v}` : v;
}

export function fmtValue(s: SeriesView, v: number): string {
  if (s.id === 'realGrowth') return v.toFixed(1);
  return String(Math.round(v));
}

export function seriesColor(id: SeriesView['id']): string {
  return { approval: '#f2a93b', realGrowth: '#56c596', stability: '#4fb3d9', tension: '#e5383b', score: '#c4ccd8', gdp: '#56c596' }[id];
}

export function arrowLabel(month: number, dates: Array<{ y: number; m: number }>): string {
  const d = dates[month - 1];
  return d ? `${MONTHS[d.m - 1]} ${d.y}` : `month ${month}`;
}

/** The three rarest earned seals, good ones first (the share card). */
export function rarestSeals(r: RevealPayload) {
  const good = r.achievements.earned.filter((a) => !a.infamy);
  return [...good]
    .sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || (a.rate ?? 1) - (b.rate ?? 1))
    .slice(0, 3);
}

/** Benchmark runs on the seat's ladder (every staff policy), 0 without benchmarks. */
export function ladderRuns(r: RevealPayload): number {
  const p = r.ranking.benchmarks;
  return p ? Object.values(p).reduce((n, b) => n + (b?.n ?? 0), 0) : 0;
}

/**
 * The ranking said kindly (F-02-1, Olivia: "Better than 9% of simulated competent leaders" right
 * after Mission Complete read as rude). First run on a seat: a ladder to climb. Later runs: your
 * place among your own runs. The percentile is never the first line.
 */
export function kindRank(r: RevealPayload, history: StoredRun[]): string {
  const others = history.filter((h) => h.saveId !== r.run.saveId);
  if (others.length === 0) {
    const n = ladderRuns(r);
    return n > 0 ? `Your first run: a ladder of ${n} runs to climb` : 'Your first run on this seat';
  }
  const all = others.length + 1;
  const pos = 1 + others.filter((h) => h.presidencyScore > r.presidency.total).length;
  return pos === 1 ? `Your best of ${all} runs on this seat` : `#${pos} of your ${all} runs on this seat`;
}

/** The percentile in words, as a secondary line ("better than 34%", never a flipped "top 66%"). */
export function percentileLine(r: RevealPayload): string | null {
  return r.ranking.percentile === null ? null : `Better than ${r.ranking.percentile}% of simulated leaders`;
}

/**
 * The ranking stage headline: the outcome and achievements lead, the ladder follows. A win is
 * never headlined by a percentile.
 */
export function rankHeadline(r: RevealPayload, history: StoredRun[]): string {
  const earned = r.achievements.earned.filter((a) => !a.infamy).length;
  const seals = earned > 0 ? `, ${earned} achievement${earned === 1 ? '' : 's'}` : '';
  const label = r.verdict.label === r.verdict.label.toUpperCase() ? r.verdict.label.charAt(0) + r.verdict.label.slice(1).toLowerCase() : r.verdict.label;
  return `${label}${seals}. ${kindRank(r, history)}.`;
}

/** The share card's rank lines: the kind line first; the percentile only when it flatters. */
export function rankLines(r: RevealPayload, history: StoredRun[]): string[] {
  const out = [kindRank(r, history)];
  const p = percentileLine(r);
  if (p && (r.ranking.percentile ?? 0) >= 50) out.push(p);
  return out;
}

export function cardData(r: RevealPayload, history: StoredRun[], daily: string | null): RevealCardData {
  const end = r.moments.well.find((m) => m.kind === 'WAR_END');
  return {
    title: r.seat.flashpointId ? r.seat.flashpointId.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : r.seat.title,
    country: r.seat.countryName,
    flagEmoji: flag(r.seat.countryId),
    verdict: r.verdict.label,
    victory: r.verdict.victory,
    dateLabel: lastMonthLabel(r, true),
    // A failed run says what it missed, so the card is honest and still worth posting
    subtitle: [r.verdict.classification, !r.verdict.victory && r.verdict.missedLine ? r.verdict.missedLine.replace(/\.$/, '') : end ? `war ended in month ${end.month}` : r.seat.title].filter(Boolean).join(' · '),
    bestMoment: r.moments.best ? `${r.moments.best.title}, month ${r.moments.best.month}` : '',
    grade: r.verdict.grade,
    stars: r.verdict.stars,
    score: r.presidency.total,
    rankLines: rankLines(r, history),
    seals: rarestSeals(r).map((a) => ({ color: a.infamy ? INFAMY_HEX : TIER_HEX[a.tier], glyph: GLYPHS[glyphFor(a)] })),
    cells: cellsFor(r),
    conditions: r.verdict.conditions,
    seedCode: r.replay.seedCode,
    daily,
    site: publicSite(),
  };
}

/** The closing shot: how this story ends on the evening news. */
export const END_SCENE: Record<string, SceneKind> = {
  DEPOSED_COUP: 'war_room',
  LOST_ELECTION: 'election',
  ASSASSINATED: 'disaster',
  IMPEACHED: 'parliament',
  REVOLUTION: 'streets',
  NUCLEAR_HOLOCAUST: 'nuclear',
  COUNTRY_COLLAPSED: 'streets',
  TERM_COMPLETED: 'election',
  OBJECTIVE_FAILED: 'cabinet',
};

/**
 * The closing scene for a session (QA3R-3g): the end of a flashpoint is not an election ("377
 * seats, majority won" closed a China flashpoint), and a one-party state never closes on a ballot.
 * Every mount point (the reveal's count stage and the end screen) asks here.
 */
export function endScene(
  reason: string | null | undefined,
  seat: { flashpointId?: string | null; regime?: string | null },
  lost: boolean,
): SceneKind {
  const scene = END_SCENE[reason ?? ''] ?? (lost ? 'streets' : 'address');
  if (scene !== 'election') return scene;
  const ballot = !seat.flashpointId && (seat.regime ?? 'DEMOCRACY') === 'DEMOCRACY';
  if (ballot) return scene;
  return reason === 'LOST_ELECTION' ? 'parliament' : lost ? 'cabinet' : 'address';
}
