import { useCallback, useEffect, useRef, useState } from 'react';
import { IconPlayerSkipForward, IconChevronRight, IconTrendingDown, IconTrendingUp, IconMinus } from '@tabler/icons-react';
import type { TurnReport } from '../store/gameStore';
import { monthLabel } from '../lib/format';
import { SceneFrame, type Verdict } from './SceneFrame';
import { sceneForAction, sceneForCrisis, type SceneKind } from './kinds';
import type { Mood } from './art/types';
import { ActionIcon } from './icons';
import { OutcomeMap, type MapEffect } from './OutcomeMap';
import './reel.css';

type Fact = NonNullable<TurnReport['orders'][number]['facts']>[number];
type Ledger = Record<string, Array<{ turn: number; value: number; target?: string }>>;

interface Shot {
  facts?: Fact[];
  story?: string;
  kind: SceneKind;
  kicker: string;
  headline: string;
  sub?: string;
  verdict: Verdict;
  mood: Mood;
  other?: string;
  type?: string;
}

const SHOT_MS = 3600;

/** Which geographic animation an order gets in the dispatch panel. */
function mapEffect(type?: string): MapEffect | null {
  switch (type) {
    case 'MILITARY_DEPLOY_BORDER': return 'deploy';
    case 'MILITARY_WITHDRAW_BORDER': return 'withdraw';
    case 'MILITARY_AIRSTRIKE':
    case 'INTEL_SABOTAGE': return type === 'INTEL_SABOTAGE' ? 'covert' : 'strike';
    case 'NUCLEAR_STRIKE': return 'nuke';
    case 'DIPLOMACY_PROPOSE_ALLIANCE': return 'alliance';
    case 'DIPLOMACY_IMPROVE_RELATIONS': return 'court';
    case 'DIPLOMACY_DENOUNCE':
    case 'DIPLOMACY_BREAK_ALLIANCE': return 'denounce';
    case 'DIPLOMACY_PROPOSE_CEASEFIRE':
    case 'DIPLOMACY_MEDIATE': return 'ceasefire';
    case 'DIPLOMACY_DECLARE_WAR': return 'war';
    default: return type?.startsWith('INTEL_') ? 'covert' : null;
  }
}
const ORDER_MS = 5600; // orders carry a dispatch and numbers to read

function verdictFor(o: TurnReport['orders'][number]): Verdict {
  if (o.ok) return 'success';
  return /backfire|exposed|blowback/i.test(o.detail) ? 'backfired' : 'failed';
}

function shotsFor(report: TurnReport): Shot[] {
  const shots: Shot[] = report.decisions.map((d) => ({
    kind: sceneForCrisis(d.templateId, d.title),
    kicker: d.templateId?.startsWith('meeting_') ? 'Meeting' : 'Crisis decision',
    headline: d.title,
    sub: d.choice,
    verdict: 'decided',
    mood: 'neutral',
  }));
  for (const o of report.orders) {
    const v = verdictFor(o);
    shots.push({
      kind: sceneForAction(o.type),
      kicker: 'Your order',
      headline: o.label,
      sub: o.story ? undefined : o.detail,
      story: o.story || o.detail,
      facts: o.facts,
      verdict: v,
      mood: v === 'success' ? 'good' : 'bad',
      other: o.target,
      type: o.type,
    });
  }
  return shots;
}

