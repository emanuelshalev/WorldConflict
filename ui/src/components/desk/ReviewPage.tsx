import { useGameStore } from '../../store/gameStore';
import { type AgendaItem, agendaItems, costLabel, executeMeaning, openCalls, openItem, reviewRows, skipMeaning, undoSkip } from '../../lib/agenda';
import { capitalLine } from '../../lib/budget';
import { TERMS } from '../../lib/glossary';
import { ExecuteButton, Recommended } from './Plan';
import { executeNow } from '../../lib/agenda';
import { useStaffPicks } from '../../lib/useStaffPicks';
import { CoachBubble } from './Coach';

/**
 * "Check what will happen" (design-agenda 0.1, 0.12 D11; design-layout section 4): one page in the
 * main area instead of the Thing and the Plan. You chose / Not decided / You skipped,
 * each row with Change or Undo, and "If you execute now" with Execute. Two columns from 1280
 * wide, one below; on phones it is the review screen with the only Execute of the phone desk.
 */
/**
 * The folded "Not decided" line (the page's fit rule hides the rows): what Execute does with them,
 * by kind, in the rows' own words (design review S2-2).
 */
function leftSummary(left: AgendaItem[]): string {
  const meetings = left.filter((x) => x.kind === 'meeting').length + left.filter((x) => x.kind === 'meetings').reduce((s, x) => s + (x.meetings?.length ?? 0), 0);
  const crises = left.filter((x) => x.kind === 'crisis');
  const orders = left.filter((x) => x.kind === 'orders');
  const parts = [
    ...crises.map((x) => executeMeaning(x).replace(/\.$/, ` (${x.title})`)),
    meetings ? `your ministers take ${meetings === 1 ? 'the meeting' : `${meetings} meetings`} on the usual answer${meetings === 1 ? '' : 's'}` : '',
    ...orders.map((x) => `the recommended order${(x.orders?.length ?? 0) === 1 ? ' is' : 's are'} not given unless you choose ${(x.orders?.length ?? 0) === 1 ? 'it' : 'them'}`),
    left.some((x) => x.kind === 'own') ? 'no orders of your own' : '',
  ].filter(Boolean);
  const s = parts.join('; ');
  return s ? `If you execute now: ${s.charAt(0).toLowerCase()}${s.slice(1)}.` : '';
}

export function ReviewPage({ phone = false }: { phone?: boolean }) {
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.skipped);
  const setFocus = useGameStore((s) => s.setFocus);
  const items = agendaItems();
  const { n } = useStaffPicks();
  const calls = openCalls(items);
  const left = items.filter((x) => x.state === 'todo' && !x.call);
  const skipped = items.filter((x) => x.state === 'skipped');
  useGameStore((s) => s.pendingActions);
  // One row per answer or order: what it answers, the answer, its cost, its mission tag (DR-INT-7)
  const rows = reviewRows();
  const many = rows.length + left.length + skipped.length > 8;
  return (
    <article className={`review-page${many ? ' compact' : ''}`} aria-label="Check what will happen" data-review="">
      <div className="rv-rows">
        <h1 className="hero-title">Check what will happen</h1>
        {calls.length > 0 && (
          <section aria-label="Your calls still open" data-open-calls="" className="rv-calls">
            <h2>
              {TERMS.yourCall.name}s still open ({calls.length})
            </h2>
            <ul className="prows">
              {calls.map((x) => (
                <li key={x.key} className="prow" data-review-row="call">
                  <span className="prow-t">
                    {x.title}
                    {/* The leave sentence already says "If you leave it" (no doubled prefix) */}
                    <small>{/^If you leave it/.test(skipMeaning(x).means) ? skipMeaning(x).means : `If you execute now: ${skipMeaning(x).short ?? skipMeaning(x).means}`}</small>
                  </span>
                  <button type="button" className="wc-btn small" onClick={() => openItem(x.key)} aria-label={`Open: ${x.title}`}>
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="You chose">
          <h2>You chose ({rows.length})</h2>
          {rows.length === 0 && <p className="muted">Nothing yet.</p>}
          <ul className="prows rv-chose">
            {rows.map((r) => (
              <li key={r.key} className="prow rv-row" data-review-row="chose">
                <span className="rv-q" data-rv-q="">
                  {r.question}
                </span>
                <span className="rv-a">
                  <b>{r.answer}</b>
                  {r.detail && <span className={`rv-d${r.tone ? ` mt-${r.tone}` : ''}`}>{r.detail}</span>}
                </span>
                <span className={`rv-cost${r.cost > 0 ? '' : ' is-free'}`} data-rv-cost="">
                  {costLabel(r.cost)}
                </span>
                <button
                  type="button"
                  className="wc-btn small"
                  onClick={() => {
                    if (r.itemKey === 'own' && r.orderIndex !== undefined) {
                      useGameStore.setState({ review: false });
                      setFocus({ kind: 'order', id: String(r.orderIndex) });
                    } else openItem(r.itemKey);
                  }}
                  aria-label={`Change: ${r.question}`}
                >
                  Change
                </button>
              </li>
            ))}
          </ul>
        </section>
        {/* Each row says what Execute will really do with it (design review S2-2, D84-DESK-TRUTH):
            nobody carries out a recommendation the player did not choose */}
        {left.length > 0 && (
          <section aria-label="Not decided" className="rv-left" data-not-decided="">
            <h2>Not decided ({left.length})</h2>
            <p className="rv-sum">{leftSummary(left)} Choose all recommended decides them.</p>
            <ul className="prows">
              {left.map((x) => (
                <li key={x.key} className="prow" data-review-row={x.kind}>
                  <span className="prow-t">
                    {x.title}
                    <small>If you execute now: {executeMeaning(x)}</small>
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
        <p className="execb-pc" data-capital-line="">
          {capitalLine()}
        </p>
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
