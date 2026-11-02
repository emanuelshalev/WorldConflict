import { IconMessageCircle, IconX } from '@tabler/icons-react';
import { countryName, useGameStore } from '../store/gameStore';
import { flag } from '../lib/format';
import { heat, METER_LABELS, needLabel, phaseLabel } from '../lib/hotspots';

/** A hot zone's card: phase, the five meters, the latest incidents and who carries it. */
export function HotspotCard({ id, onClose }: { id: string; onClose: () => void }) {
  const world = useGameStore((s) => s.worldState);
  const consult = useGameStore((s) => s.consult);
  const h = world?.hotspots?.find((x) => x.id === id);
  if (!world || !h) return null;
  const { line } = heat(h);
  const me = world.playerCountryId;
  const involved = [h.occupier, h.people, ...(h.id === 'GAZA' ? ['EGY', 'USA'] : ['USA'])];
  const ago = (t: number) => {
    const n = world.turn - 1 - t;
    return n <= 0 ? 'This month' : n === 1 ? 'Last month' : `${n} months ago`;
  };
  const since = world.turn - h.phaseSince;
  return (
    <aside className="zone-card" style={{ ['--hot' as string]: line }} aria-label={`${h.name}: ${phaseLabel(h)}`}>
      <button className="zone-close" onClick={onClose} aria-label="Close">
        <IconX size={16} />
      </button>
      <h3>{h.name}</h3>
      <span className="zone-phase">
        {phaseLabel(h)}
        {since > 1 ? ` · ${since} months` : ''}
      </span>
      <div className="zone-meters">
        {METER_LABELS(h).map((m) => {
          const v = Math.round(h[m.key] as number);
          const color = m.bad
            ? v >= 65 ? 'var(--bad)' : v >= 40 ? 'var(--tough)' : 'var(--good)'
            : v >= 55 ? 'var(--good)' : v >= 30 ? 'var(--tough)' : 'var(--bad)';
          return (
            <div key={m.key} className="zone-meter">
              <span>{m.label}</span>
              <b>{v}</b>
              <div className="bar" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={m.label}>
                <i style={{ width: `${v}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      {h.incidents.length > 0 && (
        <ul className="zone-news">
          {h.incidents.slice(0, 4).map((n) => (
            <li key={`${n.turn}-${n.kind}`}>
              <span>{ago(n.turn)}</span>
              {n.title}
            </li>
          ))}
        </ul>
      )}
      <p className="zone-foot">
        {involved.map((c) => `${flag(c)} ${countryName(c)}`).join(' · ')}. People here face {needLabel(h)}.
        {involved.includes(me)
          ? ' Decisions on this place reach your desk as crises and staff meetings.'
          : ' It reaches your desk when the world is asked to take sides.'}
      </p>
      <button
        className="wc-btn ghost"
        onClick={() => {
          onClose();
          consult('FOREIGN_MINISTER', `What is our line on ${h.name}?`);
        }}
      >
        <IconMessageCircle size={16} /> Ask the Foreign Minister
      </button>
    </aside>
  );
}
