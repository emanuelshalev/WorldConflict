import { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconChecks, IconChevronRight, IconListDetails, IconSend, IconX } from '@tabler/icons-react';
import { useExecute } from '../../lib/useExecute';
import { useGameStore } from '../../store/gameStore';
import { pcCost } from '../../lib/actions';
import { type StaffPickItem, approveLabel, planSummary } from '../../lib/month';
import { useStaffPicks } from '../../lib/useStaffPicks';
import { type AgendaItem, agendaItems, chooseAllRecommended, executeNow, openItem, undoSkip } from '../../lib/agenda';
import { type PlanSection, useFitPlan } from '../../lib/layout';
import { TERMS } from '../../lib/glossary';
import { CoachBubble } from './Coach';
import { sound } from '../../lib/sound';
import { pointTo } from '../../lib/pointer';
import '../../styles/layout.css';

/**
 * The Plan (design-layout.md L-9 to L-11, L-19; design-agenda.md 0.12): what will happen. One
 * component, forms `rail` (desk, 1280 wide and up), `float` (Map, 1600 and up), `bar` (desk under
 * 1280 and Map under 1600) and `sheet` (the phone's review screen). Top to bottom: "What will
 * happen", Decided (n), Recommended (n) still to do with each row's Open, Choose all recommended (n)
 * with its definition line, Skipped (n); pinned at the bottom and never folded: "If you execute
 * now:" and Execute month N. The fit rule (lib/layout useFitPlan) folds sections instead of
 * scrolling; nothing here ever scrolls (the QA3-S3-3 inner scroll is gone).
 */

export type PlanForm = 'rail' | 'float' | 'bar' | 'sheet';

/** "Xi call", "Order: Court India" -> short names for a folded summary. */
const short = (t: string) => t.replace(/^(Crisis answer|Meeting|Deputy takes|Order): /, '');

/** The meter an Execute-blocked reason is about. */
const reasonTarget = (r: string) => (/capital/i.test(r) ? 'capital' : /defense/i.test(r) ? 'defense' : /meeting/i.test(r) ? 'meetings' : 'orders');

export function ExecuteButton({ compact = false }: { compact?: boolean }) {
  const ex = useExecute();
  const world = useGameStore((s) => s.worldState);
  const n = world ? Math.min(world.turn + 1, world.maxTurns) : 1;
  return (
    <button
      type="button"
      className="wc-btn primary big execute-btn"
      disabled={ex.disabled}
      onClick={() => {
        if (ex.disabled) return;
        sound.play('execute');
        ex.run();
      }}
      title={ex.reason ?? undefined}
      data-point="execute"
    >
      <span className="ex-main">
        <IconSend size={18} aria-hidden /> {ex.loading ? 'Resolving...' : `Execute month ${n}`}
      </span>
      {!compact && <span className="ex-sub">ends the month</span>}
    </button>
  );
}

/** The blocked reason (it points at its meter in the state band). */
function Blocked() {
  const ex = useExecute();
  if (!ex.reason) return null;
  return (
    <button type="button" className="hint over plan-over" role="alert" onClick={() => pointTo(reasonTarget(ex.reason ?? ''))}>
      <IconAlertTriangle size={14} aria-hidden /> {ex.reason}
    </button>
  );
}

/** "If you execute now:" and Execute: pinned, never folded (L-9). */
function ExecuteBlock({ form }: { form: PlanForm }) {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  const lines = executeNow();
  return (
    <div className={`execb f-${form}`}>
      <p className="execb-h">If you execute now:</p>
      <ul>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <Blocked />
      <div className="ex-wrap">
        <CoachBubble step="execute" place="above" />
        <ExecuteButton />
      </div>
    </div>
  );
}

