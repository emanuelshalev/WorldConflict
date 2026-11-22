import { useState } from 'react';
import type { BigMoment as Moment } from '../lib/moments';
import { BigMoment } from './BigMoment';
import { SoundToggle } from './game/SoundToggle';

/**
 * Dev gallery (/#moments): every big-moment stinger with a fixture, for QA screenshots and for
 * hearing the sounds. Not linked from the game.
 */
const FIXTURES: Moment[] = [
  { kind: 'war', title: 'War declared', line: 'SAUDI ARABIA AGAINST YEMEN · MONTH 4', stat: { label: 'World tension', before: 62, after: 78 }, scene: 'address', home: 'SAU', other: 'YEM', sound: 'war', ending: false },
  { kind: 'nuclear', title: 'Nuclear strike', line: 'PAKISTAN ON INDIA · MONTH 7', stat: { label: 'World tension', before: 71, after: 98 }, scene: 'nuclear', home: 'PAK', other: 'IND', sound: 'nuclear', ending: false },
  { kind: 'coup', title: 'Regime change', line: 'VENEZUELA · MONTH 3', scene: 'covert', home: 'USA', other: 'VEN', sound: 'coup', ending: false },
  { kind: 'peace', title: 'Ceasefire', line: 'SAUDI ARABIA AND YEMEN · MONTH 6', scene: 'ceasefire', home: 'SAU', other: 'YEM', sound: 'peace', ending: false },
  { kind: 'mission', title: 'Mission complete', line: 'SAUDI ARABIA · CLOSE THE GATE', scene: 'signing', home: 'SAU', sound: 'mission', ending: true },
  { kind: 'deposed', title: 'Voted out', line: 'UNITED STATES · MONTH 24', scene: 'election', home: 'USA', sound: 'coup', ending: true },
];

export function MomentGallery() {
  const [on, setOn] = useState<Moment | null>(null);
  return (
    <main style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Big moments</h1>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>Press one to play its stinger. Any key or tap skips it.</p>
      <SoundToggle />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FIXTURES.map((m) => (
          <button key={m.kind} type="button" className="wc-btn" data-moment={m.kind} onClick={() => setOn(m)}>
            {m.title}
          </button>
        ))}
      </div>
      {on && <BigMoment key={on.kind} moment={on} onDone={() => setOn(null)} />}
    </main>
  );
}
