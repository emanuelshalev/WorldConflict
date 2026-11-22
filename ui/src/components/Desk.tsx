import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { IconAlertTriangle, IconChevronRight, IconLayoutList, IconListCheck, IconPhoneCall, IconSearch } from '@tabler/icons-react';
import { simpleMonth } from '../lib/ease';
import { useCoach } from '../lib/coach';
import { crisisStaffPick } from '../lib/staff';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { approveAll, crisisSelection, defaultDeskView, meetingPick, meetingSelection, primaryId, primaryItem, setupMonth } from '../lib/month';
import { budgetStatus } from '../lib/budget';
import { flag } from '../lib/format';
import { Navigator } from './desk/Navigator';
import { deskItems } from '../lib/deskItems';
import { Detail } from './desk/Detail';
import { CommandBar, CommandRail } from './desk/CommandRail';
import { DeskStage } from './desk/DeskStage';
import { useNarrow } from '../lib/useNarrow';
import { YourMove } from './desk/YourMove';
import { AdvisorList } from './desk/AdvisorList';
import { useAdvisorRows, whyLine } from '../lib/advisorRows';
import { goalName } from '../lib/month';
import { useExecute } from '../lib/useExecute';
import { MissionLine } from './desk/GoalLine';

/**
 * The desk (design-month.md 3, design-feel.md 5). Focus view: the goal line above, one Your move
 * card as the stage, the advisors, then "Also on your desk". Full desk: every item on the left (or
 * as filing tabs), the item in focus on the stage. The rail on the right is the command table;
 * on phones it is the command bar. The old three-line desk tip moved into the coach replay.
 */

/** Desk shortcuts: J/K walk the desk, 1-3 pick an option, Shift+A approve all, / search. */
function useDeskKeys(enabled: boolean) {
  const ex = useExecute();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const s = useGameStore.getState();
      if (s.activeModal || s.showChronicle || s.drawer || s.showBackstory) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ex.run();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter on a focused button or link presses that control (an explainer mark, Approve...), not the card shortcut
      if (e.key === 'Enter' && t?.closest('button, a[href], [role="button"]')) return;
      const items = deskItems();
      const at = items.findIndex((x) => x.kind === s.focus.kind && (x.id ?? '') === (s.focus.id ?? ''));
      // In Focus view the keys act on the Your move card
      const focusKind = s.deskView === 'focus' ? (primaryItem()?.kind ?? s.focus.kind) : s.focus.kind;
      const focusId = s.deskView === 'focus' ? (primaryId(primaryItem()) ?? s.focus.id) : s.focus.id;
      if (e.key === 'j' || e.key === 'k') {
        const next = items[Math.max(0, Math.min(items.length - 1, at + (e.key === 'j' ? 1 : -1)))];
        if (next) {
          if (s.deskView === 'focus') s.setDeskView('full');
          s.setFocus({ kind: next.kind, id: next.id });
        }
      } else if (e.key === 'A' && e.shiftKey) {
        // Only where the Recommended list is on screen: month 1's simple desk shows none (RS-005)
        if (!simpleMonth(s.worldState?.turn, s.deskView, s.deskShown)) approveAll();
      }
      else if (e.key === '/') {
        e.preventDefault();
        flushSync(() => {
          s.setDeskView('full');
          s.setFocus({ kind: 'catalog' });
        });
        document.getElementById('catalog-search')?.focus();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.focus.kind === 'order' && s.deskView === 'full') {
        s.removePendingAction(Number(s.focus.id));
        s.setFocus({ kind: 'suggestions' });
      } else if (e.key === 'Enter' && focusKind === 'crisis') {
        const d = s.pendingDecisions.find((x) => x.id === focusId);
        if (!d) return;
        s.chooseDecision(d.id, s.decisionChoices[d.id] ?? crisisStaffPick(d, s.worldState?.objective).id);
      } else if (e.key === 'Enter' && focusKind === 'meeting') {
        const m = s.worldState?.agenda?.find((x) => x.id === focusId);
        const o = m && meetingPick(m);
        if (!m || !o) return;
        s.chooseDecision(m.id, o.id);
      } else if (/^[1-4]$/.test(e.key) && (focusKind === 'crisis' || focusKind === 'meeting')) {
        const item = focusKind === 'crisis' ? s.pendingDecisions.find((d) => d.id === focusId) : s.worldState?.agenda?.find((m) => m.id === focusId);
        const opts = item?.options.filter((o) => focusKind === 'crisis' || o.id !== item.defaultOptionId) ?? [];
        const o = opts[Number(e.key) - 1];
        if (item && o) s.chooseDecision(item.id, o.id);
      } else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, ex]);
}