/** One recommendation row: who, what, what it changes, and Open (one way to decide: Choose on its card, D8). */
function RecRow({ it, compact, onOpen }: { it: StaffPickItem; compact: boolean; onOpen: () => void }) {
  return (
    <li className={`sp-item kind-${it.kind}${it.fits ? '' : ' is-off'}`} data-staff-pick={it.kind}>
      <div className="sp-text">
        <span className="sp-by">{TERMS.staffPick.name.replace('{role}', it.by)}</span>
        <b className="sp-name">
          {it.title}
          {it.cost ? ` · ◆ ${it.cost}` : ''}
        </b>
        {!compact && it.change && <span className="sp-change">{it.change}</span>}
        {!compact && it.tag?.tone === 'risk' && <span className="sp-risk">{it.tag.text}</span>}
        {!it.fits && <span className="sp-reason">{it.reason}: not in Choose all</span>}
      </div>
      <button type="button" className="wc-btn small sp-open" onClick={onOpen} aria-label={`Open: ${it.title}`}>
        Open <IconChevronRight size={14} aria-hidden />
      </button>
    </li>
  );
}

/** The agenda thing a recommendation belongs to. */
function itemFor(it: StaffPickItem, items: AgendaItem[]): AgendaItem | undefined {
  if (it.kind === 'crisis') return items.find((x) => x.key === `crisis:${it.id}`);
  if (it.kind === 'order') return items.find((x) => x.kind === 'orders');
  return items.find((x) => x.key === `meeting:${it.id}`) ?? items.find((x) => x.kind === 'meetings' && x.meetings?.some((m) => m.id === it.id));
}

/** The section heading: count, and when folded the summary and Show (L-10, L-13). */
function Head({ id, label, n, folded, summary, onShow, heading = false }: { id: PlanSection; label: string; n: number; folded: boolean; summary: string; onShow: (s: PlanSection | null) => void; heading?: boolean }) {
  const H = heading ? 'h3' : 'p';
  return (
    <div className="psec-h">
      <H className={heading ? 'sp-heading' : 'psec-t'} id={`plan-${id}`}>
        {label} ({n}){id === 'recommended' ? ', still to do' : ''}
      </H>
      {folded && n > 0 && (
        <button type="button" className="wc-btn small psec-tog" aria-expanded={false} onClick={() => onShow(id)}>
          Show
        </button>
      )}
      {folded && n > 0 && <p className="psec-sum">{summary}</p>}
    </div>
  );
}

/** Recommended (n) with Choose all recommended and its definition line (D-73). */
export function Recommended({ compact = false, folded = false, onShow = () => {}, onOpen, button = true }: { compact?: boolean; folded?: boolean; onShow?: (s: PlanSection | null) => void; onOpen?: () => void; /** False when the open list shows beside the rail with its own button. */ button?: boolean }) {
  const { items, n, breakdown, against } = useStaffPicks();
  const agenda = agendaItems();
  const pc = items.filter((x) => x.fits).reduce((s, x) => s + x.cost, 0);
  const summary = `${items.map((x) => short(x.title)).join(', ')}${pc ? ` (◆ ${pc})` : ''}`;
  const choose = () => {
    chooseAllRecommended();
    sound.play('stamp');
  };
  return (
    <section className={`psec staff-picks${folded ? ' folded' : ''}`} aria-labelledby="plan-recommended" data-staff-picks="">
      <Head id="recommended" label={TERMS.recommended.name} n={n} folded={folded} summary={summary} onShow={onShow} heading />
      {!folded && items.length > 0 && (
        <ul className="sp-list" aria-label={`${TERMS.recommended.name}, still to do`}>
          {items.map((it) => (
            <RecRow
              key={it.key}
              it={it}
              compact={compact}
              onOpen={() => {
                const target = itemFor(it, agenda);
                if (target) openItem(target.key);
                onOpen?.();
              }}
            />
          ))}
        </ul>
      )}
      {!button ? null : n > 0 ? (
        <button type="button" className="wc-btn sp-main" onClick={choose} data-choose-all="" aria-describedby="plan-choose-def">
          <span className="sp-main-label">
            <IconChecks size={16} aria-hidden /> {approveLabel(n)}
          </span>
          {!compact && (
            <small className="sp-main-sub">
              {breakdown}
              {against > 0 && <span className="approve-against"> · {against} against your mission</span>}
            </small>
          )}
        </button>
      ) : (
        <button type="button" className="wc-btn sp-main" disabled aria-describedby="plan-choose-def">
          <span className="sp-main-label">
            <IconChecks size={16} aria-hidden /> {TERMS.approveAll.name.replace(' ({n})', '')}
          </span>
          <small className="sp-main-sub">Nothing to choose: every recommendation is decided</small>
        </button>
      )}
      {button && (
        <p className="sp-why" id="plan-choose-def">
          {TERMS.approveAll.definition}
        </p>
      )}
    </section>
  );
}

