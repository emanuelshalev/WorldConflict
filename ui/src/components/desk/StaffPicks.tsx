import { useId, useState } from 'react';
import { IconCheck, IconChecks, IconChevronDown, IconInfoCircle, IconListDetails, IconPencil } from '@tabler/icons-react';
import { type StaffPickItem, approveAll, approveLabel, approveStaffPick, openStaffPick } from '../../lib/month';
import { useRecommendedOpen, useStaffPicks } from '../../lib/useStaffPicks';
import { TERMS } from '../../lib/glossary';
import { sound } from '../../lib/sound';
import '../../styles/month.css';
import '../../styles/staff-picks.css';

/**
 * "Recommended" (RS-005, D-64; wording D-71/D-72): the CEO pressed "Approve 6 picks" in Map mode
 * without seeing what it would approve. Every Accept all control now sits inside this titled group:
 * each pending recommendation (crisis answers, recommended orders, meetings to attend, meetings a
 * deputy takes) with who recommends it, what it does, what it changes and its mission tag, its own
 * Accept and Change, and the main button "Accept all recommended (n)". In Map mode the list starts
 * folded behind "Review n recommended", which only unfolds it: nothing is ever accepted unseen.
 */

const SEEN_KEY = 'worldconflict.recommendedSeen';

function readKey(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeKey(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
}

type Variant = 'rail' | 'sheet' | 'strip';

/** A short desktop rail, where the list, Accept all and Execute need every pixel (staff-picks.css). */
const SHORT_RAIL = () => typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerHeight <= 820;

/** One verb, Accept (D-72); each pick's own button names what it accepts. */
const ACCEPT_WORD: Record<StaffPickItem['kind'], string> = { crisis: 'Accept answer', order: 'Accept order', meeting: 'Accept meeting', deputy: 'Accept deputy' };

/** One recommendation: who recommends it, what it is, what it answers, what it changes, Accept and Change. */
function PickRow({ item, onDone, onNavigate }: { item: StaffPickItem; onDone: () => void; onNavigate?: () => void }) {
  const approve = () => {
    if (approveStaffPick(item).ok) {
      sound.play('stamp');
      onDone();
    }
  };
  return (
    <li className={`sp-item kind-${item.kind}${item.fits ? '' : ' is-off'}`} data-staff-pick={item.kind}>
      <div className="sp-text">
        <span className="sp-by">{TERMS.staffPick.name.replace('{role}', item.by)}</span>
        <b className="sp-name">{item.title}</b>
        <span className="sp-what">{item.what}</span>
        {item.change && <span className="sp-change">{item.change}</span>}
      </div>
      <div className="sp-foot">
      <span className="sp-tags">
        {item.tag && (
          <span className={`adv-tag tag-${item.tag.tone}`}>
            {item.tag.text}
            {item.tag.more ? ` +${item.tag.more} more` : ''}
          </span>
        )}
        {!item.fits && <span className="sp-reason">{item.reason}: not in Accept all</span>}
      </span>
      <div className="sp-act">
        <button type="button" className="wc-btn small sp-approve" onClick={approve} aria-label={`${ACCEPT_WORD[item.kind]}: ${item.title}${item.cost ? `, spends ◆ ${item.cost}` : ''}`}>
          <IconCheck size={15} aria-hidden /> {ACCEPT_WORD[item.kind]}
        </button>
        <button
          type="button"
          className="wc-btn small sp-edit"
          onClick={() => {
            openStaffPick(item);
            onNavigate?.();
          }}
          aria-label={`Change: ${item.title}`}
        >
          <IconPencil size={15} aria-hidden /> Change
        </button>
      </div>
      </div>
    </li>
  );
}

/** The main button: "Accept all recommended (4)" with what it covers; disabled with a reason at zero. */
function MainButton({ n, breakdown, against, folded, onUnfold, onApprove, kbd, listId, id }: { n: number; breakdown: string; against: number; folded: boolean; onUnfold: () => void; onApprove: () => void; kbd: boolean; listId: string; id?: string }) {
  if (n === 0)
    return (
      <button type="button" id={id} className="wc-btn sp-main" disabled aria-describedby={`${listId}-none`}>
        <span className="sp-main-label">
          <IconChecks size={16} aria-hidden /> {TERMS.approveAll.name.replace(' ({n})', '')}
        </span>
        <small className="sp-main-sub" id={`${listId}-none`}>
          Nothing to accept: every recommendation is decided
        </small>
      </button>
    );
  if (folded)
    return (
      <button type="button" id={id} className="wc-btn sp-main is-folded" onClick={onUnfold} aria-expanded={false} aria-controls={listId}>
        <span className="sp-main-label">
          <IconListDetails size={16} aria-hidden /> Review {n} recommended
        </span>
        <small className="sp-main-sub">{breakdown}: opens the list, accepts nothing</small>
      </button>
    );
  return (
    <button type="button" id={id} className="wc-btn sp-main" onClick={onApprove} title="Accept every recommendation listed here: the crisis answers, the recommended orders (this spends their political capital), the meetings to attend and the deputies for the rest (Shift+A)">
      <span className="sp-main-label">
        <IconChecks size={16} aria-hidden /> {approveLabel(n)}
        {kbd && <kbd>Shift+A</kbd>}
      </span>
      <small className="sp-main-sub">
        {breakdown}
        {against > 0 && <span className="approve-against"> · {against} against your mission</span>}
      </small>
    </button>
  );
}

export function StaffPicks({ variant, onNavigate }: { variant: Variant; onNavigate?: () => void }) {
  const { items, n, breakdown, against } = useStaffPicks();
  const uid = useId();
  // The strip's group moves between the act row (folded) and its own row (open): stable ids, so
  // focus can follow it across the remount
  const base = variant === 'strip' ? 'recommended-strip' : uid;
  const headId = `${base}-head`;
  const whyId = `${base}-why`;
  const listId = `${base}-list`;
  const mainId = `${base}-main`;
  // On a short desk rail (820 px or less) the first-use explanation starts closed so Accept all and
  // Execute keep their room; "What is this?" opens it (design review of stability-iter4)
  const [why, setWhy] = useState(() => readKey(SEEN_KEY) !== '1' && !(variant === 'rail' && SHORT_RAIL()));
  // Map mode starts folded behind "Review n recommended" (D-72; the globe keeps its room): on large
  // screens the list opens in the strip, on phones, tablets and short screens as a sheet over the
  // globe (staff-picks.css, 1280 x 820). The player's choice is remembered (lib/useStaffPicks).
  const open = useRecommendedOpen((st) => st.open);
  const folded = variant === 'strip' && !open;
  const seen = () => writeKey(SEEN_KEY, '1');
  const setOpenKept = (v: boolean) => {
    useRecommendedOpen.getState().setOpen(v);
    // Keyboard focus follows: to the group's title when it opens, to the button when it folds
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById(v ? headId : mainId)?.focus()));
  };
  const approve = () => {
    // A double press on "Review n recommended" must not land on the Accept that replaces it
    if (Date.now() - useRecommendedOpen.getState().openedAt < 600) return;
    approveAll();
    sound.play('stamp');
    seen();
  };
  // The map strip shows only the button when nothing waits (the globe keeps its room)
  if (variant === 'strip' && n === 0 && !items.length)
    return (
      <div className="staff-picks v-strip is-empty" data-staff-picks="">
        <MainButton n={0} breakdown="" against={0} folded={false} onUnfold={() => {}} onApprove={() => {}} kbd={false} listId={listId} />
      </div>
    );
  return (
    <section
      className={`staff-picks v-${variant}${folded ? ' is-folded' : ''}`}
      aria-labelledby={folded ? undefined : headId}
      aria-label={folded ? TERMS.recommended.name : undefined}
      data-staff-picks=""
      onKeyDown={(e) => {
        // On phones the open list is a sheet over the globe: Escape folds it
        if (e.key === 'Escape' && variant === 'strip' && open) setOpenKept(false);
      }}
    >
      {!folded && (
        <div className="sp-head">
          <h3 className="sp-heading" id={headId} tabIndex={-1}>
            {TERMS.recommended.name}
            <span className="sp-count num" aria-label={`${n} waiting`}>
              {n}
            </span>
          </h3>
          <button type="button" className="sp-why-btn" aria-expanded={why} aria-controls={whyId} onClick={() => setWhy((v) => !v)}>
            <IconInfoCircle size={15} aria-hidden /> What is this?
          </button>
          {variant === 'strip' && (
            <button type="button" className="sp-fold" aria-expanded aria-controls={listId} onClick={() => setOpenKept(false)}>
              <IconChevronDown size={15} aria-hidden /> Hide list
            </button>
          )}
        </div>
      )}
      {why && !folded && (
        <p className="sp-why" id={whyId}>
          {TERMS.recommended.definition}
        </p>
      )}
      {!folded && items.length > 0 && (
        <ul className="sp-list" id={listId} aria-label={`${TERMS.recommended.name}, waiting for you to accept`}>
          {items.map((it) => (
            <PickRow key={it.key} item={it} onDone={seen} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
      <MainButton n={n} breakdown={breakdown} against={against} folded={folded} onUnfold={() => setOpenKept(true)} onApprove={approve} kbd={variant === 'rail'} listId={listId} id={mainId} />
    </section>
  );
}
