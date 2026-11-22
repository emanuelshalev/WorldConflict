import { useEffect, useState } from 'react';
import { countryName, useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, money, monthLabel } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { MonthDebrief } from '../scenes/MonthDebrief';
import { ResultCard } from '../scenes/ResultCard';
import { readAfterMonth } from '../lib/afterMonth';
import { bigMomentFor } from '../lib/moments';
import { BigMoment } from './BigMoment';
import { useCoach } from '../lib/coach';
import '../scenes/result.css';
import { SceneFrame } from '../scenes/SceneFrame';
import { sceneForAction, sceneForCrisis, sceneForNews } from '../scenes/kinds';
import { ExplainText } from './learn/ExplainText';
import { monthScene } from '../lib/monthArt';
import { STATUS_WORD, statusOf } from '../lib/outcome';
import type { OutcomeStatus } from '../store/gameStore';

const MOMENT_COLOR: Record<string, string> = {
  'CLOSE CALL': '#b3261e',
  'TRAILING IN THE POLLS': '#b3261e',
  COMEBACK: '#1e7d4f',
  'UNDER ATTACK': '#b3261e',
  'NEW ALLIANCE': '#1f3a5f',
};

/** Full-width red "BREAKING" bar for wars, coups and nuclear events. */
export function Stinger() {
  const events = useGameStore((s) => s.lastEvents);
  const showChronicle = useGameStore((s) => s.showChronicle);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const critical = events.find(
    (e) => e.severity === 'CRITICAL' && ['WAR', 'NUCLEAR', 'GOVERNMENT', 'COVERT'].includes(e.type),
  );
  useEffect(() => {
    if (!critical) return;
    document.querySelector('.game')?.classList.add('shake');
    const t = setTimeout(() => document.querySelector('.game')?.classList.remove('shake'), 300);
    const auto = setTimeout(() => setDismissed(critical.id), 2600);
    return () => {
      clearTimeout(t);
      clearTimeout(auto);
    };
  }, [critical]);
  const world = useGameStore.getState().worldState;
  if (!critical || !showChronicle || dismissed === critical.id) return null;
  if (world && bigMomentFor(world.turnReport, world)) return null;
  return (
    <div className="stinger" onClick={() => setDismissed(critical.id)} role="alert">
      <small>BREAKING NEWS</small>
      <b>{critical.title}</b>
    </div>
  );
}

type Stage = 'moment' | 'result' | 'details' | 'paper';
interface Flow {
  turn: number;
  stage: Stage;
  page: number;
  seenDetails: boolean;
  seenPaper: boolean;
  momentDone: boolean;
}

/**
 * After Execute (design-month.md 9): the big-moment stinger when there is one, then the result
 * card, then the desk. Two screens in the common case. "See everything" opens the debrief pages,
 * "Read the paper" the Chronicle; both have "Next month". The paper opens by itself only on a big
 * moment month, or when the player asked for everything after each month.
 */
