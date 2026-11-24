import { type ReactNode, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../../store/gameStore';
import { FAMILIES, FAMILY_WORD, ORDERS, ORDERS_BY_FAMILY, type OrderDef, type OrderFamily, orderLabel } from '../../lib/orders';
import { useFitLevel } from '../../lib/layout';
import { usePointTarget } from '../../lib/pointAt';
import { OrderCard, type OrderCardHandle } from './OrderCard';
import { CountryPicker, type CountryPickerHandle } from './CountryPicker';

export interface OrderCatalogProps {
  /** The picked target country id ('' for none). */
  target: string;
  setTarget: (id: string) => void;
  /** A press on a queued card. Default: open that order in the desk's detail pane. */
  onOpenOrder?: (index: number) => void;
  /** Heading text (default "All orders"); pass null to leave the heading out. */
  title?: string | null;
  /** Put first on the top line (the desk's "Back to the month"), so the line is not a row of its own. */
  lead?: ReactNode;
}

interface Hit {
  def: OrderDef;
  target?: string;
  label: string;
}

/** No extra elements for the fit rule (a stable empty list). */
const NO_REFS: never[] = [];

/** How many search hits are listed. */
export const MAX_HITS = 8;

/**
 * Below this width the catalogue lists its groups as 76 px `OrderCard` rows, not tiles
 * (design-order-cards.md section 5, DR-OC-3): a phone screen then holds 6 or more orders.
 */
export const ROWS_QUERY = '(max-width: 599px)';

const subscribeRows = (cb: () => void) => {
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(ROWS_QUERY) : null;
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
};
const rowsNow = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(ROWS_QUERY).matches : false);

/** True while the viewport is phone-narrow (rows instead of tiles). */
function useCatalogRows(): boolean {
  return useSyncExternalStore(subscribeRows, rowsNow, rowsNow);
}

/**
 * The desk's "All orders" (design-orders.md §4.5): a target picker, a search box and every order
 * as an `OrderCard` tile grouped by family, under the family word its chips carry (rows on a
 * phone). With no target, targeted cards read "Pick a country
 * first." and their fix focuses the picker. Search hits are `OrderCard` rows with the same states;
 * Up/Down moves the cursor and Enter acts on the hit under it, exactly like pressing that card: it
 * queues an available order, opens the confirm face of an irreversible one (focus on the safe
 * button, so a second Enter cancels) and, for an unavailable one, points at the resource and
 * focuses the fix (backlog B-09: Enter never queues war or a nuclear strike).
 *
 * Mount: `<OrderCatalog target={target} setTarget={setTarget} />` in place of the old
 * CatalogDetail in `desk/Detail.tsx`.
 */
