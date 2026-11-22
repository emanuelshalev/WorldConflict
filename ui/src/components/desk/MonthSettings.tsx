import { useState } from 'react';
import { useCoach } from '../../lib/coach';
import { type AfterMonth, readAfterMonth, writeAfterMonth } from '../../lib/afterMonth';
import { useGameStore } from '../../store/gameStore';

/**
 * The month's settings (design-month.md 4.2 and 9): what to show after each month, and "Show me
 * around again" to replay the coach. The desk layout tip that used to sit on the desk lives here.
 */
export function MonthSettings() {
  const [after, setAfter] = useState<AfterMonth>(readAfterMonth);
  const replay = useCoach((s) => s.replay);
  const step = useCoach((s) => s.step);
  return (
    <>
      <label className="setting-row">
        <span>
          <b>After each month</b> What you see after Execute.
        </span>
        <select
          className="leader-input"
          value={after}
          onChange={(e) => {
            const v = e.target.value as AfterMonth;
            setAfter(v);
            writeAfterMonth(v);
          }}
          aria-label="After each month"
        >
          <option value="result">Result card only</option>
          <option value="details">Result card and details</option>
          <option value="everything">Everything (result, details, the paper)</option>
        </select>
      </label>
      <div className="setting-row">
        <span>
          <b>Show me around again</b> The three tips of the first month: your move, your advisors, Execute. The desk: what needs you on the left, the item you are on in the middle, what you will do this month on the right.
        </span>
        <button
          type="button"
          className="wc-btn small"
          disabled={step === 'move'}
          onClick={() => {
            replay();
            useGameStore.getState().closeModal();
            useGameStore.getState().setDeskMode('desk');
            useGameStore.getState().setDeskView('focus');
          }}
        >
          {step === 'move' ? 'On' : 'Replay'}
        </button>
      </div>
    </>
  );
}
