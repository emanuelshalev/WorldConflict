import {
  IconBomb,
  IconCheckbox,
  IconCrown,
  IconCrownOff,
  IconFlame,
  IconLock,
  IconRadioactive,
  IconRocket,
  IconSpeakerphone,
  IconSwords,
  IconTank,
  IconTrendingDown,
  IconWalk,
  type Icon,
} from '@tabler/icons-react';
import { useGameStore } from '../store/gameStore';
import { LAYER_LEGENDS, PATTERN_CSS } from './mapColors';

/**
 * The map rubric: explains what the current layer's colors mean, every icon
 * and line on the map, and how to interact with it.
 */

const badge = (color: string) =>
  ({
    width: 16,
    height: 16,
    borderRadius: 8,
    border: `1.5px solid ${color}`,
    background: '#080c14',
    display: 'inline-grid',
    placeItems: 'center',
    flexShrink: 0,
    margin: '0 1px',
  }) as const;
const unit = (color: string) =>
  ({
    width: 16,
    height: 11,
    flexShrink: 0,
    margin: '0 1px',
    border: `1.5px solid ${color}`,
    background: `linear-gradient(to top right, transparent 45%, ${color} 47%, ${color} 53%, transparent 55%), linear-gradient(to bottom right, transparent 45%, ${color} 47%, ${color} 53%, transparent 55%)`,
  }) as const;

const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 } as const;
const sectionTitle = {
  fontSize: 10,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: '#778',
  margin: '12px 0 6px 0',
};

