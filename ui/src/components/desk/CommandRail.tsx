import { useState } from 'react';
import { useExecute } from '../../lib/useExecute';
import { IconAlertTriangle, IconChecks, IconChevronDown, IconChevronUp, IconLayoutDashboard, IconPlus, IconSend, IconX } from '@tabler/icons-react';
import { MEETING_SLOTS, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { pcCost } from '../../lib/actions';
import { budgetShare, budgetStatus, money } from '../../lib/budget';
import { approveAll, crisisSelection, pcIncome, pendingApprovals, planSummary } from '../../lib/month';
import { TERMS, term } from '../../lib/glossary';
import { ActionIcon } from '../../scenes/icons';
import { ContextMap } from '../../scenes/ContextMap';
import { SceneFrame } from '../../scenes/SceneFrame';
import { sceneForAction, sceneForDecision } from '../../scenes/kinds';
import { CapitalSeals } from '../game/CapitalSeal';
import { CardCost } from '../game/CardShell';
import { Stamp } from '../game/Stamp';
import { CoachBubble } from './Coach';
import { sound } from '../../lib/sound';
import { pointTo } from '../../lib/pointer';
import { AdvisorList } from './AdvisorList';
import { scoreLine, useScoreWhy } from '../../lib/scoreWhy';
import '../../styles/desk-stage.css';

/**
 * The command table (design-feel.md 5.1 rule 6, design-month.md 3.7): the subject map, the seal
 * bank in words, the two other budgets, "This month you will" as plan slots with stamps and seals,
 * what works against the mission, an honest Approve count and the Execute button. On phones the
 * same content is a sheet over a fixed command bar.
 */

/** Political capital as seals, with the sentence that explains them (one meter, HUD and rail). */
export function SealBank({ size = 38, sentence = true }: { size?: number; sentence?: boolean }) {
  const world = useGameStore((s) => s.worldState);
  const actions = useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  const b = budgetStatus();
  if (!world || !b) return null;
  const total = Math.max(0, b.pc.bank + b.pc.crisis + b.pc.meetings);
  const left = Math.max(0, b.pc.left);
  const held = Math.min(total, b.pc.orders);
  const on = actions.filter((a) => pcCost(a.type) > 0);
  const income = pcIncome(world);
  const room = Math.max(0, Math.min(income, b.pc.cap - left));
  return (
    <div className={`seal-bank${b.pc.left < 0 ? ' over' : ''}`} data-point="capital">
      <div className="bank-head">
        <span className="bank-label">{TERMS.capital.name}</span>
        <span className="bank-count num">
          <b>{b.pc.left}</b> of {total} left
        </span>
      </div>
      <CapitalSeals left={left} held={held} short={b.pc.left < 0 ? -b.pc.left : 0} size={size} />
      {sentence && (
        <p className="bank-say">
          {on.length > 0 && (
            <>
              <b>
                {held} {held === 1 ? 'seal is' : 'seals are'} on {on.map((a) => a.label).join(' and ')}.
              </b>{' '}
              Remove {on.length === 1 ? 'it' : 'one'} to get {held === 1 ? 'it' : 'them'} back.{' '}
            </>
          )}
          {left >= b.pc.cap ? `Political capital is full: you can't hold more than ◆ ${b.pc.cap}.` : `Next month you get ${room} more (up to ${b.pc.cap}).`}
        </p>
      )}
    </div>
  );
}

/** Orders this month, Meetings, Defense budget: in full words (glossary). */
export function Budgets() {
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  const b = budgetStatus();
  if (!b) return null;
  const def = Math.round(b.defense.share * 100);
  return (
    <div className="budget-tiles" aria-label="This month's budgets">
      <div className={`budget-tile${b.orders.used > b.orders.max ? ' over' : ''}`} data-point="orders">
        <span>{TERMS.orders.name}</span>
        <b className="num">{term('{n} of {m}', b.orders.used, b.orders.max)}</b>
      </div>
      <div className={`budget-tile${b.inPerson.used > b.inPerson.max ? ' over' : ''}`} data-point="meetings">
        <span>{TERMS.meetings.name}</span>
        <b className="num">{term('{n} of {m}', b.inPerson.used, b.inPerson.max)}</b>
      </div>
      <div className={`budget-tile wide${def > 100 ? ' over' : ''}`} data-point="defense">
        <span>{TERMS.defense.name}</span>
        <b className="num">{def > 0 ? `${def}% used · ${b.defense.users.join(', ')}` : `untouched (${money(b.defense.budgetM)} a month)`}</b>
      </div>
    </div>
  );
}

/** "This month you will": the plan as slot cards with stamps and seals, empty slots as outlines. */
export function Tray() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const remove = useGameStore((s) => s.removePendingAction);
  const setFocus = useGameStore((s) => s.setFocus);
  const setDeskView = useGameStore((s) => s.setDeskView);
  const focus = useGameStore((s) => s.focus);
  if (!world) return null;
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId);
  const b = budgetStatus();
  // The order the engine would refuse first when over capital: the last one that costs political capital
  const refused = b && b.pc.left < 0 ? actions.map((a, i) => ({ a, i })).filter((x) => pcCost(x.a.type) > 0).pop()?.i : undefined;
  const decided = decisions.filter((d) => reviewed[d.id]).length + actions.length + attending.length;
  const open = (f: Parameters<typeof setFocus>[0]) => {
    setFocus(f);
    if (f.kind !== 'crisis') setDeskView('full');
  };
  return (
    <div className="tray" aria-label="This month you will" data-point="tray">
      <div className="tray-head">
        <span>This month you will</span>
        <span className="num">{decided} decided</span>
      </div>
      {decisions.map((d) => {
        const sel = crisisSelection(d, choices, reviewed);
        const o = sel.option;
        return (
          <button key={d.id} type="button" className={`slot-card crisis${focus.kind === 'crisis' && focus.id === d.id ? ' on' : ''}`} onClick={() => open({ kind: 'crisis', id: d.id })} aria-label={`${d.title}: ${sel.text}`}>
            <span className="slot-thumb" aria-hidden>
              {o && <SceneFrame kind={sceneForDecision({ templateId: d.templateId, title: d.title, label: o.label })} home={world.playerCountryId} other={d.affectedCountries.find((x) => x !== world.playerCountryId)} size="thumb" />}
            </span>
            <span className="slot-text">
              <b>{o?.label ?? 'No answer yet'}</b>
              <small>{d.title}</small>
            </span>
            {sel.kind === 'yours' || sel.kind === 'approved' ? (
              <Stamp word={sel.kind === 'yours' ? 'YOUR PICK' : 'APPROVED'} size="sm" animate={false} tilt={-4} />
            ) : (
              <span className="sel-mini">Cabinet pick</span>
            )}
          </button>
        );
      })}
      {actions.map((a, i) => (
        <div key={`${a.label}-${i}`} className={`slot-card order${i === refused ? ' refused' : ''}${focus.kind === 'order' && focus.id === String(i) ? ' on' : ''}`}>
          <button type="button" className="slot-main" onClick={() => open({ kind: 'order', id: String(i) })} title={a.why ?? a.preview?.summary}>
            <span className="slot-thumb" aria-hidden>
              <SceneFrame kind={sceneForAction(a.type)} home={world.playerCountryId} other={a.targetCountryId} size="thumb" />
            </span>
            <span className="slot-text">
              <b>
                <ActionIcon type={a.type} size={13} /> {a.label}
              </b>
              <small>
                {i === refused ? <span className="warn">Will be refused: not enough political capital</span> : a.origin === 'staff' ? `Order · staff: ${a.why?.split(':')[0] ?? 'suggested'}` : 'Order · yours'}
                {a.preview?.successChance != null && ` · ${Math.round(a.preview.successChance <= 1 ? a.preview.successChance * 100 : a.preview.successChance)}% chance`}
                {budgetShare(a.type) ? ` · ${Math.round(budgetShare(a.type) * 100)}% defense` : ''}
              </small>
            </span>
            {a.preview?.missionWarning && <IconAlertTriangle size={14} className="warn" aria-label={a.preview.missionWarning} />}
            <CardCost seals={pcCost(a.type)} size={18} />
          </button>
          <button type="button" className="slot-x" onClick={() => remove(i)} aria-label={`Remove ${a.label}`}>
            <IconX size={15} />
          </button>
        </div>
      ))}
      {actions.length < 6 && (
        <button type="button" className="slot-card empty" onClick={() => open({ kind: 'catalog' })}>
          <IconPlus size={15} aria-hidden /> Empty order slot ({6 - actions.length} more this month)
        </button>
      )}
      {agenda.length > 0 && (
        <button type="button" className="slot-card empty meet" onClick={() => open({ kind: 'meeting', id: (attending[0] ?? agenda[0]).id })}>
          {attending.length
            ? `You attend ${attending.map((m) => `${m.withCountry ? `${flag(m.withCountry)} ` : ''}${m.speaker.split(' ').slice(-1)[0]}`).join(', ')}${agenda.length - attending.length ? `; a deputy takes ${agenda.length - attending.length}` : ''}`
            : `${agenda.length} meeting${agenda.length > 1 ? 's' : ''}: a deputy goes unless you answer`}
          {attending.length < MEETING_SLOTS && attending.length > 0 ? ` (${MEETING_SLOTS - attending.length} free)` : ''}
        </button>
      )}
    </div>
  );
}