export function Chronicle() {
  const show = useGameStore((s) => s.showChronicle);
  const setShow = useGameStore((s) => s.setShowChronicle);
  const world = useGameStore((s) => s.worldState);
  const statements = useGameStore((s) => s.leaderStatements);
  const notice = useGameStore((s) => s.aiNotice);
  const gameOver = useGameStore((s) => s.gameOver);
  const openModal = useGameStore((s) => s.openModal);
  const me = usePlayerCountry();
  const [flowState, setFlowState] = useState<Flow | null>(null);
  const report0 = world?.turnReport;
  const hasContent = !!report0 && (report0.orders.length > 0 || report0.decisions.length > 0);
  const moment = show && world && report0 ? bigMomentFor(report0, world) : null;
  const flow: Flow | null = world
    ? flowState?.turn === world.turn
      ? flowState
      : { turn: world.turn, stage: moment ? 'moment' : hasContent ? 'result' : 'paper', page: 0, seenDetails: false, seenPaper: false, momentDone: false }
    : null;
  const paperOpen = !!(show && world && me && flow?.stage === 'paper');
  const ref = useModalFocus<HTMLDivElement>(paperOpen);
  const close = () => {
    setShow(false);
    if (useCoach.getState().step === 'result') useCoach.getState().finish();
    if (gameOver) openModal('endGame');
  };
  // Escape closes the paper (B-13), however it was opened
  useEffect(() => {
    if (!paperOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setShow(false);
      if (useCoach.getState().step === 'result') useCoach.getState().finish();
      if (useGameStore.getState().gameOver) useGameStore.getState().openModal('endGame');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [paperOpen, setShow]);
  if (!show || !world || !me || !flow) return null;
  const to = (patch: Partial<Flow>) => setFlowState({ ...flow, ...patch });
  const bigMonth = !!report0 && (report0.moments.length > 0 || (report0.wars ?? []).some((w) => w.ended) || !!moment);
  const afterResult = () => {
    const after = readAfterMonth();
    if (after !== 'result' && !flow.seenDetails && hasContent) to({ stage: 'details', page: 0, seenDetails: true });
    else if ((after === 'everything' || bigMonth) && !flow.seenPaper) to({ stage: 'paper', seenPaper: true });
    else close();
  };
  if (flow.stage === 'moment' && moment && !flow.momentDone)
    return (
      <BigMoment
        moment={moment}
        onDone={() => {
          if (moment.ending && gameOver) close();
          else to({ stage: hasContent ? 'result' : 'paper', momentDone: true, seenPaper: !hasContent });
        }}
      />
    );
  if ((flow.stage === 'result' || flow.stage === 'moment') && report0 && hasContent)
    return (
      <ResultCard
        report={report0}
        world={world}
        home={me.id}
        onNext={afterResult}
        onEverything={(page = 0) => to({ stage: 'details', page, seenDetails: true })}
        onPaper={() => to({ stage: 'paper', seenPaper: true })}
        nextLabel={gameOver ? 'See your verdict' : 'Next month'}
      />
    );
  if (flow.stage === 'details' && report0)
    return (
      <MonthDebrief
        key={`${world.turn}-${flow.page}`}
        report={report0}
        world={world}
        home={me.id}
        initialPage={flow.page}
        onDone={() => to({ stage: 'paper', seenPaper: true })}
        onBack={() => to({ stage: 'result' })}
        onNext={close}
        nextLabel={gameOver ? 'See your verdict' : 'Next month'}
      />
    );

  const news = world.newspaper;
  const lead = news.find((n) => n.relatedCountries.includes(me.id)) ?? news[0];
  const rest = news.filter((n) => n !== lead).slice(0, 8);
  const report = world.turnReport;
  // The lead is the month's highlight: illustrate it with that item's own scene
  const hl = report?.highlight;
  const hd = hl?.ref === 'decision' ? report?.decisions[hl.index] : undefined;
  const ho = hl?.ref === 'order' ? report?.orders[hl.index] : undefined;
  // The same picture as the result card when the lead is your month (lib/monthArt)
  const shared = lead?.relatedCountries.includes(me.id) && report && (hd || ho) ? monthScene(report, world, useGameStore.getState().saveId) : undefined;
  const leadScene = shared ?? (lead?.relatedCountries.includes(me.id)
    ? hd
      ? hd.kind === 'CALL' || hd.kind === 'VISIT'
        ? 'summit'
        : hd.kind === 'STAFF'
          ? 'cabinet'
          : hd.kind === 'PRESS'
            ? 'tv_interview'
            : sceneForCrisis(hd.templateId, hd.title)
      : ho?.type
        ? sceneForAction(ho.type)
        : hl?.ref === 'war'
          ? 'war_room'
          : undefined
    : undefined);
  const delta = (k: string) => (report?.deltas[k] ? report.deltas[k].after - report.deltas[k].before : 0);
  const fmt = (v: number, suffix = '') => (
    <b className={v > 0.4 ? 'delta-up' : v < -0.4 ? 'delta-down' : ''} style={{ color: Math.abs(v) <= 0.4 ? undefined : undefined }}>
      {v > 0 ? '+' : ''}
      {v.toFixed(Math.abs(v) < 10 ? 1 : 0)}
      {suffix}
    </b>
  );
  return (
    <div ref={ref} className="overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Monthly report">
      <button type="button" className="wc-btn primary paper-next" onClick={(e) => {
          e.stopPropagation();
          close();
        }}>
        {gameOver ? 'See your verdict' : 'Next month'} ▸
      </button>
      <article className="paper" onClick={(e) => e.stopPropagation()}>
        <div className="masthead">
          <h2>The World Chronicle</h2>
          <div className="dateline">
            <span>{monthLabel(world.date)}</span>
            <span>
              World tension {Math.round(world.globalTension)} of 100
            </span>
            <span>
              Month {world.turn} of {world.maxTurns}
            </span>
          </div>
        </div>

        {lead && (
          <div className="lead">
            <SceneFrame
              kind={leadScene ?? sceneForNews(lead.category, lead.headline)}
              home={me.id}
              other={lead.relatedCountries.find((id) => id !== me.id)}
              mood={['WAR', 'NUCLEAR'].includes(lead.category) ? 'bad' : 'neutral'}
              size="card"
            />
            <div className="story">
              <span className="kicker">{lead.category}</span>
            </div>
            <h3>{lead.headline}</h3>
            {(() => {
              // The engine's lead carries a quote "Who: ..." and a "What next:" line: lay them out
              const hl = report?.highlight;
              const src = hl?.ref === 'decision' ? report?.decisions[hl.index] : hl?.ref === 'order' ? report?.orders[hl.index] : undefined;
              const r = src?.reaction;
              const quoteText = r ? `${r.who}: "${r.line.replace(/^'|'$/g, '').replace(/"/g, "'")}"` : '';
              const [body, next] = lead.description.replace(quoteText, '').split(' What next: ');
              return (
                <>
                  <ExplainText as="p" className="lede" text={body.replace(/\s{2,}/g, ' ').trim()} info where={lead.headline} />
                  {r && lead.relatedCountries.includes(me.id) && (
                    <blockquote className="pull">
                      “{r.line.replace(/^'|'$/g, '')}”<cite>{r.who}</cite>
                    </blockquote>
                  )}
                  {next && <p className="next">What next: {next}</p>}
                </>
              );
            })()}
          </div>
        )}

        {report && (
          <div className="your-month">
            <h4>
              {flag(me.id)} YOUR MONTH IN {me.name.toUpperCase()}
            </h4>
            <div className="deltas">
              <div>
                Approval
                {fmt(delta('approval'))}
              </div>
              <div>
                Stability
                {fmt(delta('stability'))}
              </div>
              <div>
                Legitimacy
                {fmt(delta('legitimacy'))}
              </div>
              <div>
                GDP
                <b>{money(report.deltas.gdp?.after ?? me.gdp)}</b>
              </div>
              <div>
                Score
                {fmt(delta('score'))}
              </div>
            </div>
            {report.moments.map((m) => (
              <span key={m} className="moment-stamp" style={{ color: MOMENT_COLOR[m] === '#1e7d4f' ? 'var(--good)' : m === 'NEW ALLIANCE' ? 'var(--intel)' : '#ff6b6d' }}>
                {m}
              </span>
            ))}
            {/* What became of each of your orders and answers, in the engine's words (F-02-2) */}
            {(() => {
              const items = [
                ...report.decisions.filter((d) => d.attended !== false).map((d) => ({ label: d.choice.replace(/\s*\((no decision taken|you did not attend)\)\s*$/, ''), s: statusOf(d), why: d.reason })),
                ...report.orders.map((o) => ({ label: o.label, s: statusOf(o), why: o.reason })),
              ].filter((x) => x.s).slice(0, 6);
              return items.length > 0 ? (
                <ul className="paper-status" aria-label="Your orders and answers">
                  {items.map((x, i) => (
                    <li key={`${x.label}-${i}`} data-status={x.s} title={x.why}>
                      <b className={`s-${(x.s as string).toLowerCase()}`}>{STATUS_WORD[x.s as OutcomeStatus]}</b> {x.label}
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
          </div>
        )}

        <div className="paper-cols">
          {rest.map((n, i) => (
            <div className="story" key={`${n.headline}-${i}`}>
              {i < 3 && (
                <SceneFrame kind={sceneForNews(n.category, n.headline)} home={n.relatedCountries[0]} other={n.relatedCountries[1]} size="thumb" />
              )}
              <span className="kicker">
                {n.category} {n.relatedCountries.slice(0, 2).map((id) => flag(id)).join(' ')}
              </span>
              <h4>{n.headline}</h4>
              <ExplainText as="p" text={n.description} info where={n.headline} />
            </div>
          ))}
          {statements.map((s) => (
            <div className="story" key={s.countryId}>
              <span className="kicker">STATEMENT {flag(s.countryId)}</span>
              <h4>{s.leader}</h4>
              <p>“{s.text}”: {countryName(s.countryId)}</p>
            </div>
          ))}
        </div>
        {notice && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8a2a1c' }}>{notice}</p>}

        <div className="paper-foot">
          <button type="button" className="wc-btn primary big" onClick={close}>
            {gameOver ? 'See your verdict ▸' : 'Next month ▸'}
          </button>
        </div>
      </article>
    </div>
  );
}

/** Red heartbeat vignette when the player is in danger. */
export function DangerVignette() {
  const world = useGameStore((s) => s.worldState);
  const me = usePlayerCountry();
  const decisions = useGameStore((s) => s.pendingDecisions);
  if (!world || !me || world.gameOver) return null;
  const low = Math.min(me.approval, me.stability, me.legitimacy);
  const plot = decisions.some((d) => ['coup_plot', 'streets_boiling'].includes(d.templateId));
  if (low >= 28 && !plot) return null;
  return <div className="vignette" aria-hidden />;
}
