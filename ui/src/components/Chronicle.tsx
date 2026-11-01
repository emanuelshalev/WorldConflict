import { useEffect, useState } from 'react';
import { countryName, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, money, monthLabel } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { OutcomeReel } from '../scenes/OutcomeReel';
import { SceneFrame } from '../scenes/SceneFrame';
import { sceneForNews } from '../scenes/kinds';

const MOMENT_COLOR: Record<string, string> = {
  'CLOSE CALL': '#b3261e',
  'TRAILING IN THE POLLS': '#b3261e',
  COMEBACK: '#1e7d4f',
  'UNDER ATTACK': '#b3261e',
  'NEW ALLIANCE': '#1f3a5f',
};

/** Full-width red "BREAKING" bar for wars, coups and nuclear events. */
export function Stinger() {
  const events = useGameStore((s) => s.lastEvents);
  const showChronicle = useGameStore((s) => s.showChronicle);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const critical = events.find(
    (e) => e.severity === 'CRITICAL' && ['WAR', 'NUCLEAR', 'GOVERNMENT', 'COVERT'].includes(e.type),
  );
  useEffect(() => {
    if (!critical) return;
    document.querySelector('.game')?.classList.add('shake');
    const t = setTimeout(() => document.querySelector('.game')?.classList.remove('shake'), 300);
    const auto = setTimeout(() => setDismissed(critical.id), 2600);
    return () => {
      clearTimeout(t);
      clearTimeout(auto);
    };
  }, [critical]);
  if (!critical || !showChronicle || dismissed === critical.id) return null;
  return (
    <div className="stinger" onClick={() => setDismissed(critical.id)} role="alert">
      <small>BREAKING NEWS</small>
      <b>{critical.title}</b>
    </div>
  );
}

