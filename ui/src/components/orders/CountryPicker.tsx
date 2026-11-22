import { type Ref, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown, IconMapPin, IconSearch, IconX } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { type PickCountry, type PickRow, pickerGroups, pushRecentTarget, readRecentTargets, relationWord, searchCountries } from '../../lib/ease';
import { useNarrow } from '../../lib/useNarrow';
import '../../styles/picker.css';

/** What a parent can do with the picker (the "Pick a country" fix on an order card opens it). */
export interface CountryPickerHandle {
  open: () => void;
  focus: () => void;
}

export interface CountryPickerProps {
  /** The picked country id ('' for none). */
  value: string;
  onChange: (id: string) => void;
  /** Words on the empty trigger. */
  placeholder?: string;
  /** Offer "Pick on the map" (the desk catalog; the map menu and dossier are already on the map). */
  mapPick?: boolean;
  /** A smaller trigger (map menu and dossier headers). */
  compact?: boolean;
  /** Trigger label for screen readers. */
  label?: string;
  handle?: Ref<CountryPickerHandle>;
  className?: string;
  /** Extra props on the trigger (pointAt hooks). */
  triggerProps?: Record<string, unknown>;
}

/** The relation as a word with a colour chip ("Hostile"), never a bare number. */
export function RelationChip({ id }: { id: string }) {
  const v = useGameStore((s) => s.playerView.find((x) => x.id === id));
  const me = useGameStore((s) => s.worldState?.countries.find((c) => c.id === s.worldState?.playerCountryId));
  if (!v) return null;
  const r = relationWord(v.relationWithPlayer, { atWar: !!me?.atWarWith.includes(id), ally: !!me?.alliances.includes(id) });
  return (
    <span className={`rel-chip rel-${r.tone}`} title={`Their view of you: ${Math.round(v.relationWithPlayer)} of 100`}>
      <i aria-hidden /> {r.word}
    </span>
  );
}

/**
 * The country picker (F-01-1): one component for the desk catalog, the map menu and the dossier.
 * A 44 px trigger opens a list with a search box that accepts typing: flags, plain names, the
 * relation in words with a colour chip, the countries that matter first (the crisis, recent
 * targets, wars, allies, rivals, neighbours), the rest A to Z. Up/Down and Enter pick, Escape
 * closes. A popover under the trigger on wide screens, a bottom sheet on phones. "Pick on the
 * map" hands the choice to a tap on the big map.
 */
