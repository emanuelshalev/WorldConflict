import { useEffect, useRef, useState } from 'react';
import type { BigMoment as Moment } from '../lib/moments';
import { sound } from '../lib/sound';
import { prefersReducedMotion } from '../lib/motion';
import { useCountUp } from '../lib/useCountUp';
import { SceneFrame } from '../scenes/SceneFrame';
import '../styles/bigmoment.css';

/**
 * The big-moment stinger (design-feel.md 6.4): hit, slam, reveal, settle, in 2.4 s (2.8 s for a
 * nuclear strike). Skippable from the first frame by any tap, click or key; one per Execute.
 * The frame settles by shrinking toward the result card that tells the story, so the player is
 * never left on a blank screen. Reduced motion: no shake, no flash, no scale, only fades.
 */
const HAPTIC: Partial<Record<Moment['kind'], number | number[]>> = { war: [40, 60, 80], nuclear: 200 };

function Ticker({ before, after }: { before: number; after: number }) {
  const v = useCountUp(after - before, 1100, 450);
  return <b className="num">{Math.round(before + v)}</b>;
}

export function BigMoment({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  const [settling, setSettling] = useState(false);
  const done = useRef(false);
  const total = moment.kind === 'nuclear' ? 2800 : 2400;
  const reduced = prefersReducedMotion();
  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };
    sound.play(moment.sound);
    const h = HAPTIC[moment.kind];
    if (h) sound.haptic(h);
    const t1 = window.setTimeout(() => setSettling(true), total - 800);
    const t2 = window.setTimeout(finish, total);
    const skip = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      finish();
    };
    // Captured first, so the key that skips does nothing else
    window.addEventListener('keydown', skip, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('keydown', skip, true);
    };
  }, [moment, onDone, total]);
  const shake = !reduced && (moment.kind === 'war' || moment.kind === 'nuclear' || moment.kind === 'coup' || moment.kind === 'deposed');
  return (
    <div
      className={`bigmoment bm-${moment.kind}${settling ? ' is-settling' : ''}${shake ? ' has-shake' : ''}${reduced ? ' is-reduced' : ''}`}
      role="alert"
      aria-label={`${moment.title}. ${moment.line}`}
      onPointerDown={() => {
        if (done.current) return;
        done.current = true;
        onDone();
      }}
      style={{ ['--bm-total' as string]: `${total}ms` }}
    >
      <div className="bm-wash" aria-hidden />
      <div className="bm-frame">
        <SceneFrame kind={moment.scene} home={moment.home} other={moment.other} mood={moment.kind === 'peace' || moment.kind === 'mission' ? 'good' : 'bad'} size="full" live play />
        {moment.kind === 'nuclear' && !reduced && <div className="bm-flash" aria-hidden />}
        <div className="bm-band">
          <h2 className="bm-title">{moment.title}</h2>
          <p className="bm-line num">{moment.line}</p>
          {moment.stat && (
            <p className="bm-stat">
              {moment.stat.label} <Ticker before={moment.stat.before} after={moment.stat.after} />
            </p>
          )}
        </div>
      </div>
      <p className="bm-skip">Tap or press any key to continue</p>
    </div>
  );
}
