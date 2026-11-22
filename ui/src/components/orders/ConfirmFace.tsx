import { useEffect, useId, useRef, useState } from 'react';
import { sound } from '../../lib/sound';

/** How long the nuclear button must be held, ms (design-orders.md §4.4). */
export const HOLD_MS = 1200;

export type ConfirmKind = 'war' | 'nuclear' | 'mission';

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
}

/**
 * The confirm face of an order card (design-orders.md §4.4): the card flips to a red face for an
 * irreversible order (amber for a mission warning). Focus lands on the safe button, so Enter
 * cancels; confirming takes an explicit press on the other button. A nuclear strike takes a
 * 1.2 s press-and-hold (pointer, or Space/Enter held), with a fill bar; releasing early cancels
 * the hold. Esc or a press outside the face cancels. Never a native dialog.
 */
export function ConfirmFace({ kind, question, missionWarning, lines, confirmText, cancelText, onConfirm, onCancel }: ConfirmFaceProps) {
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
  return (
    <div ref={root} className={`ord-confirm kind-${kind}`} role="alertdialog" aria-modal="false" aria-labelledby={titleId} data-confirm={kind}>
      <h3 className="ord-confirm-q" id={titleId}>
        {question}
      </h3>
      {missionWarning && <p className="ord-confirm-mission">{missionWarning}</p>}
      {kind !== 'mission' && <p className="ord-confirm-sub">There is no undo.{shown.length ? ' What your staff expect:' : ''}</p>}
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