/** One line of plan, and a red line with a pointer for picks that work against the mission. */
export function Readiness() {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  const setFocus = useGameStore((s) => s.setFocus);
  const setDeskView = useGameStore((s) => s.setDeskView);
  const plan = planSummary();
  const a = plan.against[0];
  return (
    <div className="readiness" aria-label="Before you execute">
      <p className="plan-line">{plan.text}.</p>
      {a && (
        <p className="plan-against" role="note">
          <IconAlertTriangle size={14} aria-hidden /> {plan.against.length} {a.kind === 'crisis' ? 'cabinet pick' : 'staff order'}
          {plan.against.length > 1 ? 's work' : ' works'} against your mission: <b>{a.label}</b>.{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              if (a.kind === 'crisis') setFocus({ kind: 'crisis', id: a.id });
              else {
                setDeskView('full');
                setFocus({ kind: 'order', id: a.id });
              }
              document.getElementById('desk-stage')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Review
          </button>
        </p>
      )}
    </div>
  );
}

export function ApproveButton({ compact = false }: { compact?: boolean }) {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  const { crises, meetings, deputies } = pendingApprovals();
  const n = crises.length + meetings.length + (deputies.length && !meetings.length && !crises.length ? deputies.length : 0);
  if (n === 0) return null;
  const against = planSummary().against.filter((x) => x.kind === 'crisis').length;
  const label = compact ? term(TERMS.approveAll.compact, n) : term(TERMS.approveAll.name, n);
  return (
    <button type="button" className="wc-btn approve" onClick={approveAll} title="Confirm the cabinet's crisis picks and attend the suggested meetings (Shift+A)">
      <IconChecks size={16} aria-hidden /> {label}
      {against > 0 && <span className="approve-against"> ({against} against your mission)</span>}
      {!compact && <kbd>Shift+A</kbd>}
    </button>
  );
}

/** The meter an Execute-blocked reason is about. */
const reasonTarget = (r: string) => (/capital/i.test(r) ? 'capital' : /defense/i.test(r) ? 'defense' : /meeting/i.test(r) ? 'meetings' : 'orders');

/** Execute with its sound (design-feel 6.2): the paper slide and drum, then the turn stamp. */
function runWithSound(ex: ReturnType<typeof useExecute>) {
  if (ex.disabled) return;
  sound.play('execute');
  ex.run();
}

export function ExecuteButton({ compact = false }: { compact?: boolean }) {
  const ex = useExecute();
  const world = useGameStore((s) => s.worldState);
  const left = world ? world.maxTurns - world.turn : 0;
  return (
    <button type="button" className="wc-btn primary big execute-btn" disabled={ex.disabled} onClick={() => runWithSound(ex)} title={ex.reason ?? 'Execute month (Ctrl+Enter)'} data-point="execute">
      <span className="ex-main">
        <IconSend size={18} aria-hidden /> {ex.loading ? 'Resolving...' : 'Execute month'}
      </span>
      {!compact && <span className="ex-sub num">{left} month{left === 1 ? '' : 's'} left</span>}
    </button>
  );
}

/** The month so far, under the budgets from month 2: why the score moved. */
function ScoreNote() {
  const report = useGameStore((s) => s.worldState?.turnReport);
  const line = scoreLine(report?.score);
  if (!line) return null;
  return (
    <button type="button" className="score-note" onClick={() => useScoreWhy.getState().show(true)}>
      {line} <span className="link">Why?</span>
    </button>
  );
}

/** The right column of the desk. */
export function CommandRail({ catalogTarget }: { catalogTarget: string }) {
  const world = useGameStore((s) => s.worldState);
  const ex = useExecute();
  const b = budgetStatus();
  if (!world || !b) return null;
  return (
    <aside className="rail" aria-label="Command rail">
      <ContextMap catalogTarget={catalogTarget} />
      <div className="rail-body">
        <SealBank />
        <Budgets />
        <Tray />
        <Readiness />
        <ScoreNote />
      </div>
      <div className="rail-foot">
        <ApproveButton />
        {ex.reason && (
          <button type="button" className="hint over" role="alert" onClick={() => pointTo(reasonTarget(ex.reason ?? ''))}>
            <IconAlertTriangle size={13} aria-hidden /> {ex.reason}
          </button>
        )}
        <div className="ex-wrap">
          <CoachBubble step="execute" place="above" />
          <ExecuteButton />
        </div>
      </div>
    </aside>
  );
}

/** Phones: a fixed command bar (seals, "This month: n decided", Execute) over a plan sheet. */
export function CommandBar({ catalogTarget }: { catalogTarget: string }) {
  const world = useGameStore((s) => s.worldState);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const choices = useGameStore((s) => s.decisionChoices);
  const ex = useExecute();
  const [sheet, setSheet] = useState(false);
  const b = budgetStatus();
  if (!world || !b) return null;
  const attending = (world.agenda ?? []).filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const decided = Object.keys(reviewed).filter((id) => world.pendingDecisions.some((d) => d.id === id)).length + actions.length + attending;
  return (
    <>
      {sheet && <div className="bar-backdrop" onClick={() => setSheet(false)} aria-hidden />}
      <aside className={`cmd-bar${sheet ? ' sheet-open' : ''}`} aria-label="This month">
        {sheet && (
          <div className="bar-sheet">
            <ContextMap catalogTarget={catalogTarget} />
            <SealBank />
            <Budgets />
            <Tray />
            <Readiness />
            <ApproveButton />
          </div>
        )}
        {ex.reason && (
          <div className="hint over bar-over" role="alert">
            <IconAlertTriangle size={13} aria-hidden /> {ex.reason}
          </div>
        )}
        <div className="bar-row">
          <button type="button" className="bar-plan" onClick={() => setSheet((v) => !v)} aria-expanded={sheet} data-point="tray">
            <CapitalSeals left={Math.max(0, b.pc.left)} held={Math.min(b.pc.orders, Math.max(0, b.pc.bank + b.pc.crisis + b.pc.meetings))} size={22} />
            <span className="num">
              {Math.max(0, b.pc.left)} left · {decided} decided {sheet ? <IconChevronDown size={14} aria-hidden /> : <IconChevronUp size={14} aria-hidden />}
            </span>
          </button>
          <div className="ex-wrap">
            <CoachBubble step="execute" place="above" />
            <ExecuteButton compact />
          </div>
        </div>
      </aside>
    </>
  );
}

/** Map mode keeps the month in sight: seals, budgets, the advisors' top picks, back to the desk, Execute. */
export function CommandStrip() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const reviewed = useGameStore((s) => s.reviewed);
  const setDeskMode = useGameStore((s) => s.setDeskMode);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  const ex = useExecute();
  const b = budgetStatus();
  if (!world || !b) return null;
  const cabinet = decisions.filter((d) => !reviewed[d.id]).length;
  return (
    <div className="cmd-strip">
      <div className="strip-chips">
        <span className={`chip-b seals${b.pc.left < 0 ? ' over' : ''}`} data-point="capital">
          <CapitalSeals left={Math.max(0, b.pc.left)} held={Math.min(b.pc.orders, Math.max(0, b.pc.bank + b.pc.crisis + b.pc.meetings))} size={18} text={term(TERMS.capital.compact, b.pc.left)} />
        </span>
        <span className="num chip-b" data-point="orders">{term(TERMS.orders.compact, b.orders.used)}</span>
        <span className="num chip-b" data-point="meetings">{term(TERMS.meetings.compact, b.inPerson.used)}</span>
        {b.defense.share > 0 && <span className="num chip-b" data-point="defense">{term(TERMS.defense.compact, Math.round(b.defense.share * 100))}</span>}
        {cabinet > 0 && <span className="strip-note">{cabinet} crisis on the cabinet pick</span>}
      </div>
      <AdvisorList compact max={2} />
      <div className="strip-act">
        <button type="button" className="wc-btn" onClick={() => setDeskMode('desk')} title="Back to the desk (M)">
          <IconLayoutDashboard size={16} aria-hidden /> Desk
        </button>
        <ApproveButton compact />
        {ex.reason && (
          <span className="strip-over">
            <IconAlertTriangle size={13} aria-hidden /> {ex.reason}
          </span>
        )}
        <button type="button" className="wc-btn primary" disabled={ex.disabled} onClick={() => runWithSound(ex)} title={ex.reason ?? 'Execute month (Ctrl+Enter)'}>
          <IconSend size={16} aria-hidden /> {ex.loading ? 'Resolving...' : 'Execute month'}
        </button>
      </div>
    </div>
  );
}
