import { useEffect, useState } from 'react';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { capitalLeft, orderKey, queueOrder, useGameStore } from '../../store/gameStore';
import { type AdvisorRowData as Row, useAdvisorRows, whyLine } from '../../lib/advisorRows';
import { pcCost } from '../../lib/actions';
import { MAX_ORDERS } from '../../lib/budget';
import { missionTag } from '../../lib/month';
import { CardCost } from '../game/CardShell';
import { useGoalHighlight } from '../../lib/goals';
import { CoachBubble } from './Coach';
import '../../styles/month.css';

/**
 * "Your advisors suggest" (design-month.md 3.5): the top suggestions with why this and why now,
 * one-tap Add (Added, Undo for 5 s), the reason on the button when it cannot be added, and the
 * staff's own orders shown as already added, with the same why line. One component for the desk
 * and the map's command strip, so both modes see the same advice.
 */

const INITIALS: Record<string, string> = {
  'Foreign Minister': 'FM',
  'Defense Minister': 'DM',
  'Defence Minister': 'DM',
  'Finance Minister': 'FN',
  'Intelligence Chief': 'IC',
  'Interior Minister': 'IM',
  'Chief of Staff': 'CS',
};

function AdvisorRow({ r, compact }: { r: Row; compact?: boolean }) {
  const actions = useGameStore((s) => s.pendingActions);
  const remove = useGameStore((s) => s.removePendingAction);
  const impact = useGameStore((s) => s.orderImpact[r.label]);
  const status = useGameStore((s) => s.objectiveStatus);
  const hl = useGoalHighlight((s) => s.index);
  const [justAdded, setJustAdded] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(0), 5000);
    return () => window.clearTimeout(t);
  }, [justAdded]);
  const at = actions.findIndex((a) => orderKey(a) === orderKey(r.action));
  const queued = at >= 0;
  const cost = pcCost(r.action.type);
  const left = capitalLeft();
  const blocked = queued ? null : actions.length >= MAX_ORDERS ? `All ${MAX_ORDERS} orders this month are used.` : cost > left ? `Needs ◆ ${cost}, you have ◆ ${Math.max(0, left)}.` : null;
  const mt = missionTag(impact, status);
  const pointed = hl !== null && !!impact?.links?.some((l) => l.index === hl && l.effect === 'helps');
  const add = async () => {
    if (blocked || busy) return;
    setBusy(true);
    const ok = await queueOrder({ ...r.action, origin: 'player', why: `${r.who}: ${r.why}` });
    setBusy(false);
    if (ok) setJustAdded(Date.now());
  };
  const queuedBy = queued ? actions[at].origin : undefined;
  return (
    <div className={`adv-row${queued ? ' is-added' : ''}${blocked ? ' is-blocked' : ''}${pointed ? ' is-pointed' : ''}${compact ? ' compact' : ''}`} data-advice={r.label}>
      <span className="adv-avatar" aria-hidden title={r.who}>
        {INITIALS[r.who] ?? r.who.slice(0, 2).toUpperCase()}
      </span>
      <div className="adv-body">
        {queuedBy === 'staff' && !compact && <span className="adv-kicker">Added by staff</span>}
        <b className="adv-label">{r.label}</b>
        {!compact && (
          <p className="adv-why">
            <span className="adv-who">{r.who}:</span> {whyLine(r.why)}
          </p>
        )}
        {mt && <span className={`adv-tag tag-${mt.tone}`}>{mt.text}</span>}
      </div>
      <div className="adv-act">
        <CardCost seals={cost} size={18} />
        {queued ? (
          <div className="adv-added">
            <span className="adv-added-word">
              <IconCheck size={15} aria-hidden /> Added
            </span>
            {(justAdded > 0 || queuedBy === 'staff') && (
              <button type="button" className="link" onClick={() => remove(at)} aria-label={`${queuedBy === 'staff' ? 'Remove' : 'Undo'} ${r.label}`}>
                {queuedBy === 'staff' ? 'Remove' : 'Undo'}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`wc-btn small adv-add${blocked ? ' is-off' : ''}`}
            aria-disabled={!!blocked || undefined}
            aria-label={blocked ? `${r.label}, unavailable: ${blocked}` : `Add ${r.label}`}
            onClick={() => void add()}
            data-point={blocked && /◆/.test(blocked) ? 'capital' : undefined}
          >
            {blocked ? blocked : (
              <>
                <IconPlus size={15} aria-hidden /> Add
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdvisorList({ compact = false, max = 3 }: { compact?: boolean; max?: number }) {
  const rows = useAdvisorRows();
  const [all, setAll] = useState(false);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, max);
  return (
    <section className={`advisors${compact ? ' compact' : ''}`} aria-label="Your advisors suggest" data-point="advisors">
      {!compact && (
        <h3 className="block-head">
          Your advisors suggest
          <span className="num">{rows.length > max && !all ? `${max} of ${rows.length}` : ''}</span>
        </h3>
      )}
      {!compact && <CoachBubble step="advisors" place="above" />}
      <div className="adv-list">
        {shown.map((r) => (
          <AdvisorRow key={r.key} r={r} compact={compact} />
        ))}
      </div>
      {rows.length > max && (
        <button type="button" className="link adv-more" onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show ${rows.length - max} more`}
        </button>
      )}
    </section>
  );
}
