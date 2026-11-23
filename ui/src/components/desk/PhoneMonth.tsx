import { useEffect, useState } from 'react';
import { IconArrowDown, IconChevronLeft, IconChevronRight, IconListDetails } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { agendaItems, agendaProgress, currentItem, neighbours, openItem } from '../../lib/agenda';
import { Thing } from './YourMove';
import { ReviewPage } from './ReviewPage';
import { AgendaList } from './AgendaList';
import { Detail } from './Detail';
import { ExecuteButton, Recommended } from './Plan';
import { executeNow } from '../../lib/agenda';
import { ModeSwitch } from '../StateBand';
import { useStaffPicks } from '../../lib/useStaffPicks';
import { TERMS } from '../../lib/glossary';

/**
 * Phones (design-layout L-15, design-agenda 0.1): their own tree, one thing per screen. The sticky
 * top holds the state line (StateBand) and the thing line (Back, "2 of 6 · Xi Jinping calls / 1
 * done, 5 to go", See all); the thing scrolls with the page; the sticky bottom holds the cue for
 * answers below the fold (with its count, it scrolls to the first) and one button: Next, or on the
 * review screen and in Map mode Execute with its consequence line. No inner scroll regions.
 */

/** The thing line under the state line (MonthBar's phone form). */
export function PhoneThingLine() {
  const agendaKey = useGameStore((s) => s.agendaKey);
  const review = useGameStore((s) => s.review);
  const listOpen = useGameStore((s) => s.listOpen);
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.skipped);
  useGameStore((s) => s.pendingActions);
  const items = agendaItems();
  const cur = currentItem(items, agendaKey);
  const { back } = neighbours(items, cur);
  const { done, total } = agendaProgress(items);
  const at = cur ? items.findIndex((x) => x.key === cur.key) + 1 : 0;
  return (
    <nav className="ph-thingline month-bar" data-region="bar" aria-label="This month">
      {/* Back is its arrow on the phone (the word stays its name): the title gets the width (C4) */}
      <button type="button" className="wc-btn small ph-back" disabled={!back && !review} onClick={() => (review ? useGameStore.setState({ review: false }) : back && openItem(back.key))} aria-label="Back" title="Back">
        <IconChevronLeft size={18} aria-hidden /> <span className="ph-back-word">Back</span>
      </button>
      <p className="mb-where">
        <b>{review ? 'Review your month' : cur ? `${at} of ${items.length} · ${cur.title}${cur.call ? ' · Your call' : ''}` : 'A quiet month'}</b>
        <span>
          {done} of {total} done
        </span>
      </p>
      <button type="button" className="wc-btn small see-all" aria-expanded={listOpen} onClick={() => useGameStore.setState({ listOpen: !listOpen })}>
        <IconListDetails size={16} aria-hidden /> See all {items.length}
      </button>
      {/* design-layout section 5: on phones the Desk / Map switch lives in the thing line, under
          See all in the right column (C4: the line is one block, not a row for the switch) */}
      <ModeSwitch />
    </nav>
  );
}

/** How many answer cards are below the fold or under the bottom bar (the cue's count, AC-L5). */
function useBelow(dep: unknown): { n: number; skip: boolean; first: HTMLElement | null } {
  const [state, set] = useState<{ n: number; skip: boolean; first: HTMLElement | null }>({ n: 0, skip: false, first: null });
  useEffect(() => {
    const scroller = document.querySelector('.game');
    const measure = () => {
      const bar = document.querySelector('.ph-bottom')?.getBoundingClientRect();
      const limit = bar ? bar.top : window.innerHeight;
      const cards = [...document.querySelectorAll<HTMLElement>('.ph-body .thing .opt')];
      const hidden = cards.filter((c) => c.getBoundingClientRect().bottom > limit + 1);
      set({ n: hidden.length, skip: hidden.some((c) => c.classList.contains('skipopt')), first: hidden[0] ?? null });
    };
    measure();
    const t = window.setTimeout(measure, 400);
    scroller?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      scroller?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [dep]);
  return state;
}

export function PhoneBottom({ map = false }: { map?: boolean }) {
  const agendaKey = useGameStore((s) => s.agendaKey);
  const review = useGameStore((s) => s.review);
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.skipped);
  useGameStore((s) => s.pendingActions);
  const items = agendaItems();
  const cur = currentItem(items, agendaKey);
  const { next } = neighbours(items, cur);
  const below = useBelow(`${agendaKey}|${review}|${map}`);
  const { n } = useStaffPicks();
  const [recOpen, setRecOpen] = useState(false);
  const answers = below.n - (below.skip ? 1 : 0);
  const cue = below.n > 0 && !review ? `${answers > 0 ? `${answers} more answer${answers === 1 ? '' : 's'}${below.skip ? ' and Skip' : ''}` : 'Skip'} below` : '';
  const go = (key: string) => {
    openItem(key);
    document.querySelector('.game')?.scrollTo({ top: 0 });
  };
  return (
    <div className="ph-bottom" data-region="plan" data-form="sheet">
      {cue && (
        <button type="button" className="wc-btn small ph-below" onClick={() => below.first?.scrollIntoView({ block: 'center', behavior: 'smooth' })} data-below-cue="">
          {cue} <IconArrowDown size={15} aria-hidden />
        </button>
      )}
      {map && recOpen && (
        <div className="ph-sheet ph-rec" role="dialog" aria-label={TERMS.recommended.name}>
          <button type="button" className="wc-btn small al-close" onClick={() => setRecOpen(false)}>
            Close
          </button>
          <Recommended compact onOpen={() => setRecOpen(false)} />
        </div>
      )}
      {map && (
        <button type="button" className="wc-btn small pbar-review" aria-expanded={recOpen} onClick={() => setRecOpen((v) => !v)}>
          <IconListDetails size={15} aria-hidden /> {TERMS.reviewRecommended.name.replace('{n}', String(n))}
        </button>
      )}
      {review || map ? (
        <>
          <p className="ph-conseq">
            <b>If you execute now:</b> {executeNow()[0]}
          </p>
          <ExecuteButton />
        </>
      ) : next ? (
        <button type="button" className="wc-btn big ph-next" onClick={() => go(next.key)}>
          Next: {next.title} <IconChevronRight size={18} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className="wc-btn big ph-next"
          onClick={() => {
            useGameStore.setState({ review: true });
            document.querySelector('.game')?.scrollTo({ top: 0 });
          }}
        >
          Review your month <IconChevronRight size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function PhoneMonth({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
  const review = useGameStore((s) => s.review);
  const listOpen = useGameStore((s) => s.listOpen);
  const focus = useGameStore((s) => s.focus);
  const detail = focus.kind === 'catalog' || focus.kind === 'order' || focus.kind === 'suggestions';
  return (
    <section className="phone-month" aria-label="Your desk">
      <main className="ph-body" data-region="item">
        {review ? <ReviewPage phone /> : detail ? <Detail target={target} setTarget={setTarget} /> : <Thing />}
      </main>
      <PhoneBottom />
      {listOpen && (
        <div className="ph-sheet">
          <AgendaList form="sheet" />
        </div>
      )}
    </section>
  );
}
