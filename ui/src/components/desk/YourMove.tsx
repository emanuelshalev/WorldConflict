import { useState } from 'react';
import { IconCheck, IconChevronDown, IconChevronUp, IconMessageCircle, IconUserShare } from '@tabler/icons-react';
import { type DecisionOption, type Impact, type Meeting, MEETING_SLOTS, type MissionNote, type PendingDecision, countryName, useGameStore, usePlayerCountry } from '../../store/gameStore';
import { ADVISOR_NAMES, arrowText, effectArrows, flag } from '../../lib/format';
import { cabinetPick, crisisSelection, guideLede, splitLede, effectWords, meetingAdviser, meetingPick, meetingSelection, missionPick, missionTag, type Selection } from '../../lib/month';
import { SceneFrame } from '../../scenes/SceneFrame';
import { type SceneKind, avoidRepeat, crisisMood, sceneForCrisis, sceneForDecision } from '../../scenes/kinds';
import { CardCost, CardShell, EffectChips, type CardTag } from '../game/CardShell';
import { useGoalHighlight } from '../../lib/goals';
import { CoachBubble } from './Coach';
import { useNarrow } from '../../lib/useNarrow';
import { ExplainText } from '../learn/ExplainText';
import { SituationButton } from '../learn/SituationBriefing';
import { optionSizes } from '../../lib/ease';
import '../../styles/month.css';

/**
 * The Your move card (design-month.md 3.4) on the desk stage (design-feel.md 5): the crisis scene
 * is the hero, the situation's first sentence in its lower third, the staff line on its bottom
 * edge, and the options as briefing cards that overlap the stage. Every option says its two key
 * effects in words and at most one mission tag; the selection is always named (Cabinet pick,
 * Approved, Your pick). The same stage serves every crisis and meeting on the full desk.
 */

const INITIALS: Record<string, string> = {
  FOREIGN_MINISTER: 'FM',
  DEFENSE_MINISTER: 'DM',
  FINANCE_MINISTER: 'FN',
  INTELLIGENCE_CHIEF: 'IC',
  DOMESTIC_ADVISOR: 'IM',
  CHIEF_OF_STAFF: 'CS',
};

const KIND_SCENE: Record<Meeting['kind'], SceneKind> = { CALL: 'summit', STAFF: 'cabinet', VISIT: 'summit', PRESS: 'tv_interview' };
const KIND_WORD: Record<Meeting['kind'], string> = { CALL: 'Call', STAFF: 'Staff meeting', VISIT: 'State visit', PRESS: 'Interview' };

const isMeeting = (x: PendingDecision | Meeting): x is Meeting => 'kind' in x && 'speaker' in x;

const advisorFor = (m: Meeting): string => meetingAdviser(m);

/** The previous month's crisis scene, so the backdrop does not repeat (R7). */
function previousScene(): SceneKind | undefined {
  const d = useGameStore.getState().worldState?.turnReport?.decisions.find((x) => !x.kind || x.kind === 'CRISIS');
  return d ? sceneForCrisis(d.templateId, d.title) : undefined;
}

export function SelectionBadge({ sel }: { sel: Selection }) {
  return (
    <span className={`sel-badge sel-${sel.kind}`} data-selection={sel.kind}>
      {sel.kind === 'approved' && <IconCheck size={14} aria-hidden />}
      {sel.text}
    </span>
  );
}