export function MapGuide({ onClose }: { onClose: () => void }) {
  const mapLayer = useGameStore((s) => s.mapLayer);
  const guide = LAYER_LEGENDS[mapLayer] ?? LAYER_LEGENDS.relations;
  const marker = (I: Icon, color: string, text: string, cls = '') => (
    <div style={row}>
      <span className={`wcm-guide ${cls}`} style={badge(color)}>
        <I size={11} color={color} aria-hidden />
      </span>{' '}
      {text}
    </div>
  );

  return (
    <div
      className="map-guide"
      style={{
        position: 'absolute',
        top: 'calc(var(--under-top, 0px) + 56px)',
        right: 12,
        width: 'min(340px, calc(100% - 24px))',
        // Ends above the bottom of the map stage (the command strip and ticker sit below it)
        maxHeight: 'calc(100% - var(--under-top, 0px) - 68px)',
        overflowY: 'auto',
        background: 'rgba(13,15,20,0.96)',
        border: '1px solid #2a2e3a',
        borderRadius: 10,
        padding: 16,
        color: '#ccd',
        zIndex: 7,
        fontSize: 13,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ color: '#fff', fontSize: 15 }}>Map Guide</b>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}>×</button>
      </div>

      <p style={{ fontSize: 12, color: '#99a', margin: '8px 0' }}>
        This is the world <i>as your intelligence services see it</i>, not ground truth. Estimates shown as
        ranges are uncertain; the better your intel on a country, the closer they are to reality.
      </p>

      {/* Current layer colors */}
      <div style={sectionTitle}>Colors: {guide.title}</div>
      <p style={{ fontSize: 12, color: '#aab', margin: '0 0 8px 0' }}>{guide.description}</p>
      {guide.gradient && (
        <div style={{ margin: '0 0 10px 0' }}>
          <div style={{ height: 10, borderRadius: 3, background: guide.gradient.css, border: '1px solid #0009' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#99a', marginTop: 3 }}>
            <span>{guide.gradient.left}</span>
            {guide.gradient.mid && <span>{guide.gradient.mid}</span>}
            <span>{guide.gradient.right}</span>
          </div>
        </div>
      )}
      {guide.swatches.map((s) => (
        <div key={s.label} style={row}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: s.pattern ? `${PATTERN_CSS[s.pattern]}, ${s.color}` : s.color,
              border: '1px solid #0009',
              flexShrink: 0,
            }}
          />
          {s.label}
        </div>
      ))}
      <div style={{ fontSize: 11, color: '#778', marginTop: 4 }}>
        Switch layers with the buttons at the top right, this guide follows the active layer.
      </div>

      {/* Icons & markings */}
      <div style={sectionTitle}>Icons & markings</div>
      <div style={{ fontSize: 11, color: '#778', margin: '0 0 6px 0' }}>
        Badges sit above a country's name (hover one for details, click it for the dossier). Animated
        ones are live: they come and go with the situation.
      </div>
      {marker(IconRadioactive, '#d4f03c', 'Nuclear strike site: pulsing trefoil, a contamination halo sized by the fallout and a plume drifting downwind', 'rad')}
      {marker(IconRocket, '#ff4fb3', 'Used a nuclear weapon: pariah under a global embargo')}
      {marker(IconSwords, '#ff5a4f', 'War front: blasts where the front line stands (closer to the losing side)')}
      {marker(IconBomb, '#ff8a5c', 'Smoke: hit by airstrikes this month')}
      {marker(IconFlame, '#ff9f43', 'Flames: open rebellion or guerilla war')}
      {marker(IconSpeakerphone, '#ffb347', 'Protest: unrest in the streets, or a government on the brink')}
      {marker(IconTrendingDown, '#ff6b5a', 'Economy shrinking faster than 2% a year')}
      {marker(IconLock, '#c9d2e0', 'Under embargo')}
      {marker(IconCrownOff, '#ff7a59', 'Coup, revolution or assassination this month')}
      {marker(IconCheckbox, '#b48cff', 'Election or confidence vote this month')}
      {marker(IconCrown, '#b48cff', 'New leader this month')}
      {marker(IconWalk, '#e4d9ff', 'Refugees: lilac chevrons flowing out of a struck or losing country')}
      {marker(IconTank, '#f2a93b', 'Your forces are mobilised (50%+)')}
      {marker(IconRadioactive, '#f5d547', 'Nuclear-armed or tested state (always on the Nuclear layer)')}
      <div style={row}>
        <span style={unit('#f2a93b')} /> Your troops massed on a border (with their number)
      </div>
      <div style={row}>
        <span style={unit('#ff5a4f')} /> Foreign troops massed against you (other countries' deployments are not visible)
      </div>
      <div style={row}>
        <span style={{ width: 18, borderTop: '2px dashed #4c8dff', flexShrink: 0 }} />
        Dashed arrow with an icon: an order you queued this month (orders at home sit above your country)
      </div>
      <div style={row}>
        <span style={{ width: 18, height: 3, background: '#7fb2ff', opacity: 0.5, flexShrink: 0 }} />
        Faint blue link: a defense pact (yours brighter)
      </div>
      <div style={row}>
        <span style={{ width: 18, textAlign: 'center', color: '#8cc4ff', fontWeight: 700, fontSize: 11 }}>+6</span>
        Pulsing outline and number: how relations with you moved last month (blue up, orange down)
      </div>
      <div style={row}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: '#dfe6f0', margin: '0 5px', flexShrink: 0 }} />
        Capital city (yours in amber)
      </div>
      <div style={row}>
        <span style={{ width: 18, height: 3, background: '#ff3030', boxShadow: '0 0 5px #ff3030', flexShrink: 0 }} />
        Pulsing red border: country at war
      </div>
      <div style={row}>
        <span style={{ width: 18, borderTop: '2px dashed #39c46a', flexShrink: 0 }} />
        Green dashed line: military pact (of the selected country, or yours)
      </div>
      <div style={row}>
        <span style={{ width: 18, borderTop: '2px dashed #ff4040', flexShrink: 0 }} />
        Red dashed line: active war between those countries
      </div>
      <div style={row}>
        <span style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid #fff', flexShrink: 0 }} />
        White border: currently selected country
      </div>
      <div style={row}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: '#2a6dd9', flexShrink: 0 }} />
        Your nation is drawn more opaque than the rest
      </div>

      {/* Interactions */}
      <div style={sectionTitle}>How to use the map</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#aab', lineHeight: 1.7 }}>
        <li><b style={{ color: '#ccd' }}>Hover</b> a country for a quick intelligence snapshot, leader, relations, GDP and stability (as ranges when uncertain).</li>
        <li><b style={{ color: '#ccd' }}>Click</b> a foreign country for an order menu: the most relevant orders with their ◆ cost (greyed out when you can't afford them or already gave them), plus <i>Dossier</i> for government, history and military estimates. Click your own country for your dossier.</li>
        <li><b style={{ color: '#ccd' }}>Orders from the map</b> go on your desk exactly like orders given there, with the same forecast and warnings.</li>
        <li><b style={{ color: '#ccd' }}>Lines</b> show the selected country's pacts and wars; with nothing selected, they show yours.</li>
        <li><b style={{ color: '#ccd' }}>Zoom/pan</b> with the mouse or the +/− controls at the top left.</li>
      </ul>

      <div style={{ fontSize: 11, color: '#667', marginTop: 12, borderTop: '1px solid #2a2e3a', paddingTop: 8 }}>
        Tip: before an action is committed you will always see a consequence forecast, effects, costs,
        success odds and risks. There is no undo in geopolitics.
      </div>
    </div>
  );
}
