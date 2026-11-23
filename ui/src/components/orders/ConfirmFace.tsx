import { useEffect, useId, useRef, useState } from 'react';
import { sound } from '../../lib/sound';
import type { OrderFamily } from '../../lib/orders';
import { TERMS } from '../../lib/glossary';
import { FamilyChip, OrderPlate } from './OrderPictogram';

/** How long the nuclear button must be held, ms (design-orders.md §4.4). */
export const HOLD_MS = 1200;

/** war and nuclear: irreversible; danger: a risky order (D-75 mis-pick check); mission: a warning. */
export type ConfirmKind = 'war' | 'nuclear' | 'danger' | 'mission';

export interface ConfirmFaceProps {
  kind: ConfirmKind;
  /** "Declare war on India?" */
  question: string;
  /** The mission warning, shown first (amber) when the order also carries one. */
  missionWarning?: string | null;
  /** Top preview effects and risks (at most 3 are shown). */
  lines: string[];
  /** The confirm button's words ("Declare war", "Give the order"). Nuclear: "Hold to authorize". */
  confirmText: string;
  /** The safe button's words ("Keep the peace", "Stand down", "Cancel"). */
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * The order being confirmed (D-75): the face leads with its pictogram plate and family word,
   * so a player who picked the wrong card by its icon sees which order this is before giving it.
   */
  order?: { id: string; family: OrderFamily; title: string };
}

/**
 * The confirm face of an order card (design-orders.md §4.4): the card flips to a red face for an
 * irreversible order (amber for a mission warning). Focus lands on the safe button, so Enter
 * cancels; confirming takes an explicit press on the other button. A nuclear strike takes a
 * 1.2 s press-and-hold (pointer, or Space/Enter held), with a fill bar; releasing early cancels
 * the hold. Esc or a press outside the face cancels. Never a native dialog.
 */
