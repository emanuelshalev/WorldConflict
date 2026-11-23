import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SceneFrame } from '../../scenes/SceneFrame';
import type { SceneKind } from '../../scenes/kinds';
import type { Mood } from '../../scenes/art/types';
import { shake } from '../../lib/motion';
import { sound } from '../../lib/sound';
import { Stamp, type StampWord } from './Stamp';
import { CapitalSeal } from './CapitalSeal';
import '../../styles/game.css';

/**
 * The briefing card (design-feel.md section 3, concepts/feel-cards.html): one physical card shell
 * for crisis and meeting options, orders, staff suggestions and plan slots. An illustration band
 * from the scene this card will play as, a title that never ellipsizes, its cost in seals, and a
 * reason on its face when it cannot be played.
 *
 * Motion: lifts on hover, sinks on pointerdown (under 100 ms, before any network), stamps when
 * chosen, shakes when refused. Sound: `tap` on press, `stamp` when a stamp lands after mount,
 * `refuse` when an unavailable card is pressed. Reduced motion swaps transforms for border and
 * opacity changes (feel.css, game.css).
 */

export type CardLayout = 'tile' | 'row' | 'slot';
export type CardState = 'rest' | 'chosen' | 'approved' | 'unavailable' | 'queued' | 'resolved';
export type CardTag = 'cabinet' | 'best' | 'both';

export interface CardReason {
  /** Bold first sentence: "Needs 2 seals, you have 1." */
  title: string;
  /** The fix: "Remove Reform program to free 2." */
  fix?: string;
  /** Point at the thing the reason is about (orders' pointAt('capital')). */
  point?: () => void;
  /** Link text for `point` (default "Show me the seals"). */
  pointLabel?: string;
}

export interface CardShellProps {
  layout?: CardLayout;
  /** Stable id, exposed as data-card-id (seal flights and FLIP find the card by it). */
  id?: string;
  title: string;
  /** Description (2-line clamp on tiles, hidden on 1024 tiles and slots). */
  description?: ReactNode;
  /** Small line at the bottom: "Backed by the Foreign Minister". */
  byline?: ReactNode;
  /** Scene kind for the illustration band (use sceneForChoice / sceneForAction). */
  art?: SceneKind;
  /** Replaces the scene in the band (order cards: the family band of compact tiles). */
  artNode?: ReactNode;
  /** Extra layer drawn over the band (order cards: the family chip of compact tiles). */
  artOverlay?: ReactNode;
  /** Above the title, overlapping the band on tiles (order cards: pictogram plate and family chip). */
  lead?: ReactNode;
  home?: string;
  other?: string;
  mood?: Mood;
  /** Keyboard digit chip, top left (1, 2, 3). */
  keyHint?: string | number;
  /** Cost chip, top right: usually <CardCost />. */
  cost?: ReactNode;
  tag?: CardTag;
  /** Override the tag words. */
  tagText?: string;
  /** One mission ribbon at most: red "Risks your mission: ..." or green "Helps: ...". */
  ribbon?: { tone: 'risk' | 'help'; text: string };
  state?: CardState;
  /** The stamp on the art (YOUR PICK, APPROVED, ORDERED, DONE, MIXED, FAILED). */
  stamp?: StampWord;
  /** Delay the stamp's landing (and its sound), ms: Approve all stamps cards 90 ms apart. */
  stampDelay?: number;
  /** Play the stamp sound even when the stamp is there on mount (debrief: first card only). */
  stampSoundOnMount?: boolean;
  /** A sibling was chosen: this card steps back to 78% opacity (never lower). */
  dimmed?: boolean;
  /** Why it cannot be played (state "unavailable"): shown on the card, never only as a tooltip. */
  reason?: CardReason;
  /** Pressed while playable. */
  onPress?: () => void;
  /** Pressed while unavailable: the card shakes and plays `refuse`; shake the bank here too. */
  onRefuse?: () => void;
  /** Queued: the Undo button on the ghost. */
  onUndo?: () => void;
  /** Queued ghost words (default "In this month's plan"). */
  queuedText?: string;
  /** Extra body content after the description: effect chips, odds. */
  children?: ReactNode;
  /** Accessible name of the press target (default: the title). */
  ariaLabel?: string;
  className?: string;
}

const TAG_TEXT: Record<CardTag, string> = {
  cabinet: 'Recommended',
  best: 'Best for your mission',
  both: 'Recommended · good for your mission',
};

