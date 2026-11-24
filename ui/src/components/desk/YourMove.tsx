import { useState } from 'react';
import { IconMessageCircle, IconSearch } from '@tabler/icons-react';
import { type CallCard, type DecisionOption, type Impact, type Meeting, MEETING_SLOTS, type MissionNote, type PendingDecision, approveProposal, countryName, orderKey, useGameStore, usePlayerCountry } from '../../store/gameStore';
import { ADVISOR_NAMES, flag, monthLabel } from '../../lib/format';
import { cabinetPick, crisisSelection, effectWords, goalName, guideLede, meetingAdviser, meetingPick, meetingSelection, missionPick, missionTag, proposalEffects, splitLede } from '../../lib/month';
import { type AgendaItem, advisersLine, agendaItems, callWhy, callSides, chooseAnswer, chooseMove, chooseSmall, costPhrase, currentItem, meetingTitle, ministerFor, skipItem, skipMeaning, undoSkip, unchooseMove } from '../../lib/agenda';
import { TERMS } from '../../lib/glossary';
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

/**
 * The advisers named under an answer (its authored backers), except on an answer that breaks a
 * primary goal while another answer breaks none: no adviser backs such a card (D-72 extended,
 * src/core/advisors.ts crisisCall), so the desk does not say one does (design review C-2 note,
 * Water War India "Strike the camps").
 */
