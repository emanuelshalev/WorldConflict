import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowRight, IconChevronRight, IconLayoutList, IconNews } from '@tabler/icons-react';
import type { ConditionStatus, ReportFact, TurnReport, WorldState } from '../store/gameStore';
import { countryName, useGameStore } from '../store/gameStore';
import { buildPages } from '../lib/debrief';
import { monthLabel } from '../lib/format';
import { moodForVerdict } from './kinds';
import { SceneFrame } from './SceneFrame';
import { Stamp } from '../components/game/Stamp';
import { CoachResultLine } from '../components/desk/Coach';
import { Segments } from '../components/desk/GoalLine';
import { metricWord, stepObjective } from '../lib/goals';
import { scoreLine, useScoreWhy } from '../lib/scoreWhy';
import { useModalFocus } from '../lib/useModalFocus';
import { type AfterMonth, readAfterMonth, writeAfterMonth } from '../lib/afterMonth';
import './debrief.css';
import './result.css';

/**
 * The result card (design-month.md 6.2 and 8): the first screen after Execute. What your choice
 * did in one sentence, two or three measured deltas, the mission row that moved, why the score
 * moved, and the front page as a thumbnail. "Next month" goes straight back to the desk; "See
 * everything" opens the debrief pages and "Read the paper" the Chronicle (design-month 9).
 */

const r1 = (v: number) => Math.round(v);