export function CardShell({
  layout = 'tile',
  id,
  title,
  description,
  byline,
  art,
  artNode,
  artOverlay,
  lead,
  home,
  other,
  mood = 'neutral',
  keyHint,
  cost,
  tag,
  tagText,
  ribbon,
  state = 'rest',
  stamp,
  stampDelay = 0,
  stampSoundOnMount = false,
  dimmed = false,
  reason,
  onPress,
  onRefuse,
  onUndo,
  queuedText = "In this month's plan",
  children,
  ariaLabel,
  className = '',
}: CardShellProps) {
  const root = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  // A stamp that arrives after mount is an action: it gets the stamp sound
  const [firstStamp] = useState(stamp);
  const stampSound = !!stamp && (stampSoundOnMount || stamp !== firstStamp);
  useEffect(() => {
    if (!pressed) return;
    const up = () => setPressed(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [pressed]);

  const off = state === 'unavailable';
  const queued = state === 'queued';
  const playable = !off && !queued && !!onPress;
  const descId = id ? `wc-card-${id}-body` : undefined;

  const press = () => {
    if (off) {
      sound.play('refuse');
      shake(root.current);
      onRefuse?.();
      return;
    }
    if (queued) return;
    onPress?.();
  };

  return (
    <div
      ref={root}
      className={`wc-card wc-card-${layout} is-${state}${pressed ? ' is-pressed' : ''}${dimmed ? ' is-dimmed' : ''}${tag ? ' has-tag' : ''}${playable ? ' is-playable' : ''} ${className}`.trim()}
      data-card=""
      data-card-id={id}
      data-state={state}
    >
      {tag && <span className={`wc-card-tag tag-${tag}`}>{tagText ?? TAG_TEXT[tag]}</span>}
      <button
        type="button"
        className="wc-card-hit"
        aria-label={ariaLabel ?? title}
        aria-describedby={descId}
        aria-disabled={off || queued || undefined}
        aria-pressed={state === 'chosen' || state === 'approved' ? true : undefined}
        onPointerDown={(e) => {
          if (e.button !== 0 || queued) return;
          if (!off) {
            setPressed(true);
            sound.play('tap');
          }
        }}
        onClick={press}
      />
      <div className="wc-card-art" aria-hidden>
        {artNode ?? (art ? <SceneFrame kind={art} home={home} other={other} mood={mood} size="thumb" /> : <div className="wc-card-art-blank" />)}
        {artOverlay}
        {keyHint !== undefined && layout !== 'slot' && <span className="wc-card-key num">{keyHint}</span>}
        {cost && <span className="wc-card-cost">{cost}</span>}
        {ribbon && layout === 'tile' && <span className={`wc-card-ribbon ribbon-${ribbon.tone}`}>{ribbon.tone === 'risk' ? '!' : '+'} {ribbon.text}</span>}
      </div>
      {stamp && (
        <span className="wc-card-stamp">
          <Stamp key={stamp} word={stamp} size={layout === 'tile' ? 'md' : 'sm'} delay={stampDelay} sound={stampSound} />
        </span>
      )}
      <div className="wc-card-body" id={descId}>
        {lead && <div className="wc-card-lead">{lead}</div>}
        <h3 className="wc-card-title">{title}</h3>
        {ribbon && layout !== 'tile' && <span className={`wc-card-ribbon-inline ribbon-${ribbon.tone}`}>{ribbon.text}</span>}
        {description && layout !== 'slot' && <div className="wc-card-desc">{description}</div>}
        {children}
        {byline && layout !== 'slot' && <div className="wc-card-byline">{byline}</div>}
      </div>
      {off && reason && (
        <div className="wc-card-reason" role="note">
          <span>
            <b>{reason.title}</b>
            {reason.fix ? ` ${reason.fix}` : ''}
          </span>
          {reason.point && (
            <button type="button" className="wc-card-point" onClick={reason.point}>
              {reason.pointLabel ?? 'Show me the seals'} <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}
      {queued && (
        <div className="wc-card-queued">
          <span>{queuedText}</span>
          {onUndo && (
            <button type="button" className="wc-card-undo" onClick={onUndo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface EffectChip {
  /** Full words: "Approval down a lot", "Yemen's view of you up". */
  text: string;
  tone: 'up' | 'down' | 'neutral';
}

/** Two key effects in words, then "+n more" (design-month 3.4). Colour never carries meaning alone. */
export function EffectChips({ effects, max = 2, onMore }: { effects: EffectChip[]; max?: number; onMore?: () => void }) {
  const shown = effects.slice(0, max);
  const more = effects.length - shown.length;
  return (
    <div className="wc-card-fx">
      {shown.map((e) => (
        <span key={e.text} className={`fx-${e.tone}`}>
          {e.text}
        </span>
      ))}
      {more > 0 &&
        (onMore ? (
          <button type="button" className="fx-more" onClick={onMore}>
            +{more} more
          </button>
        ) : (
          <span className="fx-more">+{more} more</span>
        ))}
    </div>
  );
}

export interface CardCostProps {
  /** Seals the card costs (0 = free). */
  seals: number;
  /** Seals you are short of: drawn as empty holes (unavailable) or red "short" seals (refused). */
  missing?: number;
  /** Show the missing seals as red short seals instead of holes (while refused or hovered). */
  alarm?: boolean;
  /** Gives political capital instead: "+1" with a minted seal. */
  gain?: number;
  size?: number;
}

/**
 * The cost chip: seals, "free" as a word, holes for what is missing, or "+1" with a new seal.
 * The chip carries `data-seal-target`, where a spending flight lands.
 */
export function CardCost({ seals, missing = 0, alarm = false, gain = 0, size = 22 }: CardCostProps) {
  if (gain > 0)
    return (
      <span className="wc-cost wc-cost-gain" data-seal-target="" aria-label={`Gives ${gain} political capital`}>
        <CapitalSeal variant="new" size={size} /> +{gain}
      </span>
    );
  if (seals <= 0)
    return (
      <span className="wc-cost wc-cost-free" data-seal-target="">
        free
      </span>
    );
  const have = Math.max(0, seals - missing);
  return (
    <span className="wc-cost" data-seal-target="" role="img" aria-label={`Costs ${seals} political capital${missing ? `, ${missing} missing` : ''}`}>
      {Array.from({ length: have }, (_, i) => (
        <CapitalSeal key={`f${i}`} variant="full" size={size} />
      ))}
      {Array.from({ length: Math.min(missing, seals) }, (_, i) =>
        alarm ? <CapitalSeal key={`s${i}`} variant="short" size={size} className="wc-seal-flash" /> : <span key={`h${i}`} className="wc-cost-hole" style={{ width: size, height: size }} />,
      )}
    </span>
  );
}
