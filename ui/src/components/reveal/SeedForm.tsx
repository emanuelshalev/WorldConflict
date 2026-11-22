import { useState, type FormEvent } from 'react';
import { IconPlayerPlay } from '@tabler/icons-react';
import { startGame, useGameStore } from '../../store/gameStore';
import { normaliseSeedCode } from '../../lib/runs';

/**
 * "Play a seed": a seed code ("HC-USA-3PX", "T2026-USA-1A2B3") starts that seat with the same
 * opening. Shared by the title's Your record and Saved games (F-02-6).
 */
export function SeedForm({ id, help }: { id: string; help?: string }) {
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
    <form className="rv-seedform" onSubmit={play}>
      <label htmlFor={id}>Play a seed</label>
      <div className="rv-seedrow">
        <input
          id={id}
          className="leader-input"
          placeholder="HC-USA-3PX"
          value={code}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={bad}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setCode(e.target.value);
            setBad(false);
          }}
        />
        <button type="submit" className="wc-btn" disabled={!code.trim() || isLoading} aria-label="Play this seed">
          <IconPlayerPlay size={16} aria-hidden />
        </button>
      </div>
      <small id={`${id}-help`} className={bad ? 'bad' : ''}>
        {bad ? 'That is not a seed code: it looks like HC-USA-3PX.' : (help ?? 'A seed code from a result or a saved game: same seat, same opening.')}
      </small>
    </form>
  );
}
