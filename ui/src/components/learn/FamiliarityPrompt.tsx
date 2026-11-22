import { type JSX, useState } from 'react';
import type { LearnLevel } from '../../lib/codexMatch';
import { LEVELS } from './explain';
import { autoBriefOn } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';

/**
 * The familiarity setting (design-learn.md §5, D-53): asked once before the first month
 * (inside the briefing, "Take office" keeps the preselected Some help), changeable in Settings
 * and from the HUD book button. What each level does:
 * - Guide me: names you may not know are underlined and the crisis text is shorter (the rest
 *   behind More). The situation briefing never opens by itself (F-02-1): Settings can turn it on;
 * - Some help: clean text, a labelled "i" per paragraph and "What is going on here?" per crisis;
 * - I know this: the same, with the "i" kept faint.
 */

/** The sample sentence as each level shows it (decoration only: the real marks are buttons). */
function Sample({ level }: { level: LearnLevel }) {
  const m = (t: string) => (level === 'guide' ? <span className="lx-mark sample">{t}</span> : t);
  return (
    <p className="lx-sample" aria-hidden>
      US mediators propose a zone in {m('Donetsk oblast')}, including the {m('fortress belt')} of Kramatorsk.
      {level !== 'guide' && (
        <span className={`lx-info sample${level === 'know' ? ' quiet' : ''}`}>
          <span className="lx-info-i">i</span>
          <span className="lx-info-n">2 names</span>
        </span>
      )}
    </p>
  );
}

/** The question in the briefing, shown until it is answered or "Take office" is pressed once. */
export function FamiliarityPrompt(): JSX.Element | null {
  const asked = useGameStore((s) => s.learn.asked);
  const level = useGameStore((s) => s.learn.level);
  const [shown] = useState(() => !asked);
  const setLevel = useGameStore((s) => s.setLearnLevel);
  // Stays on screen for the rest of this briefing once shown, even after a choice
  if (!shown) return null;
  return (
    <section className="lx-ask" aria-labelledby="lx-ask-title">
      <div className="lx-kicker">Before your first month · asked once</div>
      <h2 id="lx-ask-title">How well do you follow world news?</h2>
      <p className="lx-ask-sub">We explain names and places as you meet them. Pick how much help you want.</p>
      <div className="lx-ask-opts" role="radiogroup" aria-labelledby="lx-ask-title">
        {LEVELS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={`lx-ask-opt${level === l.id ? ' on' : ''}`} onClick={() => setLevel(l.id)}>
            <span className="lx-radio" aria-hidden />
            <span className="lx-ask-text">
              <b>
                {l.name}
                {l.id === 'some' && <small> · recommended</small>}
              </b>
              <span>{l.blurb}</span>
              {level === l.id && <Sample level={l.id} />}
            </span>
          </button>
        ))}
      </div>
      <p className="lx-ask-foot">
        Change it any time with the book button at the top or in Settings. Press <kbd>I</kbd> to hide or show the underlines for this session.
      </p>
    </section>
  );
}

/** Segmented control: Guide me | Some help | I know this. */
export function LevelSegment({ onPick }: { onPick?: (l: LearnLevel) => void }): JSX.Element {
  const level = useGameStore((s) => s.learn.level);
  const setLevel = useGameStore((s) => s.setLearnLevel);
  return (
    <div className="lx-seg" role="radiogroup" aria-label="How much help">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={level === l.id}
          className={level === l.id ? 'on' : ''}
          onClick={() => {
            setLevel(l.id);
            onPick?.(l.id);
          }}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

/** Settings → Explanations. */
export function ExplanationsSettings(): JSX.Element {
  const learn = useGameStore((s) => s.learn);
  const setPref = useGameStore((s) => s.setLearnPref);
  const reset = useGameStore((s) => s.resetCodexLearned);
  const clear = useGameStore((s) => s.clearCodexProgress);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const row = (checked: boolean, onChange: (v: boolean) => void, title: string, text: string) => (
    <label className="setting-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b>{title}</b> {text}
      </span>
    </label>
  );
  return (
    <div className="lx-settings">
      <div className="section-label">Explanations</div>
      <p className="lx-settings-sub">How much help with real names, places and events.</p>
      <LevelSegment />
      <p className="lx-settings-sub">{LEVELS.find((l) => l.id === learn.level)?.blurb}</p>
      {row(autoBriefOn(learn), (v) => setPref('autoBrief', v), 'Brief me on each new crisis', 'Opens "What is going on here?" by itself the first time a crisis appears. Off unless you turn it on.')}
      {row(learn.prefs.liveLines, (v) => setPref('liveLines', v), 'Show "In your game" lines', 'Each explanation ends with what is true in your game right now.')}
      {row(learn.prefs.fadeKnown, (v) => setPref('fadeKnown', v), 'Stop marking names I know', 'A name you have opened fades, then goes plain after a few screens.')}
      {row(learn.prefs.largeText, (v) => setPref('largeText', v), 'Larger explanation text', '16 px instead of 14 px.')}
      <div className="lx-settings-btns">
        <button
          type="button"
          className="wc-btn small"
          onClick={() => {
            reset();
            setDone('Names are marked again.');
          }}
        >
          Mark names again
        </button>
        <button
          type="button"
          className={`wc-btn small${confirm ? ' danger' : ''}`}
          onClick={() => {
            if (!confirm) return setConfirm(true);
            clear();
            setConfirm(false);
            setDone('Codex progress cleared.');
          }}
        >
          {confirm ? 'Press again to clear' : 'Clear codex progress'}
        </button>
        {done && (
          <span className="lx-done" role="status">
            {done}
          </span>
        )}
      </div>
      <p className="lx-privacy">What you open stays on this device. Nothing is sent anywhere.</p>
    </div>
  );
}
