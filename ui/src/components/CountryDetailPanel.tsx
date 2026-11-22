import { useState } from 'react';
import { countryNames, useGameStore, useViewCountry } from '../store/gameStore';
import type { UncertainRange } from '../store/gameStore';
import { ordersFor } from '../lib/orders';
import { OrderCard } from './orders/OrderCard';

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function Range({ r, fmt }: { r: UncertainRange; fmt: (n: number) => string }) {
  if (r.confidence > 85) return <b>{fmt((r.low + r.high) / 2)}</b>;
  return (
    <b title={`Confidence: ${Math.round(r.confidence)}%`}>
      {fmt(r.low)} – {fmt(r.high)}
    </b>
  );
}

const S = {
  panel: {
    position: 'absolute' as const,
    top: 64,
    right: 12,
    width: 'min(380px, calc(100vw - 24px))',
    maxHeight: 'calc(100% - 100px)',
    overflowY: 'auto' as const,
    background: 'rgba(20,27,39,0.96)',
    border: '1px solid #2a3546',
    borderRadius: 10,
    padding: 14,
    color: '#ddd',
    zIndex: 6,
    fontSize: 13,
  },
  h: { margin: '0 0 2px 0', fontSize: 18, color: '#fff' },
  sub: { color: '#9aa', fontSize: 11, marginBottom: 8 },
  section: { borderTop: '1px solid #2a2e3a', marginTop: 10, paddingTop: 8 },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: '#778',
    marginBottom: 6,
  },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 },
  actionBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    background: '#1a1e28',
    border: '1px solid #2a2e3a',
    color: '#dde',
    borderRadius: 6,
    padding: '6px 10px',
    marginBottom: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
};

const LEVEL_COLORS: Record<string, string> = {
  MILITARY_PACT: '#39c46a',
  PROFITABLE: '#74c476',
  BENEFICIAL: '#a1d99b',
  FAVOURABLE: '#c7e9c0',
  SATISFACTORY: '#aaa',
  LAMENTABLE: '#fc9272',
  WAR: '#ff4040',
};

