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
function iconSvg(I: Icon, color: string, size: number): string {
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

/** Register every sprite the map uses; resolves when all are ready. */
export async function addMapImages(map: maplibregl.Map): Promise<void> {
  unitBox(map, UNIT_MINE, '#f2a93b');
  unitBox(map, UNIT_FOE, '#ff5a4f');
  await Promise.all([
    badge(map, ICON_NUKE, IconRadioactive, '#f5d547', 24),
    badge(map, ICON_FIRE, IconFlame, '#ff9f43', 22),
    ...Object.entries(ACTION_ICON).map(([type, I]) =>
      badge(map, `order-${type}`, I, FAMILY_COLOR[actionFamily(type)], 26),
    ),
  ]);
}
