import { Suspense, lazy } from 'react';
import { IconBook, IconBook2, IconNews, IconUsers, IconWorld, IconX } from '@tabler/icons-react';
import { type ConditionStatus, countryName, orderKey, queueOrder, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, monthLabel } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { primaryId, primaryItem } from '../lib/month';
import { STATE_WORD, missionSummary, nowNeed, stateOf } from '../lib/goals';
import { useScoreWhy } from '../lib/scoreWhy';
import { metCount } from '../lib/learn';
import { useExplain } from './learn/explain';

// The codex page loads on first open (keeps the main bundle small)
const Codex = lazy(() => import('./learn/Codex').then((m) => ({ default: m.Codex })));

const CABINET = [
  { id: 'FOREIGN_MINISTER', name: 'Foreign Minister', lens: 'Alliances, rivals, the art of the deal' },
  { id: 'DEFENSE_MINISTER', name: 'Defense Minister', lens: 'Force ratios, readiness, deterrence' },
  { id: 'INTELLIGENCE_CHIEF', name: 'Intelligence Chief', lens: 'What we know, and how sure we are' },
  { id: 'FINANCE_MINISTER', name: 'Finance Minister', lens: 'The bill for every option' },
  { id: 'DOMESTIC_ADVISOR', name: 'Interior Minister', lens: 'The street, the press, the polls' },
  { id: 'CHIEF_OF_STAFF', name: 'Chief of Staff', lens: 'The big picture and your survival' },
];

export function Drawers() {
  const drawer = useGameStore((s) => s.drawer);
  const setDrawer = useGameStore((s) => s.setDrawer);
  const ref = useModalFocus<HTMLElement>(!!drawer);
  // The codex counter is silent: a number on its tab, never a toast (D-53)
  const met = useGameStore((s) => metCount(s.learn));
  const codexNonce = useExplain((s) => s.codexNonce);
  if (!drawer) return null;
  const tabs = [
    { id: 'cabinet', label: 'Cabinet', icon: <IconUsers size={15} /> },
    { id: 'world', label: 'World', icon: <IconWorld size={15} /> },
    { id: 'chronicle', label: 'Chronicle', icon: <IconNews size={15} /> },
    { id: 'objective', label: 'Mission', icon: <IconBook2 size={15} /> },
    { id: 'codex', label: 'Codex', icon: <IconBook size={15} />, count: met },
  ] as const;
  return (
    <>
      <div className="drawer-backdrop" onClick={() => setDrawer(null)} />
      <aside ref={ref} className={`drawer d-${drawer}`} role="dialog" aria-modal="true" aria-label="Side panel">
        <div className="drawer-head">
          <h3>{tabs.find((t) => t.id === drawer)?.label}</h3>
          <button className="icon-btn" onClick={() => setDrawer(null)} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="drawer-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={drawer === t.id ? 'on' : ''} onClick={() => setDrawer(t.id)}>
              {t.icon} {t.label}
              {'count' in t && t.count > 0 && <span className="num lx-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {drawer === 'cabinet' && <Cabinet />}
          {drawer === 'world' && <WorldPanel />}
          {drawer === 'chronicle' && <ChroniclePanel />}
          {drawer === 'objective' && <MissionPanel />}
          {drawer === 'codex' && (
            <Suspense fallback={<p className="hint">Opening the codex...</p>}>
              <Codex key={codexNonce} />
            </Suspense>
          )}
        </div>
      </aside>
    </>
  );
}

function Cabinet() {
  const provider = useGameStore((s) => s.llmSettings.provider);
  return (
    <>
      <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 0 }}>
        Each minister sees the world through their department, and only through our intelligence. Ask them anything.
        {provider === 'builtin' && ' (Connect an LLM in Settings for free-form conversation.)'}
      </p>
      {CABINET.map((a) => (
        <button
          key={a.id}
          className="list-item"
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
          onClick={() => {
            useGameStore.setState({ drawer: null, activeAdvisorRole: a.id, activeModal: 'advisor' });
          }}
        >
          <h5>{a.name}</h5>
          <p>{a.lens}</p>
        </button>
      ))}
    </>
  );
}

