import { useGameStore } from '../store/gameStore';

const CATEGORY_ICONS: Record<string, string> = {
  WAR: '⚔️',
  GOVERNMENT: '🏛',
  NUCLEAR: '☢',
  COVERT: '🕵',
  ECONOMY: '💰',
  DIPLOMACY: '🤝',
};

function gradeColor(grade: string): string {
  const g = grade.charAt(0).toUpperCase();
  if (g === 'A' || g === 'S') return '#3fbf6f';
  if (g === 'B') return '#9ec24a';
  if (g === 'C') return '#e8b932';
  if (g === 'D') return '#e07b30';
  return '#ff4040';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 50) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 90, fontSize: 12, color: '#aab', textTransform: 'capitalize' }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 10,
          background: '#12151d',
          border: '1px solid #2a2e3a',
          borderRadius: 5,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2a6dd9, #4d8ef0)',
          }}
        />
      </div>
      <span style={{ width: 50, fontSize: 12, color: '#ddd', textAlign: 'right' }}>
        {Math.round(value)} / 50
      </span>
    </div>
  );
}

function Sparkline({ history }: { history: Array<{ turn: number; score: number }> }) {
  if (history.length < 2) return null;
  const w = 600;
  const h = 80;
  const pad = 4;
  const minTurn = history[0].turn;
  const maxTurn = history[history.length - 1].turn;
  const scores = history.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const spanTurn = Math.max(1, maxTurn - minTurn);
  const spanScore = Math.max(1, maxScore - minScore);
  const points = history
    .map((p) => {
      const x = pad + ((p.turn - minTurn) / spanTurn) * (w - 2 * pad);
      const y = h - pad - ((p.score - minScore) / spanScore) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>
        Leadership score over time ({minScore.toFixed(0)}–{maxScore.toFixed(0)})
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ background: '#12151d', border: '1px solid #2a2e3a', borderRadius: 6 }}
      >
        <polyline points={points} fill="none" stroke="#2a6dd9" strokeWidth={2} />
      </svg>
    </div>
  );
}

export function EndGameReport() {
  const { activeModal, endReport, reset, openModal } = useGameStore();

  if (activeModal !== 'endGame' || !endReport) return null;

  const { gameOver, assessment, score, timeline, scoreHistory } = endReport;

  const handleNewGame = () => {
    reset();
    openModal('newGame');
  };

  return (
    <div className="modal-overlay">
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#12151d',
          border: '1px solid #2a2e3a',
          borderRadius: 10,
          width: 'min(720px, 94vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#ddd',
        }}
      >
        {/* Dramatic header */}
        <div
          style={{
            padding: '24px 28px',
            background: 'linear-gradient(180deg, #1a1e28, #12151d)',
            borderBottom: '1px solid #2a2e3a',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#778', marginBottom: 6 }}>
            END OF AN ERA
          </div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#fff' }}>
            {gameOver?.description ?? `The reign over ${endReport.country} has ended.`}
          </h2>
          <div style={{ marginTop: 8, fontSize: 13, color: '#aab' }}>
            {endReport.leader ? `${endReport.leader.title} ${endReport.leader.name} — ` : ''}
            {endReport.country} · {endReport.turnsServed} turns served · {endReport.finalDate}
          </div>
        </div>

        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Grade + assessment */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 84,
                height: 84,
                flexShrink: 0,
                borderRadius: 10,
                border: `2px solid ${gradeColor(assessment.grade)}`,
                background: '#1a1e28',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 44,
                fontWeight: 800,
                color: gradeColor(assessment.grade),
              }}
            >
              {assessment.grade}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                {assessment.classification}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#aab', lineHeight: 1.5 }}>
                {assessment.justification}
              </p>
            </div>
          </div>

          {/* Score breakdown */}
          <div
            style={{
              background: '#1a1e28',
              border: '1px solid #2a2e3a',
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12, color: '#778', marginBottom: 10, letterSpacing: 1 }}>
              FINAL SCORE — {Math.round(score.total)}
            </div>
            <ScoreBar label="economic" value={score.economic} />
            <ScoreBar label="security" value={score.security} />
            <ScoreBar label="approval" value={score.approval} />
            <ScoreBar label="prestige" value={score.prestige} />
          </div>

          {/* Sparkline */}
          {scoreHistory.length > 1 && (
            <div style={{ marginBottom: 20 }}>
              <Sparkline history={scoreHistory} />
            </div>
          )}

          {/* Timeline */}
          <div style={{ fontSize: 12, color: '#778', marginBottom: 8, letterSpacing: 1 }}>
            TIMELINE OF YOUR RULE
          </div>
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid #2a2e3a',
              borderRadius: 8,
              background: '#1a1e28',
            }}
          >
            {timeline.length === 0 ? (
              <p style={{ padding: 14, margin: 0, fontSize: 13, color: '#778' }}>
                History will little note nor long remember this tenure.
              </p>
            ) : (
              timeline.map((event, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '8px 14px',
                    borderBottom: i < timeline.length - 1 ? '1px solid #2a2e3a' : 'none',
                    fontSize: 13,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    {CATEGORY_ICONS[event.category] ?? '•'}
                  </span>
                  <span style={{ color: '#778', flexShrink: 0, width: 80 }}>{event.date}</span>
                  <span style={{ color: '#ddd' }}>{event.description}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #2a2e3a',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button className="btn btn-primary btn-large" onClick={handleNewGame}>
            Start a new game
          </button>
        </div>
      </div>
    </div>
  );
}
