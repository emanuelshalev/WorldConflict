import { useId } from 'react';
import { FAMILY_WORD, type OrderFamily } from '../../lib/orders';
import { PICTOGRAM_SOURCE } from './pictogramData';

/**
 * The order pictograms (design-order-cards.md section 3, D-66, RS-007): 28 bold filled icons, one
 * per registry id, plus 3 reserve Economy icons. Monochrome in `currentColor`, so the plate sets
 * the ink. Sizes: 24 px for tray slots and inline text only, 28 px or more on cards, 34 px or
 * more wherever Strike nuclear sites must show its SITES tag (plates are 34 px and up).
 */

/** Pictogram per registry id (one map, keyed by id, so variants of one action type differ). */
export const ORDER_PICTOGRAM: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PICTOGRAM_SOURCE).map(([id, p]) => [id, p.body]),
);

/** The smallest plate a card may draw: below it the SITES tag of Strike nuclear sites blurs. */
export const MIN_PLATE_PX = 34;

/** Mask and clipPath ids made unique per instance (scene STYLE.md: ids from `useId()`). */
function scopeIds(body: string, scope: string): string {
  return body.replace(/(id="|url\(#)oi-/g, `$1${scope}-`);
}

export interface OrderPictogramProps {
  /** Registry id ("airstrike-nuclear"). */
  id: string;
  /** Rendered size in px (default 48). */
  size?: number;
  /** Accessible name. Omit (or pass null) when the order's title is next to it: then it is decorative. */
  title?: string | null;
  className?: string;
}

/** One order pictogram as inline SVG. Decorative (aria-hidden) unless it has a `title`. */
export function OrderPictogram({ id, size = 48, title = null, className = '' }: OrderPictogramProps) {
  const scope = `oi${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const src = PICTOGRAM_SOURCE[id];
  if (!src) return null;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const, focusable: 'false' as const };
  return (
    <svg
      className={`ord-pict ${className}`.trim()}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="currentColor"
      data-pictogram={id}
      {...a11y}
      // Generated, trusted markup from the signed-off icon set (pictogramData.ts)
      dangerouslySetInnerHTML={{ __html: scopeIds(src.body, scope) }}
    />
  );
}

export interface OrderPlateProps {
  /** Registry id. */
  id: string;
  family: OrderFamily;
  /** Plate size in px (52 tile, 42 compact, 46 row, 38 staff thumb); never below MIN_PLATE_PX. */
  size?: number;
  /** In this month: the green check badge on the plate corner. */
  queued?: boolean;
  /** Accessible name; omit when the title is beside the plate. */
  title?: string | null;
  className?: string;
}

/** The pictogram plate: a solid family-coloured token with the dark pictogram (66% of the plate). */
export function OrderPlate({ id, family, size = 52, queued = false, title = null, className = '' }: OrderPlateProps) {
  const s = Math.max(MIN_PLATE_PX, size);
  return (
    <span className={`ord-plate fam-${family} ${className}`.trim()} style={{ ['--plate' as string]: `${s}px` }} data-plate={id}>
      <OrderPictogram id={id} size={Math.round(s * 0.66)} title={title} />
      {queued && (
        <span className="ord-plate-check" aria-hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5L6.5 12L13 4.5" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** The family chip: a diamond in the accent plus the family word (never colour alone). */
export function FamilyChip({ family, className = '' }: { family: OrderFamily; className?: string }) {
  return (
    <span className={`ord-famchip fam-${family} ${className}`.trim()} data-family-word={FAMILY_WORD[family]}>
      <i aria-hidden />
      {FAMILY_WORD[family]}
    </span>
  );
}

/** The family band of compact tiles (and tiles without a scene): gradient, grid, big watermark. */
export function FamilyBand({ id, family }: { id: string; family: OrderFamily }) {
  return (
    <span className={`ord-famband fam-${family}`} aria-hidden>
      <OrderPictogram id={id} size={72} className="ord-famband-wm" />
    </span>
  );
}
