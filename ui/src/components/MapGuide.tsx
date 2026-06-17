import { useGameStore } from '../store/gameStore';

/**
 * The map rubric: explains what the current layer's colors mean, every icon
 * and line on the map, and how to interact with it.
 */

interface Swatch {
  color: string;
  label: string;
}

const LAYER_GUIDES: Record<string, { title: string; description: string; swatches: Swatch[]; gradient?: boolean }> = {
  political: {
    title: 'Political layer',
    description: 'Countries are colored by their system of government. Regimes behave differently: democracies face elections, autocracies fear coups, theocracies follow doctrine.',
    swatches: [
      { color: '#3a7d44', label: 'Democracy' },
      { color: '#a63a3a', label: 'Autocracy' },
      { color: '#b5482e', label: 'Communist state' },
      { color: '#7d5ba6', label: 'Monarchy' },
      { color: '#b07d2b', label: 'Theocracy' },
      { color: '#6e5849', label: 'Military junta' },
    ],
  },
  military: {
    title: 'Military layer',
    description: 'Brighter red = greater estimated military strength. These are your intelligence service\'s estimates of fighting power (manpower, airpower, readiness) — not exact figures.',
    swatches: [
      { color: 'rgb(255,40,40)', label: 'Major military power' },
      { color: 'rgb(160,60,40)', label: 'Mid-tier force' },
      { color: 'rgb(60,80,40)', label: 'Minor force' },
    ],
  },
  economic: {
    title: 'Economic layer',
    description: 'Brighter green = larger estimated GDP. Economic weight funds armies, buys influence, and absorbs shocks.',
    swatches: [
      { color: 'rgb(30,230,100)', label: 'Economic giant' },
      { color: 'rgb(30,150,70)', label: 'Mid-sized economy' },
      { color: 'rgb(30,70,45)', label: 'Small economy' },
    ],
  },
  stability: {
    title: 'Stability layer',
    description: 'Green = solid government, red = on the brink. Unstable states are vulnerable to coups, revolutions and your covert operations — and unstable neighbors export chaos.',
    swatches: [
      { color: 'hsl(110, 60%, 38%)', label: 'Very solid (80+)' },
      { color: 'hsl(60, 60%, 38%)', label: 'Moderate (~50)' },
      { color: 'hsl(20, 60%, 38%)', label: 'Unstable (~25)' },
      { color: 'hsl(0, 60%, 38%)', label: 'Collapsing (<15)' },
    ],
  },
  intelligence: {
    title: 'Intelligence layer',
    description: 'How well you can see each country. Your nation is blue. Others: brighter = higher intelligence confidence; near-black = you are effectively blind there, and the numbers you see for them may be badly wrong. Improve coverage with Intel Operations or by sharing intel with allies.',
    swatches: [
      { color: '#2a6dd9', label: 'Your nation (full knowledge)' },
      { color: 'hsl(210, 45%, 45%)', label: 'Good coverage (high confidence)' },
      { color: 'hsl(210, 25%, 30%)', label: 'Partial coverage' },
      { color: 'hsl(210, 10%, 20%)', label: 'Nearly blind' },
    ],
  },
  nuclear: {
    title: 'Nuclear layer',
    description: 'Nuclear weapons status as your analysts assess it. Programs can be hidden — a "None" may simply mean you haven\'t found it. Once a state TESTS, its program is invulnerable to conventional strikes.',
    swatches: [
      { color: '#c92a2a', label: 'ARMED — deliverable arsenal' },
      { color: '#e8590c', label: 'TESTED — demonstrated, weaponizing' },
      { color: '#e6a23c', label: 'DEVELOPING — active program detected' },
      { color: '#7a7a52', label: 'LATENT — could build quickly' },
      { color: '#3c4048', label: 'None detected' },
    ],
  },
};

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
  const guide = LAYER_GUIDES[mapLayer] ?? LAYER_GUIDES.political;

  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        right: 12,
        width: 340,
        maxHeight: 'calc(100% - 80px)',
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
        This is the world <i>as your intelligence services see it</i> — not ground truth. Estimates shown as
        ranges are uncertain; the better your intel on a country, the closer they are to reality.
      </p>

      {/* Current layer colors */}
      <div style={sectionTitle}>Colors — {guide.title}</div>
      <p style={{ fontSize: 12, color: '#aab', margin: '0 0 8px 0' }}>{guide.description}</p>
      {guide.swatches.map((s) => (
        <div key={s.label} style={row}>
          <span style={{ width: 16, height: 16, borderRadius: 3, background: s.color, border: '1px solid #0009', flexShrink: 0 }} />
          {s.label}
        </div>
      ))}
      <div style={{ fontSize: 11, color: '#778', marginTop: 4 }}>
        Switch layers with the buttons at the top right — this guide follows the active layer.
      </div>

      {/* Icons & markings */}
      <div style={sectionTitle}>Icons & markings</div>
      <div style={row}><span style={{ width: 18, textAlign: 'center' }}>☢</span> Nuclear-armed or tested state</div>
      <div style={row}><span style={{ width: 18, textAlign: 'center' }}>🔥</span> Serious insurgency (rebellion or guerilla war)</div>
      <div style={row}>
        <span style={{ width: 18, height: 3, background: '#ff3030', boxShadow: '0 0 5px #ff3030', flexShrink: 0 }} />
        Pulsing red border — country at war
      </div>
      <div style={row}>
        <span style={{ width: 18, borderTop: '2px dashed #39c46a', flexShrink: 0 }} />
        Green dashed line — military pact (of the selected country, or yours)
      </div>
      <div style={row}>
        <span style={{ width: 18, borderTop: '2px dashed #ff4040', flexShrink: 0 }} />
        Red dashed line — active war between those countries
      </div>
      <div style={row}>
        <span style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid #fff', flexShrink: 0 }} />
        White border — currently selected country
      </div>
      <div style={row}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: '#2a6dd9', flexShrink: 0 }} />
        Your nation is drawn more opaque than the rest
      </div>

      {/* Interactions */}
      <div style={sectionTitle}>How to use the map</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#aab', lineHeight: 1.7 }}>
        <li><b style={{ color: '#ccd' }}>Hover</b> a country for a quick intelligence snapshot — leader, relations, GDP and stability (as ranges when uncertain).</li>
        <li><b style={{ color: '#ccd' }}>Click</b> a country to open its dossier: government, history, military estimates, and quick actions (diplomacy, intelligence operations, military moves). Click again to deselect.</li>
        <li><b style={{ color: '#ccd' }}>Targeting:</b> actions in the side panel that need a target use the currently selected country.</li>
        <li><b style={{ color: '#ccd' }}>Lines</b> show the selected country's pacts and wars; with nothing selected, they show yours.</li>
        <li><b style={{ color: '#ccd' }}>Zoom/pan</b> with the mouse or the +/− controls at the top left.</li>
      </ul>

      <div style={{ fontSize: 11, color: '#667', marginTop: 12, borderTop: '1px solid #2a2e3a', paddingTop: 8 }}>
        Tip: before an action is committed you will always see a consequence forecast — effects, costs,
        success odds and risks. There is no undo in geopolitics.
      </div>
    </div>
  );
}
