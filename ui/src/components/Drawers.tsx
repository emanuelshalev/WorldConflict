import { IconBook2, IconNews, IconUsers, IconWorld, IconX } from '@tabler/icons-react';
import { countryName, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, monthLabel } from '../lib/format';

const CABINET = [
  { id: 'FOREIGN_MINISTER', name: 'Foreign Minister', lens: 'Alliances, rivals, the art of the deal' },
  { id: 'DEFENSE_MINISTER', name: 'Defense Minister', lens: 'Force ratios, readiness, deterrence' },
  { id: 'INTELLIGENCE_CHIEF', name: 'Intelligence Chief', lens: 'What we know — and how sure we are' },
  { id: 'FINANCE_MINISTER', name: 'Finance Minister', lens: 'The bill for every option' },
  { id: 'DOMESTIC_ADVISOR', name: 'Interior Minister', lens: 'The street, the press, the polls' },
  { id: 'CHIEF_OF_STAFF', name: 'Chief of Staff', lens: 'The big picture and your survival' },
];

export function Drawers() {
  const drawer = useGameStore((s) => s.drawer);
  const setDrawer = useGameStore((s) => s.setDrawer);
  if (!drawer) return null;
  const tabs = [
    { id: 'cabinet', label: 'Cabinet', icon: <IconUsers size={15} /> },
    { id: 'world', label: 'World', icon: <IconWorld size={15} /> },
    { id: 'chronicle', label: 'Chronicle', icon: <IconNews size={15} /> },
    { id: 'objective', label: 'Mission', icon: <IconBook2 size={15} /> },
  ] as const;
  return (
    <>
      <div className="drawer-backdrop" onClick={() => setDrawer(null)} />
      <aside className="drawer" role="dialog">
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
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {drawer === 'cabinet' && <Cabinet />}
          {drawer === 'world' && <WorldPanel />}
          {drawer === 'chronicle' && <ChroniclePanel />}
          {drawer === 'objective' && <MissionPanel />}
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
        Each minister sees the world through their department — and only through our intelligence. Ask them anything.
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
      {world.wars.length === 0 && <p style={{ color: 'var(--text-3)' }}>The guns are silent — for now.</p>}
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
      <p style={{ fontSize: 14 }}>{me.alliances.length ? me.alliances.map((id) => `${flag(id)} ${countryName(id)}`).join(' · ') : 'None — you stand alone.'}</p>
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

function MissionPanel() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  const backstory = useGameStore((s) => s.playerBackstory);
  if (!world) return null;
  return (
    <>
      {world.objective ? (
        <>
          <h4 className="display" style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--accent)' }}>
            {world.objective.title}
          </h4>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>{world.objective.briefing}</p>
          {status.map((c) => (
            <div key={c.label} style={{ fontSize: 14, marginBottom: 4, color: c.failed ? 'var(--war)' : c.met ? 'var(--good)' : 'var(--text-2)' }}>
              {c.failed ? '✗' : c.met ? '✓' : '○'} {c.label} {c.bonus && <span className="chip">bonus ★</span>}
            </div>
          ))}
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
