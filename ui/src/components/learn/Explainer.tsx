import { type JSX, type ReactNode, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconBook, IconCalendarEvent, IconChevronLeft, IconMapPin, IconUsersGroup, IconX } from '@tabler/icons-react';
import type { CodexEntry } from '../../lib/codexMatch';
import { TERMS, type TermId } from '../../lib/glossary';
import { preferLayer2 } from '../../lib/learn';
import { flag } from '../../lib/format';
import { useNarrow } from '../../lib/useNarrow';
import { useGameStore } from '../../store/gameStore';

import { fictionalLeader, liveLine } from './liveLine';
import { KIND_WORD, asOfLabel, initials, placeName, placePopover, useCodex, useExplain } from './explain';

/**
 * The one explainer of the app (design-learn.md §4, D-53), rendered once in a portal.
 * Opens only on click, tap or Enter (never on hover). Desktop and tablet: a popover placed next
 * to the word but never over the Execute button, the command rail or the option cards. Phone
 * (600 px and less): a bottom sheet with More, Codex and Close (44 px), swipe down or tap the
 * scrim to close. Layer 1 is one line; "More" adds the story and the map; "In your game" is
 * the live line from the player's belief-filtered view.
 */

// The mini map loads with the first "More" (it is the largest part of an explainer)
const CodexMap = lazy(() => import('./CodexMap').then((m) => ({ default: m.CodexMap })));

/** Areas the popover must never cover (concept test: Execute and the option cards). */
const AVOID = '.move-cards, .rail, .cmd-bar, .execute-btn, .command-strip, .result-foot, [data-learn-avoid]';
export function Glyph({ entry }: { entry: CodexEntry }) {
  if (entry.kind === 'person') {
    return (
      <span className="lx-disc" aria-hidden>
        {initials(entry.name)}
        {entry.countryId && <i className="lx-disc-flag">{flag(entry.countryId)}</i>}
      </span>
    );
  }
  const Icon = entry.kind === 'place' ? IconMapPin : entry.kind === 'group' ? IconUsersGroup : entry.kind === 'event' ? IconCalendarEvent : IconBook;
  return (
    <span className={`lx-glyph k-${entry.kind}`} aria-hidden>
      <Icon size={18} />
    </span>
  );
}

export function EntryHead({ entry, headingId }: { entry: CodexEntry; headingId?: string }) {
  return (
    <header className="lx-head">
      <Glyph entry={entry} />
      <div>
        <div className="lx-kind">
          {KIND_WORD[entry.kind]}
          {entry.countryId ? ` · ${placeName(entry.countryId)}` : ''}
        </div>
        <h2 className="lx-name" id={headingId}>
          {entry.name}
        </h2>
      </div>
    </header>
  );
}

/** The live "In your game" box (amber), or nothing. */
export function InYourGame({ entry }: { entry: CodexEntry }) {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const on = useGameStore((s) => s.learn.prefs.liveLines);
  const line = on ? liveLine(entry, world, view) : null;
  if (!line) return null;
  return (
    <div className="lx-live" role="note">
      <b>In your game</b> {line}
    </div>
  );
}

/** Body of an entry: short, then (layer 2) map and long text, then the live line. */
export function EntryBody({ entry, layer }: { entry: CodexEntry; layer: 1 | 2 }) {
  return (
    <>
      <p className="lx-short">{entry.short}</p>
      {layer === 2 && entry.map && (
        <Suspense fallback={<div className="lx-map lx-map-empty" />}>
          <CodexMap data={entry.map} label={entry.name} />
        </Suspense>
      )}
      {layer === 2 && entry.long && <p className="lx-long">{entry.long}</p>}
      <InYourGame entry={entry} />
    </>
  );
}

function sourceCount(e: CodexEntry): string {
  const n = e.sources.length;
  return `As of ${asOfLabel(e.asOf)}${n ? ` · ${n} source${n === 1 ? '' : 's'}` : ''}`;
}

interface CardProps {
  phone: boolean;
  headingId: string;
  close: () => void;
}

