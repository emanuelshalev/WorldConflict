import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

const ADVISORS = [
  { id: 'FOREIGN_MINISTER', name: 'Foreign Minister', icon: '🌍', description: 'Diplomatic relations and alliances' },
  { id: 'DEFENSE_MINISTER', name: 'Defense Minister', icon: '🛡️', description: 'Military strategy and readiness' },
  { id: 'FINANCE_MINISTER', name: 'Finance Minister', icon: '💰', description: 'Economic policy and budget' },
  { id: 'INTELLIGENCE_CHIEF', name: 'Intelligence Chief', icon: '🕵️', description: 'Threat assessment and covert ops' },
  { id: 'DOMESTIC_ADVISOR', name: 'Domestic Advisor', icon: '🏛️', description: 'Internal stability and reforms' },
  { id: 'CHIEF_OF_STAFF', name: 'Chief of Staff', icon: '⭐', description: 'Overall strategic coordination' },
];

interface AdvisorResponse {
  role: string;
  analysis: string;
  recommendations: Array<{
    action: { type: string; targetCountryId?: string };
    rationale: string;
    riskLevel: string;
    expectedOutcome: string;
  }>;
  warnings?: string[];
  opportunities?: string[];
}

export function AdvisorModal() {
  const { activeModal, activeAdvisorRole, closeModal, setAdvisorRole, saveId } = useGameStore();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'advisor') return null;

  const handleSelectAdvisor = async (advisorId: string) => {
    setAdvisorRole(advisorId);
    setResponse(null);
    setError(null);

    if (!saveId) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/chat/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveId, role: advisorId }),
      });
      const data = await res.json();
      if (data.success) {
        setResponse(data.response);
      } else {
        setError(data.error || 'Failed to get advisor response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to contact advisor');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeAdvisorRole || !saveId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/chat/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveId, role: activeAdvisorRole, message }),
      });
      const data = await res.json();
      if (data.success) {
        setResponse(data.response);
        setMessage('');
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const selectedAdvisor = ADVISORS.find((a) => a.id === activeAdvisorRole);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Advisors</h2>
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
        </div>

        <div className="modal-body advisor-modal">
          <div className="advisor-list">
            {ADVISORS.map((advisor) => (
              <div
                key={advisor.id}
                className={`advisor-card ${activeAdvisorRole === advisor.id ? 'selected' : ''}`}
                onClick={() => handleSelectAdvisor(advisor.id)}
              >
                <span className="advisor-icon">{advisor.icon}</span>
                <div className="advisor-info">
                  <strong>{advisor.name}</strong>
                  <span>{advisor.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="advisor-chat">
            {!activeAdvisorRole ? (
              <div className="chat-placeholder">
                <p>Select an advisor to consult</p>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <span className="advisor-icon">{selectedAdvisor?.icon}</span>
                  <h3>{selectedAdvisor?.name}</h3>
                </div>

                {error && <div className="error-message">{error}</div>}

                {loading ? (
                  <div className="chat-loading">Consulting advisor...</div>
                ) : response ? (
                  <div className="chat-response">
                    <div className="response-section">
                      <h4>Analysis</h4>
                      <p>{response.analysis}</p>
                    </div>

                    {response.warnings && response.warnings.length > 0 && (
                      <div className="response-section warnings">
                        <h4>⚠️ Warnings</h4>
                        <ul>
                          {response.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {response.opportunities && response.opportunities.length > 0 && (
                      <div className="response-section opportunities">
                        <h4>✨ Opportunities</h4>
                        <ul>
                          {response.opportunities.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {response.recommendations.length > 0 && (
                      <div className="response-section">
                        <h4>Recommendations</h4>
                        {response.recommendations.map((rec, i) => (
                          <div key={i} className={`recommendation risk-${rec.riskLevel.toLowerCase()}`}>
                            <div className="rec-header">
                              <span className="rec-action">{rec.action.type}</span>
                              <span className={`risk-badge ${rec.riskLevel.toLowerCase()}`}>
                                {rec.riskLevel}
                              </span>
                            </div>
                            <p className="rec-rationale">{rec.rationale}</p>
                            <p className="rec-outcome">
                              <em>Expected: {rec.expectedOutcome}</em>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="chat-input">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask a question..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSendMessage}
                    disabled={loading || !message.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
