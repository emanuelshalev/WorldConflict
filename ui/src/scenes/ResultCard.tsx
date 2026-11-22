import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowRight, IconChevronDown, IconChevronRight, IconChevronUp, IconLayoutList, IconNews } from '@tabler/icons-react';
import { monthScene } from '../lib/monthArt';
import type { ConditionStatus, ReportFact, TurnReport, WorldState } from '../store/gameStore';
import { countryName, useGameStore } from '../store/gameStore';
import { buildPages, yourMoveCard } from '../lib/debrief';
import { resultBig } from '../lib/outcome';
import { StatusLine } from './OutcomeCard';
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
import { factTone, fmtValue, shownDelta, signed, splitMonth } from '../lib/numbers';
import './debrief.css';
import './result.css';
import { ExplainText } from '../components/learn/ExplainText';

/**
 * The result card (design-month.md 6.2 and 8): the first screen after Execute. What your choice
 * did in one sentence, two or three measured deltas, the mission row that moved, why the score
 * moved, and the front page as a thumbnail. "Next month" goes straight back to the desk; "See
 * everything" opens the debrief pages and "Read the paper" the Chronicle (design-month 9).
 */

const r1 = (v: number) => Math.round(v);

/**
 * A fact as a bar: where it ended on its own scale, the change in words and numbers. The bar, the
 * number and the chip share one colour: good or bad for you (lib/numbers.ts), never the bare sign.
 * A month stat in the choice box is the choice's share, shown as a signed change with no bar.
 */