export function OrderCatalog({ target, setTarget, onOpenOrder, title = 'All orders', lead }: OrderCatalogProps) {
  const view = useGameStore((s) => s.playerView);
  const setFocus = useGameStore((s) => s.setFocus);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const rows = useCatalogRows();
  // Wider than a phone the catalogue never scrolls (design-layout.md section 7, L-13): one family at
  // a time behind tabs with counts, and the family's cards fit the frame. The fit rule steps the
  // cards down until they fit: 0 tiles, 1 compact tiles, 2 rows in columns (design review S1-1:
  // the families below the first ones were cut off with no sign they existed). Phones keep every
  // family in the page's own scroll.
  const tabs = !rows;
  const [fam, setFam] = useState<OrderFamily>('diplo');
  const panel = useRef<HTMLDivElement>(null);
  const picker = useRef<CountryPickerHandle>(null);
  const handles = useRef<Array<OrderCardHandle | null>>([]);
  const pickerPoint = usePointTarget('target', 'ord-target');
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

  const fit = useFitLevel(panel, `${tabs}|${fam}|${query}|${hits.length}|${target}`, 3, NO_REFS, true);
  const at = Math.min(sel, Math.max(0, hits.length - 1));
  const families = FAMILIES.filter((f) => ORDERS_BY_FAMILY[f].length > 0);
  const tabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = families.indexOf(fam);
    const next = families[(i + (e.key === 'ArrowRight' ? 1 : families.length - 1)) % families.length];
    setFam(next);
    window.setTimeout(() => document.getElementById(`ord-tab-${next}`)?.focus(), 0);
  };
  const family = (f: OrderFamily, inTabs: boolean) => {
    const word = FAMILY_WORD[f];
    const list = ORDERS_BY_FAMILY[f];
    // Tiles, compact tiles, then rows (the fit level); phones always rows
    const asRows = rows || (inTabs && fit >= 2);
    return (
      <section key={f} className={`ord-cat fam-${f}`} aria-label={word} data-order-family={f} {...(inTabs ? { role: 'tabpanel', id: 'ord-panel', 'aria-labelledby': `ord-tab-${f}` } : {})}>
        {!inTabs && (
          <div className="nav-head ord-cat-head" data-family-heading={word}>
            <i className="ord-cat-mark" aria-hidden />
            {word}
            {targetName && list.some((o) => o.targeted) && <span className="ord-cat-target"> · {targetName}</span>}
          </div>
        )}
        <div className={asRows ? `ord-list ord-cat-rows${inTabs ? ' is-cols' : ''}` : 'ord-grid'}>
          {list.map((def) => (
            <OrderCard
              key={def.id}
              def={def}
              targetId={def.targeted ? target || undefined : undefined}
              variant={asRows ? 'row' : 'tile'}
              compact={inTabs && fit === 1}
              hoverPreview={rows ? false : undefined}
              pressForecast={rows}
              onPickTarget={pickTarget}
              onOpen={openOrder}
            />
          ))}
        </div>
      </section>
    );
  };
  const openOrder = onOpenOrder ?? ((i: number) => setFocus({ kind: 'order', id: String(i) }));
  // "Pick a country" on a card opens the picker itself, not a native dropdown
  const pickTarget = () => {
    picker.current?.focus();
    picker.current?.open();
  };

  return (
    <article className={`ord-catalog${tabs ? ' is-tabs' : ''}`} data-order-catalog="" data-fit={tabs ? fit : undefined}>
      {!tabs && lead}
      {!tabs && title && <h3 className="detail-title">{title}</h3>}
      <div className="catalog-top ord-catalog-top">
        {tabs && lead}
        {tabs && title && <h3 className="detail-title">{title}</h3>}
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
        <CountryPicker
          handle={picker}
          value={target}
          onChange={setTarget}
          mapPick
          placeholder="Target: choose a country"
          className={pickerPoint.className}
          triggerProps={{ 'data-point': pickerPoint['data-point'] }}
        />
      </div>
      {tabs && !query && (
        <div className="ord-tabs" role="tablist" aria-label="Order families">
          {families.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              id={`ord-tab-${f}`}
              className={`ord-tab fam-${f}`}
              aria-selected={f === fam}
              aria-controls="ord-panel"
              tabIndex={f === fam ? 0 : -1}
              onClick={() => setFam(f)}
              onKeyDown={tabKey}
              data-family-tab={FAMILY_WORD[f]}
            >
              <i className="ord-cat-mark" aria-hidden />
              {FAMILY_WORD[f]} <span className="ord-tab-n num">{ORDERS_BY_FAMILY[f].length}</span>
            </button>
          ))}
          {targetName && <span className="ord-tabs-target">Target: {targetName}</span>}
        </div>
      )}
      {tabs ? (
        <div className="ord-tabpanel" ref={panel}>
          {query ? hitList() : family(fam, true)}
        </div>
      ) : query ? (
        hitList()
      ) : (
        <>
          {/* Only while it applies (S4): with a target chosen, every row's own Forecast cue and Add
              button say the rest, and the line would cost the list a row */}
          {!target && (
            <p className="ord-cat-hint" data-cat-hint="">
              Pick a country first: orders aimed at a country say Pick until you choose one. Tap an order for its forecast; Add puts it in this month.
            </p>
          )}
          {families.map((f) => family(f, false))}
        </>
      )}
    </article>
  );

  function hitList() {
    return (
        <div className={rows ? 'ord-hits ord-cat-rows' : `ord-hits${fit >= 1 ? ' is-cols' : ''}`} id="ord-hits" role="listbox" aria-label="Matching orders">
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
                // On a phone a search hit behaves as a list row: a tap shows the forecast, Add adds
                // (Enter in the search box still acts on the highlighted hit)
                pressForecast={rows}
                handle={(r) => {
                  handles.current[i] = r;
                }}
              />
            </div>
          ))}
        </div>
    );
  }
}
