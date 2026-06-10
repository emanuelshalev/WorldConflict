import { useState } from 'react';
import { fetchPreview, useGameStore, useViewCountry } from '../store/gameStore';
import type { UncertainRange } from '../store/gameStore';

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
    top: 12,
    left: 52,
    width: 330,
    maxHeight: 'calc(100% - 24px)',
    overflowY: 'auto' as const,
    background: 'rgba(13,15,20,0.94)',
    border: '1px solid #2a2e3a',
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
  const addPendingAction = useGameStore((s) => s.addPendingAction);
  const openModal = useGameStore((s) => s.openModal);
  const gameOver = useGameStore((s) => s.gameOver);
  const view = useViewCountry(selectedCountryId);
  const [showHistory, setShowHistory] = useState(false);

  if (!view) return null;

  const queueAction = async (type: string, label: string, params?: Record<string, unknown>) => {
    const action = { type, targetCountryId: view.isPlayer ? undefined : view.id, params };
    const preview = await fetchPreview(action);
    addPendingAction({ ...action, label, preview: preview ?? undefined });
    openModal('actionPreview');
  };

  const sys = view.politicalSystem;
  const election =
    sys.electionCycleMonths > 0 && sys.nextElectionTurn !== null
      ? `every ${Math.round(sys.electionCycleMonths / 12)} yrs`
      : 'none scheduled';

  return (
    <div style={S.panel}>
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
        {view.leader.style.toLowerCase()} · in power since turn {view.leader.sinceTurn}
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
          <div style={S.row}><span>Pacts</span><b>{view.alliances.join(', ')}</b></div>
        )}
        {view.atWarWith.length > 0 && (
          <div style={S.row}><span>⚔️ At war with</span><b style={{ color: '#ff4040' }}>{view.atWarWith.join(', ')}</b></div>
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
                  <b style={{ color: '#9ab' }}>{e.year}</b> — {e.event}
                  <div style={{ color: '#788' }}>{e.impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!view.isPlayer && !gameOver && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Actions</div>
          {!view.atWarWith.includes(useGameStore.getState().worldState?.playerCountryId ?? '') ? (
            <>
              <button style={S.actionBtn} onClick={() => queueAction('DIPLOMACY_IMPROVE_RELATIONS', `Improve relations with ${view.name}`)}>
                🤝 Improve relations <span style={{ color: '#667' }}>($100M/mo)</span>
              </button>
              <button style={S.actionBtn} onClick={() => queueAction('DIPLOMACY_DENOUNCE', `Denounce ${view.name}`)}>
                📢 Denounce publicly
              </button>
              <button style={S.actionBtn} onClick={() => queueAction('DIPLOMACY_PROPOSE_ALLIANCE', `Propose alliance to ${view.name}`)}>
                🛡 Propose military pact
              </button>
              <button style={S.actionBtn} onClick={() => queueAction('INTEL_GATHER', `Gather intelligence on ${view.name}`)}>
                🕵 Gather intelligence
              </button>
              <button style={S.actionBtn} onClick={() => queueAction('INTEL_DESTABILIZE', `Destabilize ${view.name}`)}>
                💣 Destabilize covertly
              </button>
              <button style={S.actionBtn} onClick={() => queueAction('MILITARY_DEPLOY_BORDER', `Deploy troops to ${view.name} border`)}>
                🪖 Deploy troops to border
              </button>
              <button
                style={{ ...S.actionBtn, borderColor: '#7a2a2a', color: '#ff9090' }}
                onClick={() => queueAction('MILITARY_AIRSTRIKE', `Airstrike ${view.name}`, { targetType: 'MILITARY' })}
              >
                ✈️ Launch airstrike…
              </button>
              <button
                style={{ ...S.actionBtn, borderColor: '#7a2a2a', color: '#ff6060' }}
                onClick={() => queueAction('DIPLOMACY_DECLARE_WAR', `Declare war on ${view.name}`)}
              >
                ⚔️ Declare war
              </button>
            </>
          ) : (
            <button style={S.actionBtn} onClick={() => queueAction('DIPLOMACY_PROPOSE_CEASEFIRE', `Propose ceasefire to ${view.name}`)}>
              🕊 Propose ceasefire
            </button>
          )}
        </div>
      )}
    </div>
  );
}
