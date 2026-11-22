import { useState } from 'react';
import { IconBook2, IconBroadcast, IconBroadcastOff, IconChevronDown, IconChevronUp, IconLayoutDashboard, IconMap2, IconMenu2, IconNews, IconSettings, IconUsers, IconWorld } from '@tabler/icons-react';
import { budgetStatus } from '../lib/budget';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, money, monthLabel } from '../lib/format';
import { TERMS } from '../lib/glossary';
import { pcIncome } from '../lib/month';
import { CapitalSeals } from './game/CapitalSeal';
import { SoundToggle } from './game/SoundToggle';
import { scoreLine, useScoreWhy } from '../lib/scoreWhy';
import '../styles/hud.css';

/**
 * The HUD (design-orders.md WP5, design-feel.md 5.2): full words for every indicator (no APPR,
 * STAB, CAP), political capital as the same seal meter the rail uses, the sound toggle always in
 * sight, and the score tile opening "why your score moved". Under 1280 px the minor indicators
 * fold behind "More"; on phones the HUD is two rows.
 */

function Delta({ v }: { v?: number }) {
  if (v === undefined || Math.abs(v) < 0.5) return null;
  return (
    <small className={v > 0 ? 'delta-up' : 'delta-down'} aria-label={`${v > 0 ? 'up' : 'down'} ${Math.abs(Math.round(v))} last month`}>
      {v > 0 ? '▲' : '▼'}
      {Math.abs(Math.round(v))}
    </small>
  );
}

function Stat({ label, value, delta, danger, suffix = '', minor = false, point }: { label: string; value: number; delta?: number; danger?: boolean; suffix?: string; minor?: boolean; point?: string }) {
  return (
    <div className={`stat${danger ? ' danger' : ''}${minor ? ' minor' : ''}`} data-point={point}>
      <label>{label}</label>
      <div className="val">
        {Math.round(value)}
        {suffix}
        <Delta v={delta} />
      </div>
    </div>
  );
}

