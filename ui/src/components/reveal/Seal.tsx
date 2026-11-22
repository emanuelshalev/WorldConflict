import type { CSSProperties } from 'react';
import type { AchievementView } from '../../store/gameStore';
import { GLYPHS, glyphFor, rateText, TIER_VAR, TIER_WORD } from './sealArt';

/**
 * Achievement seals (design-reveal.md 2.3, WP9): a 24-tooth rosette in the language of the wax
 * capital seal, with a rarity ring (Common grey, Uncommon green, Rare blue, Legendary gold),
 * infamy in red, and a dashed outline when locked. Rarity is never colour-only: the card under
 * the seal always prints the tier word.
 */

export interface SealProps {
  achievement: Pick<AchievementView, 'id' | 'signature' | 'tier' | 'infamy' | 'name'>;
  locked?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function teeth(): string {
  return Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 40 : 44;
    return `${(48 + Math.cos(a) * r).toFixed(1)},${(48 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
}
const TEETH = teeth();

export function Seal({ achievement, locked = false, size = 96, className = '', style }: SealProps) {
  const ink = achievement.infamy ? 'var(--infamy)' : TIER_VAR[achievement.tier] ?? 'var(--rarity-common)';
  const g = GLYPHS[glyphFor(achievement)];
  return (
    <svg
      className={`rv-seal ${locked ? 'is-locked' : ''} ${achievement.infamy ? 'is-infamy' : ''} ${className}`.trim()}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      style={{ ...style, color: ink }}
      aria-hidden
      focusable="false"
      data-tier={achievement.tier}
    >
      <polygon
        points={TEETH}
        fill={locked ? 'none' : 'var(--surface-1)'}
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray={locked ? '3 3' : undefined}
      />
      <circle cx={48} cy={48} r={31} fill={locked ? 'none' : 'var(--surface-2)'} stroke="currentColor" strokeOpacity={0.6} />
      {achievement.tier === 'LEGENDARY' && !locked && (
        <circle cx={48} cy={48} r={35.5} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeDasharray="1 3" />
      )}
      <g transform="translate(48 48)" opacity={locked ? 0.5 : 1}>
        <path
          d={g.d}
          fill={g.stroke ? 'none' : 'currentColor'}
          stroke="currentColor"
          strokeWidth={g.stroke ? 3 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}

export interface SealCardProps {
  a: AchievementView;
  locked?: boolean;
  /** Animation order (drop-in delay), or null to show it in place. */
  order?: number | null;
  size?: number;
}

export function SealCard({ a, locked = false, order = null, size }: SealCardProps) {
  const tier = TIER_WORD[a.tier] ?? a.tier;
  const ink = a.infamy ? 'var(--infamy)' : TIER_VAR[a.tier];
  return (
    <li
      className={`rv-sealcard ${a.infamy ? 'infamy' : ''} ${locked ? 'locked' : ''} ${order !== null ? 'rv-drop' : ''}`.trim()}
      style={order !== null ? ({ animationDelay: `${order * 260}ms` } as CSSProperties) : undefined}
    >
      <Seal achievement={a} locked={locked} size={size} />
      <h4>{a.name}</h4>
      <div className="rv-tier" style={{ color: ink }}>
        {a.infamy ? `Infamy · ${tier}` : tier}
        {locked ? ' · locked' : ''}
      </div>
      <div className="rv-sealmeta">
        {locked ? a.hint || a.rule : `Month ${a.month ?? '?'}${a.signature ? ' · signature' : ''}`}
        <br />
        {rateText(a.rate)}
      </div>
    </li>
  );
}