/** Animated count from 0 to the target, eased, once per mount. */
function useCountUp(target: number, ms = 900, delay = 300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      setV(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

function Stat({ label, delta, i }: { label: string; delta: number; i: number }) {
  const v = useCountUp(delta, 900, 400 + i * 160);
  const dir = delta > 0.4 ? 'up' : delta < -0.4 ? 'down' : 'flat';
  const Icon = dir === 'up' ? IconTrendingUp : dir === 'down' ? IconTrendingDown : IconMinus;
  return (
    <div className={`reel-stat ${dir}`} style={{ animationDelay: `${0.2 + i * 0.16}s` }}>
      <span className="rs-label">{label}</span>
      <span className="rs-value num">
        <Icon size={22} stroke={2.2} aria-hidden />
        {v > 0 ? '+' : ''}
        {v.toFixed(Math.abs(delta) < 10 ? 1 : 0)}
      </span>
    </div>
  );
}

const fmtNum = (v: number, unit?: string) => {
  if (unit === 'troops' || Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  return (Math.round(v * 10) / 10).toString();
};

/** One number the order moved: label, animated before to after, and a coloured delta. */
function FactRow({ f, i }: { f: Fact; i: number }) {
  const delta = f.after - f.before;
  const v = useCountUp(delta, 1000, 700 + i * 220);
  const good = delta === 0 ? null : (delta > 0) === (f.good ?? true);
  const unit = f.unit && f.unit !== 'troops' ? f.unit : '';
  const scale = Math.max(Math.abs(f.before), Math.abs(f.after), 1);
  return (
    <li className={`fact ${good === null ? 'flat' : good ? 'good' : 'bad'}`} style={{ animationDelay: `${0.5 + i * 0.2}s` }}>
      <span className="fact-label">{f.label}</span>
      <span className="fact-nums num">
        {fmtNum(f.before, f.unit)}
        <i aria-hidden> → </i>
        <b>{fmtNum(f.before + v, f.unit)}</b>
        {unit && <small>{unit}</small>}
      </span>
      <span className="fact-bar" aria-hidden>
        <span className="fb-before" style={{ width: `${(Math.abs(f.before) / scale) * 100}%` }} />
        <span className="fb-after" style={{ width: `${(Math.abs(f.before + v) / scale) * 100}%` }} />
      </span>
    </li>
  );
}

/** The evolution of this line of policy: headline number after each use this game. */
function Trend({ points }: { points: Array<{ turn: number; value: number }> }) {
  if (points.length < 2) return null;
  const pts = points.slice(-10);
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const xy = pts.map((p, n) => [(n / (pts.length - 1)) * 200, 46 - ((p.value - lo) / span) * 40] as const);
  return (
    <div className="trend">
      <span className="trend-label">This order over your term · {pts.length} uses</span>
      <svg viewBox="-4 0 208 52" preserveAspectRatio="none" aria-hidden>
        <polyline points={xy.map((p) => p.join(',')).join(' ')} />
        {xy.map(([x, y], n) => (
          <circle key={n} cx={x} cy={y} r={n === xy.length - 1 ? 3.5 : 2} />
        ))}
      </svg>
    </div>
  );
}

interface Props {
  /** Player's real annualised growth, shown on the markets set. */
  growth?: number;
  ledger?: Ledger;
  report: TurnReport;
  date: string;
  turn: number;
  home: string;
  onDone: () => void;
}

export function OutcomeReel({ report, date, turn, home, onDone, ledger, growth }: Props) {
  const shots = shotsFor(report);
  const total = shots.length + 1; // + scoreboard
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const next = useCallback(() => (i + 1 >= total ? onDone() : setI(i + 1)), [i, total, onDone]);

  useEffect(() => {
    root.current?.focus();
  }, []);
  useEffect(() => {
    if (paused || i >= total - 1) return;
    const t = setTimeout(next, shots[i]?.facts?.length || shots[i]?.story ? ORDER_MS : SHOT_MS);
    return () => clearTimeout(t);
  }, [i, paused, next, total, shots]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onDone();
    } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
  };

  const d = (k: string) => (report.deltas[k] ? report.deltas[k].after - report.deltas[k].before : 0);
  const scoreDelta = d('score');
  const shot = shots[i];

  return (
    <div
      ref={root}
      className="reel"
      role="dialog"
      aria-modal="true"
      aria-label="What happened this month"
      tabIndex={-1}
      onKeyDown={onKey}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="reel-head">
        <span className="reel-date">
          {monthLabel(date)} <i>·</i> Month {turn}
        </span>
        <span className="reel-title">What happened</span>
        <button className="reel-skip" onClick={onDone}>
          Skip to the paper <IconPlayerSkipForward size={15} />
        </button>
      </header>

      <div className="reel-stage" onClick={next}>
        {shot ? (
          <div className={`reel-shot${shot.story || shot.facts?.length ? ' with-panel' : ''}`} key={i}>
          <SceneFrame
            kind={shot.kind}
            home={home}
            other={shot.other}
            mood={shot.mood}
            size="full"
            live
            kicker={shot.kicker}
            headline={shot.headline}
            sub={shot.sub}
            verdict={shot.verdict}
          >
            {shot.type && (
              <span className="reel-type">
                <ActionIcon type={shot.type} size={18} />
              </span>
            )}
          </SceneFrame>
          {(shot.story || shot.facts?.length) && (
            <aside className={`dispatch v-${shot.verdict}`}>
              <span className="dispatch-kicker">
                {shot.type && <ActionIcon type={shot.type} size={15} />} Dispatch
              </span>
              {shot.other && mapEffect(shot.type) && (
                <div className="dispatch-map">
                  <OutcomeMap home={home} target={shot.other} effect={mapEffect(shot.type) as MapEffect} ok={shot.verdict === 'success'} />
                </div>
              )}
              {shot.story && <p className="dispatch-story">{shot.story}</p>}
              {shot.facts && shot.facts.length > 0 && (
                <ul className="facts">
                  {shot.facts.map((f, n) => (
                    <FactRow key={f.label} f={f} i={n} />
                  ))}
                </ul>
              )}
              {shot.type && shot.verdict === 'success' && <Trend points={ledger?.[shot.type] ?? []} />}
            </aside>
          )}
          </div>
        ) : (
          <SceneFrame
            key="board"
            kind="econ_tv"
            figure={growth === undefined ? undefined : `${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}%`}
            home={home}
            mood={scoreDelta > 0.4 ? 'good' : scoreDelta < -0.4 ? 'bad' : 'neutral'}
            size="full"
            live
          >
            <div className="reel-board">
              <span className="lt-kicker">Your month in numbers</span>
              <div className="reel-stats">
                {[
                  ['Approval', d('approval')],
                  ['Stability', d('stability')],
                  ['Legitimacy', d('legitimacy')],
                  ['Score', scoreDelta],
                ].map(([l, v], n) => (
                  <Stat key={l as string} label={l as string} delta={v as number} i={n} />
                ))}
              </div>
              {report.moments.length > 0 && (
                <div className="reel-moments">
                  {report.moments.map((m, n) => (
                    <span key={m} className="reel-moment" style={{ animationDelay: `${1.1 + n * 0.25}s` }}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SceneFrame>
        )}
      </div>

      <footer className="reel-foot">
        <div className="reel-dots" aria-hidden>
          {Array.from({ length: total }, (_, n) => (
            <span key={n} className={n < i ? 'done' : n === i ? `on${paused ? ' paused' : ''}` : ''} style={{ ['--ms' as string]: `${shots[n]?.facts?.length || shots[n]?.story ? ORDER_MS : SHOT_MS}ms` }} />
          ))}
        </div>
        <button className="wc-btn primary" onClick={next}>
          {i >= total - 1 ? 'Read the paper' : 'Next'} <IconChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
}
