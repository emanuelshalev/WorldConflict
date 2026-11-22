import type { EraMap } from '../../store/gameStore';
import { SITUATION_KINDS, situationKindOf } from '../../lib/crisisKind';
import { CALM_PINS, type Density, eraPins } from './eraLayers';

interface Props {
  era: EraMap;
  density: Density;
  onDensity: (d: Density) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  /** list: the dossier (desktop); strip: horizontal cards under the era chips (phone). */
  variant: 'list' | 'strip';
  /** The card is open: one line per fire. */
  compact?: boolean;
}

/**
 * "This era's five fires" (variant B) and the one switch that shows every situation and rival
 * line (variant A). The numbers match the numbered pins on the globe.
 */
export function EraFires({ era, density, onDensity, selected, onSelect, variant, compact }: Props) {
  const pins = eraPins(era, density);
  const n = era.situations.length;
  const all = density === 'all';
  return (
    <div className={`era-fires ${variant} ${compact ? 'compact' : ''}`}>
      {variant === 'list' && <div className="ts2-label">{all ? `All ${n} situations` : `This era's ${Math.min(CALM_PINS, n)} fires`}</div>}
      <ol className="era-fire-list" aria-label={all ? 'Situations in this era' : "This era's five fires"}>
        {pins.map((p) => {
          const k = SITUATION_KINDS[situationKindOf(p.situation.kind)];
          const K = k.icon;
          const on = selected === p.id;
          return (
            <li key={p.id}>
              <button type="button" className={`era-fire ${on ? 'on' : ''} ph-${p.situation.phase.toLowerCase()}`} aria-pressed={on} onClick={() => onSelect(p.id)} data-situation={p.id}>
                <span className="era-fire-num num">{p.num ?? '·'}</span>
                <span className="era-fire-pin" style={{ ['--pin' as string]: k.color, color: k.ink ?? '#fff' }} aria-hidden>
                  <K size={13} stroke={2.2} />
                </span>
                <span className="era-fire-body">
                  <b>{p.situation.title}</b>
                  {!compact && <small>{p.situation.blurb}</small>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <label className="era-switch">
        <input type="checkbox" role="switch" checked={all} aria-checked={all} onChange={(e) => onDensity(e.target.checked ? 'all' : 'calm')} />
        <span className="era-switch-track" aria-hidden />
        <span>Show all {n} situations and rival lines</span>
      </label>
    </div>
  );
}
