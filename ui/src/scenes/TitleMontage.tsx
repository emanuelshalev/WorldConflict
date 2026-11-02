import { useEffect, useState } from 'react';
import { SceneFrame } from './SceneFrame';
import type { SceneKind } from './kinds';

const SHOTS: Array<{ kind: SceneKind; home: string; other?: string; kicker: string; headline: string }> = [
  { kind: 'airstrike', home: 'USA', other: 'IRN', kicker: 'Gulf war', headline: 'Strikes on Iran enter a second month' },
  { kind: 'deployment', home: 'UKR', other: 'RUS', kicker: 'Ukraine', headline: 'The front holds as winter sets in' },
  { kind: 'streets', home: 'FRA', kicker: 'Europe', headline: 'Paris braces for another weekend in the streets' },
  { kind: 'war_room', home: 'TWN', other: 'CHN', kicker: 'Taiwan Strait', headline: 'Coast guard cutters ring the island' },
  { kind: 'parliament', home: 'DEU', kicker: 'Berlin', headline: 'A defence budget vote splits the coalition' },
];

/** Title-screen broadcast loop: the world you are about to inherit. */
export function TitleMontage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SHOTS.length), 4800);
    return () => clearInterval(t);
  }, []);
  const s = SHOTS[i];
  return (
    <div className="title-montage">
      <SceneFrame key={i} kind={s.kind} home={s.home} other={s.other} mood="bad" size="full" live kicker={s.kicker} headline={s.headline} />
    </div>
  );
}
