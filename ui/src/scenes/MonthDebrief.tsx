import { useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronRight, IconLayoutList, IconLayoutGrid, IconNews } from '@tabler/icons-react';
import type { TurnReport, WorldState } from '../store/gameStore';
import { countryName } from '../store/gameStore';
import { buildPages, type DebriefPage, type OutcomeCardData } from '../lib/debrief';
import { monthLabel } from '../lib/format';
import { OutcomeCard } from './OutcomeCard';
import { StatCount } from './debriefParts';
import './reel.css';
import './debrief.css';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const DENSE_KEY = 'worldconflict.debriefDense';
const readDense = () => {
  try {
    return localStorage.getItem(DENSE_KEY) === 'on';
  } catch {
    return false;
  }
};

/** Every outcome as one table row, for players who want it all at a glance. */
function DenseTable({ pages }: { pages: DebriefPage[] }) {
  const rows = pages.flatMap((p) => p.cards.map((c) => ({ p, c })));
  const fmt = (c: OutcomeCardData) =>
    c.facts.map((f) => `${f.label} ${Math.round(f.before * 10) / 10}→${Math.round(f.after * 10) / 10}`).join(' · ');
  return (
    <div className="db-dense-wrap">
      <table className="db-dense">
        <thead>
          <tr>
            <th>Section</th>
            <th>What</th>
            <th>Reply</th>
            <th>Numbers</th>
            <th>Watch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, c }) => (
            <tr key={`${p.key}-${c.key}`} className={`v-${c.verdict}`}>
              <td>{p.title}</td>
              <td>
                <b>{c.headline}</b>
                <div className="db-dense-sub">{c.lines.map((l) => l.text).join(' · ')}</div>
              </td>
              <td className={c.reaction ? `t-${c.reaction.tone}` : ''}>{c.reaction ? `${c.reaction.tone}: ${c.reaction.who}` : ''}</td>
              <td className="num">{fmt(c)}</td>
              <td>{c.watch ?? ''}</td>
            </tr>
          ))}
          {pages.flatMap((p) => p.footnotes.flatMap((f) => f.items.map((it, i) => (
            <tr key={`${p.key}-${f.title}-${i}`} className="foot">
              <td>{f.title}</td>
              <td colSpan={4}>{it}</td>
            </tr>
          ))))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * After Execute: the month in at most three pages (the highlight, diplomacy by country, home and
 * security), several outcomes per page, then the paper. Keys: 1-4, arrows, Enter, Esc.
 */
export function MonthDebrief({ report, world, home, onDone }: { report: TurnReport; world: WorldState; home: string; onDone: () => void }) {
  const pages = useMemo(() => buildPages(report, world), [report, world]);
  const [at, setAt] = useState(0);
  const [dense, setDense] = useState(readDense);
  const touched = useRef(dense);
  const page = pages[at];
  const go = (i: number) => {
    touched.current = true;
    if (i >= pages.length) onDone();
    else setAt(Math.max(0, i));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Captured first, so the app's own Escape does not also close the paper behind us
      e.stopPropagation();
      if (e.key === 'Escape') onDone();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') go(at + 1);
      else if (e.key === 'ArrowLeft') go(at - 1);
      else if (/^[1-4]$/.test(e.key)) go(Number(e.key) - 1);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });
  const toggleDense = () => {
    touched.current = true;
    setDense((d) => {
      try {
        localStorage.setItem(DENSE_KEY, d ? 'off' : 'on');
      } catch {
        /* storage unavailable */
      }
      return !d;
    });
  };
  if (!page) return null;
  const deltas = report.deltas;
  const stat = (k: string, label: string, i: number, suffix = '%') =>
    deltas[k] ? <StatCount key={k} label={label} before={deltas[k].before} after={deltas[k].after} i={i} suffix={suffix} /> : null;
  const [first, ...rest] = page?.cards ?? [];
  return (
    <div className="debrief" role="dialog" aria-modal="true" aria-label={`${monthLabel(world.date)}: what happened`}>
      <header className="db-head">
        <div className="db-date">
          <span className="num">{monthLabel(world.date)}</span>
          <b>What happened</b>
        </div>
        <nav className="db-tabs" role="tablist" aria-label="Debrief pages">
          {pages.map((p, i) => (
            <button key={p.key} role="tab" aria-selected={i === at} className={i === at ? 'on' : ''} onClick={() => go(i)}>
              <kbd>{i + 1}</kbd> {p.title}
              {p.cards.length > 1 && <span className="db-count num">{p.cards.length}</span>}
            </button>
          ))}
          <button role="tab" aria-selected={false} onClick={onDone}>
            <kbd>{pages.length + 1}</kbd> <IconNews size={14} /> The paper
          </button>
        </nav>
        <button className="wc-btn ghost small" onClick={toggleDense} title="Everything as one table">
          {dense ? <IconLayoutGrid size={15} /> : <IconLayoutList size={15} />} {dense ? 'Cards' : 'Table'}
        </button>
      </header>

      <main className="db-stage">
        {dense ? (
          <DenseTable pages={pages} />
        ) : page.key === 'highlight' ? (
          <div className="db-highlight">
            {first && <OutcomeCard c={first} home={home} big />}
            <div className="db-stats">
              {stat('approval', 'Approval', 0)}
              {stat('stability', 'Stability', 1)}
              {stat('legitimacy', 'Legitimacy', 2)}
              {stat('score', 'Score', 3, '')}
              {report.tension && <StatCount label="World tension" before={report.tension.before} after={report.tension.after} i={4} />}
            </div>
            {report.moments.length > 0 && (
              <div className="db-moments">
                {report.moments.map((m) => (
                  <span key={m} className="db-moment">
                    {m}
                  </span>
                ))}
              </div>
            )}
            {pages.length > 1 && (
              <div className="db-also">
                <h4>Also this month</h4>
                <div className="db-also-list">
                  {pages.slice(1).flatMap((p, pi) =>
                    p.cards.slice(0, 3).map((c) => (
                      <button key={c.key} className={`db-also-item v-${c.verdict}`} onClick={() => go(pi + 1)}>
                        <span className="db-kicker">{c.kicker}</span>
                        <b>{c.headline}</b>
                        {c.reaction && <i>“{c.reaction.line.replace(/^'|'$/g, '').slice(0, 90)}{c.reaction.line.length > 90 ? '…' : ''}”</i>}
                      </button>
                    )),
                  )}
                </div>
              </div>
            )}
            <p className="db-summary">
              {plural(report.decisions.filter((d) => d.attended !== false).length, 'decision')}, {plural(report.orders.length, 'order')}
              {(report.relations ?? []).length ? `, ${report.relations?.length} countries changed their view of you` : ''}
              {(report.wars ?? []).length ? `, ${report.wars?.length} war${report.wars?.length === 1 ? '' : 's'}` : ''}.
            </p>
          </div>
        ) : (
          <div className={`db-page p-${page.key}`}>
            {first && page.key === 'diplomacy' && <OutcomeCard c={first} home={home} big />}
            {(page.key === 'diplomacy' ? rest : page.cards).length > 0 && (
              <div className="db-grid">
                {(page.key === 'diplomacy' ? rest : page.cards).map((c) => (
                  <OutcomeCard key={c.key} c={c} home={home} />
                ))}
              </div>
            )}
            {page.footnotes.map((f) => (
              <section key={f.title} className="db-foot">
                <h4>{f.title}</h4>
                <ul>
                  {f.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </section>
            ))}
            {page.key === 'diplomacy' && !first && <p className="db-summary">A quiet month abroad.</p>}
          </div>
        )}
      </main>

      <footer className="db-foot-bar">
        <span className="db-dots" aria-hidden>
          {pages.map((p, i) => (
            <i key={p.key} className={i === at ? 'on' : i < at ? 'done' : ''} />
          ))}
        </span>
        <span className="db-hint">
          {page.key === 'diplomacy' && page.cards[0]?.country ? `Top story abroad: ${countryName(page.cards[0].country)}` : ''}
        </span>
        <button className="wc-btn primary" onClick={() => go(at + 1)}>
          {at + 1 >= pages.length ? (
            <>
              <IconNews size={16} /> Read the paper
            </>
          ) : (
            <>
              {pages[at + 1].title} <IconChevronRight size={16} />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
