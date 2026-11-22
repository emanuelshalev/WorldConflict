import { useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, monthLabel, withArticle } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { STATE_WORD, nowNeed, stateOf } from '../lib/goals';
import '../styles/month.css';

/**
 * The briefing (design-month.md 4.1): who you are in one line, the hook in one sentence, the
 * mission as goal chips with now and need, and "Take office". The full briefing is one tap away.
 * Never the same sentence twice on one screen: the "You are the ..." sentences are dropped, since
 * the heading already says who you are.
 */

/** Split prose into sentences (keeps the punctuation). */
function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

const isWhoYouAre = (s: string) => /^You are\b/i.test(s);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function BackstoryModal() {
  const showBackstory = useGameStore((s) => s.showBackstory);
  const playerBackstory = useGameStore((s) => s.playerBackstory);
  const dismissBackstory = useGameStore((s) => s.dismissBackstory);
  const worldState = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  const pending = useGameStore((s) => s.pendingDecisions);
  const player = usePlayerCountry();
  const [full, setFull] = useState(false);

  const ref = useModalFocus<HTMLDivElement>(!!(showBackstory && player && worldState));
  if (!showBackstory || !player || !worldState) return null;
  const objective = worldState.objective;
  const modeLabel = worldState.mode === 'FLASHPOINT' ? 'Flashpoint' : worldState.mode === 'TERM' ? 'One Term' : 'Legacy';
  const title = player.leader.title || player.politicalSystem.leaderTitle;
  // The hook: the briefing's first sentence that is not "You are ...", else the backstory's
  const briefing = sentences(objective?.briefing ?? '').filter((s) => !isWhoYouAre(s));
  const story = sentences(playerBackstory).filter((s) => !isWhoYouAre(s));
  const hook = briefing[0] ?? story[0] ?? '';
  // Full briefing: everything else, each sentence once
  const seen = new Set([norm(hook)]);
  const once = (list: string[]) => list.filter((s) => (seen.has(norm(s)) ? false : (seen.add(norm(s)), true)));
  const rest = once(briefing);
  const storyRest = once(story);
  const primary = status.filter((c) => !c.bonus);
  const bonus = status.filter((c) => c.bonus);

  return (
    <div ref={ref} className="overlay briefing-overlay" role="dialog" aria-modal="true" aria-label="Briefing">
      <div className="briefing">
        <div className="briefing-kicker num">
          {monthLabel(worldState.date).toUpperCase()} · {player.name.toUpperCase()} · {modeLabel.toUpperCase()} · {worldState.maxTurns} MONTHS
        </div>
        <div className="briefing-flag" aria-hidden>
          {flag(player.id)}
        </div>
        <h1 className="briefing-name">{player.leader.name}</h1>
        <p className="briefing-role">
          {title} of {withArticle(player.name)}
        </p>
        {hook && <p className="briefing-hook">{hook}</p>}
        <section className="briefing-mission" aria-label="Your mission">
          <h2>
            Your mission: <span>{objective?.title ?? 'Stay in power'}</span>
          </h2>
          <ul className="briefing-goals">
            {primary.map((c) => {
              const s = stateOf(c);
              const nn = nowNeed(c);
              return (
                <li key={c.label}>
                  <i className={`gseg s-${s}`} aria-hidden />
                  <span className="bg-label">{c.short ?? c.label.replace(/\s*[(:].*$/, '')}</span>
                  <span className={`bg-now st-${s}`}>{nn ?? STATE_WORD[s].toLowerCase()}</span>
                </li>
              );
            })}
            {bonus.map((c) => (
              <li key={c.label} className="bonus">
                <i className={`gdot s-${stateOf(c)}`} aria-hidden />
                <span className="bg-label">{c.short ?? c.label.replace(/\s*[(:].*$/, '')}</span>
                <span className="bg-now">bonus</span>
              </li>
            ))}
            {status.length === 0 && (
              <li>
                <i className="gseg s-on_track" aria-hidden />
                <span className="bg-label">Survive to the end of your term</span>
              </li>
            )}
          </ul>
        </section>
        <div className="briefing-facts num">
          Approval {Math.round(player.approval)}% · Stability {Math.round(player.stability)}% · {player.politicalSystem.type.replace(/_/g, ' ').toLowerCase()}
          {pending.length > 0 && <span className="briefing-hot"> · a crisis is already on your desk</span>}
        </div>
        <button type="button" className="wc-btn primary big briefing-go" onClick={dismissBackstory} autoFocus>
          Take office ▸
        </button>
        {(rest.length > 0 || storyRest.length > 0) && (
          <button type="button" className="link briefing-more" onClick={() => setFull((v) => !v)} aria-expanded={full}>
            Full briefing {full ? <IconChevronUp size={14} aria-hidden /> : <IconChevronDown size={14} aria-hidden />}
          </button>
        )}
        {full && (
          <div className="briefing-full">
            {rest.length > 0 && <p>{rest.join(' ')}</p>}
            {storyRest.length > 0 && <p className="briefing-story">{storyRest.join(' ')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
