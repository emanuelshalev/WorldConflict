import { useEffect, useMemo } from 'react';
import { IconX } from '@tabler/icons-react';
import { type CodexEntry, type Situation, entriesIn } from '../../lib/codexMatch';
import { useModalFocus } from '../../lib/useModalFocus';
import { useGameStore } from '../../store/gameStore';
import { CodexMap } from './CodexMap';
import { Glyph } from './Explainer';
import { WhoIsWho } from './WhoIsWho';
import { KIND_WORD, asOfLabel, dateLabel, noteMet, useCodex, useExplain, useOwnCountryIds } from './explain';

/**
 * The situation briefing panel ("What is going on here?", design-learn.md §3 C, D-53), loaded on
 * first open. A right drawer on desktop and tablet, a full-screen sheet on phones.
 */

/** "From November 2026 on, this is your game." */
function gameStartsLine(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const month = m ? new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }) : '';
  return `From ${month ? `${month} ` : ''}${y} on, this is your game.`;
}

function OnThisCard({ situation, blocks, cardTitle }: { situation: Situation; blocks?: string[]; cardTitle?: string }) {
  const codex = useCodex();
  const open = useExplain((s) => s.openExplainer);
  const own = useOwnCountryIds(codex);
  const entries = useMemo(() => {
    if (!codex) return [];
    const who = new Set(situation.whoIsWho.map((w) => w.entryId));
    const found = blocks?.length ? entriesIn(codex, blocks, { exclude: own }) : [];
    const extra = situation.onThisCard.map((id) => codex.byId.get(id)).filter((e): e is CodexEntry => !!e);
    const seen = new Set<string>();
    return [...found, ...extra].filter((e) => !who.has(e.id) && !seen.has(e.id) && (seen.add(e.id), true));
  }, [codex, blocks, situation, own]);
  useEffect(() => {
    noteMet(
      entries.map((e) => e.id),
      cardTitle ?? situation.title,
    );
  }, [entries, cardTitle, situation.title]);
  if (entries.length === 0) return null;
  return (
    <section className="lx-sec">
      <h3 className="lx-sec-h">{cardTitle ? `On this card: ${cardTitle}` : 'Names to know'}</h3>
      <ul className="lx-list">
        {entries.map((e) => (
          <li key={e.id}>
            <button type="button" className="lx-row" aria-haspopup="dialog" onClick={(ev) => open({ kind: 'entry', id: e.id }, ev.currentTarget)}>
              <Glyph entry={e} />
              <span>
                <b>{e.name}</b> <small>{KIND_WORD[e.kind]}</small>
                <span className="lx-row-short">{e.short}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Briefing({ situation }: { situation: Situation }) {
  const req = useExplain((s) => s.briefing);
  const close = useExplain((s) => s.closeBriefing);
  const playerId = useGameStore((s) => s.worldState?.playerCountryId ?? null);
  const large = useGameStore((s) => s.learn.prefs.largeText);
  const ref = useModalFocus<HTMLElement>(true);
  useEffect(() => {
    noteMet(
      situation.whoIsWho.map((w) => w.entryId),
      situation.title,
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || useExplain.getState().target) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [situation, close]);
  return (
    <>
      <div className="lx-brief-scrim" onClick={close} aria-hidden />
      <aside ref={ref} className={`lx-brief${large ? ' lx-large' : ''}`} role="dialog" aria-modal="true" aria-labelledby="lx-brief-title">
        <header className="lx-brief-head">
          <span className="lx-info-i big" aria-hidden>
            i
          </span>
          <div>
            <div className="lx-kicker">What is going on here</div>
            <h2 id="lx-brief-title">{situation.title}</h2>
          </div>
          <button type="button" className="icon-btn lx-brief-x" onClick={close} aria-label="Close the briefing">
            <IconX size={18} aria-hidden />
          </button>
        </header>
        <div className="lx-brief-body">
          <p className="lx-one">{situation.oneLine}</p>
          {situation.map && <CodexMap data={situation.map} label={situation.title} />}
          <section className="lx-sec">
            <h3 className="lx-sec-h">Who is who</h3>
            <WhoIsWho situation={situation} playerId={playerId} />
          </section>
          <div className="lx-two">
            <section className="lx-sec">
              <h3 className="lx-sec-h">Why it matters</h3>
              <p className="lx-why">{situation.whyItMatters}</p>
            </section>
            <section className="lx-sec">
              <h3 className="lx-sec-h">What really happened</h3>
              <ol className="lx-timeline">
                {situation.timeline.map((t) => (
                  <li key={`${t.date}-${t.text}`}>
                    <span className="num">{dateLabel(t.date)}</span>
                    {t.text}
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <p className="lx-yourgame">
            <b>{gameStartsLine(situation.gameStarts)}</b> What happens next is up to you and the simulation. Real events end here.
          </p>
          <OnThisCard situation={situation} blocks={req?.blocks} cardTitle={req?.cardTitle} />
          <details className="lx-sources">
            <summary className="num">
              As of {asOfLabel(situation.asOf)} · {situation.sources.length} source{situation.sources.length === 1 ? '' : 's'}
            </summary>
            <ul>
              {situation.sources.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer noopener">
                    {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </aside>
    </>
  );
}

