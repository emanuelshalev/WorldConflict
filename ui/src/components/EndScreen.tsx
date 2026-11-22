import { SceneFrame } from '../scenes/SceneFrame';
import { useEffect, useMemo, useState } from 'react';
import { IconCopy, IconDownload, IconRefresh, IconShare } from '@tabler/icons-react';
import {
  fetchEndReport,
  fetchRemoteRuns,
  fetchReveal,
  postRun,
  recordDailyResult,
  startGame,
  useGameStore,
  usePlayerCountry,
  type RevealPayload,
} from '../store/gameStore';
import { flag } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { mergeRemoteRuns } from '../lib/runs';
import { cellsToEmoji, drawClassicCard, monthCells, publicSite } from '../lib/shareCard';
import { RevealSequence } from './reveal/RevealSequence';
import { END_SCENE } from './reveal/model';

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

/** The story of the session in one line: the latest world headline that isn't the player's own order. */
function storyHeadline(news: Array<{ headline: string }>, playerName: string): string {
  const pick =
    news.find((n) => !/ ANSWER TO /i.test(n.headline) && !n.headline.toUpperCase().startsWith(playerName.toUpperCase())) ??
    news[0];
  return (pick?.headline ?? '').replace(/["“”]/g, '');
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
  const saveId = useGameStore((s) => s.saveId);
  // The reveal for this save: loading, ready, or failed (then the classic end screen shows)
  const [reveal, setReveal] = useState<{ saveId: string; payload: RevealPayload | null } | null>(null);

  useEffect(() => {
    if (gameOver && !report) fetchEndReport();
  }, [gameOver, report]);

  useEffect(() => {
    if (!gameOver || !saveId || reveal?.saveId === saveId) return;
    let live = true;
    (async () => {
      const payload = await fetchReveal(saveId);
      // Runs the server knows (another browser) join local history before the reveal reads it
      if (payload) mergeRemoteRuns(await fetchRemoteRuns(payload.seat.seatKey));
      if (!live) return;
      setReveal({ saveId, payload });
      if (payload) void postRun(saveId);
    })();
    return () => {
      live = false;
    };
  }, [gameOver, saveId, reveal?.saveId]);

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
    () => cellsToEmoji(monthCells((report?.scoreHistory ?? world?.scoreHistory ?? []).slice(0, world?.maxTurns ?? 999), lost)),
    [report, world, lost],
  );
  const pending = !!saveId && reveal?.saveId !== saveId;
  const payload = reveal?.saveId === saveId ? reveal.payload : null;
  const ref = useModalFocus<HTMLDivElement>(!!(open && gameOver && world && me && !payload && !pending));
  if (!open || !gameOver || !world || !me) return null;

  const stars = outcome?.stars ?? 0;
  const grade = report?.assessment.grade ?? '-';
  const verdict = REASON_TEXT[gameOver.reason] ?? gameOver.reason;
  const title = world.objective?.title ?? (world.mode === 'TERM' ? 'One Term' : 'Legacy');
  const archetype = report?.assessment.classification ?? '';
  const shareText = `WORLD CONFLICT${isDaily ? ` · Daily ${new Date().toISOString().slice(0, 10)}` : ''}, ${flag(me.id)} ${me.name}: ${title}\n${verdict} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · grade ${grade} · score ${world.score?.total ?? 0}\nMonth ${Math.min(world.turn, world.maxTurns)}/${world.maxTurns}${storyHeadline(world.newspaper ?? [], me.name) ? ` · "${storyHeadline(world.newspaper ?? [], me.name)}"` : ''}\n${grid}\n${archetype}\nhttps://${publicSite()}`;

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
    const url = drawClassicCard({
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
  const newGame = () => {
    closeModal();
    useGameStore.getState().reset();
  };
  const closeCalls = report?.closeCalls ?? world.director?.closeCalls ?? 0;
  const comebacks = report?.comebacks ?? 0;

  // Sealing the record: the reveal arrives in well under a second
  if (pending) {
    return (
      <div className="overlay" role="status" aria-live="polite" aria-label="Sealing the record">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (payload) {
    const replay = payload.replay;
    return (
      <RevealSequence
        r={payload}
        saveId={saveId ?? 'save'}
        daily={isDaily ? new Date().toISOString().slice(0, 10) : null}
        actions={{
          onReplay: () =>
            startGame({
              mode: replay.mode,
              playerCountryId: replay.countryId,
              flashpointId: replay.flashpointId ?? undefined,
              scenarioId: replay.flashpointId ? undefined : replay.scenarioId,
              difficulty: replay.difficulty,
              seed: replay.seed,
            }),
          onNewWorld: rematch,
          onNewGame: newGame,
        }}
        extras={
          <div className="rv-classic">
            <div className="rv-caps">Your goals</div>
            <ul className="rv-conds">
              {(outcome?.conditions ?? payload.verdict.conditions).map((c) => (
                <li key={c.label} className={c.met ? 'met' : 'missed'}>
                  {c.met ? '✓' : '✗'} {c.label} {c.bonus ? <span className="chip">bonus ★</span> : null}
                </li>
              ))}
            </ul>
            <p className="rv-hint">
              Your {Math.min(world.turn, world.maxTurns)} months · score {world.score?.total ?? '-'} · {closeCalls} close call{closeCalls === 1 ? '' : 's'} · {comebacks} comeback{comebacks === 1 ? '' : 's'}
            </p>
            <div className="month-grid" aria-label="One square per month">{grid}</div>
            {streak && (
              <div className="list-item" style={{ borderColor: 'rgba(229,56,59,0.4)', marginTop: 12 }}>
                <h5>🔥 Daily streak: {streak.streak} day{streak.streak === 1 ? '' : 's'}</h5>
                <p>Best streak {streak.best}. A new crisis drops tomorrow, same world for everyone.</p>
              </div>
            )}
            {report?.timeline && report.timeline.length > 0 && (
              <>
                <div className="rv-caps rv-sub">World timeline</div>
                <ul className="rv-timeline">
                  {report.timeline.map((e, i) => (
                    <li key={`${e.turn}-${i}`}>
                      <span className="num">{e.date}</span>
                      <span>{e.description}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div ref={ref} className="overlay" role="dialog" aria-modal="true" aria-label="Result">
      <div className="end">
        <SceneFrame
          kind={END_SCENE[gameOver.reason] ?? (lost ? 'streets' : 'address')}
          home={me.id}
          mood={lost ? 'bad' : 'good'}
          size="card"
          live
          verdict={lost ? 'failed' : 'success'}
        />
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
              Your {Math.min(world.turn, world.maxTurns)} months · score {world.score?.total ?? '-'} · {(() => { const n = report?.closeCalls ?? world.director?.closeCalls ?? 0; return `${n} close call${n === 1 ? '' : 's'}`; })()} · {(() => { const n = report?.comebacks ?? 0; return `${n} comeback${n === 1 ? '' : 's'}`; })()}
            </div>
            <div className="month-grid">{grid}</div>
          </div>
          {streak && (
            <div className="list-item" style={{ borderColor: 'rgba(229,56,59,0.4)' }}>
              <h5>🔥 Daily streak: {streak.streak} day{streak.streak === 1 ? '' : 's'}</h5>
              <p>Best streak {streak.best}. A new crisis drops tomorrow, same world for everyone.</p>
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