function Foot({ children, phone, close }: { children?: ReactNode; phone: boolean; close: () => void }) {
  return (
    <div className="lx-foot">
      {children}
      {phone && (
        <button type="button" className="lx-btn" onClick={close}>
          Close
        </button>
      )}
    </div>
  );
}

function EntryCard({ entry, phone, headingId, close }: CardProps & { entry: CodexEntry }) {
  const learn = useGameStore((s) => s.learn);
  const marksOn = useGameStore((s) => s.learn.level === 'guide' && !s.codexMarksHidden);
  const opened = useGameStore((s) => s.noteCodexOpened);
  const stop = useGameStore((s) => s.markCodexLearned);
  const from = useExplain((s) => s.from);
  const back = useExplain((s) => s.back);
  const openCodex = useExplain((s) => s.openCodex);
  const hasMore = !!(entry.long || entry.map);
  const [layer, setLayer] = useState<1 | 2>(() => (hasMore && preferLayer2(learn) ? 2 : 1));
  // One open per entry shown, recorded with the layer the player ended on (last-layer memory)
  const layerRef = useRef(layer);
  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);
  useEffect(() => () => opened(entry.id, layerRef.current), [entry.id, opened]);
  return (
    <>
      {from && (
        <button type="button" className="lx-back" onClick={back}>
          <IconChevronLeft size={14} aria-hidden /> In this paragraph
        </button>
      )}
      <EntryHead entry={entry} headingId={headingId} />
      <EntryBody entry={entry} layer={layer} />
      <div className="lx-meta num">{sourceCount(entry)}</div>
      <Foot phone={phone} close={close}>
        {hasMore && (
          <button type="button" className="lx-btn" onClick={() => setLayer(layer === 1 ? 2 : 1)} aria-expanded={layer === 2}>
            {layer === 1 ? 'More' : 'Less'}
          </button>
        )}
        {marksOn && (
          <button
            type="button"
            className="lx-btn ghost"
            onClick={() => {
              stop(entry.id);
              close();
            }}
          >
            Stop marking
          </button>
        )}
        <button type="button" className="lx-btn link" onClick={() => openCodex(entry.id)}>
          Codex ›
        </button>
      </Foot>
    </>
  );
}