export function CountryDetailPanel() {
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const selectCountry = useGameStore((s) => s.selectCountry);
  const setFocus = useGameStore((s) => s.setFocus);
  const gameOver = useGameStore((s) => s.gameOver);
  const me = useGameStore((s) => s.worldState?.countries.find((c) => c.id === s.worldState?.playerCountryId));
  const view = useViewCountry(selectedCountryId);
  const [showHistory, setShowHistory] = useState(false);
  const [allOrders, setAllOrders] = useState(false);

  if (!view) return null;

  const sys = view.politicalSystem;
  const election =
    sys.electionCycleMonths > 0 && sys.nextElectionTurn !== null
      ? `every ${Math.round(sys.electionCycleMonths / 12)} yrs`
      : 'none scheduled';

  return (
    <div className="dossier" style={S.panel} role="region" aria-label={`Dossier: ${view.name}`}>
      <button
        onClick={() => selectCountry(null)}
        style={{ float: 'right', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}
      >
        ×
      </button>
      <h3 style={S.h}>
        {view.name}
        {(view.nuclearStatus === 'ARMED' || view.nuclearStatus === 'TESTED') && ' ☢'}
      </h3>
      <div style={S.sub}>
        {view.leader.title} <b style={{ color: '#ccd' }}>{view.leader.name}</b> ·{' '}
        {view.leader.style.toLowerCase()} · {view.leader.sinceTurn === 0 ? 'in power before your term' : `in power since month ${view.leader.sinceTurn}`}
      </div>

      {!view.isPlayer && (
        <div
          style={{
            background: '#161a24',
            borderRadius: 6,
            padding: '6px 10px',
            marginBottom: 6,
            border: `1px solid ${LEVEL_COLORS[view.diplomaticLevel] ?? '#2a2e3a'}`,
          }}
        >
          Relations:{' '}
          <b style={{ color: LEVEL_COLORS[view.diplomaticLevel] ?? '#ccc' }}>
            {view.diplomaticLevel.replace('_', ' ')}
          </b>{' '}
          ({Math.round(view.relationWithPlayer)})
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionTitle}>Government</div>
        <div style={S.row}><span>System</span><b>{sys.type.replace(/_/g, ' ')}</b></div>
        <div style={S.row}><span>Power centers</span><b>{sys.powerCenters.map((p) => p.replace('_', ' ')).join(', ')}</b></div>
        <div style={S.row}><span>Elections</span><b>{election}</b></div>
        {view.insurgencyLevel !== 'NONE' && (
          <div style={S.row}><span>🔥 Insurgency</span><b style={{ color: '#ff922b' }}>{view.insurgencyLevel}</b></div>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>
          Intelligence estimate {!view.isPlayer && `(${Math.round(view.intelConfidence)}% confidence)`}
        </div>
        {!view.isPlayer && (
          <div style={{ height: 4, background: '#222', borderRadius: 2, marginBottom: 8 }}>
            <div
              style={{
                height: 4,
                width: `${view.intelConfidence}%`,
                background: view.intelConfidence > 65 ? '#39c46a' : view.intelConfidence > 35 ? '#e6a23c' : '#c92a2a',
                borderRadius: 2,
              }}
            />
          </div>
        )}
        <div style={S.row}><span>GDP</span><Range r={view.gdp} fmt={fmtMoney} /></div>
        <div style={S.row}><span>Stability</span><Range r={view.stability} fmt={(x) => `${Math.round(x)}%`} /></div>
        <div style={S.row}><span>Manpower</span><Range r={view.manpower} fmt={(x) => `${Math.round(x / 1000)}k`} /></div>
        <div style={S.row}>
          <span>Nuclear</span>
          <b style={{ color: view.nuclearStatus === 'ARMED' || view.nuclearStatus === 'TESTED' ? '#ffd43b' : '#ccc' }}>
            {view.nuclearStatus}
            {view.nuclearProgress && view.nuclearStatus === 'DEVELOPING'
              ? ` (~${Math.round(view.nuclearProgress.estimate)}%)`
              : ''}
          </b>
        </div>
        {view.alliances.length > 0 && (
          <div style={S.row}><span>Pacts</span><b>{countryNames(view.alliances)}</b></div>
        )}
        {view.atWarWith.length > 0 && (
          <div style={S.row}><span>⚔️ At war with</span><b style={{ color: '#ff4040' }}>{countryNames(view.atWarWith)}</b></div>
        )}
      </div>

      {view.history.narrative && (
        <div style={S.section}>
          <div style={S.sectionTitle}>National character</div>
          <div style={{ color: '#bbc', fontSize: 12, fontStyle: 'italic' }}>{view.history.narrative}</div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ ...S.actionBtn, marginTop: 6, textAlign: 'center' }}
          >
            {showHistory ? 'Hide' : 'Show'} historical record
          </button>
          {showHistory && (
            <div style={{ marginTop: 4 }}>
              {view.history.keyEvents.map((e) => (
                <div key={e.year + e.event} style={{ marginBottom: 5, fontSize: 11 }}>
                  <b style={{ color: '#9ab' }}>{e.year}</b>, {e.event}
                  <div style={{ color: '#788' }}>{e.impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!view.isPlayer && !gameOver && me && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Orders for {view.name}</div>
          {(() => {
            // The same registry, cards and ordering as the map menu; "All" is the desk's list
            const all = ordersFor(me, view, { expanded: true });
            const short = ordersFor(me, view);
            const list = allOrders || short.length === 0 ? all : short;
            return (
              <div className="ord-list dossier-orders">
                {list.map((def) => (
                  <OrderCard key={def.id} def={def} targetId={view.id} variant="row" compact onOpen={(i) => setFocus({ kind: 'order', id: String(i) })} />
                ))}
                {all.length > short.length && short.length > 0 && (
                  <button className="ord-more" onClick={() => setAllOrders((v) => !v)} aria-expanded={allOrders}>
                    {allOrders ? 'Fewer orders' : `All ${all.length} orders for ${view.name}`}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