function WorldPanel() {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const me = usePlayerCountry();
  if (!world || !me) return null;
  const others = view.filter((v) => !v.isPlayer);
  const rivals = [...others].sort((a, b) => a.relationWithPlayer - b.relationWithPlayer).slice(0, 6);
  const friends = [...others].sort((a, b) => b.relationWithPlayer - a.relationWithPlayer).slice(0, 6);
  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>
        Wars ({world.wars.length})
      </div>
      {world.wars.length === 0 && <p style={{ color: 'var(--text-3)' }}>The guns are silent, for now.</p>}
      {world.wars.map((w) => {
        const mine = w.attackerId === me.id || w.defenderId === me.id;
        const pct = w.frontline;
        return (
          <div key={w.id} className="list-item" style={mine ? { borderColor: 'var(--war)' } : {}}>
            <h5>
              {flag(w.attackerId)} {countryName(w.attackerId)} → {flag(w.defenderId)} {countryName(w.defenderId)}
            </h5>
            <div className="frontline" title="Front line: left = attacker's advance">
              <div style={{ width: `${pct}%` }} />
            </div>
            <p className="num" style={{ fontSize: 11.5 }}>
              Front {Math.round(pct)}/100 · exhaustion {Math.round(w.exhaustion)}% · since {w.startTurn === 0 ? 'before you' : `month ${w.startTurn}`}
            </p>
          </div>
        );
      })}
      <div className="section-label">Your alliances</div>
      <p style={{ fontSize: 14 }}>{me.alliances.length ? me.alliances.map((id) => `${flag(id)} ${countryName(id)}`).join(' · ') : 'None, you stand alone.'}</p>
      <div className="section-label">Closest friends</div>
      {friends.map((v) => (
        <Relation key={v.id} id={v.id} name={v.name} value={v.relationWithPlayer} level={v.diplomaticLevel} />
      ))}
      <div className="section-label">Most hostile</div>
      {rivals.map((v) => (
        <Relation key={v.id} id={v.id} name={v.name} value={v.relationWithPlayer} level={v.diplomaticLevel} />
      ))}
    </>
  );
}

function Relation({ id, name, value, level }: { id: string; name: string; value: number; level: string }) {
  const pct = (value + 100) / 2;
  return (
    <button
      className="list-item"
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', padding: '8px 10px' }}
      onClick={() => useGameStore.setState({ drawer: null, selectedCountryId: id })}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>
          {flag(id)} {name}
        </span>
        <span className="num" style={{ color: value >= 0 ? 'var(--ally)' : 'var(--rival)' }}>
          {level.replace('_', ' ')} {Math.round(value)}
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 999, marginTop: 6, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: value >= 0 ? '50%' : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
            height: '100%',
            background: value >= 0 ? 'var(--ally)' : 'var(--rival)',
            borderRadius: 999,
          }}
        />
      </div>
    </button>
  );
}

function ChroniclePanel() {
  const world = useGameStore((s) => s.worldState);
  if (!world) return null;
  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>
        This month · {monthLabel(world.date)}
      </div>
      {world.newspaper.map((n, i) => (
        <div className="list-item" key={`${n.headline}-${i}`}>
          <h5>{n.headline}</h5>
          <p>{n.description}</p>
        </div>
      ))}
      <div className="section-label">The record</div>
      {[...world.timeline].reverse().slice(0, 60).map((t, i) => (
        <div key={`${t.turn}-${i}`} style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>
          <span className="num" style={{ color: 'var(--text-3)' }}>{monthLabel(t.date)}</span> · {t.description}
        </div>
      ))}
    </>
  );
}

/** "Last month: +3", "Last month: no change", "Last month: first month". */
function lastMonth(c: ConditionStatus, turn: number): string | null {
  if (c.now === undefined) return null;
  if (turn === 0 || c.trend === undefined) return 'Last month: first month';
  const t = Math.round(c.trend);
  return t === 0 ? 'Last month: no change' : `Last month: ${t > 0 ? '+' : ''}${t}`;
}