function ListCard({ ids, phone, headingId, close }: CardProps & { ids: string[] }) {
  const codex = useCodex();
  const drill = useExplain((s) => s.drill);
  const entries = ids.map((id) => codex?.byId.get(id)).filter((e): e is CodexEntry => !!e);
  return (
    <>
      <div className="lx-kind">Explained</div>
      <h2 className="lx-name" id={headingId}>
        In this paragraph
      </h2>
      <ul className="lx-list">
        {entries.map((e) => (
          <li key={e.id}>
            <button type="button" className="lx-row" onClick={() => drill({ kind: 'entry', id: e.id })}>
              <Glyph entry={e} />
              <span>
                <b>{e.name}</b> <small>{KIND_WORD[e.kind]}</small>
                <span className="lx-row-short">{e.short}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Foot phone={phone} close={close} />
    </>
  );
}

function TermCard({ id, phone, headingId, close }: CardProps & { id: TermId }) {
  const t = TERMS[id];
  const openCodex = useExplain((s) => s.openCodex);
  return (
    <>
      <header className="lx-head">
        <span className="lx-glyph k-rule" aria-hidden>
          <IconBook size={18} />
        </span>
        <div>
          <div className="lx-kind">Game rule</div>
          <h2 className="lx-name" id={headingId}>
            {t.name}
          </h2>
        </div>
      </header>
      <p className="lx-short">{'definition' in t ? t.definition : t.name}</p>
      <Foot phone={phone} close={close}>
        <button type="button" className="lx-btn link" onClick={() => openCodex('rules')}>
          How the game works ›
        </button>
      </Foot>
    </>
  );
}

function FictionalCard({ countryId, phone, headingId, close }: CardProps & { countryId: string }) {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const f = fictionalLeader(world, view, countryId);
  if (!f) return null;
  return (
    <>
      <header className="lx-head">
        <span className="lx-disc" aria-hidden>
          {initials(f.name)}
          <i className="lx-disc-flag">{flag(countryId)}</i>
        </span>
        <div>
          <div className="lx-kind">Person · fictional</div>
          <h2 className="lx-name" id={headingId}>
            {f.name}
          </h2>
        </div>
      </header>
      <p className="lx-short">
        {f.title} of {f.country}. {f.line}
      </p>
      <Foot phone={phone} close={close} />
    </>
  );
}

export function Explainer(): JSX.Element | null {
  const target = useExplain((s) => s.target);
  const anchor = useExplain((s) => s.anchor);
  const close = useExplain((s) => s.closeExplainer);
  const codex = useCodex();
  const large = useGameStore((s) => s.learn.prefs.largeText);
  const phone = useNarrow(601);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const [sheetY, setSheetY] = useState(0);
  const drag = useRef<number | null>(null);
  const headingId = 'lx-explainer-title';
  const key = target ? JSON.stringify(target) : '';

  // Place the popover after it renders (it knows its own height), and keep it placed
  useLayoutEffect(() => {
    if (!target || phone) return;
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const a = anchor?.isConnected ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, right: window.innerWidth / 2, top: 120, bottom: 120 };
      const avoid = Array.from(document.querySelectorAll<HTMLElement>(AVOID))
        .filter((n) => !el.contains(n) && n.offsetParent !== null)
        .map((n) => n.getBoundingClientRect());
      // Natural height of the content (not the clamped box), at most 70% of the window
      const natural = (el.querySelector<HTMLElement>('.lx-scroll')?.scrollHeight ?? el.offsetHeight) + 2;
      const h = Math.min(natural, Math.round(window.innerHeight * 0.7));
      setPos(placePopover(a, { w: el.offsetWidth, h }, { w: window.innerWidth, h: window.innerHeight }, avoid));
    };
    place();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (ref.current) ro?.observe(ref.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [key, anchor, phone, target]);

  // Focus into the card on open; Esc closes it before any other layer; click outside closes
  useEffect(() => {
    if (!target) return;
    setSheetY(0);
    const el = ref.current;
    el?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      } else if (e.key === 'Tab' && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), [href]'));
        if (items.length === 0) return;
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && i === items.length - 1) {
          e.preventDefault();
          items[0].focus();
        } else if (i < 0) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (el?.contains(t) || anchor?.contains(t)) return;
      if (phone) return; // the scrim handles it
      useExplain.setState({ target: null, from: null, anchor: null });
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!target) return null;
  let body: ReactNode = null;
  const props = { phone, headingId, close };
  if (target.kind === 'entry') {
    const e = codex?.byId.get(target.id);
    body = e ? <EntryCard key={e.id} entry={e} {...props} /> : null;
  } else if (target.kind === 'list') body = <ListCard ids={target.ids} {...props} />;
  else if (target.kind === 'term') body = <TermCard id={target.id} {...props} />;
  else body = <FictionalCard countryId={target.countryId} {...props} />;
  if (!body) return null;

  const card = (
    <div
      ref={ref}
      className={`lx-card ${phone ? 'lx-sheet' : 'lx-pop'}${large ? ' lx-large' : ''}`}
      role="dialog"
      aria-modal={phone ? true : undefined}
      aria-labelledby={headingId}
      tabIndex={-1}
      style={phone ? { transform: sheetY ? `translateY(${sheetY}px)` : undefined } : pos ? { left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : { opacity: 0, pointerEvents: 'none', left: 0, top: 0 }}
    >
      {phone && (
        <div
          className="lx-grab"
          aria-hidden
          onPointerDown={(e) => {
            drag.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current !== null) setSheetY(Math.max(0, e.clientY - drag.current));
          }}
          onPointerUp={() => {
            if (sheetY > 70) close();
            else setSheetY(0);
            drag.current = null;
          }}
        >
          <i />
        </div>
      )}
      {!phone && (
        <button type="button" className="lx-x" onClick={close} aria-label="Close">
          <IconX size={16} aria-hidden />
        </button>
      )}
      <div className="lx-scroll">{body}</div>
    </div>
  );
  return createPortal(
    phone ? (
      <>
        <div className="lx-scrim" onClick={close} aria-hidden />
        {card}
      </>
    ) : (
      card
    ),
    document.body,
  );
}
