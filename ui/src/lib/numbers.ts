import type { ReportFact } from '../store/gameStore';

/**
 * One source for every number the month shows (F-01-3). The engine reports two kinds of facts:
 * month totals (`report.deltas`, `report.tension`: start of the month to now) and the measured
 * effect of one order or answer (its own before and after, taken around that one move). Showing
 * both as "before → after" made the same figure read 74 → 71.1 on a card and 74 → 70 on the
 * tile. So month stats keep their absolute values only in month-level places (tiles, the month
 * line), and a card shows a move's share of them as a signed change ("+1.1 from this").
 * Colour always follows good or bad for the player, never the bare sign.
 */

/** Player-wide numbers whose absolute value belongs to the month, not to one move. */
const MONTH_STAT = /^(approval|stability|legitimacy|global tension|world tension|score)$/i;
/** Numbers where a rise is bad for the player when the fact does not say. */
const LOWER_IS_BETTER = /tension|violence|hunger|humanitarian/i;

export type Tone = 'good' | 'bad' | 'flat';

export function isMonthStat(label: string): boolean {
  return MONTH_STAT.test(label.trim());
}

/** A card's facts: month stats become the move's share (a signed change), the rest stay as they are. */
export function shareFacts(facts: ReportFact[] | undefined): ReportFact[] {
  return (facts ?? []).map((f) => (isMonthStat(f.label) ? { ...f, share: true } : f));
}

/** Whether a rise in this fact is good for the player. */
export function riseIsGood(f: Pick<ReportFact, 'label' | 'good'>): boolean {
  return f.good ?? !LOWER_IS_BETTER.test(f.label);
}

/** Good, bad or flat for the player: the colour of the chip, the bar and the number alike. */
export function factTone(f: Pick<ReportFact, 'label' | 'good' | 'before' | 'after'>): Tone {
  const d = f.after - f.before;
  if (Math.abs(d) < 0.05) return 'flat';
  return d > 0 === riseIsGood(f) ? 'good' : 'bad';
}

/** A value as every month surface shows it: whole numbers, except small units and troops. */
export function fmtValue(v: number, unit?: string): string {
  if (unit === 'troops' || Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  if (unit === '%/yr' || unit === '% of GDP' || unit === '$B') return (Math.round(v * 10) / 10).toString();
  return String(Math.round(v));
}

/**
 * The change between two values as the reader can check it from the shown numbers: the difference
 * of the rounded values (74 → 70 reads -4, never -3.6 or -3); a share keeps one decimal when small.
 */
export function shownDelta(before: number, after: number, unit?: string, share = false): number {
  if (share) {
    const d = after - before;
    return Math.abs(d) < 10 ? Math.round(d * 10) / 10 : Math.round(d);
  }
  return Number(fmtValue(after, unit).replace(/,/g, '')) - Number(fmtValue(before, unit).replace(/,/g, ''));
}

export function signed(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
}

/**
 * The month's approval split into your choices and everything else, in whole points that add up
 * to the shown total (74 → 70 is -4: your choices -3, everything else -1).
 */
export function splitMonth(before: number, after: number, drift: number): { total: number; yours: number; rest: number } {
  const total = Math.round(after) - Math.round(before);
  const rest = Math.round(drift) || 0;
  return { total, yours: total - rest, rest };
}
