import { SCENE_KINDS, type SceneKind } from './kinds';
import '../styles/wc.css';
import { SceneFrame, type Verdict } from './SceneFrame';
import { OutcomeMap, type MapEffect } from './OutcomeMap';

/** Dev gallery: open the UI at /#scenes (all) or /#scenes/<kind> (one, every variant). */
/** Recording mode: /#clip?kind=..&home=..&other=..&mood=..&kicker=..&headline=..&sub=..&verdict=..&bare=1 */
function Clip() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const kind = (q.get('kind') ?? 'press') as SceneKind;
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100vw' }} className={q.get('bare') ? 'clip-bare' : ''}>
        <SceneFrame
          kind={kind}
          home={q.get('home') ?? undefined}
          other={q.get('other') ?? undefined}
          mood={(q.get('mood') as 'good' | 'bad' | 'neutral') ?? 'neutral'}
          size="full"
          live
          kicker={q.get('kicker') ?? undefined}
          headline={q.get('headline') ?? undefined}
          sub={q.get('sub') ?? undefined}
          verdict={(q.get('verdict') as Verdict) || undefined}
        />
      </div>
    </div>
  );
}

const MAP_EFFECTS: MapEffect[] = ['deploy', 'withdraw', 'strike', 'nuke', 'alliance', 'court', 'denounce', 'covert', 'ceasefire', 'war', 'none'];
const EFFECT_PAIRS: Record<MapEffect, [string, string]> = {
  deploy: ['IND', 'PAK'],
  withdraw: ['RUS', 'UKR'],
  strike: ['USA', 'IRN'],
  nuke: ['PRK', 'KOR'],
  alliance: ['FRA', 'POL'],
  court: ['CHN', 'BRA'],
  denounce: ['GBR', 'RUS'],
  covert: ['ISR', 'IRN'],
  ceasefire: ['UKR', 'RUS'],
  war: ['CHN', 'TWN'],
  none: ['JPN', 'JPN'],
};

/**
 * Outcome map: /#mapfx?home=USA&target=IRN&effect=strike&ok=1&label=..&w=640 (one map),
 * or /#mapfx alone for every effect, succeeding and failing.
 */
function MapFx() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const effect = q.get('effect') as MapEffect | null;
  if (effect) {
    const w = Number(q.get('w')) || 0;
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: w ? `${w}px` : '100vw', maxWidth: '100vw' }}>
          <OutcomeMap
            home={q.get('home') ?? 'USA'}
            target={q.get('target') ?? undefined}
            effect={MAP_EFFECTS.includes(effect) ? effect : 'none'}
            ok={q.get('ok') !== '0'}
            label={q.get('label') ?? undefined}
          />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 24, background: '#0b0f17' }}>
      <h1 style={{ font: '700 28px var(--font-display)', color: '#fff', margin: '0 0 16px' }}>Outcome maps</h1>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {MAP_EFFECTS.flatMap((e) =>
          [true, false].map((ok) => (
            <div key={`${e}-${ok}`} style={{ display: 'grid', gap: 6 }}>
              <code style={{ color: '#a3aebf' }}>
                {e} {ok ? 'ok' : 'failed'}
              </code>
              <OutcomeMap home={EFFECT_PAIRS[e][0]} target={EFFECT_PAIRS[e][1]} effect={e} ok={ok} label={`${e} ${EFFECT_PAIRS[e].join(' > ')}`} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export default function Gallery() {
  if (window.location.hash.startsWith('#clip')) return <Clip />;
  if (window.location.hash.startsWith('#mapfx')) return <MapFx />;
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