export function ConfirmFace({ kind, question, missionWarning, lines, confirmText, cancelText, onConfirm, onCancel, order }: ConfirmFaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const safe = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const hold = useRef<{ start: number; raf: number } | null>(null);
  const done = useRef(false);
  const titleId = `wc-confirm-${useId().replace(/:/g, '')}`;
  // The latest onCancel, so a parent re-render never re-runs the focus effect
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    safe.current?.focus({ preventScroll: true });
    // Both answers on screen without a scroll (DR-OC-1): in a scrolling container (the map order
    // menu) bring the button row into view once the face has its size (after the grid reflows)
    // The box we scrolled and where it was, so Cancel, Escape or the order given put it back (DR-OC-1)
    let moved: { box: HTMLElement; top: number } | null = null;
    const raf = requestAnimationFrame(() => {
      // Only the nearest scrolling box moves, never the page: a page with several faces open (the
      // orders gallery) must not jump, and its scroll position must not depend on timing
      const btns = root.current?.querySelector<HTMLElement>('.ord-confirm-btns');
      let box = btns?.parentElement ?? null;
      while (box && box !== document.body && box !== document.documentElement) {
        const oy = getComputedStyle(box).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight + 1) break;
        box = box.parentElement;
      }
      if (!btns || !box || box === document.body || box === document.documentElement) return;
      const b = btns.getBoundingClientRect();
      const c = box.getBoundingClientRect();
      // What lies over the box's edges: its scroll padding (the Map menu's sticky header sets
      // scroll-padding-top) or --cover-bottom (the phone's fixed command bar over the desk stage,
      // DR-OC-4). The answers must end clear of both, not under them
      const cs = getComputedStyle(box);
      const padTop = Number.parseFloat(cs.scrollPaddingTop) || 0;
      const padBottom = Math.max(Number.parseFloat(cs.scrollPaddingBottom) || 0, Number.parseFloat(cs.getPropertyValue('--cover-bottom')) || 0);
      const top = Math.max(c.top, 0) + padTop;
      const bottom = Math.min(c.bottom, window.innerHeight) - padBottom;
      let dy = 0;
      if (b.bottom > bottom) dy = b.bottom - bottom + 8;
      else if (b.top < top) dy = -(top - b.top + 8);
      if (!dy) return;
      moved = { box, top: box.scrollTop };
      box.scrollTop += dy;
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      cancelRef.current();
    };
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) cancelRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    // Next tick, so the press that opened the face does not close it
    const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown, true), 0);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      // Back to where the player was: the face's card shrinks again, so the list does not jump
      const m = moved as { box: HTMLElement; top: number } | null;
      if (m) requestAnimationFrame(() => (m.box.scrollTop = m.top));
      if (hold.current) cancelAnimationFrame(hold.current.raf);
    };
  }, []);

  const startHold = () => {
    if (hold.current || done.current) return;
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        hold.current = null;
        done.current = true;
        onConfirm();
        return;
      }
      if (hold.current) hold.current.raf = requestAnimationFrame(tick);
    };
    hold.current = { start, raf: requestAnimationFrame(tick) };
  };
  const endHold = () => {
    if (!hold.current) return;
    cancelAnimationFrame(hold.current.raf);
    hold.current = null;
    setProgress(0);
  };

  const shown = lines.filter(Boolean).slice(0, 3);
  // The order's title is said once (DR-OC-1): the question carries it ("Strike military targets in
  // Russia?"), so a separate title line only appears when the question does not name the order
  const titleInQuestion = !order || question.toLowerCase().includes(order.title.toLowerCase());
  const q = (
    <h3 className="ord-confirm-q" id={titleId} data-confirm-question="">
      {question}
    </h3>
  );
  return (
    <div ref={root} className={`ord-confirm kind-${kind}`} role="alertdialog" aria-modal="false" aria-labelledby={titleId} data-confirm={kind} data-confirm-order={order?.id}>
      {order ? (
        <div className="ord-confirm-head">
          <OrderPlate id={order.id} family={order.family} size={44} className="is-confirm" />
          <div className="ord-confirm-id">
            <span className="ord-confirm-chips">
              <FamilyChip family={order.family} />
              {(kind === 'war' || kind === 'nuclear') && <span className="ord-chip ord-noundo">{TERMS.noUndo.name}</span>}
            </span>
            {!titleInQuestion && (
              <span className="ord-confirm-title" data-confirm-title="">
                {order.title}
              </span>
            )}
            {q}
          </div>
        </div>
      ) : (
        q
      )}
      {missionWarning && <p className="ord-confirm-mission">{missionWarning}</p>}
      {(kind === 'war' || kind === 'nuclear') && <p className="ord-confirm-sub">There is no undo.{shown.length ? ' What your staff expect:' : ''}</p>}
      {kind === 'danger' && <p className="ord-confirm-sub">A risky order: check it is the one you meant.{shown.length ? ' What your staff expect:' : ''}</p>}
      {shown.length > 0 && (
        <ul className="ord-confirm-lines">
          {shown.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <div className="ord-confirm-btns">
        <button ref={safe} type="button" className="ord-confirm-safe" onClick={onCancel} data-confirm-cancel="">
          {cancelText}
        </button>
        {kind === 'nuclear' ? (
          <button
            type="button"
            className="ord-confirm-go ord-hold"
            data-confirm-go=""
            aria-describedby={`${titleId}-hold`}
            style={{ ['--p' as string]: progress }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              sound.play('tap');
              startHold();
            }}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onPointerLeave={endHold}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                startHold();
              } else if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') endHold();
            }}
            onBlur={endHold}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="ord-hold-fill" aria-hidden />
            <span className="ord-hold-text">{confirmText}</span>
            <span id={`${titleId}-hold`} className="sr-only">
              Press and hold for about one second to authorize.
            </span>
          </button>
        ) : (
          <button type="button" className="ord-confirm-go" onClick={onConfirm} data-confirm-go="">
            {confirmText}
          </button>
        )}
      </div>
    </div>
  );
}
