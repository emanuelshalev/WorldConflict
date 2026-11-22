import { DUR, flyBetween } from '../../lib/motion';
import { sound } from '../../lib/sound';
import { ensureSealSprite } from './sealSprite';

/**
 * Seal flights (design-feel.md section 4, "Spend" and "Refund"): a copy of a wax seal travels on
 * a quadratic arc peaking 60 px above the straight line, 420 ms, scale 1 to 1.25 to 0.62,
 * rotating 20 degrees, and plays `spend` (or `refund`) as it lands. Several seals leave 80 ms
 * apart. Reduced motion: no flight, the sound still plays.
 *
 * The bank's own state (full seal to imprint) is the caller's React state: change it at the
 * press, then call these for the motion. Targets are plain elements, e.g.
 * `document.querySelector('[data-card-id="o3"] [data-seal-target]')`.
 */

function sealNode(size: number): SVGSVGElement {
  ensureSealSprite();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', 'wc-seal wc-seal-flying');
  svg.innerHTML = '<use href="#wc-seal-full"></use>';
  return svg;
}

/**
 * Pick the element a seal leaves from: the first imprint (the seal that just turned, when the
 * caller already updated its state), else the rightmost full seal, else the bank itself.
 */
function lastSeal(bank: Element): Element {
  const imprint = bank.querySelector('[data-seal="imprint"]');
  if (imprint) return imprint;
  const all = bank.querySelectorAll('[data-seal="full"],[data-seal="new"]');
  return all[all.length - 1] ?? bank;
}

export interface SealFlightOptions {
  /** How many seals fly (one after another, `stagger` ms apart). */
  count?: number;
  stagger?: number;
  /** Size of the flying seal in px (default: the source seal's size, or 30). */
  size?: number;
  /** Fly from (or to) this exact element instead of looking up a seal in the bank. */
  exact?: boolean;
  /** Called after each landing with the seal's index. */
  onLand?: (i: number) => void;
}

/** Queue an order: seals fly from the bank to the order's cost slot, `spend` on each landing. */
export async function spendSeals(bank: Element | null | undefined, target: Element | null | undefined, opts: SealFlightOptions = {}): Promise<void> {
  const { count = 1, stagger = 80, onLand } = opts;
  if (!bank || !target) {
    for (let i = 0; i < count; i++) sound.play('spend');
    return;
  }
  const from = opts.exact ? bank : lastSeal(bank);
  const size = opts.size ?? Math.round(from.getBoundingClientRect().width || 30);
  const flights: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    flights.push(
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void flyBetween(from, target, {
            node: sealNode(size),
            duration: DUR.travel,
            onLand: () => {
              sound.play('spend');
              onLand?.(i);
            },
          }).then(resolve);
        }, DUR.press + i * stagger);
      }),
    );
  }
  await Promise.all(flights);
}

/** Undo or remove: the reverse path, `refund` on landing. */
export async function refundSeals(source: Element | null | undefined, bank: Element | null | undefined, opts: SealFlightOptions = {}): Promise<void> {
  const { count = 1, stagger = 80, onLand } = opts;
  if (!source || !bank) {
    sound.play('refund');
    return;
  }
  const to = opts.exact ? bank : (bank.querySelector('[data-seal="imprint"]') ?? bank);
  const size = opts.size ?? Math.round(to.getBoundingClientRect().width || 30);
  const flights: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    flights.push(
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void flyBetween(source, to, {
            node: sealNode(size),
            rotate: -20,
            scale: [0.62, 1.25, 1],
            onLand: () => {
              if (i === 0) sound.play('refund');
              onLand?.(i);
            },
          }).then(resolve);
        }, i * stagger);
      }),
    );
  }
  await Promise.all(flights);
}
