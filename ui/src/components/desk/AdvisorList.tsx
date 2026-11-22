import { useEffect, useState } from 'react';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { capitalLeft, committedActions, orderKey, queueOrder, useGameStore } from '../../store/gameStore';
import { type AdvisorRowData as Row, orderIdeasNote, useAdvisorRows, whyLine } from '../../lib/advisorRows';
import { pcCost } from '../../lib/actions';
import { MAX_ORDERS } from '../../lib/budget';
import { missionTag } from '../../lib/month';
import { CardCost } from '../game/CardShell';
import { pointTo } from '../../lib/pointer';
import { sound } from '../../lib/sound';
import { useGoalHighlight } from '../../lib/goals';
import { bigMove } from '../../lib/ease';
import { orderFor } from '../../lib/orders';
import { OrderCard } from '../orders/OrderCard';
import { TERMS } from '../../lib/glossary';
import { CoachBubble } from './Coach';
import '../../styles/month.css';

/**
 * "Orders to consider" (design-month.md 3.5; it said "Your advisors suggest" until QA3-S3-2): the top suggestions with why this and why now.
 * Each suggestion is the shared OrderCard (row), so the desk, the full desk's suggestions and the
 * map's command strip show the same card with the same states and words as the map menu and the
 * catalog (F-02-5: Sam saw "Added" here and "Add to this month" on the map). Staff proposals show
 * what they change and Approve (F-02-4). One component for the desk and the map's command strip.
 */

/** The advisor row: avatar and why line around the shared OrderCard (F-02-5). */
export function AdvisorCardRow({ r, compact }: { r: Row; compact?: boolean }) {
  const impact = useGameStore((s) => s.orderImpact[r.label]);
  const status = useGameStore((s) => s.objectiveStatus);
  const hl = useGoalHighlight((s) => s.index);
  const def = orderFor(r.action);
  if (!def) return <AdvisorRow r={r} compact={compact} />;
  const mt = missionTag(impact, status);
  const pointed = hl !== null && !!impact?.links?.some((l) => l.index === hl && l.effect === 'helps');
  const why = whyLine(r.why);
  return (
    <div className={`adv-row adv-card${pointed ? ' is-pointed' : ''}${compact ? ' compact' : ''}`} data-advice={r.label}>
      <span className="adv-avatar" aria-hidden title={r.who}>
        {INITIALS[r.who] ?? r.who.slice(0, 2).toUpperCase()}
      </span>
      <div className="adv-body">
        <OrderCard
          def={def}
          targetId={r.action.targetCountryId}
          variant="row"
          staff={r.who}
          hoverPreview={false}
          blurb={
            compact ? undefined : (
              <>
                <span className="adv-who">{r.who}:</span> {why}
                {mt && <span className={`adv-tag tag-${mt.tone}`}> {mt.text}</span>}
              </>
            )
          }
          extra={{ origin: 'player', why: `${r.who}: ${r.why}`, ...(r.action.value !== undefined ? { value: r.action.value } : {}) }}
        />
      </div>
    </div>
  );
}

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
  const blocked = queued ? null : committedActions(actions).length >= MAX_ORDERS ? `All ${MAX_ORDERS} orders this month are used.` : cost > left ? `Needs ◆ ${cost}, you have ◆ ${Math.max(0, left)}.` : null;
  const mt = missionTag(impact, status);
  const pointed = hl !== null && !!impact?.links?.some((l) => l.index === hl && l.effect === 'helps');
  const add = async () => {
    if (blocked) {
      sound.play('refuse');
      pointTo(cost > left ? 'capital' : 'orders', `${r.label} needs ◆ ${cost}`);
      return;
    }
    if (busy) return;
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

/**
 * "Big move" (F-01-6): with 3 or more seals unspent, one clearly labelled suggestion that spends
 * them on the mission in one press (lib/ease bigMove over the advisors' suggestions and the
 * engine's mission impact).
 */
export function BigMove({ rows }: { rows: Row[] }) {
  const actions = useGameStore((s) => s.pendingActions);
  const impacts = useGameStore((s) => s.orderImpact);
  useGameStore((s) => s.decisionChoices);
  const [busy, setBusy] = useState(false);
  const left = capitalLeft();
  const move = bigMove(
    rows.map((r) => {
      const imp = impacts[r.label];
      return {
        key: r.key,
        label: r.label,
        cost: pcCost(r.action.type),
        // The engine's mission impact; without it, the advisor's own "Mission: ..." line
        helps: imp ? imp.helps.length + imp.bonusHelps.length * 0.5 : /\bMission:/.test(r.why) ? 1 : 0,
        risky: !!imp && imp.hurts.length + imp.breaks.length > 0,
        queued: actions.some((a) => orderKey(a) === orderKey(r.action)),
      };
    }),
    left,
    MAX_ORDERS - committedActions(actions).length,
  );
  if (!move) return null;
  const go = async () => {
    if (busy) return;
    setBusy(true);
    for (const p of move.picks) {
      const r = rows.find((x) => x.key === p.key);
      if (r) await queueOrder({ ...r.action, origin: 'player', why: `${r.who}: ${r.why}` });
    }
    setBusy(false);
    sound.play('stamp');
  };
  return (
    <div className="big-move" data-big-move="" role="group" aria-label="Big move">
      <span className="big-move-tag">Big move</span>
      <p className="big-move-text">
        You have <b>◆ {left}</b> unspent. Put <b>◆ {move.seals}</b> into your mission: <b>{move.picks.map((p) => p.label).join(' + ')}</b>.
      </p>
      <button type="button" className="wc-btn primary small big-move-go" onClick={() => void go()} disabled={busy}>
        {busy ? 'Adding...' : `Do it (◆ ${move.seals})`}
      </button>
    </div>
  );
}

export function AdvisorList({ compact = false, max = 3 }: { compact?: boolean; max?: number }) {
  const rows = useAdvisorRows();
  const [all, setAll] = useState(false);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, max);
  return (
    <section className={`advisors${compact ? ' compact' : ''}`} aria-label={TERMS.orderIdeas.name} data-point="advisors">
      {!compact && (
        <h3 className="block-head">
          <span>
            {TERMS.orderIdeas.name} <span className="num">({rows.length})</span>
          </span>
          <span className="num">{orderIdeasNote(rows, rows.length > max && !all ? max : rows.length)}</span>
        </h3>
      )}
      {!compact && <CoachBubble step="advisors" place="above" />}
      {!compact && <BigMove rows={rows} />}
      <div className="adv-list">
        {shown.map((r) => (
          <AdvisorCardRow key={r.key} r={r} compact={compact} />
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
