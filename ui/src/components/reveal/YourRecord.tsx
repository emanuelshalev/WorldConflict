import { useState } from 'react';
import { IconPlayerPlay, IconRefresh, IconTrophy } from '@tabler/icons-react';
import { loadGame, startGame, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { careerSummary, replayRequestOf, seatCountry, seatName, shortDate } from '../../lib/runs';
import { SeedForm } from './SeedForm';
import '../../styles/reveal.css';

/**
 * "Your record" on the title screen (WP7): your finished runs on this browser (best run, career
 * points weighted by difficulty, the last five, each reopening its report or replaying the same
 * opening), and "Play a seed", where a seed code ("HC-USA-3PX") starts the same seat with the
 * same opening (F-02-6: both reachable outside the reveal).
 */
export function YourRecord() {
  const [summary] = useState(() => careerSummary());
  const isLoading = useGameStore((s) => s.isLoading);
  return (
    <div className="rv-record">
      {summary.runs > 0 && summary.best ? (
        <details className="rv-record-box">
          <summary>
            <IconTrophy size={16} aria-hidden />
            <span>
              <b>Your record</b> · {summary.runs} run{summary.runs === 1 ? '' : 's'} · best <b className="num">{summary.best.presidencyScore}</b> ({seatName(summary.best.seatKey)}) · {summary.stars}★
            </span>
          </summary>
          <p className="rv-record-career">
            Career points <b className="num">{summary.career.toLocaleString('en-US')}</b>: your best run on each seat, x0.85 Story, x1 Normal, x1.15 Hard.
          </p>
          <ul className="rv-record-list">
            {summary.recent.map((r) => (
              <li key={r.saveId ?? r.date}>
                <span aria-hidden>{flag(seatCountry(r.seatKey))}</span>
                <span className="rv-record-seat">
                  {seatName(r.seatKey)} <small>{shortDate(r.date)}</small>
                </span>
                <b className="num">{r.presidencyScore}</b>
                <span className="rv-record-grade">{r.grade}</span>
                {r.countryId && r.mode && (
                  <button
                    type="button"
                    className="rv-link small"
                    disabled={isLoading}
                    onClick={() => void startGame(replayRequestOf(r))}
                    aria-label={`Replay same opening: ${seatName(r.seatKey)}, seed ${r.seedCode || r.seed}`}
                    title={`Replay same opening (seed ${r.seedCode || r.seed})`}
                  >
                    <IconRefresh size={14} aria-hidden /> Replay
                  </button>
                )}
                {r.saveId && (
                  <button type="button" className="rv-link small" onClick={() => r.saveId && loadGame(r.saveId)} aria-label={`Open the report for ${seatName(r.seatKey)}, ${r.presidencyScore}`}>
                    Report
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {/* Folded until wanted, so the title's left column stays clear of the globe (tablet, Sam) */}
      <details className="rv-seed-details">
        <summary>
          <IconPlayerPlay size={15} aria-hidden /> Play a seed
        </summary>
        <SeedForm id="rv-seed" />
      </details>
    </div>
  );
}
