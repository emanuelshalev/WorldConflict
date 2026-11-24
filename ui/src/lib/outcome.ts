import type { OutcomeStatus, ReportFact, TurnReport } from '../store/gameStore';
import { cleanChoice, leftOpenChoice } from '../scenes/kinds';
import type { StampWord } from '../components/game/Stamp';
import { factTone } from './numbers';

/**
 * One outcome vocabulary (F-02-2): the engine gives every resolved item a status (DONE, PARTLY,
 * FAILED, REFUSED, NO_EFFECT, src/core/status.ts) and every surface shows it through these
 * helpers: debrief stamps, the result card, the Chronicle, the debrief table. Nothing here
 * guesses a status from the colour of the numbers; a cost is shown as a cost, not a failure.
 */

export const STATUS_WORD: Record<OutcomeStatus, string> = {
  DONE: 'Done',
  PARTLY: 'Partly done',
  FAILED: 'Failed',
  REFUSED: 'Refused',
  NO_EFFECT: 'No effect',
};

export const STATUS_STAMP: Record<OutcomeStatus, StampWord> = {
  DONE: 'DONE',
  PARTLY: 'PARTLY',
  FAILED: 'FAILED',
  REFUSED: 'REFUSED',
  NO_EFFECT: 'NO EFFECT',
};

/**
 * The item's status. Saves made before the engine sent one fall back to its own flags (ok and a
 * refusal code), never to the facts: an answer that applied is done.
 */
export function statusOf(item: { status?: OutcomeStatus; ok?: boolean; code?: string } | undefined): OutcomeStatus | undefined {
  if (!item) return undefined;
  if (item.status) return item.status;
  if (item.ok === undefined) return 'DONE';
  return item.ok ? 'DONE' : item.code ? 'REFUSED' : 'FAILED';
}

/** The card colour that goes with a status. */
export function verdictForStatus(s: OutcomeStatus): 'good' | 'bad' | 'mixed' | 'neutral' {
  return s === 'DONE' ? 'good' : s === 'PARTLY' ? 'mixed' : s === 'NO_EFFECT' ? 'neutral' : 'bad';
}

/**
 * The result card's big number: its word and its colour. The colour is what the move means for
 * the player (factTone): Priya's -9 on "United States' view of you" was green because a fact whose
 * rise is good was read as good whatever its sign.
 */
export function resultBig(lead: ReportFact, status: OutcomeStatus | undefined): { word: string; good: boolean } {
  return { word: status ? resultWord(status, lead) : 'This month', good: factTone(lead) !== 'bad' };
}

/**
 * The word over the result card's big number: the status, and "at a cost" when the number shown
 * went against the player (Priya's -9 on US view read "A step forward"; now "Done, at a cost").
 */
export function resultWord(status: OutcomeStatus, lead?: ReportFact): string {
  const word = STATUS_WORD[status];
  if (lead && factTone(lead) === 'bad' && (status === 'DONE' || status === 'PARTLY')) return `${word}, at a cost`;
  return word;
}

/** One row of the paper's "Your orders and answers" list. */
export interface PaperStatusItem {
  label: string;
  s: OutcomeStatus;
  /** The engine's reason, printed beside a refusal or a failure (F-04-9), else only on hover. */
  why?: string;
  shownWhy?: string;
}

/**
 * What became of each of your orders and answers, in the engine's words (F-02-2). A REFUSED or
 * FAILED row prints its reason in the row itself (F-04-9: "REFUSED Court United Kingdom" with the
 * reason only in a hover title told the player nothing).
 */
export function paperStatusItems(report: Pick<TurnReport, 'decisions' | 'orders'>, max = 6): PaperStatusItem[] {
  const items: PaperStatusItem[] = [
    ...report.decisions
      .filter((d) => d.attended !== false)
      .map((d) => ({ label: `${leftOpenChoice(d.choice) ? 'Left open: ' : ''}${cleanChoice(d.choice)}`, s: statusOf(d) as OutcomeStatus, why: d.reason })),
    ...report.orders.map((o) => ({ label: o.label, s: statusOf(o) as OutcomeStatus, why: o.reason ?? (statusOf(o) === 'REFUSED' || statusOf(o) === 'FAILED' ? o.detail : undefined) })),
  ].filter((x) => x.s);
  return items.slice(0, max).map((x) => ({
    ...x,
    shownWhy: (x.s === 'REFUSED' || x.s === 'FAILED') && x.why ? x.why.replace(/\.\s*$/, '') : undefined,
  }));
}
