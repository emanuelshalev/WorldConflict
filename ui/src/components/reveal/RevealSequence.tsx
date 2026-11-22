import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { IconArrowsDiff, IconPlayerPlay } from '@tabler/icons-react';
import type { RevealPayload } from '../../store/gameStore';
import { useReducedMotion } from '../../lib/motion';
import { sound } from '../../lib/sound';
import { previousBest, recordRun, runsForSeat, type StoredRun } from '../../lib/runs';
import { cellsToEmoji, revealShareText } from '../../lib/shareCard';
import { SoundToggle } from '../game/SoundToggle';
import { StageRail, StageDots } from './StageRail';
import { AchievementsStage, CountStage, MomentsStage, NumbersStage, SeenStage, TruthStage, VerdictStage, type StageProps } from './stages';
import { RankStage } from './RankStage';
import { CompareRuns } from './CompareRuns';
import { cardData, cellsFor, STAGES } from './model';
import { tierRank } from './sealArt';
import '../../styles/reveal.css';

/**
 * The reveal (design-reveal.md, WP6): seven stages played once per finished save like election
 * night, then a scrollable report that stays. Next (button, Space, Right arrow, or a tap anywhere
 * on phones), Back (Left arrow), and "Skip to the report" from any stage. With reduced motion every
 * stage shows its final state and nothing auto-advances. A save whose reveal was seen opens on the
 * report (localStorage wc.revealSeen.<saveId>).
 */
export interface RevealActions {
  onReplay: () => void;
  onNewWorld: () => void;
  onNewGame: () => void;
}

export interface RevealSequenceProps {
  r: RevealPayload;
  saveId: string;
  actions: RevealActions;
  daily?: string | null;
  /** Extra report sections kept from the end screen (conditions, daily streak, world timeline). */
  extras?: ReactNode;
  /** Record the run in local history (false in the gallery). */
  record?: boolean;
  /** History to use instead of localStorage (gallery). */
  historyOverride?: StoredRun[];
  /** Open on this stage (gallery deep links), or 'report'. */
  start?: number | 'report';
}

const HINTS = (r: RevealPayload) => [
  'Space or right arrow: next · the verdict is next',
  `Next: ${r.achievements.earned.length} achievement${r.achievements.earned.length === 1 ? '' : 's'}`,
  'Rarity is measured: share of simulated leaders who earn it',
  'Next: how you were seen',
  'Press outlets are fictional, written from your numbers',
  'Next: what you could not see, and what really happened',
  'Next: your rank, and a rematch',
  'The full report stays in your saves',
];

function seenKey(saveId: string) {
  return `wc.revealSeen.${saveId}`;
}
function wasSeen(saveId: string): boolean {
  try {
    return localStorage.getItem(seenKey(saveId)) === '1';
  } catch {
    return false;
  }
}
function markSeen(saveId: string): void {
  try {
    localStorage.setItem(seenKey(saveId), '1');
  } catch {
    /* storage blocked */
  }
}

