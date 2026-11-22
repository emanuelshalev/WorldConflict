/**
 * Share cards (design-reveal.md 2.8, WP8): the 1200 x 630 landscape PNG and the 1080 x 1350
 * portrait PNG for phones, drawn on a canvas from the reveal (Presidency Score as the hero
 * number, grade and stars, rank line, the three rarest seals, the month strip, the best moment
 * and the seed code a friend can type into "Play this seed"). `drawClassicCard` is the earlier
 * card, kept for sessions whose reveal could not be built. Also the text share and helpers the
 * end screen shares with the reveal (month cells, public site).
 */

export type MonthCell = 'g' | 'y' | 'r' | 'x';

const CELL_HEX: Record<MonthCell, string> = { g: '#2f8f6b', y: '#b9862d', r: '#a83234', x: '#05070b' };
const CELL_EMOJI: Record<MonthCell, string> = { g: '🟩', y: '🟨', r: '🟥', x: '⬛' };

/** One cell per month: steady (min of approval and stability 50+), strained (30+), on the edge; the fall in black. */
export function monthCells(history: Array<{ approval: number; stability: number }>, lost: boolean): MonthCell[] {
  const cells: MonthCell[] = history.map((h) => {
    const low = Math.min(h.approval, h.stability);
    return low >= 50 ? 'g' : low >= 30 ? 'y' : 'r';
  });
  if (lost && cells.length) cells[cells.length - 1] = 'x';
  return cells;
}

export function cellsToEmoji(cells: MonthCell[]): string {
  return cells.map((c) => CELL_EMOJI[c]).join('');
}

/** Public URL for share text and card: configurable, never "localhost". */
export function publicSite(): string {
  const env = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/^https?:\/\//, '');
  if (env) return env;
  const host = typeof window !== 'undefined' ? window.location.host : '';
  return host && !/localhost|127\.0\.0\.1/.test(host) ? host : 'worldconflict.game';
}