function OptionCard({
  item,
  o,
  i,
  chosenId,
  sel,
  tag,
  tagText,
  home,
  other,
  disabledReason,
  onPick,
  onMore,
  highlight,
  card,
  brief = false,
}: {
  /** Guide me before More: no description on the card, just the label and its effects (F-02-1). */
  brief?: boolean;
  /** Text blocks of the whole crisis card (learning aids: density rules span the card). */
  card?: readonly string[];
  item: PendingDecision | Meeting;
  o: DecisionOption;
  i: number;
  chosenId?: string;
  sel: Selection;
  tag?: CardTag;
  tagText?: string;
  home?: string;
  other?: string;
  disabledReason?: string;
  onPick: () => void;
  onMore: () => void;
  highlight: boolean;
}) {
  const impact = useGameStore((s) => s.missionImpact[item.id]?.[o.id]);
  const status = useGameStore((s) => s.objectiveStatus);
  const mt = missionTag(impact, status);
  const words = effectWords(o);
  const chosen = chosenId === o.id && (sel.kind === 'yours' || sel.kind === 'approved');
  const pc = o.effects.pc ?? 0;
  const art = sceneForDecision({ kind: isMeeting(item) ? item.kind : undefined, templateId: item.templateId, title: item.title, label: o.label });
  const impacts = useGameStore((st) => st.missionImpact[item.id]);
  const backers = shownBackers(o, impacts);
  const phone = useNarrow(600);
  const [showSizes, setShowSizes] = useState(false);
  const sizes = optionSizes(o, countryName);
  return (
    <CardShell
      id={`${item.id}-${o.id}`}
      title={o.label}
      description={brief ? undefined : <ExplainText text={o.description} card={card} block={card ? card.indexOf(o.description) : 0} where={item.title} />}
      art={art}
      home={home}
      other={other}
      mood={mt?.tone === 'risk' ? 'bad' : 'neutral'}
      keyHint={i + 1}
      cost={<CardCost seals={pc < 0 ? -pc : 0} gain={pc > 0 ? pc : 0} />}
      tag={tag}
      tagText={tagText}
      ribbon={mt ? { tone: mt.tone === 'risk' ? 'risk' : 'help', text: `${mt.text}${mt.more > 0 ? ` +${mt.more} more` : ''}` } : undefined}
      layout={phone ? 'row' : 'tile'}
      state={disabledReason ? 'unavailable' : chosen ? (sel.kind === 'approved' ? 'approved' : 'chosen') : 'rest'}
      stamp={chosen ? (sel.kind === 'approved' ? 'ACCEPTED' : 'YOUR PICK') : undefined}
      dimmed={!!chosenId && chosenId !== o.id && (sel.kind === 'yours' || sel.kind === 'approved')}
      reason={disabledReason ? { title: disabledReason } : undefined}
      onPress={onPick}
      className={`move-card${highlight && mt && mt.tone !== 'risk' ? ' is-pointed' : ''}${mt ? ` mt-${mt.tone}` : ''}`}
      ariaLabel={`${o.label}${mt ? `. ${mt.text}` : ''}${words.length ? `. ${words.slice(0, 2).map((w) => w.text).join(', ')}` : ''}`}
      byline={backers.length ? `Backed by the ${backers.join(' and the ')}` : undefined}
    >
      <EffectChips effects={words.map((w) => ({ text: w.text, tone: w.tone }))} max={2} onMore={onMore} />
      {sizes.length > 0 && (
        <button type="button" className="fx-size-btn" aria-expanded={showSizes} onClick={() => setShowSizes((v) => !v)} data-effect-sizes="">
          {showSizes ? 'Hide sizes' : 'How much?'}
        </button>
      )}
      {showSizes && (
        <ul className="fx-sizes" aria-label={`${o.label}: effect sizes`}>
          {sizes.slice(0, 5).map((s) => (
            <li key={s.text} className={`fx-${s.tone}`}>
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </CardShell>
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

/** The full situation and every effect arrow, so nothing is lost behind the lede. */
function MoreDetail({ item, options }: { item: PendingDecision | Meeting; options: DecisionOption[] }) {
  const impacts = useGameStore((s) => s.missionImpact[item.id]);
  return (
    <div className="move-more">
      {options.map((o) => {
        const imp = impacts?.[o.id];
        return (
          <div key={o.id} className="move-more-row">
            <b>{o.label}</b>
            {shownBackers(o, impacts).length > 0 && <span className="move-more-back">Backed by the {shownBackers(o, impacts).join(' and the ')}</span>}
            <div className="arrows">
              {effectArrows(o, countryName).map((a, i) => (
                <span key={`${a.label}-${i}`} className={a.good ? 'delta-up' : 'delta-down'}>
                  {arrowText(a)}
                </span>
              ))}
            </div>
            {imp && imp.helps.length + imp.hurts.length + imp.breaks.length + imp.bonusHelps.length > 0 && (
              <div className="move-more-mission">
                {imp.breaks.map((x) => <span key={`b${x}`} className="tag-risk">Breaks: {x}</span>)}
                {imp.hurts.map((x) => <span key={`h${x}`} className="tag-risk">Hurts: {x}</span>)}
                {imp.helps.map((x) => <span key={`p${x}`} className="tag-help">Helps: {x}</span>)}
                {imp.bonusHelps.map((x) => <span key={`o${x}`} className="tag-bonus">Helps: {x} (bonus)</span>)}
              </div>
            )}
            {o.followUp && <div className="move-more-later">The outcome comes later: we will tell you when it lands.</div>}
          </div>
        );
      })}
    </div>
  );
}

/** One crisis or meeting on the stage: hero scene, lede, staff line, option cards, named selection. */
export function DecisionStage({ item, primary = false, onlyLede = false }: { item: PendingDecision | Meeting; primary?: boolean; onlyLede?: boolean }) {
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const choose = useGameStore((s) => s.chooseDecision);
  const status = useGameStore((s) => s.objectiveStatus);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const difficulty = useGameStore((s) => s.worldState?.difficulty);
  const me = usePlayerCountry();
  const hl = useGoalHighlight((s) => s.index);
  const desktop = typeof window !== 'undefined' && window.innerWidth >= 1280;
  const [more, setMore] = useState(desktop && !onlyLede);
  const meeting = isMeeting(item) ? item : null;
  const home = me?.id;
  const other = meeting?.withCountry ?? item.affectedCountries.find((id) => id !== home);
  const options = meeting ? item.options.filter((o) => o.id !== meeting.defaultOptionId) : item.options;
  const sel = meeting ? meetingSelection(meeting, choices, reviewed) : crisisSelection(item, choices, reviewed);
  const cab = meeting ? meetingPick(meeting) : cabinetPick(item);
  // The engine's mission note: the honest words for the mission pick (a trade-off is named as one)
  const note = meeting ? undefined : useGameStore.getState().advice?.missionNotes?.[item.id];
  const notes = !!useGameStore.getState().advice?.missionNotes;
  const best = meeting ? undefined : notes ? (note ? item.options.find((o) => o.id === note.optionId) : undefined) : missionPick(item);
  const bestText = note ? bestTagText(note) : undefined;
  const chosenId = choices[item.id] ?? (meeting ? undefined : cab?.id);
  const urgency = item.urgency === 'EXISTENTIAL' ? 'Existential' : item.urgency === 'URGENT' ? 'Urgent' : '';
  const kindWord = meeting ? KIND_WORD[meeting.kind] : 'Crisis';
  const kicker = `${primary ? 'Your move · ' : ''}${urgency ? `${urgency} ` : ''}${urgency ? kindWord.toLowerCase() : kindWord}`;
  const scene = meeting ? KIND_SCENE[meeting.kind] : avoidRepeat(sceneForCrisis(item.templateId, item.title, item.situation), previousScene());
  const [fullLede, fullRest] = splitLede(item.situation);
  // Guide me shows fewer words before the first choice (F-02-1): a short lede, no option
  // descriptions and a short staff line; More brings back every word, still underlined
  const guide = useGameStore((s) => s.learn.level === 'guide');
  const g = guide ? guideLede(fullLede) : { short: fullLede, trimmed: false };
  const lede = g.short;
  const rest = g.trimmed ? [fullLede, fullRest].filter(Boolean).join(' ') : fullRest;
  const brief = guide && !more;
  // One card for the learning aids: lede, rest and option texts share the density rules
  const card = [lede, rest ?? '', ...options.map((o) => o.description)];
  const attended = meeting ? agenda.filter((x) => x.id !== meeting.id && choices[x.id] && choices[x.id] !== x.defaultOptionId).length : 0;
  const full = !!meeting && attended >= MEETING_SLOTS && !choices[meeting.id];
  const cabTag = cab ? missionTag(useGameStore.getState().missionImpact[item.id]?.[cab.id], status) : null;
  // Offer a switch only when the mission pick is better on the very goal the cabinet pick hurts
  const disagree = !meeting && cab && best && best.id !== cab.id && sel.kind === 'cabinet' && (notes ? note?.switchFrom?.cabinetId === cab.id : cabTag?.tone === 'risk');
  // The highlighted objective (goal line step): which options move it
  const helpsHighlighted = (o: DecisionOption) => hl !== null && !!useGameStore.getState().missionImpact[item.id]?.[o.id]?.links?.some((l) => l.index === hl && l.effect === 'helps');
  const lead = cab?.backedBy[0] ?? (meeting ? advisorFor(meeting) : 'CHIEF_OF_STAFF');
  const quote = cab ? (guide ? guideLede(splitLede(cab.description)[0], 12).short : splitLede(cab.description)[0]) : '';
  const consult = () => useGameStore.getState().consult(lead, `${item.title}: what do you advise, and what are the risks of each option?`);
  return (
    <article className={`stage${primary ? ' is-primary' : ''}${item.urgency === 'EXISTENTIAL' ? ' existential' : item.urgency === 'URGENT' ? ' urgent' : ''}`} aria-label={`${primary ? 'Your move: ' : ''}${item.title}`} data-point={primary ? 'move' : undefined}>
      <div className="stage-hero">
        <SceneFrame kind={scene} home={home} other={other} mood={crisisMood(item.templateId) ?? (item.urgency === 'ROUTINE' ? 'neutral' : 'bad')} size="card" />
        <div className="stage-shade" aria-hidden />
        <div className="stage-text">
          <span className={`stage-kicker${urgency ? ' hot' : ''}`}>
            {kicker}
            {item.affectedCountries.length > 0 && <span className="stage-flags" aria-hidden>{item.affectedCountries.slice(0, 3).map((id) => flag(id)).join(' ')}</span>}
          </span>
          <h2 className="stage-title">{meeting ? `${meeting.speaker}` : item.title}</h2>
          {meeting && <p className="stage-sub">{item.title}</p>}
          <p className="stage-lede">
            <ExplainText text={lede} card={card} block={0} info where={item.title} />
            {(rest || options.length > 0) && (
              <>
                {' '}
                <button type="button" className="link stage-more" onClick={() => setMore((v) => !v)} aria-expanded={more}>
                  {more ? 'Less' : 'More'} {more ? <IconChevronUp size={13} aria-hidden /> : <IconChevronDown size={13} aria-hidden />}
                </button>
              </>
            )}
          </p>
        </div>
        {primary && <CoachBubble step="move" />}
      </div>
      <p className="stage-lede-phone">
        <ExplainText text={lede} card={card} block={0} info where={item.title} />{' '}
        {(rest || options.length > 0) && (
          <button type="button" className="link stage-more" onClick={() => setMore((v) => !v)} aria-expanded={more}>
            {more ? 'Less' : 'More'}
          </button>
        )}
      </p>
      {!meeting && (
        <div className="lx-situation-row">
          <SituationButton blocks={[item.situation, ...options.map((o) => o.description)]} cardTitle={item.title} />
        </div>
      )}
      <div className="stage-staff">
        <span className="staff-avatar" aria-hidden>{INITIALS[lead] ?? 'CS'}</span>
        <p>
          <b>{ADVISOR_NAMES[lead] ?? 'Chief of Staff'}:</b> {quote ? <>“{quote}”</> : 'Your call.'}
        </p>
        <SelectionBadge sel={sel} />
        {!meeting && sel.kind === 'cabinet' && cab && (
          <button type="button" className="wc-btn ghost small move-approve" onClick={() => choose(item.id, choices[item.id] ?? cab.id)}>
            <IconCheck size={14} aria-hidden /> Accept recommended
          </button>
        )}
        {meeting && sel.kind === 'waiting' && cab && !full && (
          <button type="button" className="wc-btn ghost small" onClick={() => choose(item.id, cab.id)}>
            <IconCheck size={14} aria-hidden /> Attend: {cab.label}
          </button>
        )}
        {meeting && choices[item.id] !== meeting.defaultOptionId && meeting.defaultOptionId && (
          <button type="button" className="wc-btn ghost small" onClick={() => choose(item.id, meeting.defaultOptionId as string)}>
            <IconUserShare size={14} aria-hidden /> Send a deputy
          </button>
        )}
        {difficulty === 'ANALYST' && !meeting && <span className="move-note">Easy: your cabinet never picks against your mission.</span>}
        <button type="button" className="wc-btn ghost small" onClick={consult}>
          <IconMessageCircle size={15} aria-hidden /> Ask your staff
        </button>
      </div>
      {full && <p className="stage-warn">Your calendar is full: you attend 3 meetings this month. Send a deputy to another meeting to take this one.</p>}
      <div className={`move-cards n-${Math.min(options.length, 4)}`}>
        {options.map((o, i) => (
          <OptionCard
            key={o.id}
            item={item}
            o={o}
            i={i}
            chosenId={meeting ? choices[item.id] : chosenId}
            sel={sel}
            tag={cab?.id === o.id ? (best && best.id === o.id ? 'both' : 'cabinet') : best?.id === o.id ? 'best' : undefined}
            tagText={best?.id === o.id && bestText ? (cab?.id === o.id ? bestText.both : bestText.best) : undefined}
            home={home}
            other={other}
            disabledReason={full ? 'Your calendar is full.' : undefined}
            onPick={() => choose(item.id, o.id)}
            onMore={() => setMore(true)}
            highlight={helpsHighlighted(o)}
            card={card}
            brief={brief}
          />
        ))}
      </div>
      {disagree && cab && best && (
        <p className="move-disagree" role="note">
          Your cabinet backs <b>{cab.label}</b>, but it {(note?.switchFrom ? note.switchFrom.breaks : cabTag?.text.startsWith('Breaks')) ? 'breaks' : 'hurts'} {note?.switchFrom?.goal ?? cabTag?.text.replace(/^\w+: /, '')}.
          {note?.kind === 'tradeoff' || note?.kind === 'least' ? ` ${best.label} spares it, though it costs ${note.costs.join(' and ')}.` : ''}{' '}
          <button type="button" className="wc-btn small" onClick={() => choose(item.id, best.id)}>
            Switch to {best.label}
          </button>
        </p>
      )}
      {more && rest && <ExplainText as="p" className="stage-rest" text={rest} card={card} block={1} info where={item.title} />}
      {more && <MoreDetail item={item} options={options} />}
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

/** The month's primary decision, or a quiet month's top advisor move. */
export function YourMove({ item }: { item: PendingDecision | Meeting }) {
  return <DecisionStage item={item} primary onlyLede />;
}
