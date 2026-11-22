import type { CSSProperties } from 'react';
import '../../styles/game.css';
import { ensureSealSprite } from './sealSprite';

/**
 * Political capital as one physical object: a 16-lobe wax seal with a pressed ring and the
 * embossed diamond, so the text form "◆ 2" and the seal read as the same thing
 * (design-feel.md section 4, concepts/feel-seal.html).
 *
 * One rule everywhere: a full seal is one you can still spend. An imprint is a seal already
 * placed on something this month; short marks what a card is missing; next is next month's
 * refill; new is freshly minted; broken is spent at Execute.
 */
export type SealVariant = 'full' | 'imprint' | 'short' | 'new' | 'broken' | 'next';

/** 18 inline, 24 HUD and card cost, 38 rail bank, 56 onboarding and end screen. */
export type SealSize = 18 | 22 | 24 | 30 | 38 | 44 | 56;

export interface CapitalSealProps {
  variant?: SealVariant;
  size?: SealSize | number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name; seals are decorative (aria-hidden) unless this is set. */
  label?: string;
}

export function CapitalSeal({ variant = 'full', size = 24, className = '', style, label }: CapitalSealProps) {
  ensureSealSprite();
  return (
    <svg
      className={`wc-seal wc-seal-${variant} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      data-seal={variant}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href={`#wc-seal-${variant}`} />
    </svg>
  );
}

export interface CapitalSealsProps {
  /** Full seals: political capital you can still spend. */
  left: number;
  /** Imprints: seals already placed on orders or answers this month. */
  held?: number;
  /** Red "missing" seals, shown while a card that needs more is hovered or refused. */
  short?: number;
  /** Faint dotted outlines for next month's refill (CapitalMeter's third state). */
  nextRefill?: number;
  /** The last `minted` full seals pop in with a shine (monthly refill, "+1 political capital"). */
  minted?: number;
  /** Seals cracking at Execute (rendered after the full ones). */
  broken?: number;
  size?: SealSize | number;
  /** Gap between seals in px (defaults to a quarter of the size). */
  gap?: number;
  className?: string;
  /** Visible count text after the seals ("1 left", "1 of 3 left"); omit for none. */
  text?: string;
  /** Accessible summary; defaults to "Political capital: n left". */
  label?: string;
}

/**
 * A bank of seals in one fixed order: full, new, imprint, broken, short, next. The number of
 * `[data-seal="full"]` plus `[data-seal="new"]` elements always equals `left`.
 */
export function CapitalSeals({ left, held = 0, short = 0, nextRefill = 0, minted = 0, broken = 0, size = 24, gap, className = '', text, label }: CapitalSealsProps) {
  const n = (x: number) => Math.max(0, Math.floor(x));
  const fresh = Math.min(n(minted), n(left));
  const items: SealVariant[] = [
    ...Array<SealVariant>(n(left) - fresh).fill('full'),
    ...Array<SealVariant>(fresh).fill('new'),
    ...Array<SealVariant>(n(held)).fill('imprint'),
    ...Array<SealVariant>(n(broken)).fill('broken'),
    ...Array<SealVariant>(n(short)).fill('short'),
    ...Array<SealVariant>(n(nextRefill)).fill('next'),
  ];
  const summary =
    label ??
    `Political capital: ${n(left)} left${n(held) ? `, ${n(held)} placed this month` : ''}${n(short) ? `, ${n(short)} missing` : ''}${n(nextRefill) ? `, ${n(nextRefill)} more next month` : ''}`;
  return (
    <span className={`wc-seals ${className}`.trim()} role="img" aria-label={summary} style={{ gap: gap ?? Math.round(Number(size) / 4) }}>
      {items.map((v, i) => (
        <CapitalSeal key={`${v}-${i}`} variant={v} size={size} className={v === 'new' ? 'wc-seal-mint' : v === 'short' ? 'wc-seal-flash' : ''} />
      ))}
      {text && <span className="wc-seals-text num">{text}</span>}
    </span>
  );
}
