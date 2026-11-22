import { useEffect, type CSSProperties } from 'react';
import { sound } from '../../lib/sound';
import '../../styles/game.css';

/**
 * The rubber stamp (design-feel.md 3.2, R6): one component for a chosen card (YOUR PICK), an
 * approved cabinet pick (APPROVED), a queued order (ORDERED), a debrief verdict (DONE, MIXED,
 * FAILED) and the month result. It lands once, from 180% and -16 degrees, when it mounts.
 */
export type StampInk = 'accent' | 'steel' | 'good' | 'amber' | 'red';
export type StampWord = 'YOUR PICK' | 'APPROVED' | 'ORDERED' | 'DONE' | 'MIXED' | 'FAILED';

const STAMP_INK: Record<StampWord, StampInk> = {
  'YOUR PICK': 'accent',
  APPROVED: 'steel',
  ORDERED: 'accent',
  DONE: 'good',
  MIXED: 'amber',
  FAILED: 'red',
};

export interface StampProps {
  /** The word on the stamp (any short uppercase word works; the six standard words pick their ink). */
  word: StampWord | string;
  ink?: StampInk;
  size?: 'sm' | 'md' | 'lg';
  /** Land with the stamp motion on mount (default true); false shows it already in place. */
  animate?: boolean;
  /** Delay before it lands, ms (Approve all stamps cards 90 ms apart). */
  delay?: number;
  /** Play the stamp sound as it lands (default false: the caller decides, max 4 per burst anyway). */
  sound?: boolean;
  /** Tilt in degrees (default -8). */
  tilt?: number;
  className?: string;
  style?: CSSProperties;
}

export function Stamp({ word, ink, size = 'md', animate = true, delay = 0, sound: withSound = false, tilt = -8, className = '', style }: StampProps) {
  const color = ink ?? STAMP_INK[word as StampWord] ?? 'accent';
  useEffect(() => {
    if (!withSound) return;
    const t = window.setTimeout(() => sound.play('stamp'), delay + (animate ? 120 : 0));
    return () => window.clearTimeout(t);
  }, [withSound, delay, animate]);
  return (
    <span
      className={`wc-stamp ink-${color} wc-stamp-${size}${animate ? ' wc-stamp-in' : ''} ${className}`.trim()}
      style={{ '--tilt': `${tilt}deg`, animationDelay: delay ? `${delay}ms` : undefined, ...style } as CSSProperties}
      data-stamp={word}
    >
      {word}
    </span>
  );
}
