import { useMemo, useState } from 'react';
import type { RevealPayload } from '../../store/gameStore';
import type { StoredRun } from '../../lib/runs';
import '../../styles/wc.css';
import { RevealSequence } from './RevealSequence';
import payload from './demo/hormuz-usa.json';

/**
 * Gallery route for QA and the panel: the reveal for a finished Hormuz Convoy (United States)
 * session without playing one. The payload is the reveal test fixture's world built with the real
 * reality rows and benchmarks (scripts/reveal-demo-payload.ts). Deep links:
 *   #reveal-demo            the sequence from stage 0
 *   #reveal-demo/4          open on stage 4
 *   #reveal-demo/report     the report
 *   #reveal-demo/lost       the same run, deposed in month 9 (red stamp, x0.6)
 *   #reveal-demo/first      no earlier runs on the seat (first run, no ghost)
 */
function variant(base: RevealPayload, lost: boolean): RevealPayload {
  if (!lost) return base;
  const raw = base.presidency.raw;
  return {
    ...base,
    verdict: { ...base.verdict, victory: false, stars: 0, grade: 'D', reason: 'DEPOSED_COUP', label: 'DEPOSED', description: 'The generals moved in month 9.' },
    presidency: { ...base.presidency, total: Math.round(raw * 0.6), modifier: { kind: 'DEPOSED', factor: 0.6, label: 'Deposed: x0.6' } },
    achievements: {
      ...base.achievements,
      earned: [
        ...base.achievements.earned.filter((a) => !a.infamy).slice(0, 4),
        { id: 'deposed', name: 'Shown the Door', rule: 'Lose office', hint: '', infamy: true, signature: false, tier: 'COMMON', rate: 0.31, turn: 8, month: 9 },
      ],
    },
  };
}

function demoHistory(r: RevealPayload): StoredRun[] {
  const now = new Date();
  const day = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const current: StoredRun = { ...r.run, saveId: 'demo', date: now.toISOString() };
  const a = r.run.series.approval;
  return [
    current,
    {
      ...r.run,
      saveId: 'demo-2',
      date: day(2),
      presidencyScore: 611,
      parts: [350, 25, 151, 85],
      grade: 'B',
      stars: 2,
      achievements: ['sworn_in', 'full_term', 'peacemaker'],
      series: { approval: a.map((v, i) => Math.max(30, v - 6 + (i % 3))), score: r.run.series.score.map((v) => v - 7) },
      choices: r.run.choices.map((c, i) => (i === 0 ? { ...c, choice: 'Reply via Muscat' } : c)),
    },
    {
      ...r.run,
      saveId: 'demo-3',
      date: day(3),
      seed: r.run.seed + 7,
      presidencyScore: 538,
      parts: [300, 0, 148, 90],
      grade: 'C',
      stars: 1,
      achievements: ['sworn_in', 'the_hawk'],
      series: { approval: a.map((v) => Math.max(28, v - 11)), score: r.run.series.score.map((v) => v - 12) },
      choices: [],
    },
  ];
}

export default function RevealDemo() {
  const [note, setNote] = useState('');
  const parts = window.location.hash.replace(/^#reveal-demo\/?/, '').split('/').filter(Boolean);
  const lost = parts.includes('lost');
  const first = parts.includes('first');
  const startPart = parts.find((p) => /^\d$/.test(p) || p === 'report');
  const start = startPart === 'report' ? 'report' : startPart ? Number(startPart) : 0;
  const r = useMemo(() => variant(payload as unknown as RevealPayload, lost), [lost]);
  const history = useMemo(() => {
    const h = demoHistory(r);
    return first ? h.slice(0, 1) : h;
  }, [r, first]);
  const say = (t: string) => () => setNote(t);
  return (
    <>
      <RevealSequence
        r={first ? { ...r, ranking: { ...r.ranking, personalBest: null } } : r}
        saveId="demo"
        record={false}
        historyOverride={history}
        start={start}
        actions={{
          onReplay: say(`Replay same opening: would start ${r.replay.seedCode} (seed ${r.replay.seed})`),
          onNewWorld: say('New world: would start the same seat with a new seed'),
          onNewGame: say('New game: would return to the title screen'),
        }}
        extras={<p className="rv-hint">Gallery fixture: {r.seat.seatKey}, seed {r.replay.seedCode}.</p>}
      />
      {note && (
        <div className="toast" role="status" style={{ zIndex: 400 }} onClick={() => setNote('')}>
          {note}
        </div>
      )}
    </>
  );
}
