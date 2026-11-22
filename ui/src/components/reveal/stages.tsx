import { useEffect, useState, type CSSProperties } from 'react';
import { SceneFrame } from '../../scenes/SceneFrame';
import type { DeclassifiedCard as DeclassifiedData, MomentView, RevealPayload, RelationRow as RelationData, SeriesView, TruthVerdict } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { sound } from '../../lib/sound';
import { useCountUp } from '../../lib/useCountUp';
import { seatName, type StoredRun } from '../../lib/runs';
import { tierRank } from './sealArt';
import { GradeBox, VerdictStamp } from './VerdictStamp';
import { SealCard } from './Seal';
import { MiniChart, SeriesTable, type ChartSeries } from './MiniChart';
import { useWidth } from './useWidth';
import {
  cellsFor,
  countLine,
  fmtValue,
  lastMonthLabel,
  END_SCENE,
  monthLetters,
  momentsHeadline,
  seenHeadline,
  seriesColor,
  signed,
  spanLabel,
} from './model';

export interface StageProps {
  r: RevealPayload;
  /** Play entrance motion (false: final state, for reduced motion and the report). */
  animate: boolean;
  /** Your best earlier run on this seat (ghost line, record ribbon). */
  ghost: StoredRun | null;
}


const CELL_WORD = { g: 'steady', y: 'strained', r: 'on the edge', x: 'fell' } as const;

function Kicker({ children, tone }: { children: React.ReactNode; tone?: 'intel' }) {
  return <div className={`rv-caps rv-kicker ${tone ? `tone-${tone}` : ''}`}>{children}</div>;
}

// ---------------------------------------------------------------------------------------
// 0 The count
// ---------------------------------------------------------------------------------------

