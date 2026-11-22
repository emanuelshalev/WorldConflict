import { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconMap2 } from '@tabler/icons-react';
import { CRISIS_KINDS, type CrisisKind, SITUATION_KINDS, situationKindOf } from '../lib/crisisKind';
import type { EraMap } from '../store/gameStore';
import { BLOC_SIDE_COLOR, type ColourBy, type Density, STABILITY_STEPS } from './globe/eraLayers';

interface Props {
  mode: 'crisis' | 'nation' | 'era';
  /** Era mode: the era's world, the colouring and its control. */
  era?: EraMap | null;
  colourBy?: ColourBy;
  onColourBy?: (c: ColourBy) => void;
  density?: Density;
  /** Phone: only the colour-by row (it sits under the globe band). */
  compact?: boolean;
}

const COLOUR_LABEL: Record<ColourBy, string> = { blocs: 'Blocs', stability: 'Stability', difficulty: 'Difficulty' };

/** Colour by [Blocs | Stability | Difficulty]: one segmented control, in the key and on the phone. */
function ColourControl({ value, onChange }: { value: ColourBy; onChange?: (c: ColourBy) => void }) {
  return (
    <div className="mk-colour" role="radiogroup" aria-label="Colour the countries by">
      <span className="mk-colour-label">Colour by</span>
      <span className="seg">
        {(Object.keys(COLOUR_LABEL) as ColourBy[]).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} className={value === c ? 'on' : ''} onClick={() => onChange?.(c)}>
            {COLOUR_LABEL[c]}
          </button>
        ))}
      </span>
    </div>
  );
}

