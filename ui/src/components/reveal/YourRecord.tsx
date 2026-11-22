import { useState, type FormEvent } from 'react';
import { IconPlayerPlay, IconTrophy } from '@tabler/icons-react';
import { loadGame, startGame, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { careerSummary, normaliseSeedCode, seatCountry, seatName, shortDate } from '../../lib/runs';
import '../../styles/reveal.css';

/**
 * "Your record" on the title screen (WP7): your finished runs on this browser (best run, career
 * points weighted by difficulty, the last five, each reopening its report), and "Play this seed",
 * where a friend's seed code ("HC-USA-3PX") starts the same seat with the same opening.
 */
export function YourRecord() {
  const [summary] = useState(() => careerSummary());
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  const isLoading = useGameStore((s) => s.isLoading);
  const play = (e: FormEvent) => {
    e.preventDefault();
    const c = normaliseSeedCode(code);
    if (!c) {
      setBad(true);
      return;
    }
    setBad(false);
    void startGame({ playerCountryId: '', mode: 'FLASHPOINT', seedCode: c });
  };
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
      <details className="rv-seed-details" open={bad || !!code || undefined}>
        <summary>
          <IconPlayerPlay size={15} aria-hidden /> Play a friend's seed
        </summary>
      <form className="rv-seedform" onSubmit={play}>
        <label htmlFor="rv-seed">Play this seed</label>
        <div className="rv-seedrow">
          <input
            id="rv-seed"
            className="leader-input"
            placeholder="HC-USA-3PX"
            value={code}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={bad}
            aria-describedby="rv-seed-help"
            onChange={(e) => {
              setCode(e.target.value);
              setBad(false);
            }}
          />
          <button type="submit" className="wc-btn" disabled={!code.trim() || isLoading} aria-label="Play this seed">
            <IconPlayerPlay size={16} aria-hidden />
          </button>
        </div>
        <small id="rv-seed-help" className={bad ? 'bad' : ''}>
          {bad ? 'That is not a seed code: it looks like HC-USA-3PX.' : 'A seed code from a friend\'s result: same seat, same opening.'}
        </small>
      </form>
      </details>
    </div>
  );
}
