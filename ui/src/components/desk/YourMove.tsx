import { useState } from 'react';
import { IconMessageCircle, IconSearch } from '@tabler/icons-react';
import { type DecisionOption, type Meeting, MEETING_SLOTS, type PendingDecision, approveProposal, countryName, useGameStore, usePlayerCountry } from '../../store/gameStore';
import { ADVISOR_NAMES, flag, monthLabel } from '../../lib/format';
import { cabinetPick, effectWords, goalName, guideLede, meetingAdviser, meetingPick, missionPick, missionTag, proposalEffects, splitLede } from '../../lib/month';
import { type AgendaItem, agendaItems, chooseAnswer, chooseSmall, costPhrase, currentItem, meetingTitle, ministerFor, skipItem, skipMeaning, undoSkip } from '../../lib/agenda';
import { SceneFrame } from '../../scenes/SceneFrame';
import { type SceneKind, avoidRepeat, crisisMood, sceneForCrisis } from '../../scenes/kinds';
import { ContextMap } from '../../scenes/ContextMap';
import { CoachBubble } from './Coach';
import { ExplainText } from '../learn/ExplainText';
import { SituationButton } from '../learn/SituationBriefing';
import { optionSizes } from '../../lib/ease';
import { pcCost } from '../../lib/actions';
import { AdvisorList } from './AdvisorList';
import { MissionLine } from './MissionLine';
import { useLayout } from '../../lib/layout';
import { sound } from '../../lib/sound';
import '../../styles/month.css';

/**
 * The Thing (design-layout.md L-7, design-agenda.md 0.12): the current thing of the month. Its
 * columns follow its own width (container queries in styles/layout.css): the situation (scene,
 * goals in this call, how it got here), the answers (one button per answer with its Choose face,
 * the recommended one saying who recommends it and why, Skip as the last card with its
 * consequence, what your advisers say) and, when wide, the context (subject map, your goals in
 * this call, background). The same component serves the desk, the map card (`compact`) and phones.
 */

const KIND_SCENE: Record<Meeting['kind'], SceneKind> = { CALL: 'summit', STAFF: 'cabinet', VISIT: 'summit', PRESS: 'tv_interview' };
const KIND_KICKER: Record<Meeting['kind'], string> = { CALL: 'A call on the secure line', STAFF: 'A staff meeting', VISIT: 'A state visit', PRESS: 'An interview' };

/** The previous month's crisis scene, so the backdrop does not repeat (R7). */
function previousScene(): SceneKind | undefined {
  const d = useGameStore.getState().worldState?.turnReport?.decisions.find((x) => !x.kind || x.kind === 'CRISIS');
  return d ? sceneForCrisis(d.templateId, d.title) : undefined;
}