/** What the colours mean, in plain words: a labelled stability scale, or the camps' swatches. */
function ColourLegend({ era, colourBy }: { era: EraMap; colourBy: ColourBy }) {
  if (colourBy === 'stability') {
    return (
      <div className="mk-scale" aria-label="Stability: how firmly each government holds">
        <span className="mk-scale-title">How firmly each government holds</span>
        <span className="mk-scale-row">
          {STABILITY_STEPS.map((s) => (
            <span key={s.word} className="mk-step" title={`${s.word}: ${s.hint}`}>
              <i style={{ background: s.color }} />
              <small>{s.word}</small>
            </span>
          ))}
        </span>
        <span className="mk-scale-note">Red: could fall soon. Grey: nothing shakes it.</span>
      </div>
    );
  }
  if (colourBy === 'blocs') {
    return (
      <div className="mk-blocs" aria-label="Which camp each country is in">
        <span className="mk-scale-title">Which camp each country is in</span>
        <span className="mk-bloc-row">
          {era.blocs.map((b) => (
            <span key={b.id} className="mk-chip" title={b.note ?? b.name}>
              <span className="mk-sw" style={{ background: BLOC_SIDE_COLOR[b.side] }} />
              {b.name}
            </span>
          ))}
          <span className="mk-chip">
            <span className="mk-sw other" />
            No camp
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="mk-blocs">
      <span className="mk-scale-title">How hard each nation is to lead</span>
      <span className="mk-bloc-row">
        <span className="mk-chip">
          <span className="mk-sw steady" /> Steady
        </span>
        <span className="mk-chip">
          <span className="mk-sw tough" /> Tough
        </span>
        <span className="mk-chip">
          <span className="mk-sw brutal" /> Brutal
        </span>
      </span>
    </div>
  );
}

/** The era key's long part: situation kinds present, phases and lines, all in plain words. */
function EraRows({ era, colourBy, density }: { era: EraMap; colourBy: ColourBy; density?: Density }) {
  const kinds = [...new Set(era.situations.map((s) => situationKindOf(s.kind)))];
  const phases = new Set(era.situations.map((s) => s.phase));
  return (
    <>
      {colourBy === 'stability' && era.blocs.length > 0 && (
        <div className="mk-group">
          <h4>Outlines: the camps</h4>
          <span className="mk-bloc-row">
            {era.blocs.map((b) => (
              <span key={b.id} className="mk-chip">
                <span className="mk-sw outline" style={{ borderColor: BLOC_SIDE_COLOR[b.side] }} />
                {b.name}
              </span>
            ))}
          </span>
        </div>
      )}
      <div className="mk-group">
        <h4>Situations</h4>
        {kinds.map((k) => {
          const K = SITUATION_KINDS[k];
          return (
            <div key={k} className="mk-row">
              <span className="mk-pin" style={{ ['--pin' as string]: K.color }}>
                <K.icon size={13} color={K.ink ?? '#fff'} stroke={2.2} />
              </span>
              <span>
                <b>{K.label}</b>
                <small>{K.blurb}</small>
              </span>
            </div>
          );
        })}
        <div className="mk-row">
          <span className="mk-pin num-pin">1</span>
          <span>
            <b>Numbers</b>
            <small>The era's five biggest fires, also listed beside the globe</small>
          </span>
        </div>
        {phases.has('BREWING') && (
          <div className="mk-row">
            <span className="mk-pin brewing" style={{ ['--pin' as string]: '#f5d547' }} />
            <span>
              <b>Brewing</b>
              <small>Not yet, but coming (hollow pin)</small>
            </span>
          </div>
        )}
        {phases.has('FROZEN') && (
          <div className="mk-row">
            <span className="mk-pin frozen" style={{ ['--pin' as string]: '#c9d3e0' }} />
            <span>
              <b>Frozen</b>
              <small>The fighting stopped, nothing is settled (faded pin)</small>
            </span>
          </div>
        )}
        <div className="mk-row">
          <span className="mk-rim-sw" />
          <span>
            <b>Ring on the edge</b>
            <small>A situation on the far side: tap it to turn the globe</small>
          </span>
        </div>
      </div>
      <div className="mk-group">
        <h4>Lines</h4>
        <div className="mk-row">
          <span className="mk-line front" />
          <span>
            <b>Front line</b>
            <small>Two countries at war</small>
          </span>
        </div>
        <div className="mk-row">
          <span className="mk-line rival" />
          <span>
            <b>Rivals</b>
            <small>Bitter enemies, not at war: relations -60 or worse{density === 'all' ? '' : ' (with the switch on)'}</small>
          </span>
        </div>
        <div className="mk-row">
          <span className="mk-line blockade" />
          <span>
            <b>Blockade</b>
            <small>Ships stopping ships</small>
          </span>
        </div>
      </div>
    </>
  );
}

/** The title globe's legend: what each pin, ring, line and country colour means. */
export function MapKey({ mode, era, colourBy = 'blocs', onColourBy, density, compact }: Props) {
  const [open, setOpen] = useState(false);
  if (mode === 'era' && era) {
    if (compact) {
      return (
        <section className="map-key era compact" aria-label="Map colours">
          <ColourControl value={colourBy} onChange={onColourBy} />
          <ColourLegend era={era} colourBy={colourBy} />
        </section>
      );
    }
    return (
      <section className={`map-key era ${open ? 'open' : ''}`} aria-label="Map key" data-globe-obstacle>
        <div className="mk-era-bar">
          <ColourControl value={colourBy} onChange={onColourBy} />
          <button className="mk-head mk-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Hide the full map key' : 'Show the full map key'}>
            <IconMap2 size={15} /> Key {open ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
          </button>
        </div>
        <ColourLegend era={era} colourBy={colourBy} />
        {open && (
          <div className="mk-body">
            <EraRows era={era} colourBy={colourBy} density={density} />
          </div>
        )}
      </section>
    );
  }
  return (
    <section className={`map-key ${open ? 'open' : ''}`} aria-label="Map key" data-globe-obstacle>
      <button className="mk-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <IconMap2 size={15} /> Map key {open ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
      </button>
      {!open && (
        <div className="mk-mini" aria-hidden>
          {(Object.keys(CRISIS_KINDS) as CrisisKind[]).map((k) => {
            const K = CRISIS_KINDS[k];
            return (
              <span key={k} className="mk-chip" title={`${K.label}: ${K.blurb}`}>
                <span className="mk-pin" style={{ ['--pin' as string]: K.color }}>
                  <K.icon size={11} color="#fff" stroke={2.2} />
                </span>
                {K.label.replace('Standoff at sea', 'Sea standoff').replace('Regime in crisis', 'Regime crisis')}
              </span>
            );
          })}
          <span className="mk-chip">
            <span className="mk-sw steady" />
            <span className="mk-sw tough" />
            <span className="mk-sw brutal" />
            Steady · Tough · Brutal
          </span>
        </div>
      )}
      {open && (
        <div className="mk-body">
          <div className="mk-group">
            <h4>Crisis pins</h4>
            {(Object.keys(CRISIS_KINDS) as CrisisKind[]).map((k) => {
              const K = CRISIS_KINDS[k];
              return (
                <div key={k} className="mk-row">
                  <span className="mk-pin" style={{ ['--pin' as string]: K.color }}>
                    <K.icon size={13} color="#fff" stroke={2.2} />
                  </span>
                  <span>
                    <b>{K.label}</b>
                    <small>{K.blurb}</small>
                  </span>
                </div>
              );
            })}
            <div className="mk-row">
              <span className="mk-pin today">
                <i>★</i>
              </span>
              <span>
                <b>Today's crisis</b>
                <small>Gold halo: the same world for everyone today</small>
              </span>
            </div>
            <div className="mk-row">
              <span className="mk-line" />
              <span>
                <b>Rival lines</b>
                <small>Who is fighting or facing off; brighter for your pick</small>
              </span>
            </div>
          </div>
          <div className="mk-group">
            <h4>{mode === 'crisis' ? 'Countries: the sides you can play' : 'Countries: nations you can lead'}</h4>
            <div className="mk-row">
              <span className="mk-sw steady" />
              <span>
                <b>Steady</b>
                <small>A forgiving start</small>
              </span>
            </div>
            <div className="mk-row">
              <span className="mk-sw tough" />
              <span>
                <b>Tough</b>
                <small>Real trade-offs every month</small>
              </span>
            </div>
            <div className="mk-row">
              <span className="mk-sw brutal" />
              <span>
                <b>Brutal</b>
                <small>Few good options, little time</small>
              </span>
            </div>
            <div className="mk-row">
              <span className="mk-sw picked" />
              <span>
                <b>Your pick</b>
                <small>Gold outline</small>
              </span>
            </div>
            <div className="mk-row">
              <span className="mk-sw other" />
              <span>
                <b>Everyone else</b>
                <small>Run by the AI, not playable here</small>
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
