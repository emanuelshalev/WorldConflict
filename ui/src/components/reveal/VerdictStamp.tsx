import { useEffect, type CSSProperties } from 'react';
import { Stamp, type StampInk } from '../game/Stamp';
import { sound } from '../../lib/sound';

/**
 * The verdict stamp (WP9): the feel kit's rubber stamp at its largest, tilted -4 degrees, in the
 * ink of the outcome (green complete, red deposed or failed, amber survived with a loss), and the
 * grade box whose stars ignite one at a time.
 */
function verdictInk(victory: boolean, reason: string | null): StampInk {
  if (victory) return 'good';
  if (reason === 'TERM_COMPLETED') return 'amber';
  return 'red';
}

export function VerdictStamp({ label, victory, reason, animate }: { label: string; victory: boolean; reason: string | null; animate: boolean }) {
  useEffect(() => {
    if (!animate) return;
    const t = window.setTimeout(() => {
      sound.play('stamp');
    }, 160);
    const t2 = window.setTimeout(() => sound.play(victory ? 'mission' : 'coup'), 700);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [animate, victory]);
  return (
    <Stamp
      word={label}
      ink={verdictInk(victory, reason)}
      size="lg"
      tilt={-4}
      animate={animate}
      className="rv-verdict-stamp"
    />
  );
}

export function GradeBox({ grade, stars, animate }: { grade: string; stars: number; animate: boolean }) {
  useEffect(() => {
    if (!animate) return;
    const ts = Array.from({ length: stars }, (_, i) => window.setTimeout(() => sound.play('tap'), 900 + i * 300));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [animate, stars]);
  return (
    <div className="rv-gradebox" role="group" aria-label={`Grade ${grade}, ${stars} of 3 stars`}>
      <div className="rv-grade-col">
        <div className="rv-caps">Grade</div>
        <div className={`rv-grade ${animate ? 'rv-flip' : ''}`}>{grade}</div>
      </div>
      <div className="rv-grade-col">
        <div className="rv-stars" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`${i < stars ? 'on' : 'off'} ${animate && i < stars ? 'rv-ignite' : ''}`}
              style={animate ? ({ animationDelay: `${900 + i * 300}ms` } as CSSProperties) : undefined}
            >
              {i < stars ? '★' : '☆'}
            </span>
          ))}
        </div>
        <div className="rv-caps">{stars} of 3 stars</div>
      </div>
    </div>
  );
}
