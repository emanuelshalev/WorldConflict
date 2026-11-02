import { useState } from 'react';
import { useExecute } from '../../lib/useExecute';
import { IconAlertTriangle, IconChecks, IconChevronDown, IconChevronUp, IconLayoutDashboard, IconMap2, IconPlus, IconSend, IconX } from '@tabler/icons-react';
import { MEETING_SLOTS, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { pcCost } from '../../lib/actions';
import { budgetShare, budgetStatus, money } from '../../lib/budget';
import { approveAll, pendingApprovals } from '../../lib/month';
import { ActionIcon } from '../../scenes/icons';
import { ContextMap } from '../../scenes/ContextMap';

function Meter({ label, used, total, text, tone, title }: { label: string; used: number; total: number; text: string; tone: 'ok' | 'warn' | 'over' | 'muted'; title?: string }) {
  return (
    <div className={`meter ${tone}`} role="meter" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={total} aria-valuetext={text} title={title}>
      <span className="meter-label">{label}</span>
      <span className="meter-ticks" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < used ? 'on' : ''} />
        ))}
      </span>
      <span className="meter-text num">{text}</span>
    </div>
  );
}

export function Budgets() {
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  const b = budgetStatus();
  if (!b) return null;
  const pcTotal = Math.max(0, b.pc.bank + b.pc.crisis + b.pc.meetings);
  const breakdown = `Bank ${b.pc.bank}${b.pc.crisis ? `, crisis ${b.pc.crisis > 0 ? '+' : ''}${b.pc.crisis}` : ''}${b.pc.meetings ? `, meetings ${b.pc.meetings}` : ''}, orders -${b.pc.orders} = ${b.pc.left} left`;
  const def = Math.round(b.defense.share * 100);
  return (
    <div className="budgets" aria-label="This month's budgets">
      <Meter label="◆ Capital" used={Math.min(6, b.pc.orders)} total={Math.min(6, Math.max(pcTotal, b.pc.orders, 1))} text={`${b.pc.left} left of ${pcTotal}`} tone={b.pc.left < 0 ? 'over' : b.pc.left === 0 ? 'warn' : 'ok'} title={breakdown} />
      {def > 0 ? (
        <div className={`meter bar ${def > 100 ? 'over' : def >= 80 ? 'warn' : 'ok'}`} role="meter" aria-label="Defense budget" aria-valuenow={def} aria-valuemin={0} aria-valuemax={100} title={`${money(b.defense.budgetM)} a month for military orders`}>
          <span className="meter-label">Defense</span>
          <span className="meter-bar" aria-hidden>
            <i style={{ width: `${Math.min(100, def)}%` }} />
          </span>
          <span className="meter-text num">{def}% · {b.defense.users[0]}{b.defense.users.length > 1 ? ` +${b.defense.users.length - 1}` : ''}</span>
        </div>
      ) : (
        <div className="meter muted">
          <span className="meter-label">Defense</span>
          <span className="meter-text">untouched ({money(b.defense.budgetM)}/mo)</span>
        </div>
      )}
      <Meter label="Orders" used={b.orders.used} total={b.orders.max} text={`${b.orders.used} of ${b.orders.max}`} tone={b.orders.used > b.orders.max ? 'over' : b.orders.used === b.orders.max ? 'warn' : 'ok'} />
      <Meter label="In person" used={b.inPerson.used} total={b.inPerson.max} text={`${b.inPerson.used} of ${b.inPerson.max} meetings`} tone={b.inPerson.used > b.inPerson.max ? 'over' : 'ok'} />
    </div>
  );
}

