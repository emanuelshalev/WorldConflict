import { IconBuildingCommunity, IconCircleCheck, IconCircleX, IconEye, IconMicrophone, IconPhoneCall, IconUsers, IconArrowBackUp, IconAlertTriangle } from '@tabler/icons-react';
import type { OutcomeCardData } from '../lib/debrief';
import { flag } from '../lib/format';
import { ActionIcon } from './icons';
import { SceneFrame } from './SceneFrame';
import { OutcomeMap } from './OutcomeMap';
import { FactRow } from './debriefParts';

const LINE_ICON: Record<string, typeof IconPhoneCall> = {
  CALL: IconPhoneCall,
  VISIT: IconBuildingCommunity,
  STAFF: IconUsers,
  PRESS: IconMicrophone,
  CRISIS: IconAlertTriangle,
  THEM: IconArrowBackUp,
};

function LineIcon({ icon }: { icon?: string }) {
  if (!icon) return null;
  const I = LINE_ICON[icon];
  return I ? <I size={14} aria-hidden /> : <ActionIcon type={icon} size={14} />;
}

/** One outcome: what you did, how they answered, what moved, what to watch. */
export function OutcomeCard({ c, home, big = false }: { c: OutcomeCardData; home: string; big?: boolean }) {
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
    <SceneFrame kind={c.scene} home={home} other={c.country} size={big ? 'card' : 'thumb'} mood={c.verdict === 'bad' ? 'bad' : c.verdict === 'good' ? 'good' : 'neutral'} live={big} />
  ) : null;
  return (
    <article className={`db-card v-${c.verdict} ${big ? 'big' : ''}`}>
      {visual && <div className="db-visual">{visual}</div>}
      <div className="db-body">
        <div className="db-kicker">
          {c.country && <span className="db-flag">{flag(c.country)}</span>}
          <span>{c.kicker}</span>
          <span className="db-verdict" aria-label={c.verdict}>
            {c.verdict === 'good' ? <IconCircleCheck size={16} /> : c.verdict === 'bad' ? <IconCircleX size={16} /> : null}
          </span>
        </div>
        <h3 className="db-headline">{c.headline}</h3>
        {c.lines.length > 0 && (
          <ul className="db-lines">
            {c.lines.map((l, i) => (
              <li key={i} className={l.ok === false ? 'failed' : ''}>
                <LineIcon icon={l.icon} />
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        )}
        {c.reaction && (
          <blockquote className={`db-quote t-${c.reaction.tone}`}>
            <p>{c.reaction.line.replace(/^'|'$/g, '')}</p>
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
