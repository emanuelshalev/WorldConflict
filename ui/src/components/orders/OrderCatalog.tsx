import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CATEGORIES, ORDERS, ORDERS_BY_CATEGORY, type OrderDef, orderLabel } from '../../lib/orders';
import { flag } from '../../lib/format';
import { usePointTarget } from '../../lib/pointAt';
import { OrderCard, type OrderCardHandle } from './OrderCard';

export interface OrderCatalogProps {
  /** The picked target country id ('' for none). */
  target: string;
  setTarget: (id: string) => void;
  /** A press on a queued card. Default: open that order in the desk's detail pane. */
  onOpenOrder?: (index: number) => void;
  /** Heading text (default "All orders"); pass null to leave the heading out. */
  title?: string | null;
}

interface Hit {
  def: OrderDef;
  target?: string;
  label: string;
}

/** How many search hits are listed. */
export const MAX_HITS = 8;

/**
 * The desk's "All orders" (design-orders.md §4.5): a target picker, a search box and every order
 * as an `OrderCard` tile grouped by category. With no target, targeted cards read "Pick a country
 * first." and their fix focuses the picker. Search hits are `OrderCard` rows with the same states;
 * Up/Down moves the cursor and Enter acts on the hit under it, exactly like pressing that card: it
 * queues an available order, opens the confirm face of an irreversible one (focus on the safe
 * button, so a second Enter cancels) and, for an unavailable one, points at the resource and
 * focuses the fix (backlog B-09: Enter never queues war or a nuclear strike).
 *
 * Mount: `<OrderCatalog target={target} setTarget={setTarget} />` in place of the old
 * CatalogDetail in `desk/Detail.tsx`.
 */
export function OrderCatalog({ target, setTarget, onOpenOrder, title = 'All orders' }: OrderCatalogProps) {
  const view = useGameStore((s) => s.playerView);
  const setFocus = useGameStore((s) => s.setFocus);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const picker = useRef<HTMLSelectElement>(null);
  const handles = useRef<Array<OrderCardHandle | null>>([]);
  const pickerPoint = usePointTarget('target', 'leader-input ord-target');
  const others = useMemo(() => [...view].filter((v) => !v.isPlayer).sort((a, b) => a.name.localeCompare(b.name)), [view]);
  const targetName = others.find((v) => v.id === target)?.name;
  const query = q.trim().toLowerCase();

  // "spy ir" finds Spy on Iran: every word must start a word of the order or the country
  const hits: Hit[] = useMemo(() => {
    if (!query) return [];
    const words = query.split(/\s+/);
    const matches = (label: string) => words.every((w) => label.toLowerCase().split(/\s+/).some((x) => x.startsWith(w)));
    const out: Hit[] = [];
    for (const def of ORDERS) {
      if (!def.targeted) {
        const label = orderLabel(def);
        if (matches(label)) out.push({ def, label });
        continue;
      }
      // The picked target first, then the rest alphabetically
      const list = target ? [others.find((v) => v.id === target)!, ...others.filter((v) => v.id !== target)].filter(Boolean) : others;
      for (const v of list) {
        const label = orderLabel(def, v.name);
        if (matches(label)) out.push({ def, target: v.id, label });
      }
    }
    return out.slice(0, MAX_HITS);
  }, [query, others, target]);

  const at = Math.min(sel, Math.max(0, hits.length - 1));
  const openOrder = onOpenOrder ?? ((i: number) => setFocus({ kind: 'order', id: String(i) }));
  const pickTarget = () => {
    picker.current?.focus();
    picker.current?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <article className="ord-catalog" data-order-catalog="">
      {title && <h3 className="detail-title">{title}</h3>}
      <div className="catalog-top ord-catalog-top">
        <input
          id="catalog-search"
          className="leader-input"
          placeholder="Search: spy iran, court china, reform"
          value={q}
          autoComplete="off"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="ord-hits"
          aria-activedescendant={hits.length ? `ord-hit-${at}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setSel(Math.max(0, Math.min(hits.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1))));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (e.repeat) return;
              handles.current[at]?.activate();
            } else if (e.key === 'Escape') {
              if (q) setQ('');
              else (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label="Search orders (Up and Down to choose, Enter to act on the highlighted order)"
        />
        <select
          ref={picker}
          {...pickerPoint}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-label="Target country"
        >
          <option value="">Target: pick a country</option>
          {others.map((v) => (
            <option key={v.id} value={v.id}>
              {flag(v.id)} {v.name} ({Math.round(v.relationWithPlayer)})
            </option>
          ))}
        </select>
      </div>
      {query ? (
        <div className="ord-hits" id="ord-hits" role="listbox" aria-label="Matching orders">
          {hits.length === 0 && <p className="hint">No order matches.</p>}
          {hits.map((h, i) => (
            <div key={`${h.def.id}:${h.target ?? ''}`} id={`ord-hit-${i}`} role="option" aria-selected={i === at} onPointerEnter={() => setSel(i)}>
              <OrderCard
                def={h.def}
                targetId={h.target}
                variant="row"
                selected={i === at}
                onOpen={openOrder}
                hoverPreview={false}
                handle={(r) => {
                  handles.current[i] = r;
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        CATEGORIES.map((cat) => (
          <section key={cat} className="ord-cat" aria-label={cat}>
            <div className="nav-head">
              {cat}
              {targetName && ORDERS_BY_CATEGORY[cat].some((o) => o.targeted) && <span className="ord-cat-target"> · {targetName}</span>}
            </div>
            <div className="ord-grid">
              {ORDERS_BY_CATEGORY[cat].map((def) => (
                <OrderCard key={def.id} def={def} targetId={def.targeted ? target || undefined : undefined} onPickTarget={pickTarget} onOpen={openOrder} />
              ))}
            </div>
          </section>
        ))
      )}
    </article>
  );
}
