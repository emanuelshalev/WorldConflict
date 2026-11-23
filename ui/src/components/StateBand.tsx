import { useEffect, useRef, useState } from 'react';
import { IconBook, IconDeviceFloppy, IconBroadcast, IconBroadcastOff, IconChevronDown, IconChevronUp, IconLayoutDashboard, IconMap2, IconMenu2, IconNews, IconSettings, IconUsers, IconWorld } from '@tabler/icons-react';
import { budgetStatus } from '../lib/budget';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, monthLabel } from '../lib/format';
import { TERMS } from '../lib/glossary';
import { pcIncome } from '../lib/month';
import { goalsLine, missionSummary } from '../lib/goals';
import { useLayout } from '../lib/layout';
import { SoundToggle } from './game/SoundToggle';
import { useScoreWhy } from '../lib/scoreWhy';
import { LearnChip } from './learn/LearnChip';
import '../styles/state-band.css';

/**
 * The state band (design-layout.md L-5, section 5): one dedicated band above everything, at every
 * size, never scrolling, never covered. It replaces the HUD and the goal line: who, the month and
 * the mission (one button) on line 1; this month's budgets and your country on line 2 (one line at
 * 3200 wide and up). Values are plain text; Explain and Mission are the controls, plus the Desk /
 * Map switch and the menu. Labels shorten by layout class, never by ellipsis. On phones it is one
 * line with "State ▾", which opens everything as a sheet.
 */

// The short labels of section 5, each followed by its value in the band (never a bare label)
const ORDERS = 'Orders'; // glossary-ok
const DEFENSE = 'Defense'; // glossary-ok

/** A value that flashes for 300 ms when it changes (the cost is seen where the budget is). */
function V({ v, className = '' }: { v: string | number; className?: string }) {
  return (
    <b key={String(v)} className={`num sb-v ${className}`.trim()}>
      {v}
    </b>
  );
}

function Delta({ v }: { v?: number }) {
  if (v === undefined || Math.abs(v) < 0.5) return null;
  return (
    <small className={v > 0 ? 'delta-up' : 'delta-down'} aria-label={`${v > 0 ? 'up' : 'down'} ${Math.abs(Math.round(v))} last month`}>
      {v > 0 ? '▲' : '▼'}
      {Math.abs(Math.round(v))}
    </small>
  );
}

/**
 * The menu (design-agenda 0.12 D3: no icon-only buttons in the band): the learning level and the
 * mute stay in sight; Menu opens Cabinet, World, Chronicle, Codex, the news ticker, Settings and
 * Save and load as labelled buttons.
 */
