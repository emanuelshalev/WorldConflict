import type { PreviewSource } from './preview';

const tone = (delta: string) => (delta.startsWith('-') ? 'down' : delta.startsWith('+') ? 'up' : 'neutral');

/**
 * The order forecast (design-orders.md §4.2): summary, chance, predicted effects, risks and the
 * mission warning. One component for the desk's order detail, the hover panel beside a tile, the
 * info button on touch, the map menu and the dossier, so every surface reads the same.
 */
export function OrderPreview({ preview, compact = false, id }: { preview: PreviewSource | null; compact?: boolean; id?: string }) {
  if (!preview) return <p className="ord-pv-empty">No forecast yet for this order.</p>;
  const chance = preview.chance ?? preview.successChance ?? null;
  const effects = compact ? preview.effects.slice(0, 3) : preview.effects;
  return (
    <div className={`ord-pv${compact ? ' compact' : ''}`} id={id}>
      {preview.missionWarning && (
        <p className="ord-pv-mission" role="note">
          <b>Mission:</b> {preview.missionWarning}
        </p>
      )}
      {preview.summary && <p className="ord-pv-summary">{preview.summary}</p>}
      {chance !== null && chance !== undefined && (
        <p className="ord-pv-chance">
          <span className="num">{Math.round(chance <= 1 ? chance * 100 : chance)}% chance</span> it works
        </p>
      )}
      {effects.length > 0 && (
        <ul className="ord-pv-effects" aria-label="Predicted effects">
          {effects.map((e, i) => (
            <li key={`${e.metric}-${i}`}>
              <span>
                {e.target && e.target !== 'Global' ? `${e.target}: ` : ''}
                {e.metric}
                {e.note && !compact ? <span className="ord-pv-note"> ({e.note})</span> : null}
              </span>
              <b className={`num fx-${tone(e.delta)}`}>{/^[+-]?\d+(\.\d+)?%?$/.test(e.delta.trim()) ? `about ${e.delta}` : e.delta}</b>
            </li>
          ))}
        </ul>
      )}
      {preview.risks.length > 0 && (
        <ul className="ord-pv-risks" aria-label="Risks">
          {(compact ? preview.risks.slice(0, 2) : preview.risks).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