/** Decided (n): "You chose: ..." with Change. */
function Decided({ items, folded, compact, onShow }: { items: AgendaItem[]; folded: boolean; compact: boolean; onShow: (s: PlanSection | null) => void }) {
  const actions = useGameStore((s) => s.pendingActions);
  const setFocus = useGameStore((s) => s.setFocus);
  const done = items.filter((x) => x.state === 'decided' && x.kind !== 'own');
  const mine = actions.map((a, i) => ({ a, i })).filter((x) => !x.a.proposed && x.a.origin !== 'staff');
  const n = done.length + mine.length;
  const summary = [...done.map((x) => x.title), ...mine.map((x) => x.a.label)].join(', ');
  return (
    <section className={`psec${folded ? ' folded' : ''}`} aria-labelledby="plan-decided">
      <Head id="decided" label="Decided" n={n} folded={folded} summary={summary} onShow={onShow} />
      {!folded && (
        <ul className="prows">
          {done.map((x) => (
            <li key={x.key} className="prow">
              <span className="prow-t">
                You chose: {x.stateText.replace(/^Decided: /, '')}
                {!compact && <small>{x.title}</small>}
              </span>
              <button type="button" className="wc-btn small" onClick={() => openItem(x.key)} aria-label={`Change: ${x.title}`}>
                Change
              </button>
            </li>
          ))}
          {mine.map(({ a, i }) => (
            <li key={`${a.label}-${i}`} className="prow">
              <span className="prow-t">
                Order: {a.label}
                {pcCost(a.type) ? ` · ◆ ${pcCost(a.type)}` : ''}
                {!compact && <small>Your own order</small>}
              </span>
              <button type="button" className="wc-btn small" onClick={() => setFocus({ kind: 'order', id: String(i) })} aria-label={`Change: ${a.label}`}>
                Change
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Skipped (n): plain text with Undo (D7). */
function Skipped({ items, folded, onShow }: { items: AgendaItem[]; folded: boolean; onShow: (s: PlanSection | null) => void }) {
  const sk = items.filter((x) => x.state === 'skipped');
  if (!sk.length) return null;
  return (
    <section className={`psec${folded ? ' folded' : ''}`} aria-labelledby="plan-skipped">
      <Head id="skipped" label="Skipped" n={sk.length} folded={folded} summary={sk.map((x) => x.title).join(', ')} onShow={onShow} />
      {!folded && (
        <ul className="prows">
          {sk.map((x) => (
            <li key={x.key} className="prow">
              <span className="prow-t">Skipped: {x.title}</span>
              <button type="button" className="wc-btn small" onClick={() => undoSkip(x)} aria-label={`Undo: ${x.title}`}>
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The bar form (L-11): "Review n recommended" opens the list over the Thing (D4), the consequence line, Execute. */
function PlanBar({ map }: { map: boolean }) {
  const [open, setOpen] = useState(false);
  const { n } = useStaffPicks();
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.pendingActions);
  const line = executeNow()[0];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);
  return (
    <div className={`plan f-bar${map ? ' cmd-strip' : ''}`} data-region="plan" data-form="bar">
      {open && (
        <div className="plan-panel" role="dialog" aria-label={TERMS.recommended.name}>
          <div className="plan-panel-h">
            <h2>What will happen</h2>
            <button type="button" className="wc-btn small" onClick={() => setOpen(false)} aria-label="Close the list">
              <IconX size={16} aria-hidden /> Close
            </button>
          </div>
          <Recommended compact onOpen={() => setOpen(false)} />
        </div>
      )}
      <div className="pbar-grp">
        <span className="pbar-l">This month</span>
        <button type="button" className="wc-btn pbar-review" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <IconListDetails size={16} aria-hidden /> {TERMS.reviewRecommended.name.replace('{n}', String(n))}
        </button>
      </div>
      <p className="pbar-line">
        <b>If you execute now:</b> {line}
      </p>
      <div className="pbar-exec">
        <Blocked />
        <div className="ex-wrap">
          <CoachBubble step="execute" place="above" />
          <ExecuteButton compact />
        </div>
      </div>
    </div>
  );
}

/** The Plan region in its form. */
export function Plan({ form }: { form: PlanForm }) {
  const listRef = useRef<HTMLDivElement>(null);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const actions = useGameStore((s) => s.pendingActions);
  const skipped = useGameStore((s) => s.skipped);
  useGameStore((s) => s.missionImpact);
  const key = `${Object.keys(choices).length}|${Object.keys(reviewed).length}|${actions.map((a) => `${a.label}${a.proposed ? 'p' : ''}`).join(',')}|${Object.keys(skipped).join(',')}`;
  const fit = useFitPlan(listRef, key);
  if (form === 'bar') return <PlanBar map={false} />;
  const items = agendaItems();
  const against = planSummary().against;
  // A section opened with Show that still does not fit in the rail opens beside it, over the Thing,
  // with every row (L-10: Show opens it with no scroll); the rail keeps its folded summary
  const beside = fit.shown && fit.level >= 2 ? fit.shown : null;
  const folded = (s: PlanSection) => (beside ? true : fit.folded(s));
  return (
    <aside className={`plan f-${form}`} data-region="plan" data-form={form} aria-label="What will happen" data-fit={fit.level}>
      {beside && (
        <div className="plan-panel plan-beside" role="region" aria-label={beside === 'recommended' ? TERMS.recommended.name : beside === 'decided' ? 'Decided' : 'Skipped'}>
          <div className="plan-panel-h">
            <h2>What will happen</h2>
            <button type="button" className="wc-btn small" onClick={() => fit.show(null)} aria-label="Close the list">
              <IconX size={16} aria-hidden /> Close
            </button>
          </div>
          {beside === 'recommended' && <Recommended compact onOpen={() => fit.show(null)} />}
          {beside === 'decided' && <Decided items={items} folded={false} compact={false} onShow={fit.show} />}
          {beside === 'skipped' && <Skipped items={items} folded={false} onShow={fit.show} />}
        </div>
      )}
      <div className={`plan-list${fit.compact ? ' compact' : ''}${fit.tight && !beside ? ' tight' : ''}`} ref={listRef}>
        <h2 className="plan-h">What will happen</h2>
        <Decided items={items} folded={folded('decided')} compact={fit.compact} onShow={fit.show} />
        <Recommended folded={folded('recommended')} compact={fit.compact} onShow={fit.show} button={beside !== 'recommended'} />
        {against.length > 0 && !fit.compact && (
          <p className="plan-against" role="note">
            <IconAlertTriangle size={14} aria-hidden /> {against.length} recommended {against.length === 1 ? 'answer works' : 'answers work'} against your mission: <b>{against[0].label}</b>.
          </p>
        )}
        <Skipped items={items} folded={folded('skipped')} onShow={fit.show} />
        {fit.shown && (
          <button type="button" className="wc-btn small psec-all" onClick={() => fit.show(null)}>
            Show all sections
          </button>
        )}
      </div>
      <ExecuteBlock form={form} />
    </aside>
  );
}

/** Map mode under 1600 wide: the bar along the bottom of the map (L-14). */
export function MapPlanBar() {
  return <PlanBar map />;
}
