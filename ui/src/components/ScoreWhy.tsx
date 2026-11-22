import { IconX } from '@tabler/icons-react';
import { useGameStore } from '../store/gameStore';
import { PART_NAME, SCORE_ORDER as ORDER, movers, scoreLine, r, signed, useScoreWhy } from '../lib/scoreWhy';
import { useModalFocus } from '../lib/useModalFocus';
import '../styles/month.css';

/**
 * Why your score moved (design-month.md 6.1): one line for the result card and the HUD, and a
 * small sheet with the four parts, each with now, where it is heading and the terms that make up
 * that heading (they come from scoring.ts scoreBreakdown, so the explanation is the maths).
 */

export function ScoreWhySheet() {
  const open = useScoreWhy((s) => s.open);
  const show = useScoreWhy((s) => s.show);
  const world = useGameStore((s) => s.worldState);
  const ref = useModalFocus<HTMLDivElement>(open && !!world);
  if (!open || !world) return null;
  const s = world.turnReport?.score;
  const close = () => show(false);
  return (
    <div className="sheet-overlay" onClick={close} role="presentation">
      <div ref={ref} className="sheet score-why" role="dialog" aria-modal="true" aria-label="Why your score moved" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h3>Why your score moved</h3>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close">
            <IconX size={18} />
          </button>
        </header>
        {s ? (
          <>
            <p className="sw-line">{scoreLine(s)}</p>
            <div className="sw-parts">
              {ORDER.map((k) => {
                const p = s.components[k];
                const terms = movers(p);
                return (
                  <section key={k} className="sw-part">
                    <div className="sw-top">
                      <b>{PART_NAME[k]}</b>
                      <span className="num">
                        {r(p.before)} → {r(p.after)}
                        <em className={p.target < p.after - 0.5 ? 'down' : p.target > p.after + 0.5 ? 'up' : ''}> heading to {r(p.target)}</em>
                      </span>
                    </div>
                    <div className="sw-bar" aria-hidden>
                      <i style={{ width: `${Math.max(0, Math.min(100, (p.after / 50) * 100))}%` }} />
                      <b style={{ left: `${Math.max(0, Math.min(100, (p.target / 50) * 100))}%` }} />
                    </div>
                    <ul>
                      {terms.map((t) => (
                        <li key={t.label} className={t.points < 0 ? 'neg' : 'pos'}>
                          <span>{t.label}</span>
                          <b className="num">{signed(t.points)}</b>
                        </li>
                      ))}
                      {p.terms.some((t) => /^Base$/.test(t.label)) && (
                        <li className="base">
                          <span>Base</span>
                          <b className="num">{signed(p.terms.find((t) => t.label === 'Base')?.points ?? 0)}</b>
                        </li>
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="sw-line">
              Score <b className="num">{r(world.score?.total ?? 100)}</b>. It starts moving after your first month: each part drifts toward what your situation earns.
            </p>
            <div className="sw-parts">
              {ORDER.map((k) => (
                <section key={k} className="sw-part">
                  <div className="sw-top">
                    <b>{PART_NAME[k]}</b>
                    <span className="num">{r(world.score?.[k] ?? 25)}</span>
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
        <p className="sw-foot">Each part moves 15% a month toward what your situation earns (out of 50 each, 200 in all).</p>
      </div>
    </div>
  );
}
