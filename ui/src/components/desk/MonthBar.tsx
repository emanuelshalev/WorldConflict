import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { agendaItems, agendaProgress, currentItem, neighbours, openItem } from '../../lib/agenda';
import { useLayout } from '../../lib/layout';
import { PhoneThingLine } from './PhoneMonth';

/**
 * The month bar (design-agenda 0.12 D2, design-layout L-1): where you are as a sentence on the
 * left ("2 of 6: Xi Jinping calls / 1 done, 5 to go") and labelled buttons on the right: Show (One
 * at a time | Everything, from month 2 and 1280 wide), Back, Next with the next thing's title,
 * See all n (when the List is not a column), Check and execute. No chips, no step numbers.
 */
export function MonthBar() {
  const world = useGameStore((s) => s.worldState);
  const gameOver = useGameStore((s) => s.gameOver);
  const review = useGameStore((s) => s.review);
  const focus = useGameStore((s) => s.focus);
  const deskMode = useGameStore((s) => s.deskMode);
  const deskView = useGameStore((s) => s.deskView);
  const setDeskView = useGameStore((s) => s.setDeskView);
  const listOpen = useGameStore((s) => s.listOpen);
  const agendaKey = useGameStore((s) => s.agendaKey);
  // Re-derive the agenda when the month's choices change
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.skipped);
  useGameStore((s) => s.missionImpact);
  const L = useLayout();
  if (!world || gameOver) return null;
  if (L.cls === 'P') return <PhoneThingLine />;
  const items = agendaItems();
  const cur = currentItem(items, agendaKey);
  const { done, total, left } = agendaProgress(items);
  const { back, next } = neighbours(items, cur);
  const at = cur ? items.findIndex((x) => x.key === cur.key) + 1 : 0;
  const detail = deskMode === 'desk' && (focus.kind === 'catalog' || focus.kind === 'order' || focus.kind === 'suggestions');
  const first = world.turn === 0;
  // The List is a column at D and up (L-13); on the map from W and 1200 tall; at L with Everything
  const listShown = deskMode === 'map' ? L.mapList : L.listColumn || (L.planRail && deskView === 'full' && !first);
  const showSwitch = !first && L.planRail && deskMode === 'desk';
  const goReview = () => useGameStore.setState({ review: true, deskMode: 'desk', listOpen: false, focus: { kind: 'mission' } });
  const title = review ? 'Check what will happen' : detail ? (focus.kind === 'catalog' ? 'All orders' : focus.kind === 'order' ? 'An order of this month' : 'Orders to consider') : cur ? `${at} of ${items.length}: ${cur.title}` : 'A quiet month';
  const sub =
    first && L.short && !review
      ? `${done} of ${total} done. Choose or skip each, then check and execute.`
      : total
        ? `${done} done, ${left} to go`
        : 'Nothing to decide this month';
  return (
    <nav className="month-bar" data-region="bar" aria-label="This month">
      <p className="mb-where">
        <b>{title}</b>
        <span>{sub}</span>
      </p>
      {showSwitch && (
        <span className="mb-show">
          <span className="mb-show-l">Show:</span>
          <span className="seg" role="group" aria-label="Show">
            <button type="button" aria-pressed={deskView === 'focus'} className={deskView === 'focus' ? 'on' : ''} onClick={() => setDeskView('focus')}>
              One at a time
            </button>
            <button type="button" aria-pressed={deskView === 'full'} className={deskView === 'full' ? 'on' : ''} onClick={() => setDeskView('full')}>
              Everything
            </button>
          </span>
        </span>
      )}
      <button type="button" className="wc-btn mb-btn" disabled={!back && !review && !detail} onClick={() => (review || detail ? openItem(cur?.key ?? '') : back && openItem(back.key))}>
        <IconChevronLeft size={16} aria-hidden /> Back
      </button>
      {next && !review && (
        <button type="button" className="wc-btn mb-btn mb-next" onClick={() => openItem(next.key)} aria-label={`Next: ${next.title}`}>
          {L.planRail ? (
            <>
              Next: <span className="mb-next-t">{next.title}</span>
            </>
          ) : (
            'Next'
          )}{' '}
          <IconChevronRight size={16} aria-hidden />
        </button>
      )}
      {!listShown && (
        <button type="button" className="wc-btn mb-btn see-all" aria-expanded={listOpen} aria-controls="agenda-list" onClick={() => useGameStore.setState({ listOpen: !listOpen })}>
          See all {items.length} {listOpen ? <IconChevronUp size={16} aria-hidden /> : <IconChevronDown size={16} aria-hidden />}
        </button>
      )}
      {!review && (
        <button type="button" className="wc-btn mb-btn mb-check" onClick={goReview}>
          Check and execute <IconChevronRight size={16} aria-hidden />
        </button>
      )}
    </nav>
  );
}
