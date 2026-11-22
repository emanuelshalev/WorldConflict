import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconChevronDown, IconChevronUp, IconFileText, IconX } from '@tabler/icons-react';
import { useGameStore } from '../store/gameStore';
import { flag } from '../lib/format';
import { ordersFor } from '../lib/orders';
import { TERMS, term } from '../lib/glossary';
import { OrderCard } from './orders/OrderCard';
import { useMonthView } from './orders/useOrders';

interface Props {
  countryId: string;
  /** Click point, in px relative to the map container. */
  x: number;
  y: number;
  /** The visible part of the map (not under the HUD or desk), relative to the container. */
  bounds: { top: number; bottom: number; left: number; right: number };
  onClose: () => void;
  /** Dev gallery: never dock as a phone sheet. */
  inline?: boolean;
}

/** Phones get the bottom sheet of rows; wider screens the 380 px popover of tiles. */
const narrow = () => typeof window !== 'undefined' && window.innerWidth < 700;

/**
 * The order menu at the click point (design-orders.md §4.5): the six most relevant orders for this
 * country as `OrderCard` tiles (rows in the phone sheet), then "All {n} orders for {T}", which
 * expands in place to the exact list the desk catalog shows for that target (`ordersFor`, the
 * parity rule). It stays open after an order is added: the card stamps and the ◆ ticks down.
 */
export function MapActionMenu({ countryId, x, y, bounds, onClose, inline = false }: Props) {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView.find((v) => v.id === countryId));
  const selectCountry = useGameStore((s) => s.selectCountry);
  const setFocus = useGameStore((s) => s.setFocus);
  const month = useMonthView();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [rows] = useState(narrow);

  // Place beside the click, flipped and clamped to stay inside the visible map
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = Math.min(el.scrollHeight, el.offsetHeight);
    const pad = 8;
    // Too little map showing (phones): dock as a sheet at the bottom of the screen instead
    if (!inline && (rows || w > bounds.right - bounds.left - pad * 2)) {
      el.classList.add('sheet');
      el.style.left = '';
      el.style.top = '';
      el.style.visibility = '';
      return;
    }
    const room = bounds.bottom - bounds.top - pad * 2;
    el.style.maxHeight = `${room}px`;
    let left = x + 14;
    if (left + w > bounds.right - pad) left = x - 14 - w;
    left = Math.max(bounds.left + pad, Math.min(left, bounds.right - w - pad));
    let top = y - 28;
    if (top + Math.min(h, room) > bounds.bottom - pad) top = bounds.bottom - pad - Math.min(h, room);
    top = Math.max(bounds.top + pad, top);
    // Measured placement is applied straight to the element (no second render)
    el.classList.remove('sheet');
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = '';
  }, [x, y, bounds.top, bounds.bottom, bounds.left, bounds.right, countryId, expanded, rows, inline]);

  // Escape closes the menu first (before the dossier or a drawer); a confirm face handles its own
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ref.current?.querySelector('[data-confirm]')) return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.ord-wrap .wc-card-hit')?.focus({ preventScroll: true });
  }, [countryId]);

  const me = world?.countries.find((c) => c.id === world.playerCountryId);
  if (!world || !me || !view) return null;
  const all = ordersFor(me, view, { expanded: true });
  const short = ordersFor(me, view);
  const orders = expanded ? all : short.length ? short : all.slice(0, 6);
  const atWar = me.atWarWith.includes(countryId);
  const rel = Math.round(view.relationWithPlayer);
  const left = Math.max(0, month.pcLeft);

  return (
    <div
      ref={ref}
      className={`map-action-menu ord-menu${rows ? ' ord-menu-rows' : ''}`}
      role="dialog"
      aria-label={`Orders for ${view.name}`}
      style={{ left: x, top: y, visibility: 'hidden' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mam-head">
        <span className="mam-flag" aria-hidden>
          {flag(countryId)}
        </span>
        <div className="mam-title">
          <b>{view.name}</b>
          <span className={`mam-rel ${atWar ? 'war' : rel >= 20 ? 'warm' : rel <= -20 ? 'cold' : ''}`}>
            {atWar ? 'At war with you' : `${view.diplomaticLevel.replace(/_/g, ' ').toLowerCase()} · ${rel > 0 ? '+' : ''}${rel}`}
          </span>
        </div>
        <span className="mam-pc num" data-point="capital" aria-label={`${TERMS.capital.name}: ${left} left`}>
          {term(TERMS.capital.compact, left)}
        </span>
        <button className="mam-close" onClick={onClose} aria-label="Close order menu">
          <IconX size={18} />
        </button>
      </div>
      <div className={rows ? 'ord-list mam-list' : 'ord-mam-grid'}>
        {orders.map((def) => (
          <OrderCard
            key={def.id}
            def={def}
            targetId={countryId}
            variant={rows ? 'row' : 'tile'}
            compact
            onOpen={(i) => setFocus({ kind: 'order', id: String(i) })}
          />
        ))}
      </div>
      {(all.length > orders.length || expanded) && (
        <button className="ord-more mam-more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? (
            <>
              <IconChevronUp size={15} aria-hidden /> Fewer orders
            </>
          ) : (
            <>
              <IconChevronDown size={15} aria-hidden /> All {all.length} orders for {view.name} <span>· same list as the desk</span>
            </>
          )}
        </button>
      )}
      <button
        className="mam-dossier"
        onClick={() => {
          onClose();
          selectCountry(countryId);
        }}
      >
        <IconFileText size={15} /> Dossier
        <span className="mam-hint">intel, history, more orders</span>
      </button>
    </div>
  );
}