export function RevealSequence({ r, saveId, actions, daily = null, extras, record = true, historyOverride, start }: RevealSequenceProps) {
  const reduced = useReducedMotion();
  const [history, setHistory] = useState<StoredRun[]>(() => historyOverride ?? []);
  const [ghost, setGhost] = useState<StoredRun | null>(null);
  const initialReport = start === 'report' || (start === undefined && record && wasSeen(saveId));
  const [mode, setMode] = useState<'reveal' | 'report'>(initialReport ? 'report' : 'reveal');
  const [stage, setStage] = useState(typeof start === 'number' ? Math.max(0, Math.min(7, start)) : 0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set(initialReport ? [0, 1, 2, 3, 4, 5, 6, 7] : []));
  const [compare, setCompare] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Local history: record this run once, then read the seat's runs and your best before it
  useEffect(() => {
    const before = historyOverride ?? runsForSeat(r.seat.seatKey, r.seat.difficulty);
    const prev = previousBest(r.seat.seatKey, r.seat.difficulty, r.run.saveId ?? saveId, before);
    let list = before;
    if (record) {
      recordRun({ ...r.run, saveId: r.run.saveId ?? saveId });
      list = runsForSeat(r.seat.seatKey, r.seat.difficulty);
    }
    queueMicrotask(() => {
      setGhost(prev);
      setHistory(list);
    });
  }, [r, saveId, record, historyOverride]);

  const names = useMemo(() => Object.fromEntries([...r.achievements.earned, ...r.achievements.locked].map((a) => [a.id, a.name])), [r]);
  // Rarer seals rank higher; infamy and the two everyone earns rank lowest
  const sealRank = useMemo(
    () =>
      Object.fromEntries(
        [...r.achievements.earned, ...r.achievements.locked].map((a) => [
          a.id,
          a.infamy || a.id === 'sworn_in' || a.id === 'full_term' ? -0.5 : tierRank(a.tier) + (1 - (a.rate ?? 0.5)),
        ]),
      ),
    [r],
  );
  const card = useMemo(() => cardData(r, history, daily), [r, history, daily]);
  const shareText = useMemo(
    () => revealShareText(card, { grid: cellsToEmoji(cellsFor(r)), classification: r.verdict.classification }),
    [card, r],
  );
  const fileStem = `world-conflict-${r.seat.countryId.toLowerCase()}-${r.presidency.total}`;

  const animateStage = (i: number) => !reduced && mode === 'reveal' && !seen.has(i);
  const go = useCallback(
    (to: number) => {
      setSeen((s) => new Set(s).add(stage));
      if (to > 7) {
        markSeen(saveId);
        setMode('report');
        return;
      }
      if (to === 7) markSeen(saveId);
      setStage(Math.max(0, to));
      if (to > stage) sound.play('page');
    },
    [stage, saveId],
  );
  const toReport = useCallback(() => {
    markSeen(saveId);
    setSeen(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    setMode('report');
  }, [saveId]);

  // New stage: back to the top, focus the stage for screen readers
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo?.({ top: 0 });
    el.focus({ preventScroll: true });
  }, [stage, mode]);

  // The count hands over to the verdict by itself once the strip has filled
  useEffect(() => {
    if (mode !== 'reveal' || stage !== 0 || reduced || seen.has(0)) return;
    const t = window.setTimeout(() => go(1), 140 * cellsFor(r).length + 2400);
    return () => window.clearTimeout(t);
  }, [mode, stage, reduced, seen, go, r]);

  // Keys: Space and Right arrow next, Left arrow back (not while typing or on a control)
  useEffect(() => {
    if (mode !== 'reveal' || compare) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t?.closest('input, textarea, select, [contenteditable], [data-no-advance]')) return;
      const onControl = !!t?.closest('button, a, summary');
      if (e.key === 'ArrowRight' || (e.key === ' ' && !onControl)) {
        e.preventDefault();
        go(stage + 1);
      } else if (e.key === 'ArrowLeft' && stage > 0) {
        e.preventDefault();
        go(stage - 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, stage, go, compare]);

  // Phones: a tap anywhere that is not a control advances
  const onTap = (e: MouseEvent) => {
    if (mode !== 'reveal' || stage === 7 || window.innerWidth > 700) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, select, summary, details, label, table, [data-no-advance], [role="dialog"]')) return;
    go(stage + 1);
  };

  const props = (i: number): StageProps => ({ r, animate: animateStage(i), ghost });
  const rank = (anim: boolean) => (
    <RankStage
      r={r}
      animate={anim}
      history={history}
      ghost={ghost}
      names={names}
      rank={sealRank}
      card={card}
      shareText={shareText}
      fileStem={fileStem}
      onReplay={actions.onReplay}
      onNewWorld={actions.onNewWorld}
      onCompare={() => setCompare(true)}
    >
      <button type="button" className="rv-btn ghost" onClick={actions.onNewGame}>
        New game
      </button>
    </RankStage>
  );
  const stageEl = (i: number) => {
    switch (i) {
      case 0:
        return <CountStage {...props(0)} />;
      case 1:
        return <VerdictStage {...props(1)} />;
      case 2:
        return <AchievementsStage {...props(2)} />;
      case 3:
        return <MomentsStage {...props(3)} />;
      case 4:
        return <SeenStage {...props(4)} />;
      case 5:
        return <NumbersStage {...props(5)} />;
      case 6:
        return <TruthStage {...props(6)} />;
      default:
        return rank(animateStage(7));
    }
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText, title: 'World Conflict' });
      else await navigator.clipboard.writeText(shareText);
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className={`rv-root mode-${mode}`} role="dialog" aria-modal="true" aria-label="The reveal">
      {mode === 'reveal' ? (
        <StageRail stages={STAGES} current={stage} seen={seen} onJump={(i) => go(i)} onSkip={toReport} />
      ) : (
        <aside className="rv-rail rv-rail-report" aria-label="Report">
          <div className="rv-brand">The report</div>
          <nav>
            {STAGES.map((s, i) => (
              <a key={s} className="rv-st seen" href={`#rv-sec-${i}`} onClick={(e) => { e.preventDefault(); document.getElementById(`rv-sec-${i}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }}>
                <i aria-hidden>✓</i>
                {s}
              </a>
            ))}
          </nav>
          <div className="rv-rail-foot">
            <SoundToggle />
          </div>
        </aside>
      )}
      <main ref={mainRef} className="rv-main" tabIndex={-1} aria-label={mode === 'reveal' ? `Stage ${stage} of 7: ${STAGES[stage]}` : 'The full report'} onClick={onTap}>
        {mode === 'reveal' ? (
          <>
            <StageDots stages={STAGES} current={stage} seen={seen} onSkip={toReport} />
            <div className="rv-content" key={stage}>
              {stageEl(stage)}
            </div>
            <div className="rv-ctrl">
              {stage > 0 ? (
                <button type="button" className="rv-btn" onClick={() => go(stage - 1)}>
                  ‹ Back
                </button>
              ) : (
                <span />
              )}
              <span className="rv-ctrl-hint">{HINTS(r)[stage]}</span>
              {stage < 7 ? (
                <button type="button" className="rv-btn primary" onClick={() => go(stage + 1)}>
                  {STAGES[stage + 1]} ›
                </button>
              ) : (
                <span className="rv-ctrl-end">
                  <button type="button" className="rv-btn" onClick={toReport}>
                    Full report
                  </button>
                  <button type="button" className="rv-btn primary" onClick={share}>
                    Share result
                  </button>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="rv-content rv-report">
            <header className="rv-report-head">
              <div>
                <div className="rv-caps rv-kicker">The report · {card.title} · {r.seat.countryName}</div>
                <h1 className="rv-h1">Your record, kept.</h1>
              </div>
              <div className="rv-report-actions">
                <button type="button" className="rv-btn" onClick={() => { setSeen(new Set()); setStage(0); setMode('reveal'); }}>
                  <IconPlayerPlay size={18} aria-hidden /> Replay the reveal
                </button>
                {history.length > 1 && (
                  <button type="button" className="rv-btn" onClick={() => setCompare(true)}>
                    <IconArrowsDiff size={18} aria-hidden /> Compare runs
                  </button>
                )}
              </div>
            </header>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} id={`rv-sec-${i}`} className="rv-report-sec">
                {i === 0 ? <CountStage r={r} animate={false} ghost={ghost} scene={false} /> : stageEl(i)}
              </div>
            ))}
            <div id="rv-sec-7" className="rv-report-sec">
              {rank(false)}
            </div>
            {extras && <div className="rv-report-sec rv-extras">{extras}</div>}
          </div>
        )}
      </main>
      {compare && (
        <CompareRuns
          current={history.find((h) => h.saveId === (r.run.saveId ?? saveId)) ?? { ...r.run, date: new Date().toISOString() }}
          runs={history}
          names={names}
          onClose={() => setCompare(false)}
        />
      )}
    </div>
  );
}
