import type { JSX } from 'react';
import type { CodexEntry } from '../../lib/codexMatch';
import { useGameStore } from '../../store/gameStore';
import { useExplain } from './explain';

/**
 * The paragraph "i" (design-learn.md §3 C, D-53): a 44 px target with a visible label ("3 names")
 * so it is never an unlabelled icon. It opens "In this paragraph", one line per entry; a
 * paragraph with a single entry opens that entry straight away. At "I know this" it sits at 60%
 * opacity until hovered or focused (still visible, never hover-only).
 */
export function ParagraphInfo({ entries, title }: { entries: CodexEntry[]; title?: string }): JSX.Element | null {
  const open = useExplain((s) => s.openExplainer);
  const target = useExplain((s) => s.target);
  const level = useGameStore((s) => s.learn.level);
  if (entries.length === 0) return null;
  const ids = entries.map((e) => e.id);
  const n = entries.length;
  const label = `${n} name${n === 1 ? '' : 's'}`;
  const isOpen = !!target && ((target.kind === 'list' && target.ids.join() === ids.join()) || (n === 1 && target.kind === 'entry' && target.id === ids[0]));
  return (
    <button
      type="button"
      className={`lx-info${level === 'know' ? ' quiet' : ''}`}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={`Explain this paragraph: ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        open(n === 1 ? { kind: 'entry', id: ids[0] } : { kind: 'list', ids, title }, e.currentTarget);
      }}
    >
      <span className="lx-info-i" aria-hidden>
        i
      </span>
      <span className="lx-info-n" aria-hidden>
        {label}
      </span>
    </button>
  );
}
