import { useState, type ReactNode } from 'react';
import { IconCopy, IconRefresh, IconWorld, IconArrowsDiff } from '@tabler/icons-react';
import type { RevealPayload } from '../../store/gameStore';
import { firstSplit, shortDate, type StoredRun } from '../../lib/runs';
import type { RevealCardData } from '../../lib/shareCard';
import { RankLadder, type LadderTick } from './RankLadder';
import { percentileLine, rankHeadline } from './model';
import { RunHistory } from './RunHistory';
import { ShareBar } from './ShareBar';

/**
 * Stage 7, ranking and replay (WP7): the ladder of benchmark runs for the seat with your
 * percentile, your record on the seat, where your choices split from your last run, the one
 * "beat this next time" line, Replay same opening (same seed), New world, Compare runs, the
 * seed code and the share bar.
 */
export interface RankStageProps {
  r: RevealPayload;
  animate: boolean;
  history: StoredRun[];
  ghost: StoredRun | null;
  names: Record<string, string>;
  /** Achievement id to rarity order (higher is rarer), to pick each run's notable seal. */
  rank: Record<string, number>;
  card: RevealCardData;
  shareText: string;
  fileStem: string;
  onReplay: () => void;
  onNewWorld: () => void;
  onCompare: () => void;
  /** Extra actions kept from the end screen (New game). */
  children?: ReactNode;
}

const DIFF_WORD: Record<string, string> = { ANALYST: 'Analyst', STATESMAN: 'Statesman', STRONGMAN: 'Strongman' };

export function RankStage({ r, animate, history, ghost, names, rank, card, shareText, fileStem, onReplay, onNewWorld, onCompare, children }: RankStageProps) {
  const [copied, setCopied] = useState(false);
  const ticks: LadderTick[] = r.ranking.ticks.map((t) => ({
    id: t.id,
    label: t.id === 'best' ? 'Best known run' : t.id === 'smart_p90' ? 'Competent, top 10%' : t.id === 'smart_p50' ? 'Competent, median' : t.label,
    score: t.score,
    kind: t.id.startsWith('smart') ? 'competent' : t.id === 'best' ? 'best' : 'bench',
  }));
  const best = r.ranking.personalBest ?? ghost?.presidencyScore ?? null;
  if (best !== null) ticks.push({ id: 'mine', label: 'Your best before', score: best, kind: 'mine' });
  const previous = history.find((h) => h.saveId !== r.run.saveId) ?? null;
  const split = previous ? firstSplit(r.run, previous) : null;
  // The outcome and achievements lead; the percentile is a quiet line under the ladder (F-02-1)
  const headline = rankHeadline(r, history);
  const pct = percentileLine(r);
  const firstCrisis = r.run.choices[0];
  const others = history.filter((h) => h.saveId !== r.run.saveId);
  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(r.replay.seedCode);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <section className="rv-stage rv-rank" aria-labelledby="rv-h-rank">
      <div className="rv-caps rv-kicker">
        {card.title} · {r.seat.countryName} · {DIFF_WORD[r.seat.difficulty] ?? r.seat.difficulty}
      </div>
      <h2 id="rv-h-rank" className="rv-h2">
        {headline}
      </h2>
      <div className="rv-rank-grid">
        <div className="rv-card rv-ladder-card">
          <div className="rv-caps">Presidency score ladder</div>
          {ticks.length ? (
            <RankLadder you={r.presidency.total} ticks={ticks} animate={animate} />
          ) : (
            <p className="rv-hint">No benchmark runs for this seat yet.</p>
          )}
          {pct && (
            <p className="rv-hint" data-percentile="">
              Presidency Score {r.presidency.total}. {pct.replace('simulated leaders', 'simulated competent leaders')}: every run you add climbs the ladder.
            </p>
          )}
          {r.ranking.benchmarks?.smart && (
            <p className="rv-hint small">
              Benchmarks: {r.ranking.benchmarks.smart.n} simulated runs per staff policy on this seat ({DIFF_WORD[r.seat.difficulty] ?? r.seat.difficulty}). Percentile is against the competent staff runs.
            </p>
          )}
        </div>
        <div className="rv-rank-side">
          <div className="rv-card">
            <div className="rv-caps">Your record on this seat</div>
            <RunHistory runs={history} currentSaveId={r.run.saveId} names={names} rank={rank} />
            {previous && (
              <p className="rv-split">
                Compared with {shortDate(previous.date)}:{' '}
                {split ? (
                  <>
                    <b>your choices split in month {split.month}</b> ({split.a} vs {split.b}).
                  </>
                ) : (
                  <b>the same crisis choices; your orders made the difference.</b>
                )}
                {previous.seed === r.run.seed ? ' Same opening.' : ''}
              </p>
            )}
          </div>
          {r.beatNext && (
            <div className="rv-beat">
              Beat <b className="num">{r.presidency.total}</b> next time: {r.beatNext.replace(/\.$/, '')}.
            </div>
          )}
          <div className="rv-actions">
            <button type="button" className="rv-btn primary" onClick={onReplay}>
              <IconRefresh size={18} aria-hidden /> Replay same opening
            </button>
            <button type="button" className="rv-btn" onClick={onNewWorld}>
              <IconWorld size={18} aria-hidden /> New world
            </button>
            <button type="button" className="rv-btn" onClick={onCompare} disabled={others.length === 0} title={others.length === 0 ? 'Finish another run on this seat to compare' : undefined}>
              <IconArrowsDiff size={18} aria-hidden /> Compare runs
            </button>
            {children}
          </div>
          <div className="rv-seedline num">
            Seed {r.replay.seedCode}
            {firstCrisis ? ` · first crisis: "${firstCrisis.title}"` : ''}
            <button type="button" className="rv-link small" onClick={copySeed}>
              <IconCopy size={14} aria-hidden /> {copied ? 'Seed copied' : 'Copy seed'}
            </button>
          </div>
          {!r.replay.deterministic && <p className="rv-hint">Rivals used LLMs: later months may differ on a replay.</p>}
          <div className="rv-caps rv-sub">Share card</div>
          <ShareBar data={card} text={shareText} fileStem={fileStem} />
        </div>
      </div>
    </section>
  );
}
