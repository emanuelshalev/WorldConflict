import { SoundToggle } from '../game/SoundToggle';

/**
 * The stage rail: all seven stage names from the first second (Ranking always waiting at the
 * bottom, the anticipation hook), check marks on seen stages, which can be revisited. On phones it
 * collapses to dots plus the current stage name (StageDots).
 */
export function StageRail({ stages, current, seen, onJump, onSkip }: { stages: readonly string[]; current: number; seen: Set<number>; onJump: (i: number) => void; onSkip: () => void }) {
  const last = stages.length - 1;
  const item = (s: string, i: number) => {
    const done = seen.has(i) && i !== current;
    const cls = `rv-st ${done ? 'seen' : ''} ${i === current ? 'cur' : ''} ${i === last && current < last ? 'next-big' : ''}`;
    return (
      <li key={s}>
        {done ? (
          <button type="button" className={cls} onClick={() => onJump(i)}>
            <i aria-hidden>✓</i>
            {s}
            <span className="rv-sr"> (seen, go back)</span>
          </button>
        ) : (
          <span className={cls} aria-current={i === current ? 'step' : undefined}>
            <i aria-hidden>{i}</i>
            {s}
          </span>
        )}
      </li>
    );
  };
  return (
    <aside className="rv-rail" aria-label="Stages of the reveal">
      <div className="rv-brand">The reveal</div>
      <ol className="rv-rail-list">{stages.slice(0, last).map(item)}</ol>
      <div className="rv-rail-foot">
        <ol className="rv-rail-list">{item(stages[last], last)}</ol>
        <div className="rv-rail-row">
          <button type="button" className="rv-skip" onClick={onSkip}>
            Skip to the report
          </button>
          <SoundToggle />
        </div>
      </div>
    </aside>
  );
}

export function StageDots({ stages, current, seen, onSkip }: { stages: readonly string[]; current: number; seen: Set<number>; onSkip: () => void }) {
  return (
    <div className="rv-dots">
      <span className="rv-dots-row" role="img" aria-label={`Stage ${current} of ${stages.length - 1}: ${stages[current]}`}>
        {stages.map((s, i) => (
          <i key={s} className={`${i === current ? 'cur' : seen.has(i) ? 'seen' : ''}`} />
        ))}
      </span>
      <span className="rv-dots-name" aria-hidden>
        {stages[current]}
      </span>
      <SoundToggle className="rv-dots-sound" />
      <button type="button" className="rv-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
