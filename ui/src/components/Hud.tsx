import { IconBook2, IconMenu2, IconNews, IconSettings, IconUsers, IconWorld } from '@tabler/icons-react';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, money, monthLabel } from '../lib/format';

function Stat({
  label,
  value,
  delta,
  danger,
  suffix = '',
}: {
  label: string;
  value: number;
  delta?: number;
  danger?: boolean;
  suffix?: string;
}) {
  return (
    <div className={`stat ${danger ? 'danger' : ''}`}>
      <label>{label}</label>
      <div className="val">
        {Math.round(value)}
        {suffix}
        {delta !== undefined && Math.abs(delta) >= 0.5 && (
          <small className={delta > 0 ? 'delta-up' : 'delta-down'}>
            {delta > 0 ? '▲' : '▼'}
            {Math.abs(Math.round(delta))}
          </small>
        )}
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
  if (!world || !me) return null;

  const d = world.turnReport?.deltas ?? {};
  const delta = (k: string) => (d[k] ? d[k].after - d[k].before : undefined);
  const pc = world.politicalCapital;
  const llmOn = provider !== 'builtin' && tier !== 'ALGORITHMIC';
  const election = me.politicalSystem.nextElectionTurn;
  const monthsToElection =
    election !== null && election >= world.turn && election - world.turn <= 12 ? election - world.turn : null;

  return (
    <header className="hud">
      <div style={{ fontSize: 30, lineHeight: 1 }}>{flag(me.id)}</div>
      <div className="hud-who">
        <b>
          {me.leader.title} {me.leader.name}
        </b>
        <span>
          {me.name} · <span className="num">{monthLabel(world.date)}</span> · month{' '}
          <span className="num">
            {Math.min(world.turn + 1, world.maxTurns)}/{world.maxTurns}
          </span>
          {monthsToElection !== null && (
            <span style={{ color: me.approval < 45 ? 'var(--war)' : 'var(--accent)' }}>
              {' '}
              · election in {monthsToElection === 0 ? 'days' : `${monthsToElection} mo`}
            </span>
          )}
        </span>
      </div>

      <div className="hud-stats">
        <Stat label="Approval" value={me.approval} delta={delta('approval')} danger={me.approval < 30} suffix="%" />
        <Stat label="Stability" value={me.stability} delta={delta('stability')} danger={me.stability < 30} suffix="%" />
        <Stat
          label="Legitimacy"
          value={me.legitimacy}
          delta={delta('legitimacy')}
          danger={me.legitimacy < 30}
          suffix="%"
        />
        <div className="stat" title="GDP">
          <label>Economy</label>
          <div className="val">
            {money(me.gdp)}
            <small className={me.growthRate >= 0 ? 'delta-up' : 'delta-down'}>
              {(me.growthRate * 100).toFixed(1)}%
            </small>
          </div>
        </div>
        <div className="stat" title="Political capital: spent on orders, refilled monthly">
          <label>Capital</label>
          <div className="pc-pips">
            {Array.from({ length: Math.max(pc, 3) }).map((_, i) => (
              <i key={i} className={i < pc ? 'full' : ''} />
            ))}
          </div>
        </div>
        <div className="stat tension" title="Global tension">
          <label>World tension</label>
          <div className="bar">
            <div style={{ width: `${world.globalTension}%` }} />
          </div>
        </div>
        <Stat label="Score" value={world.score?.total ?? 100} delta={delta('score')} />
      </div>

      <div className="hud-menu">
        {llmOn && (
          <button className="cost-chip" onClick={() => openModal('settings')} title="LLM usage this game">
            AI {usage ? `${(usage.promptTokens + usage.completionTokens).toLocaleString()} tok` : 'on'}
            {usage?.costUsd !== null && usage?.costUsd !== undefined ? ` · $${usage.costUsd.toFixed(3)}` : ''}
          </button>
        )}
        <button className="icon-btn" title="Cabinet: talk to your advisors" onClick={() => setDrawer('cabinet')}>
          <IconUsers size={18} />
        </button>
        <button className="icon-btn" title="World: wars, alliances, rivals" onClick={() => setDrawer('world')}>
          <IconWorld size={18} />
        </button>
        <button className="icon-btn" title="Chronicle: news and history" onClick={() => setDrawer('chronicle')}>
          <IconNews size={18} />
        </button>
        <button className="icon-btn" title="Mission & record" onClick={() => setDrawer('objective')}>
          <IconBook2 size={18} />
          {pendingDecisions.length > 0 && <span className="badge">{pendingDecisions.length}</span>}
        </button>
        <button className="icon-btn" title="Settings & AI" onClick={() => openModal('settings')}>
          <IconSettings size={18} />
        </button>
        <button className="icon-btn" title="Menu" onClick={() => openModal('saveLoad')}>
          <IconMenu2 size={18} />
        </button>
      </div>
    </header>
  );
}
