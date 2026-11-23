import { useState } from 'react';
import { COACH_TEXT, type CoachStep, coachIndex, useCoach } from '../../lib/coach';

/**
 * One coach bubble, rendered inside the element it talks about as an overlay (absolute), so it
 * never moves another element when it comes or goes (design-feel 5.1 rule 4). Only the bubble for
 * the current step renders, so there is never more than one on screen.
 *
 * `inline` (RS-008-2): where an overlay would lie on what the player needs (the question heading
 * and the first answer, the order list over a bar), the bubble takes its own place in the flow. It
 * keeps that place, invisible, once its step is done, so it still never moves anything when it goes;
 * the next thing opened starts without it.
 */
export function CoachBubble({ step, place = 'top-right', onFine }: { step: Exclude<CoachStep, 'done' | 'result'>; place?: 'top-right' | 'above' | 'below' | 'inline'; onFine?: () => void }) {
  const current = useCoach((s) => s.step);
  const advance = useCoach((s) => s.advance);
  // Whether this bubble has been shown since it mounted (state adjusted during render, React docs)
  const [shown, setShown] = useState(current === step);
  if (current === step && !shown) setShown(true);
  const gone = current !== step;
  if (gone && !(place === 'inline' && shown)) return null;
  return (
    <div className={`coach-bubble place-${place}${gone ? ' is-gone' : ''}`} role={gone ? undefined : 'note'} aria-live={gone ? undefined : 'polite'} aria-hidden={gone || undefined} data-coach={gone ? undefined : step}>
      <p>
        <b>{COACH_TEXT[step]}</b>
      </p>
      <div className="coach-foot">
        <span className="num">Step {coachIndex(step)} of 3</span>
        {step === 'advisors' && !gone && (
          <button
            type="button"
            className="wc-btn ghost small"
            onClick={() => {
              onFine?.();
              advance('advisors');
            }}
          >
            Fine
          </button>
        )}
      </div>
    </div>
  );
}

/** The last coach line, on the first result card only. */
export function CoachResultLine() {
  const step = useCoach((s) => s.step);
  const finish = useCoach((s) => s.finish);
  if (step !== 'result') return null;
  return (
    <button type="button" className="coach-result" onClick={finish}>
      {COACH_TEXT.result}
    </button>
  );
}