/** "Hold firm" from "Hold firm: the patrol stays" (goal and adviser rows). */
const shortLabel = (o: DecisionOption) => o.label.replace(/\s*[:(].*$/, '');

/** One answer: the whole card is one button, its action drawn as a Choose face (AF-5, D9). */
function AnswerCard({
  title,
  rec,
  fx,
  fxTone,
  more,
  chosen,
  disabled,
  onChoose,
  aria,
  face = 'Choose',
}: {
  title: string;
  /** "★ Recommended by your Secretary of State: "..."" (D1: plain text, never a control look). */
  rec?: string;
  fx: React.ReactNode;
  fxTone?: 'help' | 'risk';
  /** The detail line (cost, who reacts), shown on tall screens. */
  more?: string;
  chosen?: boolean;
  disabled?: string;
  onChoose: () => void;
  aria?: string;
  face?: string;
}) {
  return (
    <button type="button" className={`opt${chosen ? ' is-chosen' : ''}${fxTone ? ` fx-${fxTone}` : ''}`} onClick={onChoose} disabled={!!disabled} aria-pressed={chosen} aria-label={aria}>
      <span className="opt-body">
        {rec && (
          <span className="opt-rec" data-rec="">
            {rec.split(': ')[0]}
            {rec.includes(': ') && <span className="rec-why">: {rec.split(': ').slice(1).join(': ')}</span>}
          </span>
        )}
        <span className="opt-name">{title}</span>
        <span className="opt-fx">{fx}</span>
        {more && <span className="opt-more">{more}</span>}
        {disabled && <span className="opt-off">{disabled}</span>}
      </span>
      <span className="face">{chosen ? 'Your choice' : face}</span>
    </button>
  );
}

/** Skip: the last card of every answer list, same size and shape, with what it means (D5). */
function SkipCard({ item }: { item: AgendaItem }) {
  const sk = skipMeaning(item);
  if (item.state === 'skipped')
    return (
      <div className="skip-status" role="status">
        <p>
          <b>Skipped.</b> {sk.means}
        </p>
        <button type="button" className="wc-btn small" onClick={() => undoSkip(item)}>
          Undo
        </button>
      </div>
    );
  return (
    <div className="skip-wrap">
      <p className="opt-or">Or, if you do not want to decide:</p>
      <button type="button" className="opt skipopt" onClick={() => skipItem(item)} data-skip="">
        <span className="opt-body">
          <span className="opt-name">{sk.label}</span>
          <span className="opt-fx">{sk.means}</span>
          <span className="opt-more opt-after">{sk.after}</span>
        </span>
        <span className="face">Skip</span>
      </button>
    </div>
  );
}

/** The scene band: kicker, title, the situation's first sentence (or the caller's words). */
function Hero({ scene, home, other, mood, kicker, title, quote, hot, card, where }: { scene: SceneKind; home?: string; other?: string; mood: 'good' | 'bad' | 'neutral'; kicker: React.ReactNode; title: string; quote: string; hot?: boolean; card: string[]; where: string }) {
  return (
    <div className={`th-hero${hot ? ' is-crisis' : ''}`} data-point="move">
      <SceneFrame kind={scene} home={home} other={other} mood={mood} size="card" />
      <div className="shade" aria-hidden />
      <div className="txt">
        <span className="kick">{kicker}</span>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-quote">
          <ExplainText text={quote} card={card} block={0} info where={where} />
        </p>
      </div>
    </div>
  );
}

/**
 * "How it got here": the last months' entries about this subject (L-12). Entries never spread over
 * the height (Group Manager): taller screens show more of them, each with its month and kind, and
 * the box ends where they end; what does not fit is left out, never scrolled.
 */
function Story({ countries }: { countries: string[] }) {
  const timeline = useGameStore((s) => s.worldState?.timeline ?? []);
  const L = useLayout();
  const names = countries.map((c) => countryName(c)).filter(Boolean);
  const about = timeline.filter((t) => names.some((n) => t.description.includes(n)));
  const max = L.height >= 2000 ? 10 : L.tallPlus ? 7 : 4;
  const rows = (about.length >= 3 ? about : timeline).slice(-max);
  if (!rows.length) return null;
  return (
    <section className="th-story" aria-label="How it got here">
      <h3>How it got here</h3>
      <ol>
        {rows.map((t, i) => (
          <li key={`${t.turn}-${i}`}>
            <span className="when">
              {monthLabel(t.date)} · {t.category.toLowerCase().replace(/_/g, ' ')}
            </span>
            <span>{t.description}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "Your goals in this call": which answers help or hurt each goal at stake (from missionImpact). */
function GoalsAtStake({ id, options, cls }: { id: string; options: DecisionOption[]; cls: string }) {
  const impacts = useGameStore((s) => s.missionImpact[id]);
  const status = useGameStore((s) => s.objectiveStatus);
  if (!impacts) return null;
  const rows = status
    .map((c, i) => {
      const helps = options.filter((o) => impacts[o.id]?.links?.some((l) => l.index === i && l.effect === 'helps')).map(shortLabel);
      const hurts = options.filter((o) => impacts[o.id]?.links?.some((l) => l.index === i && l.effect !== 'helps')).map(shortLabel);
      if (!helps.length && !hurts.length) return null;
      return { goal: goalName(c, c.label), text: [helps.length ? `${helps.join(', ')} helps` : '', hurts.length ? `${hurts.join(', ')} hurts` : ''].filter(Boolean).join('; ') };
    })
    .filter((r): r is { goal: string; text: string } => !!r);
  if (!rows.length) return null;
  return (
    <section className={`th-facts goals ${cls}`} aria-label="Your goals in this call">
      <h3>Your goals in this call</h3>
      {rows.map((r) => (
        <p key={r.goal} className="r">
          <span>{r.goal}</span>
          <span>{r.text}</span>
        </p>
      ))}
    </section>
  );
}

/** "What your advisers say": each backer's voice, so Recommended stays a view, not the answer. */
function Advisers({ options, onAsk }: { options: DecisionOption[]; onAsk: () => void }) {
  const voices = new Map<string, string>();
  for (const o of options)
    for (const b of o.backedBy) if (!voices.has(b)) voices.set(b, `${splitLede(o.description)[0]} (${shortLabel(o)})`);
  return (
    <section className="th-facts advice" aria-label="What your advisers say">
      <h3>What your advisers say</h3>
      {[...voices.entries()].slice(0, 3).map(([who, said]) => (
        <p key={who} className="r">
          <span>
            <b>{ADVISOR_NAMES[who] ?? who}</b>: "{said}"
          </span>
        </p>
      ))}
      <button type="button" className="wc-btn small" onClick={onAsk}>
        <IconMessageCircle size={15} aria-hidden /> Ask your staff
      </button>
    </section>
  );
}

/** A crisis or a meeting: one question, every answer at once, Skip last. */
function DecisionThing({ item, compact }: { item: AgendaItem; compact: boolean }) {
  const d = (item.decision ?? item.meeting) as PendingDecision | Meeting;
  const meeting = item.meeting ?? null;
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const status = useGameStore((s) => s.objectiveStatus);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const difficulty = useGameStore((s) => s.worldState?.difficulty);
  const missionImpact = useGameStore((s) => s.missionImpact);
  const advice = useGameStore((s) => s.advice);
  const guide = useGameStore((s) => s.learn.level === 'guide');
  const turn = useGameStore((s) => s.worldState?.turn ?? 0);
  const [sizes, setSizes] = useState(false);
  const me = usePlayerCountry();
  const home = me?.id;
  const other = meeting?.withCountry ?? d.affectedCountries.find((id) => id !== home);
  const options = meeting ? d.options.filter((o) => o.id !== meeting.defaultOptionId) : d.options;
  const rec = meeting ? meetingPick(meeting) : cabinetPick(d);
  const note = meeting ? undefined : advice?.missionNotes?.[d.id];
  const best = meeting ? undefined : advice?.missionNotes ? (note ? d.options.find((o) => o.id === note.optionId) : undefined) : missionPick(d);
  const decided = !!reviewed[d.id] || (!!meeting && !!choices[d.id] && choices[d.id] !== meeting.defaultOptionId && item.state === 'decided');
  const chosenId = decided ? choices[d.id] : undefined;
  const attended = meeting ? agenda.filter((x) => x.id !== meeting.id && choices[x.id] && choices[x.id] !== x.defaultOptionId).length : 0;
  const full = !!meeting && attended >= MEETING_SLOTS && !chosenId;
  const lead = rec?.backedBy[0] ?? (meeting ? meetingAdviser(meeting) : 'CHIEF_OF_STAFF');
  const recBy = ADVISOR_NAMES[lead] ?? 'Chief of Staff';
  const [lede, rest] = splitLede(d.situation);
  const quote = guide ? guideLede(lede).short : lede;
  const card = [quote, rest ?? '', ...options.map((o) => o.description)];
  const scene = meeting ? KIND_SCENE[meeting.kind] : avoidRepeat(sceneForCrisis(d.templateId, d.title, d.situation), previousScene());
  const urgency = d.urgency === 'EXISTENTIAL' ? 'Existential crisis' : d.urgency === 'URGENT' ? 'Urgent crisis' : 'Crisis';
  const kicker = (
    <>
      {meeting ? KIND_KICKER[meeting.kind] : urgency}
      {other ? ` · ${flag(other)} ${countryName(other)}` : ''}
    </>
  );
  const recTag = rec ? missionTag(missionImpact[d.id]?.[rec.id], status) : null;
  const disagree = !meeting && rec && best && best.id !== rec.id && !decided && (advice?.missionNotes ? note?.switchFrom?.cabinetId === rec.id : recTag?.tone === 'risk');
  const consult = () => useGameStore.getState().consult(lead, `${d.title}: what do you advise, and what are the risks of each option?`);
  const noun = meeting ? (meeting.kind === 'CALL' ? 'say' : 'do') : 'do';
  return (
    <article className="thing" data-thing={item.kind} aria-label={item.title}>
      <div className="th-sit">
        {turn === 0 && !compact && <MissionLine />}
        {turn === 0 && !compact && <p className="intro1">This month you have {agendaItems().filter((x) => x.needsYou).length} things to go through. For each one, choose an answer or skip it. Then check what will happen and execute.</p>}
        <Hero scene={scene} home={home} other={other} mood={crisisMood(d.templateId) ?? (d.urgency === 'ROUTINE' ? 'neutral' : 'bad')} kicker={kicker} title={meeting ? meetingTitle(meeting) : d.title} quote={quote} hot={d.urgency !== 'ROUTINE' && !meeting} card={card} where={d.title} />
        {!compact && <GoalsAtStake id={d.id} options={options} cls="in-sit" />}
        {!compact && <Story countries={d.affectedCountries} />}
      </div>
      <div className="th-ans">
        <div className="ask-row">
          {!compact && <CoachBubble step="move" place="below" />}
          <h2 className="ask">
            What do you {noun}? Choose one of {options.length} answers, or skip (last card).
          </h2>
          {!compact && optionSizes(options[0] ?? { effects: {} }, countryName).length > 0 && (
            <button type="button" className="wc-btn small ask-sizes" aria-pressed={sizes} onClick={() => setSizes((v) => !v)} data-effect-sizes="">
              {sizes ? 'Hide sizes' : 'How much?'}
            </button>
          )}
        </div>
        <div className="opts">
          {options.map((o) => {
            const mt = missionTag(missionImpact[d.id]?.[o.id], status);
            const words = effectWords(o).slice(0, 2).map((w) => w.text);
            const pc = o.effects.pc ?? 0;
            const reason = guide ? guideLede(splitLede(o.description)[0], 12).short : splitLede(o.description)[0];
            const isRec = rec?.id === o.id;
            const bestLine = best?.id === o.id && note ? ` ${note.text}.` : '';
            // The map card is shorter (D5): the goal it moves, else its strongest effect
            const fx = compact ? (
              mt ? <span className={`mt mt-${mt.tone}`}>{mt.text}.</span> : <>{words[0] ?? 'No effect we can see'}.</>
            ) : (
              <>
                {mt && <span className={`mt mt-${mt.tone}`}>{mt.text}{mt.more > 0 ? ` (+${mt.more} more)` : ''}. </span>}
                <span className={mt ? 'fx-rest' : undefined}>
                  {words.join('. ')}
                  {words.length ? '.' : ''}
                  {bestLine}
                </span>
              </>
            );
            const more = [
              pc < 0 ? `Costs ◆ ${-pc}.` : pc > 0 ? `Gives ◆ ${pc}.` : 'Free.',
              o.backedBy.length ? `Backed by the ${o.backedBy.map((b) => ADVISOR_NAMES[b] ?? b).join(' and the ')}.` : '',
              sizes ? optionSizes(o, countryName).slice(0, 4).map((x) => x.text).join(', ') : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <AnswerCard
                key={o.id}
                title={`${o.label}${pc < 0 ? ` · costs ◆ ${-pc}` : ''}`}
                rec={isRec ? `★ Recommended by your ${recBy}: "${reason}"` : undefined}
                fx={fx}
                fxTone={mt ? (mt.tone === 'risk' ? 'risk' : 'help') : undefined}
                more={!compact ? more : undefined}
                chosen={chosenId === o.id}
                disabled={full ? 'Your calendar is full: skip another meeting to take this one.' : undefined}
                onChoose={() => {
                  chooseAnswer(item, o.id);
                  sound.play('stamp');
                }}
                aria={`${o.label}${isRec ? `, recommended by your ${recBy}` : ''}${mt ? `. ${mt.text}` : ''}${words.length ? `. ${words.join(', ')}` : ''}. Choose`}
              />
            );
          })}
          <SkipCard item={item} />
        </div>
        {disagree && rec && best && (
          <p className="move-disagree" role="note">
            Your cabinet backs <b>{rec.label}</b>, but it {(note?.switchFrom ? note.switchFrom.breaks : recTag?.text.startsWith('Breaks')) ? 'breaks' : 'hurts'} {note?.switchFrom?.goal ?? recTag?.text.replace(/^\w+: /, '')}.{' '}
            {note?.kind === 'tradeoff' || note?.kind === 'least' ? `${best.label} spares it, though it costs ${note.costs.join(' and ')}. ` : ''}
          </p>
        )}
        {difficulty === 'ANALYST' && !meeting && !compact && <p className="move-note">Easy: your cabinet never picks against your mission.</p>}
        {!compact && <Advisers options={options} onAsk={consult} />}
      </div>
      {!compact && (
        <div className="th-ctx">
          <ContextMap focus={meeting ? { kind: 'meeting', id: d.id } : { kind: 'crisis', id: d.id }} />
          <GoalsAtStake id={d.id} options={options} cls="in-ctx" />
          <section className="bg" aria-label="Background">
            <h3>Background</h3>
            {rest ? <ExplainText as="p" text={rest} card={card} block={1} info where={d.title} /> : <p>{meeting ? `Your ${ministerFor(meeting)} can take it for you: ${costPhrase(meeting.options.find((o) => o.id === meeting.defaultOptionId)).toLowerCase()}.` : lede}</p>}
            {!meeting && <SituationButton blocks={[d.situation, ...options.map((o) => o.description)]} cardTitle={d.title} />}
          </section>
        </div>
      )}
      {!compact && !meeting && (
        <div className="sit-more">
          <SituationButton blocks={[d.situation, ...options.map((o) => o.description)]} cardTitle={d.title} className="in-sit" />
        </div>
      )}
    </article>
  );
}

/** The small meetings: the ministers take them all (recommended), or you take one yourself. */
function SmallMeetingsThing({ item }: { item: AgendaItem }) {
  const choices = useGameStore((s) => s.decisionChoices);
  const ms = item.meetings ?? [];
  const all = ms.length === 2 ? 'both' : `all ${ms.length}`;
  const attended = ms.find((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId);
  const decided = item.state === 'decided';
  return (
    <article className="thing is-simple" data-thing="meetings" aria-label={item.title}>
      <div className="th-sit">
        <div className="th-hero is-text">
          <div className="txt">
            <span className="kick">Small meetings: they need no decision from you</span>
            <h1 className="hero-title">{item.title}</h1>
            <p className="hero-quote">{ms.map(meetingTitle).join(', ')}. No goal is at stake in any of them.</p>
          </div>
        </div>
      </div>
      <div className="th-ans">
        <h2 className="ask">Choose one of {ms.length + 1} answers, or skip (last card).</h2>
        <div className="opts">
          <AnswerCard
            title={`Your ministers take ${all}`}
            rec={`★ Recommended by your Chief of Staff: "None of these needs your decision; keep your calendar for the calls that matter."`}
            fx={ms.map((m) => `${meetingTitle(m)}: your ${ministerFor(m)}`).join('. ')}
            more="Free, no effect."
            chosen={decided && !attended}
            onChoose={() => chooseSmall(item)}
          />
          {ms.map((m) => {
            const o = meetingPick(m);
            return (
              <AnswerCard
                key={m.id}
                title={`Take ${meetingTitle(m)} yourself`}
                fx={o ? `You answer: ${o.label}. ${effectWords(o).slice(0, 2).map((w) => w.text).join('. ')}` : 'You take it yourself.'}
                more="Uses 1 of your 3 meetings. Your ministers take the rest."
                chosen={decided && attended?.id === m.id}
                onChoose={() => chooseSmall(item, m.id)}
              />
            );
          })}
          <SkipCard item={item} />
        </div>
      </div>
    </article>
  );
}

/** The recommended orders: Choose each one, or skip (they do not run). */
function OrdersThing({ item }: { item: AgendaItem }) {
  const actions = useGameStore((s) => s.pendingActions);
  const remove = useGameStore((s) => s.removePendingAction);
  const unchoose = (i: number) => useGameStore.setState((s) => ({ pendingActions: s.pendingActions.map((a, j) => (j === i ? { ...a, proposed: true } : a)) }));
  const idx = (item.orders ?? []).filter((i) => actions[i]);
  return (
    <article className="thing is-simple" data-thing="orders" aria-label={item.title}>
      <div className="th-sit">
        <div className="th-hero is-text">
          <div className="txt">
            <span className="kick">Your advisers propose these orders</span>
            <h1 className="hero-title">{item.title}</h1>
            <p className="hero-quote">An order you choose spends its political capital when you execute. One you do not choose does not run.</p>
          </div>
        </div>
      </div>
      <div className="th-ans">
        <h2 className="ask">Choose the orders you want, or skip (last card).</h2>
        <div className="opts">
          {idx.map((i) => {
            const a = actions[i];
            const pc = pcCost(a.type);
            const who = a.why?.split(':')[0] ?? 'Chief of Staff';
            const why = a.why?.split(':').slice(1).join(':').trim();
            const fx = proposalEffects(a);
            return (
              <div key={`${a.label}-${i}`} className="opt-pair">
                <AnswerCard
                  title={`Order: ${a.label}${pc ? ` · ◆ ${pc}` : ''}`}
                  rec={`★ Recommended by your ${who}${why ? `: "${why}"` : ''}`}
                  fx={fx ? `Will change: ${fx}` : 'Free of side effects we can see.'}
                  fxTone={a.preview?.missionWarning ? 'risk' : undefined}
                  more={[a.preview?.successChance != null ? `${Math.round(a.preview.successChance <= 1 ? a.preview.successChance * 100 : a.preview.successChance)}% chance.` : '', a.preview?.missionWarning ?? ''].filter(Boolean).join(' ')}
                  chosen={!a.proposed}
                  onChoose={() => {
                    if (a.proposed && approveProposal(i).ok) sound.play('stamp');
                  }}
                  aria={`Order: ${a.label}${pc ? `, spends ◆ ${pc}` : ''}. Choose`}
                />
                {!a.proposed ? (
                  <button type="button" className="wc-btn small" onClick={() => unchoose(i)}>
                    Undo
                  </button>
                ) : (
                  <button type="button" className="wc-btn small" onClick={() => remove(i)} aria-label={`Remove ${a.label}`}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
          {idx.some((i) => actions[i].proposed) && <SkipCard item={item} />}
        </div>
      </div>
    </article>
  );
}

/** Your own orders (optional): the advisers' order ideas and All orders. */
function OwnOrdersThing({ item, compact }: { item: AgendaItem; compact: boolean }) {
  const setFocus = useGameStore((s) => s.setFocus);
  const L = useLayout();
  // As many order ideas as the room holds without scrolling; "Show n more" brings the rest
  const max = compact || L.short ? 2 : L.tallPlus ? 6 : 3;
  return (
    <article className="thing is-own" data-thing="own" aria-label={item.title}>
      <div className="own-head">
        <h1 className="hero-title">Your own orders</h1>
        <p>Optional. Give any order you like this month; each one costs political capital.</p>
        <button type="button" className="wc-btn" onClick={() => setFocus({ kind: 'catalog' })} data-all-orders="">
          <IconSearch size={16} aria-hidden /> All orders
        </button>
      </div>
      <AdvisorList max={max} compact={compact} />
      <SkipCard item={item} />
    </article>
  );
}

/** The current thing of the month, by kind. */
export function Thing({ compact = false }: { compact?: boolean }) {
  const agendaKey = useGameStore((s) => s.agendaKey);
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.skipped);
  useGameStore((s) => s.missionImpact);
  useGameStore((s) => s.deskShown);
  useLayout();
  const items = agendaItems();
  const item = currentItem(items, agendaKey);
  if (!item)
    return (
      <article className="thing is-own" data-thing="quiet" aria-label="A quiet month">
        <div className="own-head">
          <h1 className="hero-title">A quiet month</h1>
          <p>No crisis and no call needs your answer. Use the month: give an order, or let it run.</p>
        </div>
        <AdvisorList max={6} />
      </article>
    );
  if (item.kind === 'crisis' || item.kind === 'meeting') return <DecisionThing key={item.key} item={item} compact={compact} />;
  if (item.kind === 'meetings') return <SmallMeetingsThing key={item.key} item={item} />;
  if (item.kind === 'orders') return <OrdersThing key={item.key} item={item} />;
  return <OwnOrdersThing key={item.key} item={item} compact={compact} />;
}
