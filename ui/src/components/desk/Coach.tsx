import { COACH_TEXT, type CoachStep, coachIndex, useCoach } from '../../lib/coach';

/**
 * One coach bubble, rendered inside the element it talks about as an overlay (absolute), so it
 * never moves another element when it comes or goes (design-feel 5.1 rule 4). Only the bubble for
 * the current step renders, so there is never more than one on screen.
 */
export function CoachBubble({ step, place = 'top-right', onFine }: { step: Exclude<CoachStep, 'done' | 'result'>; place?: 'top-right' | 'above' | 'below'; onFine?: () => void }) {
  const current = useCoach((s) => s.step);
  const advance = useCoach((s) => s.advance);
  if (current !== step) return null;
  return (
    <div className={`coach-bubble place-${place}`} role="note" aria-live="polite" data-coach={step}>
      <p>
        <b>{COACH_TEXT[step]}</b>
      </p>
      <div className="coach-foot">
        <span className="num">Step {coachIndex(step)} of 3</span>
        {step === 'advisors' && (
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
