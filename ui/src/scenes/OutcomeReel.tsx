import { useCallback, useEffect, useRef, useState } from 'react';
import { IconPlayerSkipForward, IconChevronRight, IconTrendingDown, IconTrendingUp, IconMinus } from '@tabler/icons-react';
import type { TurnReport } from '../store/gameStore';
import { monthLabel } from '../lib/format';
import { SceneFrame, type Verdict } from './SceneFrame';
import { sceneForAction, sceneForCrisis, type SceneKind } from './kinds';
import type { Mood } from './art/types';
import { ActionIcon } from './icons';
import './reel.css';

interface Shot {
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

function verdictFor(o: TurnReport['orders'][number]): Verdict {
  if (o.ok) return 'success';
  return /backfire|exposed|blowback/i.test(o.detail) ? 'backfired' : 'failed';
}

function shotsFor(report: TurnReport): Shot[] {
  const shots: Shot[] = report.decisions.map((d) => ({
    kind: sceneForCrisis(d.templateId, d.title),
    kicker: 'Crisis decision',
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
      sub: o.detail,
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

interface Props {
  report: TurnReport;
  date: string;
  turn: number;
  home: string;
  onDone: () => void;
}

export function OutcomeReel({ report, date, turn, home, onDone }: Props) {
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
    const t = setTimeout(next, SHOT_MS);
    return () => clearTimeout(t);
  }, [i, paused, next, total]);

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
          <SceneFrame
            key={i}
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
        ) : (
          <SceneFrame
            key="board"
            kind="econ_tv"
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
            <span key={n} className={n < i ? 'done' : n === i ? `on${paused ? ' paused' : ''}` : ''} style={{ ['--ms' as string]: `${SHOT_MS}ms` }} />
          ))}
        </div>
        <button className="wc-btn primary" onClick={next}>
          {i >= total - 1 ? 'Read the paper' : 'Next'} <IconChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
}