/** Truncate text with an ellipsis to fit a canvas width. */
export function fit(g: CanvasRenderingContext2D, text: string, width: number): string {
  if (g.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 4 && g.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t}…`;
}

/** Wrap text into at most `lines` lines of `width`. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number, lines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width > width && cur) {
      out.push(cur);
      cur = w;
      if (out.length === lines) break;
    } else cur = next;
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.length === lines && words.join(' ') !== out.join(' ')) out[lines - 1] = fit(g, `${out[lines - 1]}…`, width);
  return out;
}

export interface CardSeal {
  color: string;
  glyph: { d: string; stroke?: boolean };
}

export interface RevealCardData {
  title: string; // flashpoint or mode name ("Hormuz Convoy")
  country: string;
  flagEmoji: string;
  verdict: string;
  victory: boolean;
  dateLabel: string; // "NOV 2026"
  subtitle: string; // "Cautious Caretaker · war ended in month 6"
  bestMoment: string; // "The shooting stops with Iran, month 6"
  grade: string;
  stars: number;
  score: number;
  rankLines: string[]; // ["Your first run: a ladder of 90 runs to climb", "Better than 62% of simulated leaders"]
  seals: CardSeal[];
  cells: MonthCell[];
  conditions: Array<{ met: boolean; bonus: boolean }>;
  seedCode: string;
  daily: string | null;
  site: string;
}

function sealOn(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, s: CardSeal): void {
  const k = size / 96;
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(k, k);
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 40 : 44;
    const px = 48 + Math.cos(a) * r;
    const py = 48 + Math.sin(a) * r;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = '#141b27';
  g.fill();
  g.strokeStyle = s.color;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.arc(48, 48, 31, 0, Math.PI * 2);
  g.fillStyle = '#1c2533';
  g.fill();
  g.globalAlpha = 0.6;
  g.stroke();
  g.globalAlpha = 1;
  g.translate(48, 48);
  const p = new Path2D(s.glyph.d);
  if (s.glyph.stroke) {
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke(p);
  } else {
    g.fillStyle = s.color;
    g.fill(p, 'evenodd');
  }
  g.restore();
}

function background(g: CanvasRenderingContext2D, w: number, h: number): void {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0b0f17');
  bg.addColorStop(1, '#1c2533');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.75, -h * 0.1, 10, w * 0.75, -h * 0.1, w * 0.8);
  glow.addColorStop(0, 'rgba(242,169,59,0.10)');
  glow.addColorStop(1, 'rgba(242,169,59,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
}

/** The mission strip along the top edge: one segment per objective (green met, red missed, bonus gold or grey). */
function missionBar(g: CanvasRenderingContext2D, w: number, d: RevealCardData): void {
  const segs = d.conditions.length ? d.conditions : [{ met: d.victory, bonus: false }];
  const segW = w / segs.length;
  segs.forEach((c, i) => {
    g.fillStyle = c.bonus ? (c.met ? '#f2a93b' : '#3a4558') : c.met ? '#3fb68b' : '#e5383b';
    g.fillRect(i * segW, 0, segW - (i < segs.length - 1 ? 4 : 0), 12);
  });
}

function strip(g: CanvasRenderingContext2D, x: number, y: number, width: number, cells: MonthCell[], maxCell = 30): number {
  if (!cells.length) return y;
  const perRow = cells.length > 48 ? 30 : cells.length > 24 ? 24 : cells.length;
  const gap = 5;
  const size = Math.min(maxCell, (width - gap * (perRow - 1)) / perRow);
  cells.forEach((c, i) => {
    const r = Math.floor(i / perRow);
    const col = i % perRow;
    g.fillStyle = CELL_HEX[c];
    g.beginPath();
    g.roundRect?.(x + col * (size + gap), y + r * (size + gap), size, size, 4);
    if (!g.roundRect) g.rect(x + col * (size + gap), y + r * (size + gap), size, size);
    g.fill();
  });
  return y + Math.ceil(cells.length / perRow) * (size + gap);
}

function gradeBlock(g: CanvasRenderingContext2D, cx: number, top: number, d: RevealCardData, scale = 1, colW = 300): number {
  g.textAlign = 'center';
  g.fillStyle = '#a3aebf';
  g.font = `500 ${18 * scale}px "Geist Mono", monospace`;
  g.fillText('PRESIDENCY SCORE', cx, top);
  g.fillStyle = '#e8ecf2';
  g.font = `700 ${104 * scale}px "Geist Mono", monospace`;
  g.fillText(String(d.score), cx, top + 100 * scale);
  g.font = `500 ${20 * scale}px "Geist Mono", monospace`;
  g.fillStyle = '#8693a6';
  g.fillText('of 1000', cx, top + 132 * scale);
  const bw = 96 * scale;
  g.strokeStyle = '#f2a93b';
  g.lineWidth = 4 * scale;
  g.strokeRect(cx - bw / 2, top + 156 * scale, bw, bw);
  g.fillStyle = '#f2a93b';
  g.font = `700 ${70 * scale}px "Geist", sans-serif`;
  g.fillText(d.grade, cx, top + 156 * scale + bw * 0.75);
  g.font = `${36 * scale}px sans-serif`;
  g.fillText('★'.repeat(d.stars) + '☆'.repeat(Math.max(0, 3 - d.stars)), cx, top + 300 * scale);
  g.fillStyle = '#c4ccd8';
  // Rank lines fit the grade column: shrink, then wrap, never run off the card (Leo's clipped card)
  let y = top + 340 * scale;
  for (const l of d.rankLines.slice(0, 2)) {
    const t = fitText(g, l, colW, (px) => `500 ${px}px "Geist Mono", monospace`, 19 * scale, 14 * scale, 2);
    t.lines.forEach((line) => {
      g.fillText(line, cx, y);
      y += t.size * 1.4;
    });
  }
  g.textAlign = 'left';
  return y;
}

/**
 * Text that fits a box: the largest font size from `size` down to `min` at which it fits one
 * line, else wrapped at `min` over at most `lines` lines (2.8: nothing on a share card is clipped).
 */
export function fitText(g: CanvasRenderingContext2D, text: string, width: number, font: (px: number) => string, size: number, min: number, lines = 1): { lines: string[]; size: number } {
  for (let s = Math.round(size); s >= min; s--) {
    g.font = font(s);
    if (g.measureText(text).width <= width) return { lines: [text], size: s };
  }
  g.font = font(min);
  return { lines: wrap(g, text, width, lines), size: min };
}

/** Draw text that fits: returns the y under the last line. */
function drawFit(g: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, font: (px: number) => string, size: number, min: number, lines = 1, lead = 1.25): number {
  const t = fitText(g, text, width, font, size, min, lines);
  t.lines.forEach((l, i) => g.fillText(l, x, y + i * t.size * lead));
  return y + (t.lines.length - 1) * t.size * lead;
}

/** A faint flag behind the left column: the card's picture, so it is not a text box. */
function heroFlag(g: CanvasRenderingContext2D, d: RevealCardData, x: number, y: number, size: number): void {
  if (!d.flagEmoji) return;
  g.save();
  g.globalAlpha = 0.1;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'right';
  g.fillText(d.flagEmoji, x, y);
  g.restore();
}

export function drawRevealCard(d: RevealCardData): string {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const g = c.getContext('2d');
  if (!g) return '';
  background(g, 1200, 630);
  missionBar(g, 1200, d);
  // Left column 60..840, grade column centred on 1020 (300 wide); every line shrinks or wraps to
  // its box, and the seals take only the room left above the footer
  const L = 60;
  const W = 780;
  heroFlag(g, d, 840, 600, 300);
  const mono = (w: number) => (px: number) => `${w} ${px}px "Geist Mono", monospace`;
  g.fillStyle = '#a3aebf';
  drawFit(g, `WORLD CONFLICT · ${d.title.toUpperCase()}${d.daily ? ` · DAILY ${d.daily}` : ''}`, L, 70, W, mono(600), 24, 16);
  g.fillStyle = d.victory ? '#f2a93b' : '#ff8486';
  drawFit(g, `${d.verdict} · ${d.dateLabel}`, L, 112, W, mono(600), 24, 16);
  g.fillStyle = '#e8ecf2';
  drawFit(g, `${d.flagEmoji} ${d.country.toUpperCase()}`, L, 178, W, (px) => `700 ${px}px "Geist", sans-serif`, 60, 36);
  g.fillStyle = '#a3aebf';
  let y = drawFit(g, d.subtitle, L, 222, W, (px) => `500 ${px}px "Geist", Inter, sans-serif`, 28, 22, 2);
  y = strip(g, L, y + 22, 760, d.cells, 26);
  if (d.bestMoment) {
    g.fillStyle = '#e8ecf2';
    y = drawFit(g, `Best moment: ${d.bestMoment}`, L, y + 30, W, (px) => `italic 400 ${px}px "Instrument Serif", Georgia, serif`, 28, 22, 2);
  }
  const room = 556 - (y + 12);
  const seal = Math.min(88, room);
  if (seal >= 48) d.seals.slice(0, 3).forEach((s, i) => sealOn(g, L + seal / 2 + i * (seal + 16), y + 12 + seal / 2, seal, s));
  gradeBlock(g, 1020, 76, d, 1, 300);
  g.fillStyle = '#c4ccd8';
  drawFit(g, `Can you beat ${d.score}? Seed ${d.seedCode} · ${d.site}`, L, 600, 1080, mono(500), 22, 14);
  return c.toDataURL('image/png');
}

export function drawRevealPortrait(d: RevealCardData): string {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d');
  if (!g) return '';
  background(g, 1080, 1350);
  missionBar(g, 1080, d);
  const L = 72;
  const W = 936;
  heroFlag(g, d, 1040, 1240, 520);
  const mono = (w: number) => (px: number) => `${w} ${px}px "Geist Mono", monospace`;
  g.fillStyle = '#a3aebf';
  drawFit(g, `WORLD CONFLICT · ${d.title.toUpperCase()}`, L, 92, W, mono(600), 28, 18);
  g.fillStyle = d.victory ? '#f2a93b' : '#ff8486';
  drawFit(g, `${d.verdict} · ${d.dateLabel}`, L, 142, W, mono(600), 28, 18);
  g.fillStyle = '#e8ecf2';
  drawFit(g, `${d.flagEmoji} ${d.country.toUpperCase()}`, L, 230, W, (px) => `700 ${px}px "Geist", sans-serif`, 72, 40);
  g.fillStyle = '#a3aebf';
  drawFit(g, d.subtitle, L, 284, W, (px) => `500 ${px}px "Geist", Inter, sans-serif`, 32, 24, 3);
  const gy = gradeBlock(g, 540, 420, d, 1.25, W);
  let y = strip(g, L, Math.max(920, gy + 24), W, d.cells, 60);
  if (d.bestMoment) {
    g.fillStyle = '#e8ecf2';
    y = drawFit(g, `Best moment: ${d.bestMoment}`, L, y + 46, W, (px) => `italic 400 ${px}px "Instrument Serif", Georgia, serif`, 36, 26, 3);
  }
  const room = 1212 - (y + 20);
  const seal = Math.min(116, room);
  if (seal >= 56) d.seals.slice(0, 3).forEach((s, i) => sealOn(g, L + seal / 2 + i * (seal + 24), y + 20 + seal / 2, seal, s));
  g.fillStyle = '#c4ccd8';
  drawFit(g, `Can you beat ${d.score}?`, L, 1262, W, mono(500), 28, 18);
  drawFit(g, `Seed ${d.seedCode} · ${d.site}`, L, 1302, W, mono(500), 28, 18);
  return c.toDataURL('image/png');
}

/** The text share: emoji grid, Presidency Score and seed code. */
export function revealShareText(d: RevealCardData, extra: { grid: string; classification: string }): string {
  return [
    `WORLD CONFLICT${d.daily ? ` · Daily ${d.daily}` : ''}, ${d.flagEmoji} ${d.country}: ${d.title}`,
    `${d.verdict} · ${'★'.repeat(d.stars)}${'☆'.repeat(Math.max(0, 3 - d.stars))} · grade ${d.grade} · Presidency Score ${d.score}/1000`,
    d.rankLines[0] ?? '',
    extra.grid,
    extra.classification,
    `Can you beat ${d.score}? Play this seed: ${d.seedCode}`,
    `https://${d.site}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function downloadDataUrl(url: string, name: string): void {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

/**
 * The default share is the picture (F-02-3, Leo: "a text box I would not post"): the card PNG
 * through the system share sheet when it accepts files, else the card is saved and the text
 * copied. Returns the feedback to show ("" when the player cancelled).
 */
export async function shareImage(url: string, text: string, fileStem: string): Promise<string> {
  try {
    const blob = url ? await (await fetch(url)).blob() : null;
    const file = blob ? new File([blob], `${fileStem}.png`, { type: 'image/png' }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: 'World Conflict' });
      return 'Shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return '';
  }
  downloadDataUrl(url, `${fileStem}.png`);
  try {
    await navigator.clipboard.writeText(text);
    return url ? 'Card saved, text copied' : 'Text copied';
  } catch {
    return url ? 'Card saved' : 'Could not share';
  }
}