export function Tray() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const remove = useGameStore((s) => s.removePendingAction);
  const setFocus = useGameStore((s) => s.setFocus);
  const focus = useGameStore((s) => s.focus);
  if (!world) return null;
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId);
  const deputies = agenda.length - attending.length;
  const b = budgetStatus();
  // The order the engine would refuse first when over capital: the last one that costs ◆
  const refused = b && b.pc.left < 0 ? actions.map((a, i) => ({ a, i })).filter((x) => pcCost(x.a.type) > 0).pop()?.i : undefined;
  return (
    <div className="tray" aria-label="This month you will">
      <div className="tray-head">This month you will</div>
      {decisions.map((d) => {
        const o = d.options.find((x) => x.id === choices[d.id]);
        return (
          <button key={d.id} className="tray-row crisis" onClick={() => setFocus({ kind: 'crisis', id: d.id })}>
            <span className="tray-label">
              {d.title}: <b>{o?.label ?? 'no answer'}</b>
            </span>
            {!reviewed[d.id] && <span className="nav-tag staff">Staff</span>}
            {(o?.effects.pc ?? 0) !== 0 && <span className="num tray-pc">{(o?.effects.pc ?? 0) > 0 ? '+' : '−'}◆{Math.abs(o?.effects.pc ?? 0)}</span>}
          </button>
        );
      })}
      {agenda.length > 0 && (
        <div className="tray-row slots">
          {Array.from({ length: MEETING_SLOTS }, (_, i) => {
            const m = attending[i];
            return m ? (
              <button key={m.id} className="slot on" onClick={() => setFocus({ kind: 'meeting', id: m.id })} title={`${m.speaker}: ${m.options.find((o) => o.id === choices[m.id])?.label ?? ''}`}>
                {m.withCountry ? flag(m.withCountry) : '👥'} {m.speaker.split(' ').slice(-1)[0]}
              </button>
            ) : (
              <span key={`e${i}`} className="slot" aria-label="Free meeting slot">
                free
              </span>
            );
          })}
          {deputies > 0 && <span className="slot-dep">+{deputies} deputy</span>}
        </div>
      )}
      {actions.map((a, i) => (
        <div key={`${a.label}-${i}`} className={`tray-row order ${i === refused ? 'refused' : ''} ${focus.kind === 'order' && focus.id === String(i) ? 'on' : ''}`}>
          <button className="tray-main" onClick={() => setFocus({ kind: 'order', id: String(i) })} title={a.why ?? a.preview?.summary}>
            <ActionIcon type={a.type} size={14} />
            <span className="tray-label">
              {a.label}
              {a.why && <small>{a.why}</small>}
              {i === refused && <small className="warn">Will be refused: not enough capital</small>}
            </span>
            {a.origin === 'staff' && <span className="nav-tag staff">Staff</span>}
            {a.preview?.missionWarning && <IconAlertTriangle size={13} className="warn" aria-label={a.preview.missionWarning} />}
            <span className="num tray-pc">{pcCost(a.type) ? `◆${pcCost(a.type)}` : ''}{budgetShare(a.type) ? ` ${Math.round(budgetShare(a.type) * 100)}%` : ''}</span>
            {a.preview?.successChance != null && <span className="num tray-odds">{Math.round(a.preview.successChance <= 1 ? a.preview.successChance * 100 : a.preview.successChance)}%</span>}
          </button>
          <button className="tray-x" onClick={() => remove(i)} aria-label={`Remove ${a.label}`}>
            <IconX size={14} />
          </button>
        </div>
      ))}
      {actions.length < 6 && (
        <button className="tray-row add" onClick={() => setFocus({ kind: 'catalog' })}>
          <IconPlus size={14} /> Add order
        </button>
      )}
    </div>
  );
}

export function Readiness() {
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const setFocus = useGameStore((s) => s.setFocus);
  const staffCrises = decisions.filter((d) => !reviewed[d.id]);
  const waiting = agenda.filter((m) => !choices[m.id]);
  const staffOrders = actions.filter((a) => a.origin === 'staff').length;
  return (
    <ul className="readiness" aria-label="Before you execute">
      {decisions.length > 0 && (
        <li className={staffCrises.length ? 'half' : 'full'}>
          <i aria-hidden />
          {staffCrises.length ? `${staffCrises.length} ${staffCrises.length > 1 ? 'crises' : 'crisis'} on staff pick` : `${decisions.length > 1 ? 'Crises' : 'Crisis'} decided`}
          {staffCrises[0] && (
            <button className="link" onClick={() => setFocus({ kind: 'crisis', id: staffCrises[0].id })}>
              Review
            </button>
          )}
        </li>
      )}
      {agenda.length > 0 && (
        <li className={waiting.length ? 'empty' : 'full'}>
          <i aria-hidden />
          {waiting.length ? `${waiting.length} meeting${waiting.length > 1 ? 's' : ''} waiting: a deputy goes if not approved` : 'Calendar settled'}
          {waiting[0] && (
            <button className="link" onClick={() => setFocus({ kind: 'meeting', id: waiting[0].id })}>
              Open
            </button>
          )}
        </li>
      )}
      <li className="full">
        <i aria-hidden />
        {actions.length ? `${actions.length} order${actions.length > 1 ? 's' : ''} queued${staffOrders ? `, ${staffOrders} by staff` : ''}` : 'No orders: the month runs on its own'}
      </li>
    </ul>
  );
}

