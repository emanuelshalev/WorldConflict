import { useGameStore } from '../../store/gameStore';
import { agendaItems, openItem, undoSkip } from '../../lib/agenda';
import { pcCost } from '../../lib/actions';
import { ExecuteButton, Recommended } from './Plan';
import { executeNow } from '../../lib/agenda';
import { useStaffPicks } from '../../lib/useStaffPicks';
import { CoachBubble } from './Coach';

/**
 * "Check what will happen" (design-agenda 0.1, 0.12 D11; design-layout section 4): one page in the
 * main area instead of the Thing and the Plan. You chose / Left to your advisers / You skipped,
 * each row with Change or Undo, and "If you execute now" with Execute. Two columns from 1280
 * wide, one below; on phones it is the review screen with the only Execute of the phone desk.
 */
export function ReviewPage({ phone = false }: { phone?: boolean }) {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.skipped);
  const actions = useGameStore((s) => s.pendingActions);
  const setFocus = useGameStore((s) => s.setFocus);
  const items = agendaItems();
  const { n } = useStaffPicks();
  const chose = items.filter((x) => x.state === 'decided' && x.kind !== 'own');
  const left = items.filter((x) => x.state === 'todo');
  const skipped = items.filter((x) => x.state === 'skipped');
  const mine = actions.map((a, i) => ({ a, i })).filter((x) => !x.a.proposed && x.a.origin !== 'staff');
  const many = chose.length + left.length + skipped.length + mine.length > 8;
  return (
    <article className={`review-page${many ? ' compact' : ''}`} aria-label="Check what will happen" data-review="">
      <div className="rv-rows">
        <h1 className="hero-title">Check what will happen</h1>
        <section aria-label="You chose">
          <h2>You chose ({chose.length + mine.length})</h2>
          {chose.length + mine.length === 0 && <p className="muted">Nothing yet.</p>}
          <ul className="prows">
            {chose.map((x) => (
              <li key={x.key} className="prow">
                <span className="prow-t">
                  {x.stateText.replace(/^Decided: /, '')}
                  <small>{x.title}</small>
                </span>
                <button type="button" className="wc-btn small" onClick={() => openItem(x.key)} aria-label={`Change: ${x.title}`}>
                  Change
                </button>
              </li>
            ))}
            {mine.map(({ a, i }) => (
              <li key={`${a.label}-${i}`} className="prow">
                <span className="prow-t">
                  Order: {a.label}
                  {pcCost(a.type) ? ` · ◆ ${pcCost(a.type)}` : ''}
                  <small>Your own order</small>
                </span>
                <button type="button" className="wc-btn small" onClick={() => {
                    useGameStore.setState({ review: false });
                    setFocus({ kind: 'order', id: String(i) });
                  }} aria-label={`Change: ${a.label}`}>
                  Change
                </button>
              </li>
            ))}
          </ul>
        </section>
        {left.length > 0 && (
          <section aria-label="Left to your advisers">
            <h2>Left to your advisers ({left.length})</h2>
            <ul className="prows">
              {left.map((x) => (
                <li key={x.key} className="prow">
                  <span className="prow-t">
                    {x.title}
                    <small>{x.rec ? `Recommended: ${x.rec}` : 'To do'}</small>
                  </span>
                  <button type="button" className="wc-btn small" onClick={() => openItem(x.key)} aria-label={`Open: ${x.title}`}>
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {skipped.length > 0 && (
          <section aria-label="You skipped">
            <h2>You skipped ({skipped.length})</h2>
            <ul className="prows">
              {skipped.map((x) => (
                <li key={x.key} className="prow">
                  <span className="prow-t">
                    {x.title}
                    <small>{x.stateText.replace(/^Skipped: /, '')}</small>
                  </span>
                  <button type="button" className="wc-btn small" onClick={() => undoSkip(x)} aria-label={`Undo: ${x.title}`}>
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="rv-exec">
        {n > 0 && <Recommended compact />}
        <p className="execb-h">If you execute now:</p>
        <ul>
          {executeNow().map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {!phone && (
          <div className="ex-wrap">
            <CoachBubble step="execute" place="above" />
            <ExecuteButton />
          </div>
        )}
      </div>
    </article>
  );
}