export function Chronicle() {
  const show = useGameStore((s) => s.showChronicle);
  const setShow = useGameStore((s) => s.setShowChronicle);
  const world = useGameStore((s) => s.worldState);
  const statements = useGameStore((s) => s.leaderStatements);
  const notice = useGameStore((s) => s.aiNotice);
  const gameOver = useGameStore((s) => s.gameOver);
  const openModal = useGameStore((s) => s.openModal);
  const me = usePlayerCountry();
  const [reelTurn, setReelTurn] = useState(-1);
  const report0 = world?.turnReport;
  const reel = !!(show && world && me && report0 && reelTurn !== world.turn && (report0.orders.length > 0 || report0.decisions.length > 0));
  const ref = useModalFocus<HTMLDivElement>(!!(show && world && me) && !reel);
  if (!show || !world || !me) return null;
  if (reel && report0)
    return <OutcomeReel report={report0} date={world.date} turn={world.turn} home={me.id} onDone={() => setReelTurn(world.turn)} />;

  const news = world.newspaper;
  const lead = news.find((n) => n.relatedCountries.includes(me.id)) ?? news[0];
  const rest = news.filter((n) => n !== lead).slice(0, 8);
  const report = world.turnReport;
  const delta = (k: string) => (report?.deltas[k] ? report.deltas[k].after - report.deltas[k].before : 0);
  const fmt = (v: number, suffix = '') => (
    <b className={v > 0.4 ? 'delta-up' : v < -0.4 ? 'delta-down' : ''} style={{ color: Math.abs(v) <= 0.4 ? undefined : undefined }}>
      {v > 0 ? '+' : ''}
      {v.toFixed(Math.abs(v) < 10 ? 1 : 0)}
      {suffix}
    </b>
  );
  const close = () => {
    setShow(false);
    if (gameOver) openModal('endGame');
  };

  return (
    <div ref={ref} className="overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Monthly report">
      <article className="paper" onClick={(e) => e.stopPropagation()}>
        <div className="masthead">
          <h2>The World Chronicle</h2>
          <div className="dateline">
            <span>{monthLabel(world.date)}</span>
            <span>
              Global tension {Math.round(world.globalTension)}/100
            </span>
            <span>
              Month {world.turn}/{world.maxTurns}
            </span>
          </div>
        </div>

        {lead && (
          <div className="lead">
            <SceneFrame
              kind={sceneForNews(lead.category, lead.headline)}
              home={me.id}
              other={lead.relatedCountries.find((id) => id !== me.id)}
              mood={['WAR', 'NUCLEAR'].includes(lead.category) ? 'bad' : 'neutral'}
              size="card"
            />
            <div className="story">
              <span className="kicker">{lead.category}</span>
            </div>
            <h3>{lead.headline}</h3>
            <p>{lead.description}</p>
          </div>
        )}

        {report && (
          <div className="your-month">
            <h4>
              {flag(me.id)} YOUR MONTH IN {me.name.toUpperCase()}
            </h4>
            <div className="deltas">
              <div>
                Approval
                {fmt(delta('approval'))}
              </div>
              <div>
                Stability
                {fmt(delta('stability'))}
              </div>
              <div>
                Legitimacy
                {fmt(delta('legitimacy'))}
              </div>
              <div>
                GDP
                <b>{money(report.deltas.gdp?.after ?? me.gdp)}</b>
              </div>
              <div>
                Score
                {fmt(delta('score'))}
              </div>
            </div>
            {(report.orders.length > 0 || report.decisions.length > 0 || report.causes.length > 0) && (
              <ul className="causes">
                {report.decisions.map((d) => (
                  <li key={d.title}>
                    <b style={{ color: '#f4efe4' }}>{d.title}:</b> {d.choice}
                  </li>
                ))}
                {report.orders.map((o, i) => (
                  <li key={`${o.label}-${i}`} style={{ color: o.ok ? undefined : '#ff9a9b' }}>
                    {o.ok ? '✓' : '✗'} {o.label}, {o.detail}
                  </li>
                ))}
                {report.causes.slice(0, 5).map((c) => (
                  <li key={c} style={{ color: '#b9b2a2' }}>
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {report.moments.map((m) => (
              <span key={m} className="moment-stamp" style={{ color: MOMENT_COLOR[m] === '#1e7d4f' ? 'var(--good)' : m === 'NEW ALLIANCE' ? 'var(--intel)' : '#ff6b6d' }}>
                {m}
              </span>
            ))}
          </div>
        )}

        <div className="paper-cols">
          {rest.map((n, i) => (
            <div className="story" key={`${n.headline}-${i}`}>
              {i < 3 && (
                <SceneFrame kind={sceneForNews(n.category, n.headline)} home={n.relatedCountries[0]} other={n.relatedCountries[1]} size="thumb" />
              )}
              <span className="kicker">
                {n.category} {n.relatedCountries.slice(0, 2).map((id) => flag(id)).join(' ')}
              </span>
              <h4>{n.headline}</h4>
              <p>{n.description}</p>
            </div>
          ))}
          {statements.map((s) => (
            <div className="story" key={s.countryId}>
              <span className="kicker">STATEMENT {flag(s.countryId)}</span>
              <h4>{s.leader}</h4>
              <p>“{s.text}”: {countryName(s.countryId)}</p>
            </div>
          ))}
        </div>
        {notice && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8a2a1c' }}>{notice}</p>}

        <div className="paper-foot">
          <button className="wc-btn primary big" onClick={close}>
            {gameOver ? 'See your verdict ▸' : 'To your desk ▸'}
          </button>
        </div>
      </article>
    </div>
  );
}

/** Red heartbeat vignette when the player is in danger. */
export function DangerVignette() {
  const world = useGameStore((s) => s.worldState);
  const me = usePlayerCountry();
  const decisions = useGameStore((s) => s.pendingDecisions);
  if (!world || !me || world.gameOver) return null;
  const low = Math.min(me.approval, me.stability, me.legitimacy);
  const plot = decisions.some((d) => ['coup_plot', 'streets_boiling'].includes(d.templateId));
  if (low >= 28 && !plot) return null;
  return <div className="vignette" aria-hidden />;
}