function Menu({ phone = false }: { phone?: boolean }) {
  const setDrawer = useGameStore((s) => s.setDrawer);
  const openModal = useGameStore((s) => s.openModal);
  const usage = useGameStore((s) => s.aiTotalUsage);
  const tier = useGameStore((s) => s.llmSettings.tier);
  const provider = useGameStore((s) => s.llmSettings.provider);
  const showTicker = useGameStore((s) => s.showTicker);
  const setShowTicker = useGameStore((s) => s.setShowTicker);
  const [open, setOpen] = useState(false);
  const llmOn = provider !== 'builtin' && tier !== 'ALGORITHMIC';
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);
  const go = (f: () => void) => () => {
    setOpen(false);
    f();
  };
  const items = (
    <>
      <button type="button" className="wc-btn ghost" onClick={go(() => setDrawer('cabinet'))}>
        <IconUsers size={16} aria-hidden /> Cabinet
      </button>
      <button type="button" className="wc-btn ghost" onClick={go(() => setDrawer('world'))}>
        <IconWorld size={16} aria-hidden /> World
      </button>
      <button type="button" className="wc-btn ghost" onClick={go(() => setDrawer('chronicle'))}>
        <IconNews size={16} aria-hidden /> Chronicle
      </button>
      <button type="button" className="wc-btn ghost" onClick={go(() => setDrawer('codex'))}>
        <IconBook size={16} aria-hidden /> Codex
      </button>
      <button type="button" className="wc-btn ghost" aria-pressed={showTicker} onClick={go(() => setShowTicker(!showTicker))} title="News ticker (N)">
        {showTicker ? <IconBroadcast size={16} aria-hidden /> : <IconBroadcastOff size={16} aria-hidden />} {showTicker ? 'Hide the news ticker' : 'Show the news ticker'}
      </button>
      {llmOn && (
        <button type="button" className="wc-btn ghost" onClick={go(() => openModal('settings'))}>
          AI {usage ? `${(usage.promptTokens + usage.completionTokens).toLocaleString()} tokens` : 'on'}
          {usage?.costUsd !== null && usage?.costUsd !== undefined ? ` · $${usage.costUsd.toFixed(3)}` : ''}
        </button>
      )}
      <button type="button" className="wc-btn ghost" onClick={go(() => openModal('settings'))}>
        <IconSettings size={16} aria-hidden /> Settings
      </button>
      <button type="button" className="wc-btn ghost" onClick={go(() => openModal('saveLoad'))}>
        <IconDeviceFloppy size={16} aria-hidden /> Save and load
      </button>
    </>
  );
  if (phone) return <div className="sb-menu is-phone">{items}</div>;
  return (
    <div className="sb-menu">
      <LearnChip />
      <SoundToggle className="hud-sound" />
      <button type="button" className="wc-btn small sb-menu-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        <IconMenu2 size={16} aria-hidden /> Menu
      </button>
      {open && (
        <div className="sb-menu-pop" role="menu" aria-label="Menu">
          {items}
        </div>
      )}
    </div>
  );
}

function ModeSwitch() {
  const deskMode = useGameStore((s) => s.deskMode);
  const setDeskMode = useGameStore((s) => s.setDeskMode);
  return (
    <div className="seg mode-seg" role="tablist" aria-label="Map or desk (M)">
      <button type="button" role="tab" aria-selected={deskMode === 'desk'} className={deskMode === 'desk' ? 'on' : ''} onClick={() => setDeskMode('desk')} title="Decide this month (M)">
        <IconLayoutDashboard size={15} aria-hidden /> <span>Desk</span>
      </button>
      <button type="button" role="tab" aria-selected={deskMode === 'map'} className={deskMode === 'map' ? 'on' : ''} onClick={() => setDeskMode('map')} title="Investigate the world (M)">
        <IconMap2 size={15} aria-hidden /> <span>Map</span>
      </button>
    </div>
  );
}