/** One objective row of the Mission sheet: state, now and need, last month, and what helps now. */
function ObjectiveRow({ c, turn }: { c: ConditionStatus; turn: number }) {
  const state = stateOf(c);
  const nn = nowNeed(c);
  const helps = (c.helps ?? []).slice(0, 3);
  const go = (h: NonNullable<ConditionStatus['helps']>[number]) => {
    const s = useGameStore.getState();
    if (h.kind === 'order' && h.action) {
      void queueOrder({ ...h.action, label: h.label, origin: 'player', why: `Mission: ${c.short ?? c.label}` });
      return;
    }
    if (!h.id) return;
    s.setDrawer(null);
    s.setDeskMode('desk');
    const isPrimary = primaryId(primaryItem()) === h.id;
    if (!isPrimary) s.setDeskView('full');
    s.setFocus({ kind: h.kind === 'meeting' ? 'meeting' : 'crisis', id: h.id });
  };
  const queued = useGameStore((s) => s.pendingActions);
  return (
    <div className={`mission-row s-${state}${c.bonus ? ' bonus' : ''}`}>
      <i className={c.bonus ? `gdot s-${state}` : `gseg s-${state}`} aria-hidden />
      <div className="mission-body">
        <div className="mission-top">
          <b className={state === 'failed' ? 'struck' : ''}>{c.short ?? c.label}</b>
          <span className={`mission-state st-${state}`}>{STATE_WORD[state]}</span>
        </div>
        {(nn || c.unit === 'score') && (
          <p className="mission-nn">
            {nn ? nn.replace(/^./, (x) => x.toUpperCase()) : ''}
            {c.unit === 'score' && (
              <>
                {' '}
                <button type="button" className="link" onClick={() => useScoreWhy.getState().show(true)}>
                  Why?
                </button>
              </>
            )}
            {lastMonth(c, turn) && <span className="mission-last"> · {lastMonth(c, turn)}</span>}
          </p>
        )}
        {helps.length > 0 && state !== 'failed' && (
          <div className="mission-helps">
            <span>Helps now:</span>
            {helps.map((h) => {
              const inPlan = h.kind === 'order' && h.action && queued.some((a) => orderKey(a) === orderKey(h.action as Parameters<typeof orderKey>[0]));
              return (
                <button key={`${h.kind}-${h.label}`} type="button" className="mission-help" onClick={() => go(h)} disabled={!!inPlan}>
                  {h.label} <small>({inPlan ? 'in this month' : h.kind})</small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MissionPanel() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  const backstory = useGameStore((s) => s.playerBackstory);
  if (!world) return null;
  const primary = status.filter((c) => !c.bonus);
  const bonus = status.filter((c) => c.bonus);
  return (
    <>
      {world.objective ? (
        <>
          <h4 className="display" style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--accent)' }}>
            {world.objective.title}
          </h4>
          <p className="mission-sum num">{missionSummary(status, world.turn, world.maxTurns)}</p>
          <div className="mission-rows">
            {primary.map((c) => (
              <ObjectiveRow key={c.label} c={c} turn={world.turn} />
            ))}
          </div>
          {bonus.length > 0 && (
            <>
              <div className="section-label">Bonus</div>
              <div className="mission-rows">
                {bonus.map((c) => (
                  <ObjectiveRow key={c.label} c={c} turn={world.turn} />
                ))}
              </div>
            </>
          )}
          <div className="section-label">Briefing</div>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>{world.objective.briefing}</p>
        </>
      ) : (
        <p style={{ color: 'var(--text-2)' }}>Legacy mode: survive a decade and let history judge your score.</p>
      )}
      <div className="section-label">How you came to power</div>
      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.6 }}>{backstory}</p>
      <div className="section-label">Record</div>
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Close calls survived: <b>{world.director?.closeCalls ?? 0}</b> · comebacks: <b>{world.director?.rallies ?? 0}</b> · difficulty:{' '}
        <b>{world.difficulty}</b>
      </p>
    </>
  );
}