function DeltaBar({ f }: { f: ReportFact }) {
  const pct = /view|relation/i.test(f.label) ? (f.after + 100) / 2 : Math.max(0, Math.min(100, f.after));
  const tone = factTone(f);
  const d = shownDelta(f.before, f.after, f.unit, f.share);
  if (f.share)
    return (
      <div className={`rc-delta share ${tone}`}>
        <div className="rc-delta-top">
          <span>{/ from your move$/.test(f.label) ? f.label : `${f.label}, from this choice`}</span>
          <span className="num">
            <em>{tone === 'flat' ? 'no change' : signed(d)}</em>
          </span>
        </div>
      </div>
    );
  return (
    <div className={`rc-delta ${tone}`}>
      <div className="rc-delta-top">
        <span>{f.label}</span>
        <span className="num">
          {fmtValue(f.before, f.unit)} → <b>{fmtValue(f.after, f.unit)}{f.unit === '%' ? '%' : ''}</b>
          {tone !== 'flat' && <em>{signed(d)}</em>}
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
  // "What your choice did" is the engine's yourMove (F-02-2, QA S2-1): the player's own decision
  // or order. The month's highlight can be a front that moved on its own; it is never told as
  // the choice, and gets its own "not from your choice" line below.
  const own = useMemo(() => yourMoveCard(report), [report]);
  const card = own ?? pages[0]?.cards[0];
  const h = report.yourMove ?? (report.highlight?.ref !== 'war' ? report.highlight : undefined);
  const hd = h?.ref === 'decision' ? report.decisions[h.index] : undefined;
  const ho = h?.ref === 'order' ? report.orders[h.index] : undefined;
  const warHl = report.highlight?.ref === 'war' ? report.wars?.[report.highlight.index] : undefined;
  const meanwhile = own && warHl ? warHl : undefined;
  const chose = hd ? hd.choice.replace(/\s*\((no decision taken|you did not attend)\)\s*$/, '') : ho?.label;
  // "What your choice did" shows only what the choice itself moved (its own measured facts; month
  // stats as its share). The month's totals, which include everyone else's moves, sit on their own
  // line below, so tension from someone else's nuclear test is never credited to your order.
  const facts = (card?.facts ?? []).slice(0, 3);
  const appr = report.deltas.approval;
  const drift = report.drift?.approval;
  const split = appr && drift !== undefined ? splitMonth(appr.before, appr.after, drift) : null;
  const tensionNow = r1(world.globalTension);
  const tensionMove = report.tension ? tensionNow - report.tension.before : 0;
  const tensionCause = report.causes.find((c) => /tension|nuclear|war|strike|test/i.test(c));
  const mm = missionMove(report, status);
  const followUp = report.followUps?.[0];
  const resolved = report.followUpsResolved?.[0];
  const step = mm && report.stepObjective === mm.i && mm.c.now !== undefined && mm.c.need !== undefined && Math.abs(mm.c.need - mm.c.now) + 2 <= Math.abs(mm.c.need - mm.before);
  const lead = world.newspaper.find((n) => n.relatedCountries.includes(home)) ?? world.newspaper[0];
  const homePage = pages.findIndex((p) => p.key === 'home');
  const also = pages.slice(1).flatMap((p, pi) => p.cards.slice(0, 2).map((c) => ({ c, page: pi + 1 })));
  useEffect(() => nextRef.current?.focus({ preventScroll: true }), []);
  // One big visual outcome on the picture (the month's lead number), the art chosen by what
  // happened (lib/monthArt, shared with the paper), the rest one tap away
  const saveId = useGameStore((s) => s.saveId);
  const scene = useMemo(() => monthScene(report, world, saveId) ?? card?.scene, [report, world, saveId, card?.scene]);
  const lead0 = facts[0];
  const big = lead0 && Math.abs(lead0.after - lead0.before) >= 1 ? (() => {
    const delta = lead0.after - lead0.before;
    const { good, word } = resultBig(lead0, card?.status);
    return { delta, good, word, label: lead0.label };
  })() : null;
  const [moreOpen, setMoreOpen] = useState(false);
  const u = (c: ConditionStatus) => (c.unit === '%' ? '%' : '');
  return (
    <div ref={ref} className="result-overlay" role="dialog" aria-modal="true" aria-label={`${monthLabel(world.date)}: your month`}>
      <article className={`result-card v-${card?.verdict ?? 'neutral'}`} data-settle="result">
        <div className="rc-visual">
          {scene ? <SceneFrame kind={scene} home={home} other={card?.country} mood={moodForVerdict(card?.verdict)} size="card" play={false} /> : <div className="rc-blank" />}
          <span className="rc-date num">{monthLabel(world.date)} · Your month</span>
          {big && (
            <div className={`rc-big ${big.good ? 'good' : 'bad'}`} data-result-big="">
              <span className="rc-big-word">{big.word}</span>
              <span className="rc-big-num num">
                {big.delta > 0 ? '+' : ''}
                {r1(big.delta)}
              </span>
              <span className="rc-big-label">{big.label}</span>
            </div>
          )}
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
          <span className="rc-kicker">{own ? 'What your choice did' : 'The month'}</span>
          {chose && (
            <p className="rc-chose">
              You {ho ? 'ordered' : 'chose'}: <b>{chose}</b>
            </p>
          )}
          <h2 className="rc-sentence">{card?.headline ?? 'A quiet month: the world moved on its own.'}</h2>
          {own?.status && <StatusLine status={own.status} reason={own.reason} />}
          {meanwhile && (
            <p className="rc-meanwhile" data-result-meanwhile="">
              Not from your choice:{' '}
              {meanwhile.ended
                ? `the war with ${countryName(meanwhile.vs)} is over`
                : meanwhile.frontAfter >= meanwhile.frontBefore
                  ? `your forces gain ground against ${countryName(meanwhile.vs)}`
                  : `${countryName(meanwhile.vs)} pushes your forces back`}{' '}
              (front {meanwhile.frontBefore} → {meanwhile.frontAfter}).
            </p>
          )}
          {card?.reaction && (
            <blockquote className={`rc-quote t-${card.reaction.tone}`}>
              <p>
                “<ExplainText text={card.reaction.line.replace(/^'|'$/g, '')} where={card.headline} />”
              </p>
              <cite>{card.reaction.who}</cite>
            </blockquote>
          )}
          {mm && mm.c.now !== undefined && (
            <button type="button" className="rc-mission" onClick={() => useGameStore.getState().setDrawer('objective')}>
              <span>
                Mission{['front', 'score'].includes(metricWord(mm.c)) ? ` (${mm.c.short ?? ''})` : ''}: <b>{metricWord(mm.c)} {r1(mm.before)} → {r1(mm.c.now)}{u(mm.c)}</b>
                {mm.c.need !== undefined ? `, needs ${r1(mm.c.need)}${u(mm.c)}.` : '.'}
              </span>
              <Segments status={status} size="lg" />
            </button>
          )}
          <CoachResultLine />
          <button type="button" className="rc-more-toggle" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-controls="rc-more" data-result-more="">
            {moreOpen ? <IconChevronUp size={16} aria-hidden /> : <IconChevronDown size={16} aria-hidden />} {moreOpen ? 'Fewer details' : 'The numbers, the score and the rest of the month'}
          </button>
          {moreOpen && (
          <div className="rc-more" id="rc-more">
          {facts.length > 0 && (
            <div className="rc-deltas">
              {facts.map((f) => (
                <DeltaBar key={f.label} f={f} />
              ))}
            </div>
          )}
          {((appr && split && split.total !== 0) || (report.tension && Math.abs(tensionMove) >= 2)) && (
            <p className="rc-split num">
              <span className="rc-split-k">This month, all moves:</span>{' '}
              {appr && split && split.total !== 0 && (
                <>
                  approval {r1(appr.before)} → {r1(appr.after)}% ({signed(split.total)}: all your choices together {signed(split.yours)}, everything else {signed(split.rest)}).{' '}
                </>
              )}
              {report.tension && Math.abs(tensionMove) >= 2 && (
                <>
                  World tension {report.tension.before} → {tensionNow}
                  {tensionCause ? ` (${tensionCause.charAt(0).toLowerCase()}${tensionCause.slice(1).replace(/\.$/, '')})` : ''}.{' '}
                </>
              )}
              {homePage > 0 && (
                <button type="button" className="link" onClick={() => onEverything(homePage)}>
                  Why?
                </button>
              )}
            </p>
          )}
          {followUp && <p className="rc-later">The outcome of {followUp.title} comes in {Math.max(1, followUp.due - world.turn)} month{followUp.due - world.turn > 1 ? 's' : ''}; we will tell you.</p>}
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
        </div>
      </article>
    </div>
  );
}
