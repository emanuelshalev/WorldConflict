import { useGameStore } from '../store/gameStore';

/**
 * Crisis decisions interrupt the briefing: the player must choose a response
 * (or consciously defer — ignored crises resolve themselves, usually badly).
 */
export function CrisisDecisionModal() {
  const pendingDecisions = useGameStore((s) => s.pendingDecisions);
  const decisionChoices = useGameStore((s) => s.decisionChoices);
  const chooseDecision = useGameStore((s) => s.chooseDecision);
  const currentPhase = useGameStore((s) => s.currentPhase);

  // Show during briefing, only decisions not yet answered
  const open = pendingDecisions.filter((d) => !decisionChoices[d.id]);
  if (currentPhase === 'news' || open.length === 0) return null;
  const decision = open[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: '92vw',
          background: '#141019',
          border: '2px solid #a33',
          borderRadius: 12,
          padding: 24,
          color: '#ddd',
          boxShadow: '0 0 60px rgba(200,40,40,0.25)',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, color: '#ff8080', marginBottom: 6 }}>
          ⚠ CRISIS — DECISION REQUIRED
        </div>
        <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: 20 }}>{decision.title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#ccd' }}>{decision.situation}</p>

        <div style={{ marginTop: 16 }}>
          {decision.options.map((option) => (
            <button
              key={option.id}
              onClick={() => chooseDecision(decision.id, option.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: '#1a1620',
                border: '1px solid #3a2e3a',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 8,
                cursor: 'pointer',
                color: '#eee',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#a33';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a2e3a';
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{option.label}</div>
              <div style={{ fontSize: 12, color: '#99a', marginTop: 2 }}>{option.description}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#776', marginTop: 8 }}>
          Your choice takes effect when you commit this month's actions.
        </div>
      </div>
    </div>
  );
}
