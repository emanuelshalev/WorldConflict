import { useEffect, useMemo, useState } from 'react';
import { IconCopy, IconDownload, IconRefresh, IconShare } from '@tabler/icons-react';
import { fetchEndReport, recordDailyResult, startGame, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';

const REASON_TEXT: Record<string, string> = {
  TERM_COMPLETED: 'MISSION COMPLETE',
  OBJECTIVE_FAILED: 'MISSION FAILED',
  LOST_ELECTION: 'VOTED OUT',
  DEPOSED_COUP: 'DEPOSED',
  REVOLUTION: 'OVERTHROWN',
  ASSASSINATED: 'ASSASSINATED',
  IMPEACHED: 'IMPEACHED',
  COUNTRY_COLLAPSED: 'STATE COLLAPSE',
  NUCLEAR_HOLOCAUST: 'NUCLEAR HOLOCAUST',
};

/** One emoji per month: how close to the edge you were. */
function monthGrid(
  history: Array<{ approval: number; stability: number }>,
  lost: boolean,
): string {
  const cells: string[] = history.map((h) => {
    const low = Math.min(h.approval, h.stability);
    return low >= 50 ? '🟩' : low >= 30 ? '🟨' : '🟥';
  });
  if (lost && cells.length) cells[cells.length - 1] = '⬛';
  return cells.join('');
}

function drawCard(opts: {
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
  // The strip is the mission: one segment per objective, green met, red missed (bonus: gold / grey)
  const segs = opts.conditions.length ? opts.conditions : [{ met: opts.victory, bonus: false }];
  const segW = 1200 / segs.length;
  segs.forEach((cond, i) => {
    g.fillStyle = cond.bonus ? (cond.met ? '#f2a93b' : '#3a4558') : cond.met ? '#3fb68b' : '#e5383b';
    g.fillRect(i * segW, 0, segW - (i < segs.length - 1 ? 4 : 0), 12);
  });
  g.fillStyle = '#a3aebf';
  g.font = '600 26px "Barlow Condensed", sans-serif';
  g.fillText(`WORLD CONFLICT${opts.daily ? ` · DAILY ${opts.daily}` : ''}`, 60, 70);
  g.fillStyle = opts.victory ? '#f2a93b' : '#ff8486';
  g.font = '600 24px "IBM Plex Mono", monospace';
  g.fillText(`${opts.verdict} · ${opts.month}`, 60, 120);
  g.fillStyle = '#e8ecf2';
  g.font = '700 64px "Barlow Condensed", sans-serif';
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
  // Every month gets a cell: long games use smaller cells and more per row
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
  g.font = '700 130px "Barlow Condensed", sans-serif';
  g.textAlign = 'center';
  g.fillText(opts.grade, 1040, 220);
  g.font = '44px sans-serif';
  g.fillText('★'.repeat(opts.stars) + '☆'.repeat(3 - opts.stars), 1040, 330);
  g.fillStyle = '#a3aebf';
  g.font = '500 22px "IBM Plex Mono", monospace';
  g.fillText('SCORE', 1040, 390);
  g.fillStyle = '#e8ecf2';
  g.font = '700 56px "IBM Plex Mono", monospace';
  g.fillText(String(opts.score), 1040, 450);
  g.textAlign = 'left';
  // Legends, so strangers can read the card
  g.fillStyle = '#8693a6';
  g.font = '500 18px "IBM Plex Mono", monospace';
  g.fillText('Each square is a month: 🟩 steady  🟨 strained  🟥 on the edge  ⬛ fell', 60, 535);
  g.fillText('Top bar: one segment per objective (green met, red missed, gold bonus)', 60, 560);
  g.fillStyle = '#a3aebf';
  g.font = '500 22px "IBM Plex Mono", monospace';
  g.fillText(`Can you do better? ${opts.site}`, 60, 600);
  return c.toDataURL('image/png');
}

/** Truncate text with an ellipsis to fit a canvas width. */
function fit(g: CanvasRenderingContext2D, text: string, width: number): string {
  if (g.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 4 && g.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t}…`;
}

/** The story of the session in one line: the latest world headline that isn't the player's own order. */
function storyHeadline(news: Array<{ headline: string }>, playerName: string): string {
  const pick =
    news.find((n) => !/'S ANSWER TO|’S ANSWER TO/i.test(n.headline) && !n.headline.toUpperCase().startsWith(playerName.toUpperCase())) ??
    news[0];
  return (pick?.headline ?? '').replace(/["“”]/g, '');
}

/** Public URL for share text and card: configurable, never "localhost". */
function publicSite(): string {
  const env = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/^https?:\/\//, '');
  if (env) return env;
  const host = typeof window !== 'undefined' ? window.location.host : '';
  return host && !/localhost|127\.0\.0\.1/.test(host) ? host : 'worldconflict.game';
}

export function EndScreen() {
  const activeModal = useGameStore((s) => s.activeModal);
  const closeModal = useGameStore((s) => s.closeModal);
  const report = useGameStore((s) => s.endReport);
  const world = useGameStore((s) => s.worldState);
  const gameOver = useGameStore((s) => s.gameOver);
  const showChronicle = useGameStore((s) => s.showChronicle);
  const me = usePlayerCountry();
  const [copied, setCopied] = useState(false);
  const isDaily = useGameStore((s) => s.isDaily);
  const [streak, setStreak] = useState<{ streak: number; best: number } | null>(null);

  useEffect(() => {
    if (gameOver && !report) fetchEndReport();
  }, [gameOver, report]);

  const outcomeStars = world?.outcome?.stars ?? 0;
  useEffect(() => {
    if (!gameOver || !isDaily) return;
    const result = recordDailyResult(new Date().toISOString().slice(0, 10), outcomeStars);
    queueMicrotask(() => setStreak(result));
  }, [gameOver, isDaily, outcomeStars]);

  const open = activeModal === 'endGame' || (!!gameOver && !showChronicle && activeModal === null);
  const outcome = world?.outcome ?? report?.outcome ?? null;
  const lost = !outcome?.victory;
  const grid = useMemo(
    () => monthGrid((report?.scoreHistory ?? world?.scoreHistory ?? []).slice(0, world?.maxTurns ?? 999), lost),
    [report, world, lost],
  );
  const ref = useModalFocus<HTMLDivElement>(!!(open && gameOver && world && me));
  if (!open || !gameOver || !world || !me) return null;

  const stars = outcome?.stars ?? 0;
  const grade = report?.assessment.grade ?? '—';
  const verdict = REASON_TEXT[gameOver.reason] ?? gameOver.reason;
  const title = world.objective?.title ?? (world.mode === 'TERM' ? 'One Term' : 'Legacy');
  const archetype = report?.assessment.classification ?? '';
  const shareText = `WORLD CONFLICT${isDaily ? ` · Daily ${new Date().toISOString().slice(0, 10)}` : ''} — ${flag(me.id)} ${me.name}: ${title}\n${verdict} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · grade ${grade} · score ${world.score?.total ?? 0}\nMonth ${Math.min(world.turn, world.maxTurns)}/${world.maxTurns}${storyHeadline(world.newspaper ?? [], me.name) ? ` · "${storyHeadline(world.newspaper ?? [], me.name)}"` : ''}\n${grid}\n${archetype}\nhttps://${publicSite()}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText, title: 'World Conflict' });
      else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      /* user cancelled */
    }
  };
  const download = () => {
    const url = drawCard({
      title,
      country: me.name,
      flagEmoji: flag(me.id),
      verdict,
      grade,
      stars,
      archetype,
      grid,
      victory: !lost,
      score: world.score?.total ?? 0,
      month: `MONTH ${Math.min(world.turn, world.maxTurns)}/${world.maxTurns}`,
      headline: storyHeadline(world.newspaper ?? [], me.name),
      leader: me.leader?.name ?? '',
      daily: isDaily ? new Date().toISOString().slice(0, 10) : null,
      conditions: outcome?.conditions ?? [],
      site: publicSite(),
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-conflict-${me.id.toLowerCase()}.png`;
    a.click();
  };
  const rematch = () =>
    startGame({
      mode: world.mode,
      playerCountryId: me.id,
      flashpointId: world.flashpointId ?? undefined,
      scenarioId: world.flashpointId ? undefined : world.scenarioId,
      difficulty: world.difficulty,
    });

  return (
    <div ref={ref} className="overlay" role="dialog" aria-modal="true" aria-label="Result">
      <div className="end">
        <div className="end-hero">
          <div style={{ flex: 1 }}>
            <div className="verdict" style={{ color: lost ? '#ff8486' : 'var(--accent)' }}>
              {verdict} · {flag(me.id)} {me.name.toUpperCase()}
            </div>
            <h2>{archetype || title}</h2>
            <p>{gameOver.description}</p>
            {report?.assessment.justification && (
              <p style={{ marginTop: 6, fontStyle: 'italic' }}>{report.assessment.justification}</p>
            )}
          </div>
          <div className="grade">
            <b>{grade}</b>
            <div className="stars">{'★'.repeat(stars) + '☆'.repeat(3 - stars)}</div>
          </div>
        </div>
        <div className="end-body">
          {outcome && (
            <div>
              {outcome.conditions.map((c) => (
                <div key={c.label} style={{ fontSize: 14, color: c.met ? 'var(--good)' : 'var(--text-3)', marginBottom: 3 }}>
                  {c.met ? '✓' : '✗'} {c.label} {c.bonus ? <span className="chip">bonus ★</span> : null}
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="display" style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.16em' }}>
              Your {Math.min(world.turn, world.maxTurns)} months · score {world.score?.total ?? '—'} · {report?.closeCalls ?? world.director?.closeCalls ?? 0} close calls · {report?.comebacks ?? 0} comebacks
            </div>
            <div className="month-grid">{grid}</div>
          </div>
          {streak && (
            <div className="list-item" style={{ borderColor: 'rgba(229,56,59,0.4)' }}>
              <h5>🔥 Daily streak: {streak.streak} day{streak.streak === 1 ? '' : 's'}</h5>
              <p>Best streak {streak.best}. A new crisis drops tomorrow — same world for everyone.</p>
            </div>
          )}
          {world.objective?.debrief && <div className="debrief">{world.objective.debrief}</div>}
          <div className="end-actions">
            <button className="wc-btn primary" onClick={share}>
              <IconShare size={16} /> {copied ? 'Copied!' : 'Share result'}
            </button>
            <button className="wc-btn" onClick={download}>
              <IconDownload size={16} /> Save card
            </button>
            <button
              className="wc-btn"
              onClick={async () => {
                await navigator.clipboard.writeText(shareText);
                setCopied(true);
              }}
            >
              <IconCopy size={16} /> Copy text
            </button>
            <button className="wc-btn" onClick={rematch}>
              <IconRefresh size={16} /> Rematch
            </button>
            <button
              className="wc-btn ghost"
              onClick={() => {
                closeModal();
                useGameStore.getState().reset();
              }}
            >
              New game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