/** A month with no crisis and no mission meeting: the top advisor's move is the card. */
function QuietMove() {
  const rows = useAdvisorRows();
  const top = rows.find((r) => !r.staff) ?? rows[0];
  return (
    <article className="stage is-primary quiet" aria-label="Your move: a quiet month">
      <div className="quiet-card">
        <span className="stage-kicker">Your move · a quiet month</span>
        <h2 className="stage-title">{top ? `Your ${top.who}'s move: ${top.label}` : 'A quiet month'}</h2>
        <p className="stage-lede">{top ? whyLine(top.why) : 'No crisis and no call needs you. Use the month: give an order, or let it run.'}</p>
      </div>
    </article>
  );
}

/** "Also on your desk": meetings, orders and other crises, each one tap from the full item. */
function AlsoOnDesk() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const status = useGameStore((s) => s.objectiveStatus);
  const setFocus = useGameStore((s) => s.setFocus);
  const setDeskView = useGameStore((s) => s.setDeskView);
  if (!world) return null;
  const open = (f: Parameters<typeof setFocus>[0]) => {
    setDeskView('full');
    setFocus(f);
    document.getElementById('desk-stage')?.scrollTo({ top: 0 });
  };
  const primary = primaryId(primaryItem());
  const others = decisions.filter((d) => d.id !== primary);
  const agenda = (world.agenda ?? []).filter((m) => m.id !== primary);
  const targets = new Map<string, string>();
  status.forEach((c, i) => {
    const cond = [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])][i];
    if (cond?.targetId) targets.set(cond.targetId, goalName(c));
  });
  const missionMeeting = agenda.find((m) => m.withCountry && targets.has(m.withCountry));
  const attend = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const waiting = agenda.filter((m) => !choices[m.id]);
  const willAttend = waiting.filter((m) => meetingPick(m)).length;
  const b = budgetStatus();
  const committed = actions.filter((a) => !a.proposed);
  const staff = committed.filter((a) => a.origin === 'staff').length;
  const toApprove = actions.length - committed.length;
  return (
    <section className="also" aria-label="Also on your desk">
      <h3 className="block-head">Also on your desk</h3>
      {others.map((d) => {
        const sel = crisisSelection(d, choices, reviewed);
        return (
          <button key={d.id} type="button" className="also-row hot" onClick={() => open({ kind: 'crisis', id: d.id })}>
            <IconAlertTriangle size={17} aria-hidden />
            <span>
              <b>{d.title}</b>
              <small>{sel.text}</small>
            </span>
            <IconChevronRight size={16} aria-hidden />
          </button>
        );
      })}
      {missionMeeting && (
        <button type="button" className="also-row mission" onClick={() => open({ kind: 'meeting', id: missionMeeting.id })}>
          <IconPhoneCall size={17} aria-hidden />
          <span>
            <b>
              {flag(missionMeeting.withCountry ?? '')} {missionMeeting.speaker} {missionMeeting.kind === 'VISIT' ? 'visits' : missionMeeting.kind === 'CALL' ? 'calls' : 'meets you'}
            </b>
            <small>
              Mission: {targets.get(missionMeeting.withCountry ?? '')} · {meetingSelection(missionMeeting, choices, reviewed).text}
            </small>
          </span>
          <IconChevronRight size={16} aria-hidden />
        </button>
      )}
      {agenda.length > 0 && (
        <button type="button" className="also-row" onClick={() => open({ kind: 'meeting', id: agenda[0].id })}>
          <IconPhoneCall size={17} aria-hidden />
          <span>
            <b>
              {agenda.length} call{agenda.length > 1 ? 's' : ''} and meeting{agenda.length > 1 ? 's' : ''}
            </b>
            <small>
              {attend ? `You attend ${attend}` : `On Approve, staff attend ${Math.min(3, willAttend)}`}
              {agenda.length - Math.max(attend, Math.min(3, willAttend)) > 0 ? `, a deputy takes ${agenda.length - Math.max(attend, Math.min(3, willAttend))}` : ''}
            </small>
          </span>
          <IconChevronRight size={16} aria-hidden />
        </button>
      )}
      <button type="button" className="also-row" onClick={() => open({ kind: 'suggestions' })}>
        <IconListCheck size={17} aria-hidden />
        <span>
          <b>
            {committed.length} order{committed.length === 1 ? '' : 's'} in this month{staff ? ` (${staff} by staff)` : ''}
            {toApprove ? `, ${toApprove} staff proposal${toApprove === 1 ? '' : 's'} to approve` : ''}
          </b>
          <small>{b ? `◆ ${b.pc.orders} of ◆ ${Math.max(0, b.pc.bank + b.pc.crisis + b.pc.meetings)} political capital on orders` : ''}</small>
        </span>
        <IconChevronRight size={16} aria-hidden />
      </button>
      <button type="button" className="also-row" onClick={() => open({ kind: 'catalog' })}>
        <IconSearch size={17} aria-hidden />
        <span>
          <b>All orders</b>
          <small>Search or browse every order you can give</small>
        </span>
        <IconChevronRight size={16} aria-hidden />
      </button>
    </section>
  );
}

