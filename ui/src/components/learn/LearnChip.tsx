import { type JSX, useEffect, useRef, useState } from 'react';
import { IconBook, IconEyeOff } from '@tabler/icons-react';
import { metCount } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';
import { LevelSegment } from './FamiliarityPrompt';
import { levelName, useExplain } from './explain';

/**
 * The HUD book chip (design-learn.md §5): names the familiarity level ("Some help", or
 * "Guide me · hidden" after `I`), and opens a small menu to change it, hide the underlines for
 * this session and open the codex. Icon only on phones, with the level in its accessible name.
 */
export function LearnChip(): JSX.Element {
  const level = useGameStore((s) => s.learn.level);
  const hidden = useGameStore((s) => s.codexMarksHidden);
  const toggle = useGameStore((s) => s.toggleCodexMarks);
  const met = useGameStore((s) => metCount(s.learn));
  const openCodex = useExplain((s) => s.openCodex);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = `${levelName(level)}${hidden && level === 'guide' ? ' · hidden' : ''}`;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <div className="lx-chip-wrap" ref={ref}>
      <button type="button" className="lx-chip" aria-expanded={open} aria-haspopup="true" aria-label={`Explanations: ${label}`} title={hidden && level === 'guide' ? 'Underlines hidden for this session (press I to show them)' : 'Explanations and codex'} onClick={() => setOpen((v) => !v)}>
        <IconBook size={16} aria-hidden />
        <span className="lx-chip-label">{levelName(level)}</span>
        {hidden && level === 'guide' && <IconEyeOff size={15} aria-hidden className="lx-chip-off" />}
      </button>
      {open && (
        <div className="lx-chip-menu" role="group" aria-label="Explanations">
          <div className="lx-kicker">How much help</div>
          <LevelSegment />
          {level === 'guide' && (
            <button type="button" className="wc-btn ghost small" onClick={() => toggle()}>
              {hidden ? 'Show underlines again' : 'Hide underlines this session'} <kbd>I</kbd>
            </button>
          )}
          <button
            type="button"
            className="wc-btn small"
            onClick={() => {
              setOpen(false);
              openCodex();
            }}
          >
            <IconBook size={15} aria-hidden /> Open the codex <span className="num">{met} met</span>
          </button>
        </div>
      )}
    </div>
  );
}
