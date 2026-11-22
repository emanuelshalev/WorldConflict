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
  rankLines: string[]; // ["Top 22% of simulated leaders", "#1 of your 3 runs"]
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

function gradeBlock(g: CanvasRenderingContext2D, cx: number, top: number, d: RevealCardData, scale = 1): void {
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
  g.font = `500 ${19 * scale}px "Geist Mono", monospace`;
  d.rankLines.slice(0, 2).forEach((l, i) => g.fillText(l, cx, top + (340 + i * 28) * scale));
  g.textAlign = 'left';
}

export function drawRevealCard(d: RevealCardData): string {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const g = c.getContext('2d');
  if (!g) return '';
  background(g, 1200, 630);
  missionBar(g, 1200, d);
  g.fillStyle = '#a3aebf';
  g.font = '600 24px "Geist Mono", monospace';
  g.fillText(fit(g, `WORLD CONFLICT · ${d.title.toUpperCase()}${d.daily ? ` · DAILY ${d.daily}` : ''}`, 800), 60, 70);
  g.fillStyle = d.victory ? '#f2a93b' : '#ff8486';
  g.font = '600 24px "Geist Mono", monospace';
  g.fillText(`${d.verdict} · ${d.dateLabel}`, 60, 116);
  g.fillStyle = '#e8ecf2';
  g.font = '700 60px "Geist", sans-serif';
  g.fillText(fit(g, `${d.flagEmoji} ${d.country.toUpperCase()}`, 800), 60, 186);
  g.fillStyle = '#a3aebf';
  g.font = '500 28px "Geist", Inter, sans-serif';
  g.fillText(fit(g, d.subtitle, 800), 60, 232);
  const after = strip(g, 60, 268, 760, d.cells);
  if (d.bestMoment) {
    g.fillStyle = '#e8ecf2';
    g.font = 'italic 400 28px "Instrument Serif", Georgia, serif';
    g.fillText(fit(g, `Best moment: ${d.bestMoment}`, 760), 60, after + 34);
  }
  d.seals.slice(0, 3).forEach((s, i) => sealOn(g, 60 + 44 + i * 104, after + 108, 88, s));
  gradeBlock(g, 1010, 76, d);
  g.fillStyle = '#c4ccd8';
  g.font = '500 22px "Geist Mono", monospace';
  g.fillText(fit(g, `Can you beat ${d.score}? Seed ${d.seedCode} · ${d.site}`, 1080), 60, 600);
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
  g.fillStyle = '#a3aebf';
  g.font = '600 28px "Geist Mono", monospace';
  g.fillText(fit(g, `WORLD CONFLICT · ${d.title.toUpperCase()}`, 936), L, 92);
  g.fillStyle = d.victory ? '#f2a93b' : '#ff8486';
  g.fillText(`${d.verdict} · ${d.dateLabel}`, L, 142);
  g.fillStyle = '#e8ecf2';
  g.font = '700 72px "Geist", sans-serif';
  g.fillText(fit(g, `${d.flagEmoji} ${d.country.toUpperCase()}`, 936), L, 230);
  g.fillStyle = '#a3aebf';
  g.font = '500 32px "Geist", Inter, sans-serif';
  wrap(g, d.subtitle, 936, 2).forEach((l, i) => g.fillText(l, L, 284 + i * 42));
  gradeBlock(g, 540, 400, d, 1.25);
  let y = strip(g, L, 900, 936, d.cells, 60);
  if (d.bestMoment) {
    g.fillStyle = '#e8ecf2';
    g.font = 'italic 400 36px "Instrument Serif", Georgia, serif';
    wrap(g, `Best moment: ${d.bestMoment}`, 936, 2).forEach((l, i) => g.fillText(l, L, y + 46 + i * 44));
    y += 46 + 88;
  }
  d.seals.slice(0, 3).forEach((s, i) => sealOn(g, L + 60 + i * 140, y + 70, 116, s));
  g.fillStyle = '#c4ccd8';
  g.font = '500 28px "Geist Mono", monospace';
  g.fillText(fit(g, `Can you beat ${d.score}?`, 936), L, 1262);
  g.fillText(fit(g, `Seed ${d.seedCode} · ${d.site}`, 936), L, 1302);
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