export function CountStage({ r, animate, scene = true }: StageProps & { scene?: boolean }) {
  const cells = cellsFor(r);
  const letters = monthLetters(r);
  const lost = !r.verdict.victory;
  useEffect(() => {
    if (!animate) return;
    const t = window.setTimeout(() => sound.play('page'), 140 * cells.length + 200);
    return () => window.clearTimeout(t);
  }, [animate, cells.length]);
  return (
    <section className="rv-stage rv-count" aria-labelledby="rv-h-count">
      <Kicker>
        {r.seat.flashpointId ? `${seatName(r.seat.seatKey)} · ` : `${r.seat.title} · `}
        {r.seat.countryName} · {lastMonthLabel(r)} · Month {cells.length} of {r.seat.maxTurns}
      </Kicker>
      <h1 id="rv-h-count" className="rv-h1">
        The record is sealed.
      </h1>
      {scene && (
        <div className="rv-scene">
          <SceneFrame
            kind={END_SCENE[r.verdict.reason ?? ''] ?? (lost ? 'streets' : 'address')}
            home={r.seat.countryId}
            mood={lost ? 'bad' : 'good'}
            size="card"
            live={animate}
            play={animate}
            kicker="Counting the verdict of history"
            headline={countLine(r)}
          />
          <p className="rv-countline">{countLine(r)}</p>
        </div>
      )}
      <ol className="rv-strip" aria-label={`One square per month: ${cells.map((c, i) => `month ${i + 1} ${CELL_WORD[c]}`).join(', ')}`}>
        {cells.map((c, i) => (
          <li
            key={i}
            className={`c-${c} ${i === cells.length - 1 ? 'cur' : ''} ${animate ? 'rv-fill' : ''}`}
            style={animate ? ({ animationDelay: `${i * 140}ms` } as CSSProperties) : undefined}
          >
            <span>{letters[i]}</span>
          </li>
        ))}
      </ol>
      <p className="rv-hint">Each square is a month: green steady, amber strained, red on the edge{lost ? ', black the fall' : ''}.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 1 The verdict
// ---------------------------------------------------------------------------------------

export function ScoreTally({ r, animate, best }: { r: RevealPayload; animate: boolean; best: number | null }) {
  const p = r.presidency;
  const shown = Math.round(useCountUp(p.total, animate ? 900 : 1, animate ? 1300 : 0));
  const record = best !== null && p.total > best;
  return (
    <div className="rv-card rv-tally">
      <div className="rv-caps">Presidency score</div>
      <div className="rv-total">
        <span className="rv-total-n num" aria-label={`${p.total} out of 1000`}>
          {animate ? shown : p.total}
        </span>
        <span className="rv-total-of num">/ 1000</span>
        {record && <span className="rv-ribbon">▲ New personal best {signed(p.total - (best ?? 0))}</span>}
        {best !== null && !record && <span className="rv-ribbon muted">Your best on this seat: {best}</span>}
      </div>
      <ul className="rv-parts">
        {p.parts.map((part, i) => (
          <li key={part.id} className="rv-part">
            <div className="rv-caps">{part.label}</div>
            <div className="rv-bar" aria-hidden>
              <b
                className={animate ? 'rv-grow' : ''}
                style={{ '--w': Math.max(0, Math.min(1, part.value / part.max)), animationDelay: animate ? `${1400 + i * 220}ms` : undefined } as CSSProperties}
              />
            </div>
            <div className="rv-part-v num">
              {part.value} <small>/ {part.max}</small>
            </div>
            <p>{part.detail}</p>
          </li>
        ))}
      </ul>
      {p.modifier.kind !== 'NONE' && (
        <p className="rv-modifier">
          {p.modifier.label || (p.modifier.kind === 'NUCLEAR' ? 'Nuclear war: the score is zero' : `Lost office: parts x${p.modifier.factor}`)} · parts add to {p.raw}, x{p.modifier.factor} is {p.total}
        </p>
      )}
    </div>
  );
}

export function VerdictStage({ r, animate, ghost }: StageProps) {
  const best = r.ranking.personalBest ?? ghost?.presidencyScore ?? null;
  return (
    <section className="rv-stage rv-verdict" aria-labelledby="rv-h-verdict">
      <div className="rv-verdict-wrap">
        <div>
          <VerdictStamp label={r.verdict.label} victory={r.verdict.victory} reason={r.verdict.reason} animate={animate} />
          <h1 id="rv-h-verdict" className="rv-h1 rv-verdict-title">
            <span aria-hidden>{flag(r.seat.countryId)} </span>
            {r.seat.title}
          </h1>
          <div className="rv-lead">
            {r.seat.leader || r.seat.countryName}
            {r.verdict.classification ? (
              <>
                {' · '}
                <b>{r.verdict.classification}</b>
              </>
            ) : null}
          </div>
          {r.verdict.missedLine && (
            <p className="rv-missed" role="note">
              {r.verdict.missedLine}
            </p>
          )}
          <p className="rv-body">
            {[r.verdict.description, r.verdict.justification]
              .filter(Boolean)
              .map((t) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`))
              .join(' ')}
          </p>
        </div>
        <GradeBox grade={r.verdict.grade} stars={r.verdict.stars} animate={animate} />
      </div>
      <ScoreTally r={r} animate={animate} best={best} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 2 Achievements
// ---------------------------------------------------------------------------------------

export function AchievementsStage({ r, animate }: StageProps) {
  const [all, setAll] = useState(!animate);
  // Good seals rarest last (tier, then measured rate), then infamy seals in red
  const rarity = (a: (typeof r.achievements.earned)[number]) => tierRank(a.tier) + (1 - (a.rate ?? 0.5));
  const good = r.achievements.earned.filter((a) => !a.infamy).sort((a, b) => rarity(a) - rarity(b));
  const earned = [...good, ...r.achievements.earned.filter((a) => a.infamy)];
  // At most 8 on stage: the rarest good seals (still rarest last), then infamy; "+N more" adds the rest
  const shown = all
    ? earned
    : (() => {
        const bad = earned.filter((a) => a.infamy).slice(0, 3);
        const keep = new Set(
          earned
            .filter((a) => !a.infamy)
            .map((a, i) => ({ a, i }))
            .sort((x, y) => tierRank(y.a.tier) - tierRank(x.a.tier) || (x.a.rate ?? 0) - (y.a.rate ?? 0) || y.i - x.i)
            .slice(0, 8 - bad.length)
            .map((x) => x.a.id),
        );
        return [...good.filter((a) => keep.has(a.id)), ...bad];
      })();
  useEffect(() => {
    if (!animate) return;
    const n = Math.min(8, earned.length);
    const ts = Array.from({ length: n }, (_, i) => window.setTimeout(() => sound.play('stamp'), 220 + i * 260));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [animate, earned.length]);
  return (
    <section className="rv-stage rv-ach" aria-labelledby="rv-h-ach">
      <Kicker>
        Achievements · {good.length} earned · {earned.length - good.length} infamy
      </Kicker>
      <h2 id="rv-h-ach" className="rv-h2">
        What you will be remembered for
      </h2>
      {earned.length === 0 ? (
        <p className="rv-body">No seals this time. The two below were within reach.</p>
      ) : (
        <ul className="rv-seals">
          {shown.map((a, i) => (
            <SealCard key={a.id} a={a} order={animate && i < 8 ? i : null} />
          ))}
        </ul>
      )}
      {earned.length > 8 && (
        <button type="button" className="rv-link" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? 'Show fewer' : `+${earned.length - 8} more`}
        </button>
      )}
      {r.achievements.locked.length > 0 && (
        <>
          <div className="rv-caps rv-sub">Within reach next time</div>
          <ul className="rv-seals locked">
            {r.achievements.locked.map((a) => (
              <SealCard key={a.id} a={a} locked />
            ))}
          </ul>
        </>
      )}
      <p className="rv-hint">
        {r.achievements.catalogue} seals in the catalogue. Rarity is measured: the share of simulated leaders who earn it.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 3 The moments
// ---------------------------------------------------------------------------------------

interface AxisMark {
  month: number;
  color: string;
  big: boolean;
  label: string;
  tone: 'good' | 'bad' | 'gold';
}

export function MomentAxis({ r, animate }: { r: RevealPayload; animate: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const months = Math.max(1, r.moments.months);
  const marks: AxisMark[] = [];
  const add = (m: MomentView | null, color: string, big: boolean, tone: AxisMark['tone'], label?: string) => {
    if (!m || marks.some((x) => x.month === m.month && x.big >= big)) return;
    const i = marks.findIndex((x) => x.month === m.month);
    if (i >= 0) marks.splice(i, 1);
    marks.push({ month: m.month, color, big, label: label ?? m.title, tone });
  };
  for (const m of r.moments.well) add(m, '#56c596', false, 'good');
  for (const m of r.moments.bad) add(m, '#e5383b', false, 'bad');
  add(r.moments.best, '#f2a93b', true, 'gold');
  add(r.moments.worst, '#e5383b', true, 'bad');
  const tp = r.moments.turningPoint;
  if (tp && !marks.some((m) => m.month === tp.month)) marks.push({ month: tp.month, color: '#f2a93b', big: false, label: 'Turning point', tone: 'gold' });
  marks.sort((a, b) => a.month - b.month);
  const narrow = w < 560;
  const H = narrow ? 150 : 160;
  const y = 72;
  const pad = 26;
  const x = (m: number) => pad + (months <= 1 ? 0 : ((m - 1) * (w - pad * 2)) / (months - 1));
  const every = months > 24 ? Math.ceil(months / 12) : months > 12 && narrow ? 3 : narrow && months > 8 ? 2 : 1;
  const short = (s: string, big: boolean) => {
    const max = narrow ? (big ? 22 : 16) : big ? 40 : 26;
    return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
  };
  return (
    <div className="rv-card rv-axiscard">
      <div ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label={`Month axis: ${marks.map((m) => `month ${m.month} ${m.label}`).join(', ')}`}>
          <line x1={pad} x2={w - pad} y1={y} y2={y} className="rv-axis-line" />
          {Array.from({ length: months }, (_, i) => i + 1).map((m) =>
            (m - 1) % every === 0 || m === months ? (
              <g key={m}>
                <line x1={x(m)} x2={x(m)} y1={y - 5} y2={y + 5} className="rv-axis-line" />
                <text x={x(m)} y={y + 24} textAnchor="middle" className="rv-axis">
                  {m}
                </text>
              </g>
            ) : null,
          )}
          {marks.map((m, k) => {
            const r0 = m.big ? 11 : 7;
            const up = k % 2 === 0;
            const showLabel = !narrow || m.big;
            const anchor = x(m.month) < 60 ? 'start' : x(m.month) > w - 60 ? 'end' : 'middle';
            return (
              <g key={`${m.month}-${m.label}`} className={animate ? 'rv-pop' : ''} style={animate ? ({ animationDelay: `${300 + k * 120}ms` } as CSSProperties) : undefined}>
                {m.big && <circle cx={x(m.month)} cy={y} r={r0 + 6} fill="none" stroke={m.color} strokeOpacity={0.4} />}
                <circle cx={x(m.month)} cy={y} r={r0} fill={m.color} stroke="var(--surface-1)" strokeWidth={3} />
                {showLabel && (
                  <text
                    x={x(m.month)}
                    y={up ? y - r0 - 12 : y + r0 + 44}
                    textAnchor={anchor}
                    className={`rv-axis-mark ${m.big ? `big tone-${m.tone}` : ''}`}
                  >
                    {short(m.label, m.big)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      </div>
      <ul className="rv-axis-key" aria-hidden>
        <li><i style={{ background: '#f2a93b' }} /> Best moment, turning point</li>
        <li><i style={{ background: '#56c596' }} /> Went well</li>
        <li><i style={{ background: '#e5383b' }} /> Went badly</li>
      </ul>
    </div>
  );
}

function MomentList({ items, tone }: { items: MomentView[]; tone: 'well' | 'bad' }) {
  return (
    <div className={`rv-card rv-mcol ${tone}`}>
      <h3>{tone === 'well' ? 'What went well' : 'What went badly'}</h3>
      {items.length === 0 ? (
        <p className="rv-hint">{tone === 'well' ? 'Nothing stood out.' : 'Nothing went badly enough to make the list.'}</p>
      ) : (
        <ul className="rv-mlist">
          {items.slice(0, 3).map((m) => (
            <li key={`${m.turn}-${m.title}`}>
              <span className="rv-m num">Month {m.month}</span>
              <div>
                <b>{m.title}</b>
                <span>{m.consequence}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MomentsStage({ r, animate }: StageProps) {
  return (
    <section className="rv-stage rv-moments" aria-labelledby="rv-h-moments">
      <Kicker>The moments · {spanLabel(r)}</Kicker>
      <h2 id="rv-h-moments" className="rv-h2">
        {momentsHeadline(r)}
      </h2>
      <MomentAxis r={r} animate={animate} />
      <div className="rv-cols">
        <MomentList items={r.moments.well} tone="well" />
        <MomentList items={r.moments.bad} tone="bad" />
      </div>
      {r.moments.timing.length > 0 && (
        <ul className="rv-chips">
          {r.moments.timing.map((t) => (
            <li key={t.text} className="rv-chip">
              {t.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 4 How you were seen
// ---------------------------------------------------------------------------------------

function niceTicks(lo: number, hi: number): number[] {
  const step = hi - lo > 40 ? 20 : hi - lo > 18 ? 10 : 5;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

export function ApprovalCard({ r, animate, ghost }: StageProps) {
  const [table, setTable] = useState(false);
  const a = r.perception.approval;
  const letters = monthLetters(r);
  const series: ChartSeries[] = [{ id: 'run', label: 'This run', values: a.values, color: '#f2a93b' }];
  const ghostVals = ghost?.series?.approval ?? [];
  if (ghost && ghostVals.length > 1) series.push({ id: 'ghost', label: `Your best before (${ghost.presidencyScore})`, values: ghostVals, color: '#a3aebf', dashed: true });
  const all = series.flatMap((s) => s.values);
  const lo = Math.max(0, Math.floor((Math.min(...all) - 6) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...all) + 6) / 5) * 5);
  return (
    <div className="rv-card rv-approval">
      <div className="rv-card-head">
        <div className="rv-caps">Public approval</div>
        <div className="rv-caption num">
          start {a.start} · low {a.min} · high {a.max} · end {a.end}
        </div>
      </div>
      {table ? (
        <SeriesTable series={series} xLabels={letters} unit="%" caption="Approval by month" />
      ) : (
        <MiniChart
          series={series}
          xLabels={letters}
          title="Approval by month"
          unit="%"
          height={190}
          domain={[lo, hi]}
          grid={niceTicks(lo, hi)}
          markers={r.perception.elections.map((e) => ({ index: e.month - 1, label: e.won ? 'Won' : 'Lost' }))}
          markLow
          animate={animate}
        />
      )}
      <button type="button" className="rv-link small" onClick={() => setTable((v) => !v)} aria-pressed={table}>
        {table ? 'Show the chart' : 'Show as table'}
      </button>
    </div>
  );
}

const REL_TONE: Record<RelationData['label'], string> = { Closer: 'tone-ally', Thaw: 'tone-intel', Cooler: 'tone-rival', Rupture: 'tone-war', Steady: 'tone-muted' };

export function RelationRow({ row }: { row: RelationData }) {
  const X = (v: number) => 70 + (Math.max(-100, Math.min(100, v)) / 100) * 66;
  const x1 = Math.min(X(row.before), X(row.after));
  const x2 = Math.max(X(row.before), X(row.after));
  const up = row.after >= row.before;
  return (
    <li className="rv-rel">
      <span className="rv-flag" aria-hidden>
        {flag(row.id)}
      </span>
      <span className="rv-rel-name">
        {row.name}
        {row.objective && <small>in your goals</small>}
      </span>
      <span className="rv-rel-nums num">
        {row.before} → <b>{row.after}</b>
      </span>
      <svg className="rv-rel-bar" width={140} height={16} viewBox="0 0 140 16" aria-hidden>
        <rect x={4} y={6} width={132} height={4} rx={2} fill="var(--surface-3)" />
        <line x1={70} x2={70} y1={1} y2={15} stroke="var(--line-2)" />
        <rect x={x1} y={5} width={Math.max(2, x2 - x1)} height={6} rx={3} fill={up ? 'var(--ally)' : 'var(--rival)'} />
        <circle cx={X(row.after)} cy={8} r={5} fill={up ? 'var(--ally)' : 'var(--rival)'} stroke="var(--surface-1)" strokeWidth={2} />
      </svg>
      <span className={`rv-rel-lab ${REL_TONE[row.label]}`}>{row.label}</span>
    </li>
  );
}

export function SeenStage({ r, animate, ghost }: StageProps) {
  return (
    <section className="rv-stage rv-seen" aria-labelledby="rv-h-seen">
      <Kicker>How you were seen</Kicker>
      <h2 id="rv-h-seen" className="rv-h2">
        {seenHeadline(r)}
      </h2>
      <div className="rv-grid2">
        <ApprovalCard r={r} animate={animate} ghost={ghost} />
        <div className="rv-card rv-rels">
          <div className="rv-caps">Allies and rivals · before and after</div>
          {r.perception.relations.length ? (
            <ul>
              {r.perception.relations.slice(0, 5).map((row) => (
                <RelationRow key={row.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="rv-hint">No relations tracked on this seat.</p>
          )}
          <p className="rv-hint small">Relations run from -100 (hostile) to +100 (allied).</p>
        </div>
      </div>
      {r.perception.press.length > 0 && (
        <ul className="rv-press">
          {r.perception.press.map((p) => (
            <li key={p.role} className={`rv-card rv-presscard tone-${p.tone}`}>
              <div className="rv-caps">{p.outlet}</div>
              <q>{p.quote}</q>
            </li>
          ))}
        </ul>
      )}
      {r.perception.judgement && (
        <blockquote className="rv-judge">
          <div className="rv-caps">History's judgement</div>
          <p>{r.perception.judgement}</p>
        </blockquote>
      )}
      <p className="rv-hint">Press outlets are fictional, written from your numbers.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 5 The numbers
// ---------------------------------------------------------------------------------------

function MiniCard({ s: raw, r, animate }: { s: SeriesView; r: RevealPayload; animate: boolean }) {
  // Glossary: the 0 to 200 meter is called "Score"
  const s = raw.id === 'score' ? { ...raw, label: 'Score' } : raw;
  const d = s.end - s.start;
  const good = s.higherIsBetter ? d > 0 : d < 0;
  const unit = s.unit === '%' ? '%' : '';
  const fmt = (v: number) => fmtValue(s, v);
  const lowIdx = s.values.indexOf(s.min);
  const highIdx = s.values.indexOf(s.max);
  const par = s.id === 'score' ? r.verdict.par : null;
  const crossed = par !== null ? s.values.findIndex((v) => v >= par) : -1;
  return (
    <li className="rv-card rv-mini">
      <div className="rv-mini-top">
        <span className="rv-caps">{s.label}</span>
        <span className={`rv-delta num ${Math.abs(d) < 0.05 ? 'flat' : good ? 'good' : 'bad'}`}>
          {Math.abs(d) < 0.05 ? 'no change' : `${d > 0 ? '▲' : '▼'} ${signed(d, s.id === 'realGrowth' ? 1 : 0)}`}
        </span>
      </div>
      <div className="rv-mini-big num">
        {fmt(s.end)}
        {unit}
      </div>
      <MiniChart
        series={[{ id: s.id, label: s.label, values: s.values, color: seriesColor(s.id) }]}
        xLabels={s.months.map(String)}
        title={`${s.label} by month`}
        unit={unit}
        height={92}
        reference={par !== null ? { value: par, label: `par ${par}` } : undefined}
        animate={animate}
        format={fmt}
        showX={false}
      />
      <div className="rv-mini-foot num">
        <span>
          start {fmt(s.start)}
          {unit}
        </span>
        <span>
          {par !== null && crossed >= 0
            ? `par ${par} reached in month ${crossed + 1}`
            : s.min === s.max
              ? 'level all session'
              : `low ${fmt(s.min)} (M${lowIdx + 1}) · high ${fmt(s.max)} (M${highIdx + 1})`}
        </span>
      </div>
    </li>
  );
}

export function NumbersStage({ r, animate }: StageProps) {
  const [table, setTable] = useState(false);
  const c = r.numbers.counts;
  const series = r.numbers.series.filter((s) => s.id !== 'gdp').slice(0, 5);
  const counts: Array<[string, string | number]> = [
    ['Wars fought', c.wars],
    ['Deals signed', c.deals],
    ['Orders given', c.orders],
    ['Crises decided', c.crises],
    ['Lives lost (est.)', c.livesLost.toLocaleString('en-US')],
    ['Covert ops', c.covertExposed ? `${c.covertOk} ok, ${c.covertExposed} caught` : c.covertOk],
  ];
  return (
    <section className="rv-stage rv-numbers" aria-labelledby="rv-h-numbers">
      <Kicker>The numbers · {r.perception.approval.values.length || r.seat.months} months</Kicker>
      <h2 id="rv-h-numbers" className="rv-h2">
        Measured, month by month.
      </h2>
      {table ? (
        <SeriesTable
          series={series.map((s) => ({ id: s.id, label: `${s.id === 'score' ? 'Score' : s.label}${s.unit === '%' ? ' %' : ''}`, values: s.values, color: seriesColor(s.id) }))}
          xLabels={monthLetters(r)}
          caption="Every measure by month"
          format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
        />
      ) : (
        <ul className="rv-minis">
          {series.map((s) => (
            <MiniCard key={s.id} s={s} r={r} animate={animate} />
          ))}
          <li className="rv-card rv-mini rv-counts">
            <span className="rv-caps">Counts</span>
            <dl>
              {counts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        </ul>
      )}
      <button type="button" className="rv-link small" onClick={() => setTable((v) => !v)} aria-pressed={table}>
        {table ? 'Show the charts' : 'Show as table'}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// 6 The truth
// ---------------------------------------------------------------------------------------

function big(n: number, unit: string): string {
  if (unit === '%') return `${Math.round(n)}%`;
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function DeclassifiedCard({ card, animate, order }: { card: DeclassifiedData; animate: boolean; order: number }) {
  useEffect(() => {
    if (!animate) return;
    const t = window.setTimeout(() => sound.play('page'), 600 + order * 400);
    return () => window.clearTimeout(t);
  }, [animate, order]);
  const plots = card.id === 'plots';
  return (
    <li className="rv-card rv-declass">
      <div className="rv-caps tone-intel">{card.label}</div>
      <div className="rv-dc-row">
        <div className="rv-dc-believed">
          <span>{plots ? 'You detected' : 'Your estimate'}</span>
          <b className="num">{card.believed === null ? (plots ? '0' : '?') : big(card.believed, card.unit)}</b>
        </div>
        <div className="rv-dc-actual">
          <span>{plots ? 'Actually run' : 'Actual'}</span>
          <b className="num">
            {big(card.actual, card.unit)}
            {animate && (
              <i className="rv-redact" style={{ animationDelay: `${600 + order * 400}ms` } as CSSProperties} aria-hidden />
            )}
          </b>
        </div>
        <p>{card.note}</p>
      </div>
    </li>
  );
}

const VERDICT_WORD: Record<TruthVerdict, string> = { BETTER: 'Better', SAME: 'Same', WORSE: 'Worse', CONTEXT: 'Context', OPEN: 'Open' };

export function VerdictChip({ v }: { v: TruthVerdict }) {
  return (
    <span className={`rv-v v-${v.toLowerCase()}`} title={v === 'CONTEXT' ? 'Not directly comparable' : v === 'OPEN' ? 'Still an open question' : `${VERDICT_WORD[v]} than reality`}>
      {VERDICT_WORD[v]}
    </span>
  );
}

function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? '')
      .replace(/[-_]+/g, ' ')
      .replace(/\.html?$/, '');
    return `${host}${last ? `, ${last.length > 42 ? `${last.slice(0, 40)}…` : last}` : ''}`;
  } catch {
    return url;
  }
}

function asOfLabel(asOf: string): string {
  const [y, m] = asOf.split('-').map(Number);
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return y && m ? `${names[m - 1]} ${y}` : asOf;
}

export function TruthTable({ truth }: { truth: NonNullable<RevealPayload['truth']> }) {
  const rows = truth.rows;
  return (
    <table className="rv-truth">
      <thead>
        <tr>
          <th scope="col">Topic</th>
          <th scope="col">In your world</th>
          <th scope="col">In the real world</th>
          <th scope="col">
            <span className="rv-sr">Verdict</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.topic}>
            <th scope="row" className="topic">
              <span>{row.topic}</span>
              <span className="rv-mchip">
                <VerdictChip v={row.verdict} />
              </span>
            </th>
            <td className="yours" data-l="Your world">
              {row.yours}
            </td>
            <td className="real" data-l="Real world">
              {row.real}
            </td>
            <td className="vcell">
              <VerdictChip v={row.verdict} />
            </td>
          </tr>
        ))}
        {truth.fear && (
          <tr className="fear">
            <th scope="row" className="topic">
              <span>What experts feared</span>
              <span className="rv-mchip">
                <VerdictChip v="OPEN" />
              </span>
            </th>
            <td className="yours" data-l="Your world">
              Your session ended; the fear outlives it.
            </td>
            <td className="real" data-l="Real world">
              {truth.fear}
            </td>
            <td className="vcell">
              <VerdictChip v="OPEN" />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function DebriefText({ text }: { text: string }) {
  const parts = text.split(/(?=What experts fear:)/);
  return (
    <div className="rv-debrief">
      {parts.map((p) => {
        const m = /^(What [^:]+):\s*/.exec(p);
        return (
          <p key={p.slice(0, 24)}>
            {m ? <b>{m[1]}: </b> : null}
            {m ? p.slice(m[0].length) : p}
          </p>
        );
      })}
    </div>
  );
}

export function TruthStage({ r, animate }: StageProps) {
  const t = r.truth;
  const rows = t?.rows ?? [];
  return (
    <section className="rv-stage rv-truthstage" aria-labelledby="rv-h-truth">
      {r.declassified.length > 0 && (
        <>
          <Kicker tone="intel">Declassified · what your intelligence could not see</Kicker>
          <h2 id="rv-h-truth" className="rv-h2">
            The fog lifts.
          </h2>
          <ul className="rv-declass-list">
            {r.declassified.slice(0, 3).map((c, i) => (
              <DeclassifiedCard key={c.id} card={c} animate={animate} order={i} />
            ))}
          </ul>
        </>
      )}
      {t && (
        <>
          {r.declassified.length === 0 ? (
            <h2 id="rv-h-truth" className="rv-h2">
              What really happened.
            </h2>
          ) : null}
          <div className="rv-caps rv-sub">What really happened · as of {asOfLabel(t.asOf)}</div>
          {rows.length > 0 ? <TruthTable truth={t} /> : t.debrief ? <DebriefText text={t.debrief} /> : null}
          <div className="rv-sources">
            {t.sources.length > 0 && (
              <>
                Sources:{' '}
                {t.sources.map((s, i) => (
                  <span key={s}>
                    {i > 0 ? ' · ' : ''}
                    <a href={s} target="_blank" rel="noreferrer noopener">
                      {sourceLabel(s)}
                    </a>
                  </span>
                ))}
              </>
            )}
          </div>
          {rows.length > 0 && t.debrief && (
            <details className="rv-details">
              <summary>Read the full debrief</summary>
              <DebriefText text={t.debrief} />
            </details>
          )}
        </>
      )}
      {!t && r.declassified.length === 0 && (
        <>
          <h2 id="rv-h-truth" className="rv-h2">
            The record, as it stands.
          </h2>
          <p className="rv-body">No declassified files and no real-world comparison for this seat.</p>
        </>
      )}
    </section>
  );
}
