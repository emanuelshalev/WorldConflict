import { useId, useRef, useState } from 'react';
import { IconCheck, IconChecks, IconChevronDown, IconChevronUp, IconInfoCircle, IconPencil } from '@tabler/icons-react';
import { type StaffPickItem, approveAll, approveLabel, approveStaffPick, openStaffPick } from '../../lib/month';
import { useStaffPicks } from '../../lib/useStaffPicks';
import { TERMS } from '../../lib/glossary';
import { sound } from '../../lib/sound';
import '../../styles/month.css';
import '../../styles/staff-picks.css';

/**
 * "Staff picks" (RS-005, D-64): the CEO pressed "Approve 6 picks" in Map mode without seeing what
 * it would approve. Every Approve control now sits inside this titled group: each pending pick
 * (cabinet picks on crises, staff orders, meetings the staff would attend, meetings a deputy takes)
 * with what it does, what it changes and its mission tag, its own Approve and Change, and the main
 * button that names its count. In Map mode the list can fold away, and then the main button only
 * unfolds it (a disclosure): nothing is ever approved unseen.
 */

const SEEN_KEY = 'worldconflict.staffPicksSeen';
const OPEN_KEY = 'worldconflict.staffPicksOpen';

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

/** A pick's own Approve names what it approves (a bare "Approve" is banned by the glossary). */
const APPROVE_WORD: Record<StaffPickItem['kind'], string> = { crisis: 'Approve pick', order: 'Approve order', meeting: 'Approve meeting', deputy: 'Approve deputy' };

/** One pick: what it is, what it answers, what it changes, Approve and Change. */
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
        {!item.fits && <span className="sp-reason">{item.reason}: not in Approve all</span>}
      </span>
      <div className="sp-act">
        <button type="button" className="wc-btn small sp-approve" onClick={approve} aria-label={`${APPROVE_WORD[item.kind]}: ${item.title}${item.cost ? `, spends ◆ ${item.cost}` : ''}`}>
          <IconCheck size={15} aria-hidden /> {APPROVE_WORD[item.kind]}
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

/** The main button: "Approve 4 staff picks" with what it covers; disabled with a reason at zero. */
function MainButton({ n, breakdown, against, folded, onUnfold, onApprove, kbd, listId, id }: { n: number; breakdown: string; against: number; folded: boolean; onUnfold: () => void; onApprove: () => void; kbd: boolean; listId: string; id?: string }) {
  if (n === 0)
    return (
      <button type="button" id={id} className="wc-btn sp-main" disabled aria-describedby={`${listId}-none`}>
        <span className="sp-main-label">
          <IconChecks size={16} aria-hidden /> {TERMS.approveAll.name.replace('{n} ', '')}
        </span>
        <small className="sp-main-sub" id={`${listId}-none`}>
          Nothing to approve: every staff pick is decided
        </small>
      </button>
    );
  if (folded)
    return (
      <button type="button" id={id} className="wc-btn sp-main is-folded" onClick={onUnfold} aria-expanded={false} aria-controls={listId}>
        <span className="sp-main-label">
          <IconChevronUp size={16} aria-hidden /> Show {n} {n === 1 ? 'staff pick' : 'staff picks'}
        </span>
        <small className="sp-main-sub">{breakdown}: see them before you approve</small>
      </button>
    );
  return (
    <button type="button" id={id} className="wc-btn sp-main" onClick={onApprove} title="Confirm the cabinet's crisis picks, approve the staff's proposed orders (this spends their political capital), attend the suggested meetings and send deputies to the rest (Shift+A)">
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
  const headId = `${uid}-head`;
  const whyId = `${uid}-why`;
  const listId = `${uid}-list`;
  const [why, setWhy] = useState(() => readKey(SEEN_KEY) !== '1');
  // Map mode: open on large screens; on phones, tablets and short screens the list unfolds as a
  // sheet over the globe when asked (staff-picks.css uses the same 1280 x 820 line)
  const [open, setOpen] = useState(() => {
    const kept = readKey(OPEN_KEY);
    return kept !== null ? kept === '1' : typeof window === 'undefined' || (window.innerWidth >= 1280 && window.innerHeight > 820);
  });
  // A double press on "Show n staff picks" must not land on the Approve that replaces it
  const unfoldedAt = useRef(0);
  const folded = variant === 'strip' && !open;
  const mainId = `${uid}-main`;
  const seen = () => writeKey(SEEN_KEY, '1');
  const setOpenKept = (v: boolean) => {
    setOpen(v);
    writeKey(OPEN_KEY, v ? '1' : '0');
    if (v) unfoldedAt.current = Date.now();
    // Keyboard focus follows: to the group's title when it opens, to the button when it folds
    window.requestAnimationFrame(() => document.getElementById(v ? headId : mainId)?.focus());
  };
  const approve = () => {
    if (Date.now() - unfoldedAt.current < 600) return;
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
      aria-label={folded ? TERMS.staffPicks.name : undefined}
      data-staff-picks=""
      onKeyDown={(e) => {
        // On phones the open list is a sheet over the globe: Escape folds it
        if (e.key === 'Escape' && variant === 'strip' && open) setOpenKept(false);
      }}
    >
      {!folded && (
        <div className="sp-head">
          <h3 className="sp-heading" id={headId} tabIndex={-1}>
            {TERMS.staffPicks.name}
            <span className="sp-count num" aria-label={`${n} waiting`}>
              {n}
            </span>
          </h3>
          <button type="button" className="sp-why-btn" aria-expanded={why} aria-controls={whyId} onClick={() => setWhy((v) => !v)}>
            <IconInfoCircle size={15} aria-hidden /> What are these?
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
          {TERMS.staffPicks.definition}
        </p>
      )}
      {!folded && items.length > 0 && (
        <ul className="sp-list" id={listId} aria-label={`${TERMS.staffPicks.name} waiting for approval`}>
          {items.map((it) => (
            <PickRow key={it.key} item={it} onDone={seen} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
      <MainButton n={n} breakdown={breakdown} against={against} folded={folded} onUnfold={() => setOpenKept(true)} onApprove={approve} kbd={variant === 'rail'} listId={listId} id={mainId} />
    </section>
  );
}