/** The earlier card (no reveal available): grade, stars, leadership score and the emoji grid. */
export function drawClassicCard(opts: {
  title: string;
  country: string;
  flagEmoji: string;
  verdict: string;
  grade: string;
  stars: number;
  archetype: string;
  grid: string;
  victory: boolean;
  score: number;
  month: string;
  headline: string;
  daily: string | null;
  conditions: Array<{ met: boolean; bonus: boolean }>;
  site: string;
  leader: string;
}): string {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const g = c.getContext('2d');
  if (!g) return '';
  const bg = g.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, '#0b0f17');
  bg.addColorStop(1, '#1c2533');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1200, 630);
  const segs = opts.conditions.length ? opts.conditions : [{ met: opts.victory, bonus: false }];
  const segW = 1200 / segs.length;
  segs.forEach((cond, i) => {
    g.fillStyle = cond.bonus ? (cond.met ? '#f2a93b' : '#3a4558') : cond.met ? '#3fb68b' : '#e5383b';
    g.fillRect(i * segW, 0, segW - (i < segs.length - 1 ? 4 : 0), 12);
  });
  g.fillStyle = '#a3aebf';
  g.font = '600 26px "Geist", sans-serif';
  g.fillText(`WORLD CONFLICT${opts.daily ? ` · DAILY ${opts.daily}` : ''}`, 60, 70);
  g.fillStyle = opts.victory ? '#f2a93b' : '#ff8486';
  g.font = '600 24px "Geist Mono", monospace';
  g.fillText(`${opts.verdict} · ${opts.month}`, 60, 120);
  g.fillStyle = '#e8ecf2';
  g.font = '700 64px "Geist", sans-serif';
  g.fillText(`${opts.flagEmoji} ${opts.country}`.toUpperCase(), 60, 195);
  g.font = '500 32px Inter, sans-serif';
  g.fillStyle = '#a3aebf';
  g.fillText(opts.leader ? `${opts.title} · ${opts.leader}` : opts.title, 60, 245);
  g.fillText(opts.archetype, 60, 290);
  if (opts.headline) {
    g.font = 'italic 500 26px Georgia, serif';
    g.fillStyle = '#e8ecf2';
    g.fillText(fit(g, `“${opts.headline}”`, 840), 60, 340);
  }
  const cells = [...opts.grid];
  const perLine = cells.length > 96 ? 30 : 24;
  const rows = Math.ceil(cells.length / perLine);
  const size = rows > 4 ? 26 : 34;
  const rowH = rows > 4 ? 30 : rows > 3 ? 38 : 46;
  g.font = `${size}px sans-serif`;
  for (let i = 0; i < cells.length; i += perLine) {
    g.fillText(cells.slice(i, i + perLine).join(''), 60, 400 + (i / perLine) * rowH);
  }
  g.strokeStyle = '#f2a93b';
  g.lineWidth = 4;
  g.strokeRect(940, 70, 200, 200);
  g.fillStyle = '#f2a93b';
  g.font = '700 130px "Geist", sans-serif';
  g.textAlign = 'center';
  g.fillText(opts.grade, 1040, 220);
  g.font = '44px sans-serif';
  g.fillText('★'.repeat(opts.stars) + '☆'.repeat(3 - opts.stars), 1040, 330);
  g.fillStyle = '#a3aebf';
  g.font = '500 22px "Geist Mono", monospace';
  g.fillText('SCORE', 1040, 390);
  g.fillStyle = '#e8ecf2';
  g.font = '700 56px "Geist Mono", monospace';
  g.fillText(String(opts.score), 1040, 450);
  g.textAlign = 'left';
  g.fillStyle = '#8693a6';
  g.font = '500 18px "Geist Mono", monospace';
  g.fillText('Each square is a month: 🟩 steady  🟨 strained  🟥 on the edge  ⬛ fell', 60, 535);
  g.fillText('Top bar: one segment per objective (green met, red missed, gold bonus)', 60, 560);
  g.fillStyle = '#a3aebf';
  g.font = '500 22px "Geist Mono", monospace';
  g.fillText(`Can you do better? ${opts.site}`, 60, 600);
  return c.toDataURL('image/png');
}