function shownBackers(o: DecisionOption, impacts: Record<string, Impact> | undefined): string[] {
  const breaks = (id: string) => (impacts?.[id]?.breaks.length ?? 0) > 0;
  if (impacts && breaks(o.id) && Object.keys(impacts).some((id) => !breaks(id))) return [];
  return o.backedBy.map((b) => ADVISOR_NAMES[b] ?? b);
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

interface AdviserVoice {
  who: string[];
  said: string;
  label: string;
  optionId: string;
}

/**
 * The voices of "What your advisers say", from the same source as the answer cards' Recommended
 * lines, so an adviser never backs one answer on its card and another below (design review S2-3,
 * C-2): on a call, the engine's call cards (the advisers a card names speak for it, in the card's
 * own words); elsewhere the recommended answer's adviser and backers first, then the other answers'
 * shown backers (none on an answer that breaks a goal while another breaks none). Each adviser
 * speaks once; advisers for the same answer share one line.
 */
function adviserVoices(options: DecisionOption[], cards: CallCard[] | null, rec: DecisionOption | undefined, impacts: Record<string, Impact> | undefined, recBy?: string): AdviserVoice[] {
  const byAdviser = new Map<string, AdviserVoice>();
  const say = (who: string, v: Omit<AdviserVoice, 'who'>) => {
    if (!byAdviser.has(who)) byAdviser.set(who, { who: [who], ...v });
  };
  if (cards) {
    for (const c of cards) for (const who of c.advisers) say(who, { said: callWhy(c) || c.label, label: c.label.replace(/\s*[:(].*$/, ''), optionId: c.id });
  } else {
    const line = (o: DecisionOption) => ({ said: splitLede(o.description)[0], label: shortLabel(o), optionId: o.id });
    // The adviser the recommended card names speaks for it, even when its authored backers are hidden
    if (rec && recBy) say(recBy, line(rec));
    const ordered = rec ? [rec, ...options.filter((o) => o.id !== rec.id)] : options;
    for (const o of ordered) for (const who of shownBackers(o, impacts)) say(who, line(o));
  }
  const out: AdviserVoice[] = [];
  for (const [who, v] of byAdviser) {
    const same = out.find((x) => x.optionId === v.optionId);
    if (same) same.who.push(who);
    else out.push({ ...v, who: [who] });
  }
  return out;
}

/** "What your advisers say": each adviser's voice, so Recommended stays a view, not the answer. */
function Advisers({ voices, onAsk }: { voices: AdviserVoice[]; onAsk: () => void }) {
  return (
    <section className="th-facts advice" aria-label="What your advisers say" data-advisers="">
      <h3>What your advisers say</h3>
      {voices.slice(0, 3).map(({ who, said, label, optionId }) => (
        <p key={optionId} className="r" data-voice={who.join(',')} data-voice-option={optionId}>
          <span>
            <b>{who.join(' and ')}</b>: "{said}" ({label})
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
  const sel = meeting ? meetingSelection(meeting, choices, reviewed) : crisisSelection(d as PendingDecision, choices, reviewed);
  // The recommended answer: on a crisis the one the desk starts on (what Execute sends until the
  // player chooses), else the cabinet's; a call has none of its own (D-85), its cards name advisers
  const rec = meeting ? meetingPick(meeting) : sel.kind === 'cabinet' && sel.option ? sel.option : cabinetPick(d);
  // "Your call" (D-84): the engine's cards name who recommends which answer (design review C-2)
  const call = item.call ? callSides(item) : null;
  // "Agree" only while one card holds every adviser who backs a card (design review S2-3): the
  // heading, the cards and the voices below all read the engine's call cards
  const backedCards = call?.call ? call.call.cards.filter((c) => c.advisers.length > 0) : [];
  const agree = !!call?.call && call.call.missionCard === call.call.calmCard && backedCards.length <= 1;
  const note = meeting ? undefined : advice?.missionNotes?.[d.id];
  const best = meeting ? undefined : advice?.missionNotes ? (note ? d.options.find((o) => o.id === note.optionId) : undefined) : missionPick(d);
  const bestText = note ? bestTagText(note) : undefined;
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
      {call ? `${TERMS.yourCall.name} · ` : ''}
      {meeting ? KIND_KICKER[meeting.kind] : urgency}
      {other ? ` · ${flag(other)} ${countryName(other)}` : ''}
    </>
  );
  const recTag = rec ? missionTag(missionImpact[d.id]?.[rec.id], status) : null;
  const disagree = !call && !meeting && rec && best && best.id !== rec.id && !decided && (advice?.missionNotes ? note?.switchFrom?.cabinetId === rec.id : recTag?.tone === 'risk');
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
          <h2 className="ask">
            {call ? `${TERMS.yourCall.name}: your advisers ${agree ? 'agree, and the choice is yours' : 'disagree'}. ` : ''}What do you {noun}? Choose one of {options.length} answers, or skip (last card).
          </h2>
          {!compact && optionSizes(options[0] ?? { effects: {} }, countryName).length > 0 && (
            <button type="button" className="wc-btn small ask-sizes" aria-pressed={sizes} onClick={() => setSizes((v) => !v)} data-effect-sizes="">
              {sizes ? 'Hide sizes' : 'How much?'}
            </button>
          )}
          {/* Ask your staff beside the crisis where "What your advisers say" is not shown (below
              1300 tall or 1600 wide; design review S3) */}
          {!compact && (
            <button type="button" className="wc-btn small ask-staff" onClick={consult} data-ask-staff="">
              <IconMessageCircle size={15} aria-hidden /> Ask your staff
            </button>
          )}
        </div>
        {/* What Execute does with this crisis now, in the desk's one sentence (D-84 RC-1, D-85): the
            answer it will send, or, for a call with no answer, what leaving it does (lib/month leaveText) */}
        {!meeting && (
          <p className={`sel-badge sel-${sel.kind}`} data-sel={sel.kind} role="status" aria-label={`${d.title}: ${sel.text}`}>
            {sel.text}
          </p>
        )}
        {/* Step 1 under the question, over the answers, in its own place (RS-008-2) */}
        {!compact && <CoachBubble step="move" place="inline" />}
        {call && guide && call.guide && (
          <p className="call-guide" data-call-guide="">
            <b>Chief of Staff:</b> {call.guide}
          </p>
        )}
        <div className="opts">
          {options.map((o) => {
            const mt = missionTag(missionImpact[d.id]?.[o.id], status);
            const cc = call?.cards[o.id];
            // A war this answer starts is always named on its card (design review C-2)
            const all = effectWords(o);
            const war = all.find((w) => w.text === 'Starts a war');
            const words = (war ? [war, ...all.filter((w) => w !== war)] : all).slice(0, 2).map((w) => w.text);
            // The card's cost is what the answer does to political capital, its D-84 price included
            // (the price is charged by the engine and counted by the meters, lib/budget.ts)
            const price = meeting && o.id === meeting.defaultOptionId ? 0 : (advice?.prices?.[d.id]?.[o.id] ?? 0);
            const pc = (o.effects.pc ?? 0) - price;
            const reason = guide ? guideLede(splitLede(o.description)[0], 12).short : splitLede(o.description)[0];
            const isRec = !call && rec?.id === o.id;
            const bestLine = best?.id === o.id && bestText ? ` ${bestText.best}.` : '';
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
            // On a call the card's advisers are the engine's (C-2); elsewhere the authored backers,
            // none on an answer that breaks a goal while another breaks none (RC-6)
            const backers = cc ? [] : shownBackers(o, missionImpact[d.id]);
            const more = [
              pc < 0 ? `Costs ◆ ${-pc}${price ? ` (◆ ${price} of it is the price of the mission side)` : ''}.` : pc > 0 ? `Gives ◆ ${pc}.` : 'Free.',
              backers.length ? `Backed by the ${backers.join(' and the ')}.` : '',
              cc?.blocked ? `${cc.blocked.reason} ${cc.blocked.fix}`.trim() : '',
              sizes ? optionSizes(o, countryName).slice(0, 4).map((x) => x.text).join(', ') : '',
            ]
              .filter(Boolean)
              .join(' ');
            const ccRec = cc && cc.advisers.length ? `${advisersLine(cc)}${cc.why ? `: "${guide ? guideLede(callWhy(cc), 14).short : callWhy(cc)}"` : ''}` : undefined;
            return (
              <AnswerCard
                key={o.id}
                title={`${o.label}${pc < 0 ? ` · costs ◆ ${-pc}` : ''}`}
                rec={ccRec ?? (isRec ? `★ Recommended by your ${recBy}: "${reason}"` : undefined)}
                fx={fx}
                fxTone={mt ? (mt.tone === 'risk' ? 'risk' : 'help') : undefined}
                more={!compact ? more : undefined}
                chosen={chosenId === o.id}
                disabled={full ? 'Your calendar is full: skip another meeting to take this one.' : undefined}
                onChoose={() => {
                  chooseAnswer(item, o.id);
                  sound.play('stamp');
                }}
                aria={`${o.label}${ccRec ? `, ${advisersLine(cc as CallCard).toLowerCase()}` : isRec ? `, recommended by your ${recBy}` : ''}${mt ? `. ${mt.text}` : ''}${words.length ? `. ${words.join(', ')}` : ''}. Choose`}
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
        {!compact && <Advisers voices={adviserVoices(options, call?.call ? call.call.cards.filter((c) => options.some((o) => o.id === c.id)) : null, rec, missionImpact[d.id], call ? undefined : recBy)} onAsk={consult} />}
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

/** The tag words for the mission pick: alone, and when it is also the recommended answer. */
function bestTagText(note: MissionNote): { best: string; both: string } {
  // A note that names more than two goals (or runs long) no longer fits the tag on a card (RC-6, Water War India
  // at 1440: four lines, the first cut): the tag keeps the kind, the card's ribbon and the
  // disagreement line name the goals
  const long = note.kind !== 'best' && (note.helps.length + note.costs.length > 2 || note.text.length > 64);
  const text = long ? (note.kind === 'tradeoff' ? 'Best trade-off for your mission' : 'Least harm to your mission') : note.text;
  return {
    best: text,
    both: note.kind === 'best' ? 'Recommended · good for your mission' : `Recommended · ${long ? (note.kind === 'tradeoff' ? 'best trade-off' : 'least harm') : `${text.charAt(0).toLowerCase()}${text.slice(1)}`}`,
  };
}

/**
 * The mission move (D-84 R1 b): the engine's move call. One card per adviser's order that pushes a
 * goal, each naming its adviser (CallCard.advisers, no star); Choose puts that order in the month
 * as yours; Skip is the engine's Hold this month. With the Chief of Staff making the calls, their
 * order starts as a proposal that Choose all approves.
 */
function MoveThing({ item }: { item: AgendaItem }) {
  const actions = useGameStore((s) => s.pendingActions);
  const status = useGameStore((s) => s.objectiveStatus);
  const guide = useGameStore((s) => s.learn.level === 'guide');
  const [refused, setRefused] = useState<Record<string, string>>({});
  const mv = item.yourCall;
  if (!mv) return null;
  const cards = mv.cards.filter((c) => c.action);
  const stateOf = (c: CallCard) => (c.action ? actions.find((a) => orderKey(a) === orderKey(c.action as NonNullable<CallCard['action']>)) : undefined);
  return (
    <article className="thing is-simple" data-thing="move" aria-label={item.title}>
      <div className="th-sit">
        <div className="th-hero is-text">
          <div className="txt">
            <span className="kick">{TERMS.yourCall.name} · the orders that push your mission</span>
            <h1 className="hero-title">{item.title}</h1>
            <p className="hero-quote">Your advisers each propose a move for your mission. Choose the one you want to fund, or hold this month.</p>
          </div>
        </div>
      </div>
      <div className="th-ans">
        <h2 className="ask">Choose one of {cards.length} {cards.length === 1 ? 'order' : 'orders'}, or skip (last card).</h2>
        {guide && mv.guide && (
          <p className="call-guide" data-call-guide="">
            <b>Chief of Staff:</b> {mv.guide}
          </p>
        )}
        <div className="opts">
          {cards.map((c) => {
            const a = stateOf(c);
            const chosen = !!a && !a.proposed;
            const goals = [c.breaks.length ? `Breaks: ${c.breaks.join(', ')}` : '', c.hurts.length ? `Hurts: ${c.hurts.join(', ')}` : '', c.helps.length ? `Helps: ${c.helps.map((x) => goalWords(x, status)).join(', ')}` : '']
              .filter(Boolean)
              .join('. ');
            const odds = c.successChance == null ? '' : `${Math.round(c.successChance <= 1 ? c.successChance * 100 : c.successChance)}% chance.`;
            return (
              <div key={c.id} className="opt-pair">
                <AnswerCard
                  title={`Order: ${c.label}${c.pc ? ` · ◆ ${c.pc}` : ''}`}
                  rec={c.advisers.length ? `${advisersLine(c)}${c.why ? `: "${callWhy(c)}"` : ''}` : undefined}
                  fx={goals ? `${goals}.` : 'No goal moves that we can see.'}
                  fxTone={c.breaks.length + c.hurts.length ? 'risk' : c.helps.length ? 'help' : undefined}
                  more={[odds, a?.proposed ? 'Your Chief of Staff proposes it: Choose all recommended chooses it.' : '', refused[c.id] ?? (c.blocked ? `${c.blocked.reason} ${c.blocked.fix}` : '')].filter(Boolean).join(' ')}
                  chosen={chosen}
                  onChoose={() => {
                    if (chosen) return;
                    void chooseMove(item, c).then((r) => {
                      if (r?.ok) sound.play('stamp');
                      else if (r && !r.ok) setRefused((m) => ({ ...m, [c.id]: r.block?.reason ?? 'This order needs a confirmation: give it from All orders.' }));
                    });
                  }}
                  aria={`Order: ${c.label}${c.pc ? `, spends ◆ ${c.pc}` : ''}${c.advisers.length ? `, ${advisersLine(c).toLowerCase()}` : ''}. Choose`}
                />
                {chosen && (
                  <button type="button" className="wc-btn small" onClick={() => unchooseMove(c)} aria-label={`Undo: ${c.label}`}>
                    Undo
                  </button>
                )}
              </div>
            );
          })}
          {item.state !== 'decided' && <SkipCard item={item} />}
        </div>
      </div>
    </article>
  );
}

/** "Taipei comes to the table": a goal named by the engine, in the mission line's short words. */
function goalWords(label: string, status: ReturnType<typeof useGameStore.getState>['objectiveStatus']): string {
  const c = status.find((x) => x.label === label);
  return c ? goalName(c, c.label) : label;
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
      <AdvisorList max={max} />
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
  if (item.kind === 'move') return <MoveThing key={item.key} item={item} />;
  if (item.kind === 'orders') return <OrdersThing key={item.key} item={item} />;
  return <OwnOrdersThing key={item.key} item={item} compact={compact} />;
}