/** Month 1: one line instead of the advisors, orders and meetings, which open on demand. */
export function ShowDesk({ className = '' }: { className?: string }) {
  const showDesk = useGameStore((s) => s.showDesk);
  const agenda = useGameStore((s) => s.worldState?.agenda?.length ?? 0);
  const proposals = useGameStore((s) => s.pendingActions.filter((a) => a.proposed).length);
  const actions = useGameStore((s) => s.pendingActions.filter((a) => !a.proposed).length);
  return (
    <button type="button" className={`show-desk ${className}`.trim()} onClick={showDesk} data-show-desk="">
      <IconLayoutList size={17} aria-hidden />
      <span>
        <b>Show the whole desk</b>
        <small>
          Advisors, {actions} order{actions === 1 ? '' : 's'}
          {proposals ? `, ${proposals} staff proposal${proposals === 1 ? '' : 's'}` : ''} and {agenda} meeting{agenda === 1 ? '' : 's'}: deputies take the meetings, proposals wait for your approval
        </small>
      </span>
      <IconChevronRight size={16} aria-hidden />
    </button>
  );
}

function FocusView() {
  useGameStore((s) => s.missionImpact);
  useGameStore((s) => s.pendingDecisions);
  const simple = useSimpleMonth();
  const p = primaryItem();
  return (
    <div className={`focus-view${simple ? ' is-simple' : ''}`}>
      {p?.kind === 'crisis' ? <YourMove item={p.decision} /> : p?.kind === 'meeting' ? <YourMove item={p.meeting} /> : <QuietMove />}
      {simple ? (
        <ShowDesk />
      ) : (
        <>
          <AdvisorList />
          <AlsoOnDesk />
        </>
      )}
    </div>
  );
}

/** Month 1 in Focus view, until the player asks for the rest (lib/ease simpleMonth). */
function useSimpleMonth(): boolean {
  const turn = useGameStore((s) => s.worldState?.turn);
  const view = useGameStore((s) => s.deskView);
  const shown = useGameStore((s) => s.deskShown);
  return simpleMonth(turn, view, shown);
}

export function Desk() {
  const world = useGameStore((s) => s.worldState);
  const gameOver = useGameStore((s) => s.gameOver);
  const saveId = useGameStore((s) => s.saveId);
  const deskMode = useGameStore((s) => s.deskMode);
  const deskView = useGameStore((s) => s.deskView);
  const selected = useGameStore((s) => s.selectedCountryId);
  const me = usePlayerCountry();
  const picked = useGameStore((s) => s.orderTarget);
  const setTarget = useGameStore((s) => s.setOrderTarget);
  const narrowNav = useNarrow(1280);
  const phone = useNarrow(900);
  // A country picked on the big map becomes the order target until the player picks another
  const target = picked || (selected && selected !== world?.playerCountryId ? selected : '');
  const turn = world?.turn;
  // The month's defaults (cabinet picks, staff orders) once per save and month
  useEffect(() => {
    if (saveId && turn !== undefined) void setupMonth();
  }, [saveId, turn]);
  // Months 1 and 2, phones and tablets open in Focus view (without overwriting the saved choice)
  useEffect(() => {
    if (turn === undefined) return;
    const s = useGameStore.getState();
    if (defaultDeskView(s.worldState, s.deskView) === 'focus' && s.deskView !== 'focus') useGameStore.setState({ deskView: 'focus' });
  }, [turn]);
  useDeskKeys(deskMode === 'desk' && !gameOver);
  const simple = useSimpleMonth();
  const coachStep = useCoach((s) => s.step);
  // Month 1 hides the advisors, so the coach skips its advisors step (it would point at nothing)
  useEffect(() => {
    if (simple && coachStep === 'advisors') useCoach.getState().advance('advisors');
  }, [simple, coachStep]);
  if (!world || !me || gameOver || deskMode !== 'desk') return null;
  const full = deskView === 'full';
  return (
    <DeskStage
      view={deskView}
      nav={full && !narrowNav ? <Navigator /> : undefined}
      tabs={full && narrowNav ? <Navigator tabs /> : undefined}
      rail={phone ? undefined : <CommandRail catalogTarget={target} simple={simple} />}
      bar={phone ? <CommandBar catalogTarget={target} simple={simple} /> : undefined}
    >
      <MissionLine />
      {full ? <Detail target={target} setTarget={setTarget} /> : <FocusView />}
    </DeskStage>
  );
}
