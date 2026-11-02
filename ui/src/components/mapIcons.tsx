import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type maplibregl from 'maplibre-gl';
import { IconFlame, IconRadioactive, type Icon } from '@tabler/icons-react';
import { ACTION_ICON, FAMILY_COLOR, actionFamily } from '../scenes/actionIcons';

/**
 * Map sprites drawn once at load: order badges (one per order type, the same Tabler icon and
 * colour family as the desk), status badges (nuclear, insurgency) and NATO-style unit boxes.
 * Rasterised to canvas at 2x and registered with map.addImage, so symbol layers stay cheap.
 */

const PR = 2; // pixel ratio of the sprites

/** Render a Tabler icon to SVG markup (synchronously, outside React's tree). */
export function iconSvg(I: Icon, color: string, size: number): string {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(<I size={size} stroke={2} color={color} />));
  const svg = host.innerHTML;
  root.unmount();
  return svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w * PR;
  c.height = h * PR;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(PR, PR);
  return [c, ctx];
}

function register(map: maplibregl.Map, name: string, c: HTMLCanvasElement) {
  if (map.hasImage(name)) map.removeImage(name);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  map.addImage(name, ctx.getImageData(0, 0, c.width, c.height), { pixelRatio: PR });
}

/** A round badge: dark core, coloured ring, icon in the middle. */
async function badge(map: maplibregl.Map, name: string, I: Icon, color: string, size = 26) {
  const [c, ctx] = canvas(size, size);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,12,20,0.92)';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = color;
  ctx.stroke();
  const glyph = Math.round(size * 0.6);
  try {
    const img = await loadImage(iconSvg(I, color, glyph));
    ctx.drawImage(img, r - glyph / 2, r - glyph / 2, glyph, glyph);
  } catch {
    /* the ring alone still reads as a marker */
  }
  register(map, name, c);
}

/** NATO-style infantry box (rectangle with a cross): a troop deployment. */
function unitBox(map: maplibregl.Map, name: string, color: string) {
  const [w, h] = [30, 21];
  const [c, ctx] = canvas(w, h);
  const x = 2;
  const y = 2;
  const bw = w - 4;
  const bh = h - 4;
  ctx.fillStyle = 'rgba(8,12,20,0.9)';
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(x, y, bw, bh);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(x, y, bw, bh);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bw, y + bh);
  ctx.moveTo(x + bw, y);
  ctx.lineTo(x, y + bh);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  register(map, name, c);
}

export const UNIT_MINE = 'unit-mine';
export const UNIT_FOE = 'unit-foe';
export const ICON_NUKE = 'status-nuke';
export const ICON_FIRE = 'status-fire';
export const orderImage = (type: string) => (ACTION_ICON[type] ? `order-${type}` : 'order-DOMESTIC_PROPAGANDA');

/**
 * Seamless fill patterns drawn over a country's colour for special states (embargo, war,
 * revolt, fallout, nuclear pariah). Names match PATTERN in mapColors.ts.
 */
function stripes(
  map: maplibregl.Map,
  name: string,
  color: string,
  width: number,
  size: number,
  dirs: Array<1 | -1>,
) {
  const [c, ctx] = canvas(size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'square';
  for (const d of dirs) {
    for (const k of [-size, 0, size]) {
      ctx.beginPath();
      if (d === 1) {
        ctx.moveTo(k, size);
        ctx.lineTo(k + size, 0);
      } else {
        ctx.moveTo(k, 0);
        ctx.lineTo(k + size, size);
      }
      ctx.stroke();
    }
  }
  register(map, name, c);
}

/** Refugee flow chevron, drawn along the flow lines. */
function chevron(map: maplibregl.Map, name: string, color: string) {
  const [c, ctx] = canvas(12, 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(3.5, 2.5);
  ctx.lineTo(8.5, 6);
  ctx.lineTo(3.5, 9.5);
  ctx.stroke();
  register(map, name, c);
}

export const REFUGEE_ARROW = 'refugee-chevron';

/** Register every sprite the map uses; resolves when all are ready. */
export async function addMapImages(map: maplibregl.Map): Promise<void> {
  unitBox(map, UNIT_MINE, '#f2a93b');
  unitBox(map, UNIT_FOE, '#ff5a4f');
  stripes(map, 'pat-embargo', 'rgba(5,8,14,0.85)', 2, 8, [1]);
  stripes(map, 'pat-war', 'rgba(255,70,60,0.9)', 1.8, 10, [-1]);
  stripes(map, 'pat-unrest', 'rgba(255,159,67,0.85)', 1.4, 8, [1, -1]);
  stripes(map, 'pat-fallout', 'rgba(10,10,6,0.9)', 3, 10, [1]);
  stripes(map, 'pat-pariah', 'rgba(255,210,235,0.6)', 1, 7, [1, -1]);
  chevron(map, REFUGEE_ARROW, '#d7c6ff');
  await Promise.all([
    badge(map, ICON_NUKE, IconRadioactive, '#f5d547', 24),
    badge(map, ICON_FIRE, IconFlame, '#ff9f43', 22),
    ...Object.entries(ACTION_ICON).map(([type, I]) =>
      badge(map, `order-${type}`, I, FAMILY_COLOR[actionFamily(type)], 26),
    ),
  ]);
}
