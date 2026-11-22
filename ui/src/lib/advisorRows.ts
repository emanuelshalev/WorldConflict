import { useMemo } from 'react';
import { type PendingAction, orderKey, useGameStore, usePlayerCountry } from '../store/gameStore';
import { computeSuggestions, type Suggestion } from './staff';

/** The advisor's line in glossary words, at most 120 characters. */
export function whyLine(why: string): string {
  const w = why
    .replace(/^[A-Z][a-z]+( [A-Z][a-z]+)*: /, (m) => (/^Mission: /.test(m) ? m : ''))
    .replace(/\bleadership score\b/gi, 'score')
    .replace(/~(\d)/g, 'about $1');
  return w.length > 120 ? `${w.slice(0, 117).replace(/\s+\S*$/, '')}...` : w;
}

export interface AdvisorRowData {
  key: string;
  who: string;
  label: string;
  why: string;
  action: PendingAction;
  staff: boolean;
}

/** The advisor rows: staff-queued orders first (already added), then the top suggestions. */
export function useAdvisorRows(): AdvisorRowData[] {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const advice = useGameStore((s) => s.advice);
  const actions = useGameStore((s) => s.pendingActions);
  const me = usePlayerCountry();
  const suggestions = useMemo<Suggestion[]>(() => computeSuggestions(world, view, me), [world, view, me, advice]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const rows: AdvisorRowData[] = [];
    const seen = new Set<string>();
    for (const a of actions) {
      if (a.origin !== 'staff') continue;
      const [who, ...why] = (a.why ?? 'Chief of Staff: ').split(': ');
      rows.push({ key: orderKey(a), who, label: a.label, why: why.join(': '), action: a, staff: true });
      seen.add(orderKey(a));
    }
    for (const s of suggestions) {
      if (seen.has(orderKey(s.action))) continue;
      seen.add(orderKey(s.action));
      rows.push({ key: orderKey(s.action), who: s.who, label: s.label, why: s.why, action: s.action, staff: false });
    }
    return rows;
  }, [actions, suggestions]);
}


/**
 * The heading's side note: how many are shown and how many of them are recommended (the staff
 * proposals, which the Recommended list counts as orders), so the two counts never disagree on
 * screen (QA3-S3-2: "Your advisors suggest 5" sat next to "Review 6 recommended").
 */
export function orderIdeasNote(rows: readonly Pick<AdvisorRowData, 'action'>[], shown = rows.length): string {
  const rec = rows.filter((r) => r.action.proposed).length;
  const parts: string[] = [];
  if (shown < rows.length) parts.push(`${shown} shown`);
  if (rec) parts.push(`${rec} of them recommended`);
  return parts.join(' · ');
}