export function ApproveButton({ compact = false }: { compact?: boolean }) {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  const { crises, meetings } = pendingApprovals();
  const n = crises.length + meetings.length;
  if (n === 0) return null;
  return (
    <button className="wc-btn approve" onClick={approveAll} title="Confirm the staff's crisis picks and attend the suggested meetings (Shift+A)">
      <IconChecks size={16} /> {compact ? `Approve ${n}` : (<>Approve {n}<span className="approve-long">&nbsp;suggestion{n > 1 ? 's' : ''}</span></>)}
      {!compact && <kbd>Shift+A</kbd>}
    </button>
  );
}

export function ExecuteButton({ compact = false }: { compact?: boolean }) {
  const ex = useExecute();
  return (
    <button className="wc-btn primary big execute-btn" disabled={ex.disabled} onClick={ex.run} title={ex.reason ?? 'Execute month (Ctrl+Enter)'}>
      <IconSend size={18} /> {ex.loading ? 'Resolving…' : 'Execute month'}
      {!compact && <kbd>Ctrl+Enter</kbd>}
    </button>
  );
}

/** The right column of the desk; a bottom sheet on phones. */
export function CommandRail({ catalogTarget }: { catalogTarget: string }) {
  const world = useGameStore((s) => s.worldState);
  const ex = useExecute();
  const [sheet, setSheet] = useState(false);
  const setDeskMode = useGameStore((s) => s.setDeskMode);
  const b = budgetStatus();
  if (!world || !b) return null;
  return (
    <aside className={`rail ${sheet ? 'sheet-open' : ''}`} aria-label="Command rail">
      <ContextMap catalogTarget={catalogTarget} />
      <button className="sheet-grab" onClick={() => setSheet((v) => !v)} aria-expanded={sheet} aria-label={sheet ? 'Hide this month' : 'Show this month'}>
        <span className="num">◆ {b.pc.left} left · Orders {b.orders.used}/6 · In person {b.inPerson.used}/3</span>
        {sheet ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
      </button>
      <div className="rail-body">
        <Budgets />
        <Tray />
        <Readiness />
      </div>
      <div className="rail-foot">
        <button className="wc-btn ghost mode-switch" onClick={() => setDeskMode('map')} title="Investigate the world (M)">
          <IconMap2 size={16} />
          <span>Map</span>
        </button>
        <ApproveButton compact={false} />
        {ex.reason && (
          <div className="hint over">
            <IconAlertTriangle size={13} /> {ex.reason}
          </div>
        )}
        <ExecuteButton />
        <div className="hint">{world.maxTurns - world.turn} months left</div>
      </div>
    </aside>
  );
}

/** Map mode keeps the month in sight: budgets, what is waiting, back to the desk, Execute. */
export function CommandStrip() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const reviewed = useGameStore((s) => s.reviewed);
  const choices = useGameStore((s) => s.decisionChoices);
  const actions = useGameStore((s) => s.pendingActions);
  const setDeskMode = useGameStore((s) => s.setDeskMode);
  const ex = useExecute();
  const b = budgetStatus();
  if (!world || !b) return null;
  const staff = decisions.filter((d) => !reviewed[d.id]).length;
  const waiting = (world.agenda ?? []).filter((m) => !choices[m.id]).length;
  return (
    <div className="cmd-strip">
      <span className={`num chip-b ${b.pc.left < 0 ? 'over' : ''}`}>◆ {b.pc.left} left</span>
      <span className="num chip-b">Orders {b.orders.used}/6</span>
      <span className="num chip-b">In person {b.inPerson.used}/3</span>
      {b.defense.share > 0 && <span className="num chip-b">Defense {Math.round(b.defense.share * 100)}%</span>}
      <span className="strip-note">
        {actions.length ? `Your ${actions.length} order${actions.length > 1 ? 's are' : ' is'} kept` : 'No orders yet'}
        {staff ? ` · ${staff} crisis on staff pick` : ''}
        {waiting ? ` · ${waiting} meeting${waiting > 1 ? 's' : ''} waiting` : ''}
      </span>
      <button className="wc-btn" onClick={() => setDeskMode('desk')} title="Back to the desk (M)">
        <IconLayoutDashboard size={16} /> Desk
      </button>
      <ApproveButton compact />
      <button className="wc-btn primary" disabled={ex.disabled} onClick={ex.run} title={ex.reason ?? 'Execute month (Ctrl+Enter)'}>
        <IconSend size={16} /> {ex.loading ? 'Resolving…' : 'Execute'}
      </button>
    </div>
  );
}
