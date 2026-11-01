import { SCENE_KINDS, type SceneKind } from './kinds';
import '../styles/wc.css';
import { SceneFrame } from './SceneFrame';

/** Dev gallery: open the UI at /#scenes (all) or /#scenes/<kind> (one, every variant). */
export default function Gallery() {
  const only = window.location.hash.split('/')[1] as SceneKind | undefined;
  const kinds = only && SCENE_KINDS.includes(only) ? [only] : SCENE_KINDS;
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 24, background: '#0b0f17' }}>
      <h1 style={{ font: '700 28px var(--font-display)', color: '#fff', margin: '0 0 16px' }}>Scenes</h1>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: only ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))' }}>
        {kinds.map((k) => (
          <div key={k} style={{ display: 'grid', gap: 10 }}>
            <code style={{ color: '#a3aebf' }}>{k}</code>
            <SceneFrame
              kind={k}
              home="USA"
              other="CHN"
              size="full"
              live
              kicker="Your order"
              headline="Offer defense pact to Japan"
              sub="Tokyo accepts: a mutual-defense treaty is signed in the Rose Garden."
              verdict="success"
              ticker={['Oil up 4% on Gulf jitters', 'Markets close lower', 'Global tension 58/100']}
            />
            {only && (
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <SceneFrame kind={k} home="FRA" other="RUS" mood="bad" size="card" verdict="failed" />
                <SceneFrame kind={k} home="UKR" other="DEU" mood="good" size="card" />
                <SceneFrame kind={k} home="IND" other="PAK" size="thumb" verdict="backfired" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