/** A fact as a bar: where it ended on its own scale, the change in words and numbers. */
function DeltaBar({ f }: { f: ReportFact }) {
  const pct = /view|relation/i.test(f.label) ? (f.after + 100) / 2 : Math.max(0, Math.min(100, f.after));
  const d = f.after - f.before;
  const good = /tension/i.test(f.label) ? d <= 0 : (f.good ?? d >= 0);
  return (
    <div className={`rc-delta ${good ? 'good' : 'bad'}`}>
      <div className="rc-delta-top">
        <span>{f.label}</span>
        <span className="num">
          {r1(f.before)} → <b>{r1(f.after)}{f.unit === '%' ? '%' : ''}</b>
          <em>{d > 0 ? '+' : ''}{r1(d)}</em>
        </span>
      </div>
      <div className="rc-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** The mission row that moved most (or this month's step), before and after. */
function missionMove(report: TurnReport, status: ConditionStatus[]): { c: ConditionStatus; before: number; i: number } | null {
  const before = report.missionBefore ?? [];
  let best: { c: ConditionStatus; before: number; i: number; d: number } | null = null;
  status.forEach((c, i) => {
    const b = before[i];
    if (c.now === undefined || b === null || b === undefined) return;
    const d = Math.abs(c.now - b);
    const step = report.stepObjective === i ? 0.5 : 0;
    if (!best || d + step > best.d) best = { c, before: b, i, d: d + step };
  });
  if (best) return best;
  const i = report.stepObjective ?? stepObjective(status);
  const c = status[i];
  return c && c.now !== undefined ? { c, before: c.now, i } : null;
}

export function ResultCard({ report, world, home, onNext, onEverything, onPaper, nextLabel = 'Next month' }: { report: TurnReport; world: WorldState; home: string; onNext: () => void; onEverything: (page?: number) => void; onPaper: () => void; nextLabel?: string }) {
  const status = useGameStore((s) => s.objectiveStatus);
  const pages = useMemo(() => buildPages(report, world), [report, world]);
  const ref = useModalFocus<HTMLDivElement>(true);
  const [after, setAfter] = useState<AfterMonth>(readAfterMonth);
  const nextRef = useRef<HTMLButtonElement>(null);
  const card = pages[0]?.cards[0];
  const h = report.highlight;
  const hd = h?.ref === 'decision' ? report.decisions[h.index] : undefined;
  const ho = h?.ref === 'order' ? report.orders[h.index] : undefined;
  const chose = hd ? hd.choice.replace(/\s*\((no decision taken|you did not attend)\)\s*$/, '') : ho?.label;
  // One tension number everywhere: the month's start and the world's tension now, rounded
  const tension = (f: ReportFact): ReportFact => (/tension/i.test(f.label) && report.tension ? { ...f, before: report.tension.before, after: r1(world.globalTension) } : f);
  // Home stats show the whole month (with the choice/drift split below), so they never disagree
  const STAT = /^(approval|stability|legitimacy)$/i;
  const facts = (card?.facts ?? []).filter((f) => !STAT.test(f.label)).map(tension).slice(0, 2);
  if (facts.length < 3 && report.tension && !facts.some((f) => /tension/i.test(f.label)) && Math.abs(r1(world.globalTension) - report.tension.before) >= 2)
    facts.push({ label: 'World tension', before: report.tension.before, after: r1(world.globalTension), good: r1(world.globalTension) < report.tension.before });
  const appr = report.deltas.approval;
  if (facts.length < 3 && appr && Math.abs(appr.after - appr.before) >= 1 && !facts.some((f) => /approval/i.test(f.label))) facts.push({ label: 'Approval', before: appr.before, after: appr.after, unit: '%' });
  const drift = report.drift?.approval;
  const apprMove = appr ? appr.after - appr.before : 0;
  const mm = missionMove(report, status);
  const followUp = report.followUps?.[0];
  const resolved = report.followUpsResolved?.[0];
  const step = mm && report.stepObjective === mm.i && mm.c.now !== undefined && mm.c.need !== undefined && Math.abs(mm.c.need - mm.c.now) + 2 <= Math.abs(mm.c.need - mm.before);
  const lead = world.newspaper.find((n) => n.relatedCountries.includes(home)) ?? world.newspaper[0];
  const homePage = pages.findIndex((p) => p.key === 'home');
  const also = pages.slice(1).flatMap((p, pi) => p.cards.slice(0, 2).map((c) => ({ c, page: pi + 1 })));
  useEffect(() => nextRef.current?.focus({ preventScroll: true }), []);
  const u = (c: ConditionStatus) => (c.unit === '%' ? '%' : '');
  return (
    <div ref={ref} className="result-overlay" role="dialog" aria-modal="true" aria-label={`${monthLabel(world.date)}: your month`}>
      <article className={`result-card v-${card?.verdict ?? 'neutral'}`} data-settle="result">
        <div className="rc-visual">
          {card?.scene ? <SceneFrame kind={card.scene} home={home} other={card.country} mood={moodForVerdict(card.verdict)} size="card" play={false} /> : <div className="rc-blank" />}
          <span className="rc-date num">{monthLabel(world.date)} · Your month</span>
          {step && (
            <span className="rc-step">
              <Stamp word="STEP ACHIEVED" ink="good" size="md" delay={600} sound />
            </span>
          )}
        </div>
        <div className="rc-body">
          {resolved && (
            <p className="rc-remember">
              Remember {resolved.title}? <b>{resolved.headline}</b>
            </p>
          )}
          <span className="rc-kicker">What your choice did</span>
          {chose && (
            <p className="rc-chose">
              You {ho ? 'ordered' : 'chose'}: <b>{chose}</b>
            </p>
          )}
          <h2 className="rc-sentence">{card?.headline ?? 'A quiet month: the world moved on its own.'}</h2>
          {card?.reaction && (
            <blockquote className={`rc-quote t-${card.reaction.tone}`}>
              <p>“{card.reaction.line.replace(/^'|'$/g, '')}”</p>
              <cite>{card.reaction.who}</cite>
            </blockquote>
          )}
          {facts.length > 0 && (
            <div className="rc-deltas">
              {facts.map((f) => (
                <DeltaBar key={f.label} f={f} />
              ))}
            </div>
          )}
          {appr && drift !== undefined && Math.abs(apprMove) >= 1 && (
            <p className="rc-split num">
              Approval {r1(appr.before)} → {r1(appr.after)}%: your choices {apprMove - drift >= 0 ? '+' : ''}
              {r1(apprMove - drift)}, everything else {drift >= 0 ? '+' : ''}
              {r1(drift)}.{' '}
              {homePage > 0 && (
                <button type="button" className="link" onClick={() => onEverything(homePage)}>
                  Why?
                </button>
              )}
            </p>
          )}
          {followUp && <p className="rc-later">The outcome of {followUp.title} comes in {Math.max(1, followUp.due - world.turn)} month{followUp.due - world.turn > 1 ? 's' : ''}; we will tell you.</p>}
          {mm && mm.c.now !== undefined && (
            <button type="button" className="rc-mission" onClick={() => useGameStore.getState().setDrawer('objective')}>
              <span>
                Mission{['front', 'score'].includes(metricWord(mm.c)) || mm.c.unit === 'view' ? ` (${mm.c.short ?? ''})` : ''}: <b>{metricWord(mm.c)} {r1(mm.before)} → {r1(mm.c.now)}{u(mm.c)}</b>
                {mm.c.need !== undefined ? `, needs ${r1(mm.c.need)}${u(mm.c)}.` : '.'}
              </span>
              <Segments status={status} size="lg" />
            </button>
          )}
          {report.score && (
            <p className="rc-score">
              {scoreLine(report.score)}{' '}
              <button type="button" className="link" onClick={() => useScoreWhy.getState().show(true)}>
                Why your score moved
              </button>
            </p>
          )}
          {lead && (
            <button type="button" className="rc-paper" onClick={onPaper}>
              <span className="rc-masthead">The World Chronicle</span>
              <span className="rc-headline">{lead.headline}</span>
            </button>
          )}
          <CoachResultLine />
          {also.length > 0 && (
            <div className="rc-also" aria-label="Also this month">
              {also.slice(0, 4).map(({ c, page }) => (
                <button key={c.key} type="button" className={`rc-chip v-${c.verdict}`} onClick={() => onEverything(page)}>
                  {c.country && !c.headline.includes(countryName(c.country)) ? `${countryName(c.country)}: ` : ''}
                  {c.headline.length > 54 ? `${c.headline.slice(0, 52)}...` : c.headline}
                  <IconChevronRight size={14} aria-hidden />
                </button>
              ))}
            </div>
          )}
          <footer className="rc-foot">
            <button type="button" className="wc-btn rc-secondary" onClick={() => onEverything(0)}>
              <IconLayoutList size={16} aria-hidden /> See everything
            </button>
            <button type="button" className="link rc-read" onClick={onPaper}>
              <IconNews size={15} aria-hidden /> Read the paper
            </button>
            <button ref={nextRef} type="button" className="wc-btn primary rc-next" onClick={onNext}>
              {nextLabel} <IconArrowRight size={17} aria-hidden />
            </button>
          </footer>
          <label className="rc-after">
              After each month:
              <select
                value={after}
                onChange={(e) => {
                  const v = e.target.value as AfterMonth;
                  setAfter(v);
                  writeAfterMonth(v);
                }}
              >
                <option value="result">Result card only</option>
                <option value="details">Result card and details</option>
                <option value="everything">Everything</option>
              </select>
            </label>

        </div>
      </article>
    </div>
  );
}