export function Hud() {
  const world = useGameStore((s) => s.worldState);
  const setDrawer = useGameStore((s) => s.setDrawer);
  const openModal = useGameStore((s) => s.openModal);
  const usage = useGameStore((s) => s.aiTotalUsage);
  const tier = useGameStore((s) => s.llmSettings.tier);
  const provider = useGameStore((s) => s.llmSettings.provider);
  const pendingDecisions = useGameStore((s) => s.pendingDecisions);
  const me = usePlayerCountry();
  const deskMode = useGameStore((s) => s.deskMode);
  const setDeskMode = useGameStore((s) => s.setDeskMode);
  const showTicker = useGameStore((s) => s.showTicker);
  const setShowTicker = useGameStore((s) => s.setShowTicker);
  const gameOver = useGameStore((s) => s.gameOver);
  const [more, setMore] = useState(false);
  const [explain, setExplain] = useState(false);
  const [menu, setMenu] = useState(false);
  // Re-render when the month's selection changes (the capital figure follows it)
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.decisionChoices);
  if (!world || !me) return null;

  const d = world.turnReport?.deltas ?? {};
  const delta = (k: string) => (d[k] ? d[k].after - d[k].before : undefined);
  // Same figure as the desk's seal bank: what is left this month after answers and queued orders
  const budget = budgetStatus();
  const pcTotal = budget ? Math.max(0, budget.pc.bank + budget.pc.crisis + budget.pc.meetings) : world.politicalCapital;
  const pc = budget ? budget.pc.left : world.politicalCapital;
  const held = budget ? Math.min(pcTotal, budget.pc.orders) : 0;
  const llmOn = provider !== 'builtin' && tier !== 'ALGORITHMIC';
  const election = me.politicalSystem.nextElectionTurn;
  const monthsToElection = election !== null && election >= world.turn && election - world.turn <= 12 ? election - world.turn : null;
  // One tension number everywhere (tile, result card, paper): the world's, rounded
  const tension = Math.round(world.globalTension);
  const tensionDelta = world.turnReport?.tension ? tension - world.turnReport.tension.before : undefined;
  const income = pcIncome(world);
  const growth = (me.realGrowth ?? me.growthRate) * 100;
  const why = scoreLine(world.turnReport?.score);

  return (
    <header className={`hud${more ? ' more-open' : ''}`}>
      <div className="hud-flag" aria-hidden>
        {flag(me.id)}
      </div>
      <div className="hud-who">
        <b title={`${me.leader.title} ${me.leader.name}`}>{me.leader.name}</b>
        <span>
          {me.name} · <span className="num">{monthLabel(world.date)}</span> · Month{' '}
          <span className="num">
            {Math.min(world.turn + 1, world.maxTurns)} of {world.maxTurns}
          </span>
          {monthsToElection !== null && (
            <span style={{ color: me.approval < 45 ? 'var(--war)' : 'var(--accent)' }}>
              {' '}
              · election in {monthsToElection === 0 ? 'days' : `${monthsToElection} month${monthsToElection === 1 ? '' : 's'}`}
            </span>
          )}
        </span>
      </div>

      <div className="hud-stats">
        <Stat label={TERMS.approval.name} value={me.approval} delta={delta('approval')} danger={me.approval < 30} suffix="%" />
        <Stat label={TERMS.stability.name} value={me.stability} delta={delta('stability')} danger={me.stability < 30} suffix="%" />
        <Stat label={TERMS.legitimacy.name} value={me.legitimacy} delta={delta('legitimacy')} danger={me.legitimacy < 30} suffix="%" minor />
        <div className="stat minor">
          <label>{TERMS.economy.name}</label>
          <div className="val">
            {money(me.gdp)}
            <small className={growth >= 0 ? 'delta-up' : 'delta-down'} title="Real growth, annualised: what actually happened to GDP">
              {growth >= 0 ? '+' : ''}
              {growth.toFixed(1)}%
            </small>
          </div>
        </div>
        <div className="stat capital" data-point="capital">
          <button type="button" className="stat-btn" onClick={() => setExplain((v) => !v)} aria-expanded={explain} aria-label={`${TERMS.capital.name}: ${pc} of ${pcTotal} left. What is this?`}>
            <label>{TERMS.capital.name}</label>
            <span className="val pc-val">
              <CapitalSeals left={Math.max(0, pc)} held={held} short={pc < 0 ? -pc : 0} size={24} gap={3} />
              <span className="pc-left num" style={{ color: pc < 0 ? 'var(--war)' : undefined }}>
                {pc} left
              </span>
            </span>
          </button>
          {explain && (
            <div className="hud-explain" role="note">
              <b>{TERMS.capital.name}</b>: what your orders cost. You get +{income} each month, up to ◆ 6. Unspent capital carries over.
              <span className="num">
                {' '}
                Now: {pc} of {pcTotal} left{held ? `, ${held} on orders` : ''}.
              </span>
            </div>
          )}
        </div>
        <div className="stat tension minor">
          <label>{TERMS.tension.name}</label>
          <div className="bar" aria-hidden>
            <div style={{ width: `${tension}%` }} />
          </div>
          <div className="val tension-num" style={{ color: tension >= 80 ? 'var(--war)' : undefined }}>
            {tension}
            <Delta v={tensionDelta} />
          </div>
        </div>
        <div className="stat minor score">
          <button type="button" className="stat-btn" onClick={() => useScoreWhy.getState().show(true)} title={why ?? 'Why your score moves'} aria-label={`${TERMS.score.name} ${world.score?.total ?? 100}. Why your score moved`}>
            <label>{TERMS.score.name}</label>
            <span className="val">
              {Math.round(world.score?.total ?? 100)}
              <Delta v={delta('score')} />
            </span>
          </button>
        </div>
        <button type="button" className="hud-more" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-label={more ? 'Fewer indicators' : 'All indicators'}>
          {more ? <IconChevronUp size={18} aria-hidden /> : <IconChevronDown size={18} aria-hidden />}
          <span>More</span>
        </button>
      </div>

      {!gameOver && (
        <div className="seg mode-seg" role="tablist" aria-label="Map or desk (M)">
          <button role="tab" aria-selected={deskMode === 'map'} className={deskMode === 'map' ? 'on' : ''} onClick={() => setDeskMode('map')} title="Investigate the world (M)">
            <IconMap2 size={15} /> <span>Map</span>
          </button>
          <button role="tab" aria-selected={deskMode === 'desk'} className={deskMode === 'desk' ? 'on' : ''} onClick={() => setDeskMode('desk')} title="Decide this month (M)">
            <IconLayoutDashboard size={15} /> <span>Desk</span>
          </button>
        </div>
      )}
      <div className="hud-menu">
        <SoundToggle className="hud-sound" />
        <button className="icon-btn hide-phone" aria-pressed={showTicker} title={showTicker ? 'Hide the news ticker (N)' : 'Show the news ticker (N)'} aria-label={showTicker ? 'Hide the news ticker' : 'Show the news ticker'} onClick={() => setShowTicker(!showTicker)}>
          {showTicker ? <IconBroadcast size={18} /> : <IconBroadcastOff size={18} />}
        </button>
        {llmOn && (
          <button className="cost-chip hide-phone" onClick={() => openModal('settings')} title="LLM usage this game">
            AI {usage ? `${(usage.promptTokens + usage.completionTokens).toLocaleString()} tokens` : 'on'}
            {usage?.costUsd !== null && usage?.costUsd !== undefined ? ` · $${usage.costUsd.toFixed(3)}` : ''}
          </button>
        )}
        <button className="icon-btn hide-phone" title="Cabinet: talk to your advisors" aria-label="Cabinet" onClick={() => setDrawer('cabinet')}>
          <IconUsers size={18} />
        </button>
        <button className="icon-btn hide-phone" title="World: wars, alliances, rivals" aria-label="World" onClick={() => setDrawer('world')}>
          <IconWorld size={18} />
        </button>
        <button className="icon-btn hide-phone" title="Chronicle: news and history" aria-label="Chronicle" onClick={() => setDrawer('chronicle')}>
          <IconNews size={18} />
        </button>
        <button className="icon-btn hide-phone" title="Mission and record" aria-label="Mission and record" onClick={() => setDrawer('objective')}>
          <IconBook2 size={18} />
          {pendingDecisions.length > 0 && <span className="badge">{pendingDecisions.length}</span>}
        </button>
        <button className="icon-btn hide-phone" title="Settings and AI" aria-label="Settings" onClick={() => openModal('settings')}>
          <IconSettings size={18} />
        </button>
        <button className="icon-btn" title="Menu" aria-label="Menu" onClick={() => (window.innerWidth <= 600 ? setMenu((v) => !v) : openModal('saveLoad'))} aria-expanded={menu}>
          <IconMenu2 size={18} />
        </button>
      </div>
      {menu && (
        <div className="hud-phone-menu" onClick={() => setMenu(false)}>
          <button type="button" className="wc-btn ghost" onClick={() => setDrawer('cabinet')}>
            <IconUsers size={16} aria-hidden /> Cabinet
          </button>
          <button type="button" className="wc-btn ghost" onClick={() => setDrawer('world')}>
            <IconWorld size={16} aria-hidden /> World
          </button>
          <button type="button" className="wc-btn ghost" onClick={() => setDrawer('chronicle')}>
            <IconNews size={16} aria-hidden /> Chronicle
          </button>
          <button type="button" className="wc-btn ghost" onClick={() => setDeskMode(deskMode === 'map' ? 'desk' : 'map')}>
            {deskMode === 'map' ? <IconLayoutDashboard size={16} aria-hidden /> : <IconMap2 size={16} aria-hidden />} {deskMode === 'map' ? 'Desk' : 'Map'}
          </button>
          <button type="button" className="wc-btn ghost" onClick={() => openModal('settings')}>
            <IconSettings size={16} aria-hidden /> Settings
          </button>
          <button type="button" className="wc-btn ghost" onClick={() => openModal('saveLoad')}>
            <IconMenu2 size={16} aria-hidden /> Save and load
          </button>
        </div>
      )}
    </header>
  );
}
