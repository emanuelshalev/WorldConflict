import { IconBuildingCommunity, IconCircleCheck, IconCircleX, IconEye, IconMicrophone, IconPhoneCall, IconUsers, IconArrowBackUp, IconAlertTriangle } from '@tabler/icons-react';
import type { OutcomeCardData } from '../lib/debrief';
import type { OutcomeStatus } from '../store/gameStore';
import { flag } from '../lib/format';
import { ActionIcon } from './icons';
import { SceneFrame } from './SceneFrame';
import { OutcomeMap } from './OutcomeMap';
import { FactRow } from './debriefParts';
import { moodForVerdict } from './kinds';
import { Stamp, type StampWord } from '../components/game/Stamp';
import { ExplainText } from '../components/learn/ExplainText';
import { STATUS_STAMP, STATUS_WORD } from '../lib/outcome';

/**
 * R6 with F-02-2: the stamp is the engine's status for the player's own item (DONE, PARTLY,
 * FAILED, REFUSED, NO EFFECT), never a guess from the colour of the numbers. Cards that are not
 * the player's doing (a front, a hot zone, a foreign move) get no stamp.
 */
function stampFor(c: OutcomeCardData): StampWord | undefined {
  return c.status ? STATUS_STAMP[c.status] : undefined;
}

const LINE_ICON: Record<string, typeof IconPhoneCall> = {
  CALL: IconPhoneCall,
  VISIT: IconBuildingCommunity,
  STAFF: IconUsers,
  PRESS: IconMicrophone,
  CRISIS: IconAlertTriangle,
  THEM: IconArrowBackUp,
};

/** "Done, at a cost: Approval -2", "Failed: Russia rejected the ceasefire proposal". */
export function StatusLine({ status, reason }: { status: OutcomeStatus; reason?: string }) {
  const why = (reason ?? '').replace(/^(Carried out|Your answer took effect)/, '').replace(/^[,:]\s*/, '').trim();
  return (
    <p className={`db-status s-${status.toLowerCase()}`} data-status={status}>
      <b>{STATUS_WORD[status]}</b>
      {why ? (/^at a cost/.test(why) ? `, ${why}` : `: ${why}`) : ''}
    </p>
  );
}

function LineIcon({ icon }: { icon?: string }) {
  if (!icon) return null;
  const I = LINE_ICON[icon];
  return I ? <I size={14} aria-hidden /> : <ActionIcon type={icon} size={14} />;
}

/**
 * One outcome: what you did, how they answered, what moved, what to watch. The verdict stamp
 * (DONE, MIXED, FAILED) lands once as the card enters; `stampSound` plays the stamp sound with it
 * (default: the big highlight card only, so a page of cards makes one sound).
 */
export function OutcomeCard({ c, home, big = false, stampSound = big }: { c: OutcomeCardData; home: string; big?: boolean; stampSound?: boolean }) {
  const stamp = stampFor(c);
  const visual = c.front ? (
    <div className="db-front" aria-label={`Front from your side: ${c.front.before} to ${c.front.after} of 100`}>
      <span className="db-front-mid" />
      <span className="db-front-was" style={{ left: `${c.front.before}%` }} />
      <span className={`db-front-now ${c.front.after >= c.front.before ? 'good' : 'bad'}`} style={{ left: `${c.front.after}%` }} />
      <small>
        <span>Losing</span>
        <span>Stalemate</span>
        <span>Winning</span>
      </small>
    </div>
  ) : c.map && (!big || !c.scene) ? (
    <OutcomeMap home={home} target={c.map.target} effect={c.map.effect} ok={c.verdict !== 'bad'} />
  ) : c.scene ? (
    <SceneFrame kind={c.scene} home={home} other={c.country} size={big ? 'card' : 'thumb'} mood={moodForVerdict(c.verdict)} live={big} />
  ) : null;
  return (
    <article className={`db-card v-${c.verdict} ${big ? 'big' : ''}`}>
      {visual && (
        <div className="db-visual">
          {visual}
          {stamp && (
            <span className="db-stamp">
              <Stamp word={stamp} size={big ? 'lg' : 'md'} delay={big ? 500 : 250} sound={stampSound} />
            </span>
          )}
        </div>
      )}
      <div className="db-body">
        {!visual && stamp && (
          <span className="db-stamp in-body">
            <Stamp word={stamp} size="sm" delay={200} sound={stampSound} />
          </span>
        )}
        <div className="db-kicker">
          {c.country && <span className="db-flag">{flag(c.country)}</span>}
          <span>{c.kicker}</span>
          <span className="db-verdict" aria-label={c.verdict}>
            {c.verdict === 'good' ? <IconCircleCheck size={16} /> : c.verdict === 'bad' ? <IconCircleX size={16} /> : c.verdict === 'mixed' ? <span className="db-mixed-glyph" /> : null}
          </span>
        </div>
        <h3 className="db-headline">{c.headline}</h3>
        {c.status && <StatusLine status={c.status} reason={c.reason} />}
        {c.lines.length > 0 && (
          <ul className="db-lines">
            {c.lines.map((l, i) => (
              <li key={i} className={l.ok === false ? 'failed' : ''}>
                <LineIcon icon={l.icon} />
                <ExplainText text={l.text} card={c.lines.map((x) => x.text)} block={i} where={c.headline} />
              </li>
            ))}
          </ul>
        )}
        {c.reaction && (
          <blockquote className={`db-quote t-${c.reaction.tone}`}>
            <p>{/^'.*'$/.test(c.reaction.line) ? c.reaction.line.slice(1, -1) : c.reaction.line}</p>
            <cite>{c.reaction.who}</cite>
          </blockquote>
        )}
        {c.facts.length > 0 && (
          <ul className="facts">
            {c.facts.map((f, i) => (
              <FactRow key={f.label} f={f} i={i} />
            ))}
          </ul>
        )}
        {c.watch && (
          <p className="db-watch">
            <IconEye size={14} aria-hidden /> {c.watch}
          </p>
        )}
      </div>
    </article>
  );
}