export function CountryPicker({ value, onChange, placeholder = 'Choose a country', mapPick = false, compact = false, label = 'Target country', handle, className = '', triggerProps }: CountryPickerProps) {
  const view = useGameStore((s) => s.playerView);
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const setMapPick = useGameStore((s) => s.setMapPick);
  const phone = useNarrow(600);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxH: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');

  useImperativeHandle(handle, () => ({
    open: () => setOpen(true),
    focus: () => trigger.current?.focus({ preventScroll: true }),
  }));

  const me = world?.countries.find((c) => c.id === world.playerCountryId);
  const mine = view.find((v) => v.isPlayer);
  const list: PickCountry[] = useMemo(
    () =>
      view
        .filter((v) => !v.isPlayer)
        .map((v) => ({
          id: v.id,
          name: v.name,
          relation: v.relationWithPlayer,
          atWar: !!me?.atWarWith.includes(v.id),
          ally: !!me?.alliances.includes(v.id),
          capital: world?.countries.find((c) => c.id === v.id)?.capital,
        })),
    [view, me, world],
  );
  const groups = useMemo(
    () =>
      pickerGroups(list, {
        crisis: decisions.flatMap((d) => d.affectedCountries),
        recent: readRecentTargets(),
        rivals: mine?.history.historicalRivals,
        allies: mine?.history.historicalAllies,
        home: me?.capital,
      }),
    // readRecentTargets is read again each time the list opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, decisions, mine, me, open],
  );
  const query = q.trim();
  const rows: PickRow[] = query ? searchCountries([...groups.suggested, ...groups.rest], query) : [...groups.suggested, ...groups.rest];
  const cur = Math.min(at, Math.max(0, rows.length - 1));
  const picked = list.find((c) => c.id === value);

  // Place the popover under (or above) the trigger; phones get the bottom sheet
  useLayoutEffect(() => {
    if (!open || phone) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(300, Math.min(380, window.innerWidth - 16));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      if (below >= 320 || below >= above) setPos({ left, top: r.bottom + 6, width, maxH: Math.max(200, below) });
      else setPos({ left, bottom: window.innerHeight - r.top + 6, width, maxH: Math.max(200, above) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, phone]);

  useEffect(() => {
    if (!open) return;
    setAt(0);
    window.setTimeout(() => input.current?.focus({ preventScroll: true }), 0);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`#pick-${uid}-${cur}`)?.scrollIntoView({ block: 'nearest' });
  }, [cur, uid]);

  const close = (refocus = true) => {
    setOpen(false);
    setQ('');
    if (refocus) window.setTimeout(() => trigger.current?.focus({ preventScroll: true }), 0);
  };
  const choose = (id: string) => {
    pushRecentTarget(id);
    onChange(id);
    close();
  };

  const sheet = open && (
    <>
      <div className={`cp-backdrop${phone ? " dim" : ""}`} onPointerDown={() => close()} aria-hidden />
      <div
        className={`cp-pop${phone ? ' cp-sheet' : ''}`}
        role="dialog"
        aria-label="Choose a country"
        style={phone || !pos ? undefined : { left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxH }}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            close();
          }
        }}
      >
        {phone && (
          <div className="cp-sheet-head">
            <b>Choose a country</b>
            <button type="button" className="cp-x" onClick={() => close()} aria-label="Close">
              <IconX size={20} aria-hidden />
            </button>
          </div>
        )}
        <div className="cp-search">
          <IconSearch size={17} aria-hidden />
          <input
            ref={input}
            value={q}
            placeholder="Type a name: iran, china, uk"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls={`pick-${uid}`}
            aria-activedescendant={rows.length ? `pick-${uid}-${cur}` : undefined}
            aria-label="Search countries (Up and Down to choose, Enter to pick)"
            onChange={(e) => {
              setQ(e.target.value);
              setAt(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setAt(Math.max(0, Math.min(rows.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1))));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (rows[cur]) choose(rows[cur].id);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                if (q) setQ('');
                else close();
              } else if (e.key === 'Tab') close(false);
            }}
          />
        </div>
        {mapPick && (
          <button
            type="button"
            className="cp-map"
            onClick={() => {
              close(false);
              setMapPick(true);
            }}
          >
            <IconMapPin size={17} aria-hidden /> Pick on the map
          </button>
        )}
        <div className="cp-list" id={`pick-${uid}`} role="listbox" aria-label="Countries" ref={listRef}>
          {rows.length === 0 && <p className="cp-empty">No country matches "{query}".</p>}
          {rows.map((c, i) => {
            const r = relationWord(c.relation, { atWar: c.atWar, ally: c.ally });
            const head = !query && (i === 0 || i === groups.suggested.length) ? (i === 0 && groups.suggested.length ? 'Likely targets' : 'All countries') : null;
            return (
              <div key={c.id} className="cp-group-wrap">
                {head && <div className="cp-group">{head}</div>}
                <div
                  id={`pick-${uid}-${i}`}
                  role="option"
                  aria-selected={i === cur}
                  className={`cp-row${i === cur ? ' on' : ''}${c.id === value ? ' picked' : ''}`}
                  onPointerEnter={() => setAt(i)}
                  onClick={() => choose(c.id)}
                  data-country={c.id}
                >
                  <span className="cp-flag" aria-hidden>
                    {flag(c.id)}
                  </span>
                  <span className="cp-name">
                    {c.name}
                    {c.why && !query && <small>{c.why}</small>}
                  </span>
                  <span className={`rel-chip rel-${r.tone}`}>
                    <i aria-hidden /> {r.word}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`cp-trigger${compact ? ' compact' : ''}${picked ? ' has-value' : ''} ${className}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={picked ? `${label}: ${picked.name}. Change` : `${label}: ${placeholder}`}
        data-country-picker=""
        {...triggerProps}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          // Typing on the closed trigger opens the list with that letter
          if (!open && e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            setQ(e.key);
            setOpen(true);
          } else if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {picked ? (
          <>
            <span className="cp-flag" aria-hidden>
              {flag(picked.id)}
            </span>
            <span className="cp-name">{picked.name}</span>
            {!compact && <RelationChip id={picked.id} />}
          </>
        ) : (
          <span className="cp-placeholder">{placeholder}</span>
        )}
        <IconChevronDown size={16} aria-hidden className="cp-caret" />
      </button>
      {open && createPortal(sheet, document.body)}
    </>
  );
}
