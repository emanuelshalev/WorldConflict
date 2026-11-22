import { type CSSProperties, type ElementType, type JSX, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { type CodexEntry, entriesIn, matchCard, stripMarkup } from '../../lib/codexMatch';
import { markStyle } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';
import { ParagraphInfo } from './ParagraphInfo';
import { noteMet, useCodex, useExplain, useMarkState, useOwnCountryIds } from './explain';

/**
 * Text with the learning aids (design-learn.md §6, D-53): the string as written, plus
 * - at Guide me only, a dotted underline on the first mention of names the player has not
 *   learned (density rules from `matchCard`, card-wide when `card` is given);
 * - with `info`, a labelled "i" at the end that lists every entry in this paragraph.
 * Entries shown (marked or listed) count as met for the codex once the text is half on screen.
 * Without a codex (not loaded, failed) it renders the plain text: the game never depends on it.
 */

export interface ExplainTextProps {
  text: string;
  /** All text blocks of the card this text belongs to (density rules span the card). */
  card?: readonly string[];
  /** Index of `text` in `card`. */
  block?: number;
  /** Entries never marked or listed here (the subject already on screen). */
  exclude?: readonly string[];
  /** Add the paragraph "i". */
  info?: boolean;
  /** Where the player met these names (codex "first met"): the card title. */
  where?: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Extra content after the text and before the "i" (e.g. a "More" link). */
  after?: ReactNode;
}

export function ExplainText({ text, card, block = 0, exclude, info = false, where, as, className, style, after }: ExplainTextProps): JSX.Element {
  const Tag = (as ?? 'span') as ElementType;
  const codex = useCodex();
  const { level, marks, known, knownVersion } = useMarkState();
  const learn = useGameStore((s) => s.learn);
  const own = useOwnCountryIds(codex);
  const open = useExplain((s) => s.openExplainer);
  const target = useExplain((s) => s.target);
  const anchor = useExplain((s) => s.anchor);
  const ref = useRef<HTMLElement>(null);
  const excl = useMemo(() => [...own, ...(exclude ?? [])], [own, exclude]);
  const blocks = card && card[block] === text ? card : [text];
  const at = card && card[block] === text ? block : 0;

  const result = useMemo(() => {
    if (!codex) return { text: stripMarkup(text).text, spans: [] };
    return matchCard(codex, blocks, { level, mode: 'marks', known, knownVersion, exclude: excl })[at];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codex, blocks.join('\u0001'), at, level, known, knownVersion, excl]);
  const spans = useMemo(() => (marks ? result.spans : []), [marks, result]);
  const listed: CodexEntry[] = useMemo(() => (codex && info ? entriesIn(codex, text, { exclude: excl }) : []), [codex, info, text, excl]);

  // Met: entries marked or listed here, once the text is half visible (design-learn.md §8.1)
  const metIds = useMemo(() => [...new Set([...spans.map((s) => s.id), ...listed.map((e) => e.id)])], [spans, listed]);
  const metKey = metIds.join(',');
  useEffect(() => {
    const el = ref.current;
    if (!el || metIds.length === 0) return;
    const title = where ?? 'Your game';
    if (typeof IntersectionObserver === 'undefined') {
      noteMet(metIds, title);
      return;
    }
    const io = new IntersectionObserver(
      (list) => {
        if (list.some((e) => e.isIntersecting)) {
          noteMet(metIds, title);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metKey, where]);

  const parts: ReactNode[] = [];
  let last = 0;
  for (const s of spans) {
    const look = markStyle(learn, s.id);
    if (look === 'none') continue;
    if (s.start > last) parts.push(result.text.slice(last, s.start));
    const isOpen = target?.kind === 'entry' && target.id === s.id && !!anchor && ref.current?.contains(anchor);
    parts.push(
      <button
        key={`${s.id}-${s.start}`}
        type="button"
        className={`lx-mark${look === 'faint' ? ' faint' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-entry={s.id}
        onClick={(e) => {
          e.stopPropagation();
          open({ kind: 'entry', id: s.id }, e.currentTarget);
        }}
      >
        {result.text.slice(s.start, s.end)}
      </button>,
    );
    last = s.end;
  }
  if (last < result.text.length) parts.push(result.text.slice(last));

  return (
    <Tag ref={ref} className={className} style={style}>
      {parts}
      {after}
      {info && listed.length > 0 && (
        <>
          {' '}
          <ParagraphInfo entries={listed} />
        </>
      )}
    </Tag>
  );
}
