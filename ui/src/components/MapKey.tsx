import { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconMap2 } from '@tabler/icons-react';
import { CRISIS_KINDS, type CrisisKind } from '../lib/crisisKind';

/** The title globe's legend: what each pin, ring, line and country colour means. */
export function MapKey({ mode }: { mode: 'crisis' | 'nation' }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`map-key ${open ? 'open' : ''}`} aria-label="Map key">
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
