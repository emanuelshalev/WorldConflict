import { useEffect, useMemo, useState } from 'react';
import { IconCopy, IconDownload, IconRefresh, IconShare } from '@tabler/icons-react';
import { fetchEndReport, recordDailyResult, startGame, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag } from '../lib/format';

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
  g.fillStyle = opts.victory ? '#f2a93b' : '#e5383b';
  g.fillRect(0, 0, 1200, 10);
  g.fillStyle = '#a3aebf';
  g.font = '600 26px "Barlow Condensed", sans-serif';
  g.fillText('WORLD CONFLICT', 60, 70);
  g.fillStyle = opts.victory ? '#f2a93b' : '#ff8486';
  g.font = '600 24px "IBM Plex Mono", monospace';
  g.fillText(opts.verdict, 60, 120);
  g.fillStyle = '#e8ecf2';
  g.font = '700 64px "Barlow Condensed", sans-serif';
  g.fillText(`${opts.flagEmoji} ${opts.country}`.toUpperCase(), 60, 195);
  g.font = '500 32px Inter, sans-serif';
  g.fillStyle = '#a3aebf';
  g.fillText(opts.title, 60, 245);
  g.fillText(opts.archetype, 60, 290);
  g.font = '40px sans-serif';
  const perLine = 24;
  const cells = [...opts.grid];
  for (let i = 0; i < cells.length; i += perLine) {
    g.fillText(cells.slice(i, i + perLine).join(''), 60, 370 + (i / perLine) * 52);
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
  g.textAlign = 'left';
  g.fillStyle = '#6f7b8d';
  g.font = '500 22px "IBM Plex Mono", monospace';
  g.fillText('Can you do better? Lead your nation at worldconflict.game', 60, 590);
  return c.toDataURL('image/png');
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
    () => monthGrid(report?.scoreHistory ?? world?.scoreHistory ?? [], lost),
    [report, world, lost],
  );
  if (!open || !gameOver || !world || !me) return null;

  const stars = outcome?.stars ?? 0;
  const grade = report?.assessment.grade ?? '—';
  const verdict = REASON_TEXT[gameOver.reason] ?? gameOver.reason;
  const title = world.objective?.title ?? (world.mode === 'TERM' ? 'One Term' : 'Legacy');
  const archetype = report?.assessment.classification ?? '';
  const shareText = `WORLD CONFLICT${isDaily ? ` · Daily ${new Date().toISOString().slice(0, 10)}` : ''} — ${flag(me.id)} ${me.name}: ${title}\n${verdict} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · grade ${grade} · score ${world.score?.total ?? 0}\nMonth ${Math.min(world.turn, world.maxTurns)}/${world.maxTurns}${world.newspaper?.[0]?.headline ? ` · "${world.newspaper[0].headline}"` : ''}\n${grid}\n${archetype}${typeof window !== 'undefined' ? `\n${window.location.origin}` : ''}`;

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
    const url = drawCard({ title, country: me.name, flagEmoji: flag(me.id), verdict, grade, stars, archetype, grid, victory: !lost });
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
    <div className="overlay">
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