export function StateBand() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  const setDrawer = useGameStore((s) => s.setDrawer);
  const gameOver = useGameStore((s) => s.gameOver);
  const deskShown = useGameStore((s) => s.deskShown);
  const me = usePlayerCountry();
  const L = useLayout();
  const [explain, setExplain] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // The result card, the details and the paper open under the band (AC-L2: the state stays in view)
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const set = () => document.documentElement.style.setProperty('--band-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--band-h');
    };
  }, [L.cls]);
  // The budgets follow the month's choices
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  if (!world || !me) return null;
  const b = budgetStatus();
  const cls = L.cls;
  const wide = cls === 'D' || cls === 'W' || cls === 'U';
  const month = Math.min(world.turn + 1, world.maxTurns);
  // The meeting and defense budgets join from month 2, or once the player asks for the whole month
  const from2 = world.turn >= 1 || deskShown;
  const pcLeft = b ? b.pc.left : world.politicalCapital;
  const pcCap = b?.pc.cap ?? 6;
  const d = world.turnReport?.deltas ?? {};
  const delta = (k: string) => (d[k] ? d[k].after - d[k].before : undefined);
  const tension = Math.round(world.globalTension);
  const tensionDelta = world.turnReport?.tension ? tension - world.turnReport.tension.before : undefined;
  const election = me.politicalSystem.nextElectionTurn;
  const toElection = election !== null && election >= world.turn && election - world.turn <= 12 ? election - world.turn : null;
  const goals = goalsLine(status) ?? missionSummary(status, world.turn, world.maxTurns);
  const title = world.objective?.title ?? 'Stay in power';
  const def = b ? Math.round(b.defense.share * 100) : 0;

  const monthText = cls === 'P' ? `Month ${month}` : cls === 'T' ? `Month ${month} of ${world.maxTurns}` : `Month ${month} of ${world.maxTurns} · ${monthLabel(world.date)}`;
  const electionText = toElection !== null ? `election in ${toElection === 0 ? 'days' : `${toElection} month${toElection === 1 ? '' : 's'}`}` : '';
  const who = cls === 'T' ? '' : wide ? `${me.leader.title} of ${/^(United|Philippines|Netherlands|Democratic|Republic|Czech)/.test(me.name) ? 'the ' : ''}${me.name}` : me.name;

  const pc = (
    <span className={`sb-s sb-pc${pcLeft < 0 ? ' over' : ''}`} data-point="capital">
      {wide ? 'Political capital (what orders cost)' : TERMS.capital.name} <V v={`◆ ${pcLeft} of ${pcCap}`} />
    </span>
  );
  const explainBtn = (
    <button type="button" className="wc-btn small sb-explain" onClick={() => setExplain((v) => !v)} aria-expanded={explain}>
      Explain
    </button>
  );
  const orders = (
    <span className="sb-s" data-point="orders">
      {ORDERS} <V v={`${b?.orders.used ?? 0} of ${b?.orders.max ?? 6}`} />
    </span>
  );
  const meetings = from2 && (
    <span className="sb-s" data-point="meetings">
      {wide ? 'Meetings you take' : 'Meetings'} <V v={`${b?.inPerson.used ?? 0} of ${b?.inPerson.max ?? 3}`} />
    </span>
  );
  const defense = from2 && (
    <span className={`sb-s${def > 100 ? ' over' : ''}`} data-point="defense">
      {wide ? TERMS.defense.name : DEFENSE} <V v={`${def}% used`} />
    </span>
  );
  const growth = (me.realGrowth ?? me.growthRate) * 100;
  const score = (
    <button type="button" className="wc-btn small sb-score" onClick={() => useScoreWhy.getState().show(true)} aria-label={`${TERMS.score.name} ${Math.round(world.score?.total ?? 100)}: why your score moved`}>
      {TERMS.score.name} <span className="num">{Math.round(world.score?.total ?? 100)}</span>
    </button>
  );
  // Every indicator stays one press away (QA1 S3-3): "Your country" opens the full set, the band
  // shows the ones section 5 lists for its width
  const all = (
    <div className="sb-country-pop" role="note" aria-label="Your country">
      <span className="sb-s">
        {TERMS.approval.name} <V v={`${Math.round(me.approval)}%`} />
        <Delta v={delta('approval')} />
      </span>
      <span className="sb-s">
        {TERMS.stability.name} <V v={Math.round(me.stability)} />
        <Delta v={delta('stability')} />
      </span>
      <span className="sb-s">
        {TERMS.legitimacy.name} <V v={`${Math.round(me.legitimacy)}%`} />
        <Delta v={delta('legitimacy')} />
      </span>
      <span className="sb-s">
        {TERMS.economy.name} <V v={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`} />
      </span>
      <span className="sb-s">
        {TERMS.tension.name} <V v={tension} />
      </span>
      {!wide && score}
    </div>
  );
  const country = (
    <span className="sb-grp sb-country">
      <button type="button" className="wc-btn small sb-country-btn" aria-expanded={countryOpen} onClick={() => setCountryOpen((v) => !v)}>
        Your country {countryOpen ? <IconChevronUp size={14} aria-hidden /> : <IconChevronDown size={14} aria-hidden />}
      </button>
      {countryOpen && all}
      {cls !== 'T' && (
        <span className={`sb-s${me.approval < 30 ? ' over' : ''}`}>
          {TERMS.approval.name} <V v={`${Math.round(me.approval)}%`} />
          <Delta v={delta('approval')} />
        </span>
      )}
      {cls !== 'T' && (
        <span className={`sb-s${me.stability < 30 ? ' over' : ''}`}>
          {TERMS.stability.name} <V v={Math.round(me.stability)} />
          <Delta v={delta('stability')} />
        </span>
      )}
      <span className={`sb-s${tension >= 80 ? ' over' : ''}`}>
        {cls === 'T' ? 'Tension' : TERMS.tension.name} <V v={tension} />
        <Delta v={tensionDelta} />
      </span>
      {wide && score}
    </span>
  );
  const note = explain && (
    <div className="sb-explain-note" role="note">
      <b>{TERMS.capital.name}</b>: what your orders cost. You get +{pcIncome(world)} each month, up to ◆ {pcCap}. Unspent capital carries over. Now: ◆ {pcLeft} of {pcCap}
      {b && b.pc.orders ? `, ◆ ${b.pc.orders} on orders` : ''}.
      <button type="button" className="wc-btn small" onClick={() => setExplain(false)}>
        Close
      </button>
    </div>
  );

  if (cls === 'P')
    return (
      <header className="state-band is-phone" data-region="state" ref={ref}>
        <div className="sb-line">
          <span className="sb-s">
            <V v={monthText} />
          </span>
          <span className="sb-s sb-pc" data-point="capital">
            <V v={`◆ ${pcLeft} of ${pcCap}`} />
          </span>
          {orders}
          <button type="button" className="wc-btn small sb-more" aria-expanded={sheet} onClick={() => setSheet((v) => !v)}>
            State {sheet ? <IconChevronUp size={14} aria-hidden /> : <IconChevronDown size={14} aria-hidden />}
          </button>
        </div>
        {sheet && (
          <div className="sb-sheet" role="region" aria-label="State">
            <p className="sb-sheet-who">
              {flag(me.id)} {me.leader.name}, {me.name} · {monthText} of {world.maxTurns} · {monthLabel(world.date)}
              {electionText ? ` · ${electionText}` : ''}
            </p>
            <button type="button" className="wc-btn sb-mission" onClick={() => setDrawer('objective')} data-point="mission">
              <span>
                Mission: <b>{title}</b> · {goals}
              </span>
              <span className="sb-open">Open ›</span>
            </button>
            <div className="sb-sheet-grid">
              {pc}
              {explainBtn}
              {meetings}
              {defense}
              {country}
            </div>
            {note}
            {!gameOver && <ModeSwitch />}
            <Menu phone />
          </div>
        )}
      </header>
    );

  return (
    <header className={`state-band cls-${cls}`} data-region="state" ref={ref}>
      <div className="sb-l1">
        <span className="sb-who">
          <span aria-hidden>{flag(me.id)}</span> {who && <b>{who}</b>}
        </span>
        <span className="sb-month">
          <V v={monthText} />
          {electionText && <span className={me.approval < 45 ? 'sb-warn' : 'sb-elect'}> · {electionText}</span>}
        </span>
        <button type="button" className="wc-btn small sb-mission" onClick={() => setDrawer('objective')} aria-label={`Mission: ${title}. ${goals}. Open the mission sheet`} data-point="mission">
          {cls === 'T' ? (
            <span>Mission · {goals}</span>
          ) : (
            <span>
              Mission: <b>{title}</b> · {goals}
            </span>
          )}
          <span className="sb-open">Open ›</span>
        </button>
      </div>
      <div className="sb-l2">
        <span className="sb-grp sb-month-grp">
          {wide && <span className="sb-lbl">This month</span>}
          {pc}
          {explainBtn}
          {orders}
          {meetings}
          {defense}
        </span>
        <span className="sb-div" aria-hidden />
        {country}
      </div>
      <div className="sb-right">
        {!gameOver && <ModeSwitch />}
        <Menu />
      </div>
      {note}
    </header>
  );
}
