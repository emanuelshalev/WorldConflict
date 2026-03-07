import { useState, useEffect, useRef } from 'react';
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
    action: { type: string; targetCountryId?: string; value?: number };
    rationale: string;
    riskLevel: string;
    expectedOutcome: string;
  }>;
  warnings?: string[];
  opportunities?: string[];
}

// Generate detailed local briefings based on game state
function generateLocalBriefing(advisorId: string, worldState: any): AdvisorResponse {
  const playerCountry = worldState?.countries?.find((c: any) => c.id === worldState?.playerCountryId);
  if (!playerCountry || !worldState) {
    return {
      role: advisorId,
      analysis: 'Unable to assess the situation at this time.',
      recommendations: [],
    };
  }

  const countries = worldState.countries;
  
  switch (advisorId) {
    case 'FOREIGN_MINISTER': {
      const allies = playerCountry.alliances || [];
      const hostileCountries = Object.entries(playerCountry.relations || {})
        .filter(([_, rel]) => (rel as number) < -50)
        .map(([id]) => countries.find((c: any) => c.id === id)?.name || id);
      const friendlyCountries = Object.entries(playerCountry.relations || {})
        .filter(([id, rel]) => (rel as number) >= 40 && (rel as number) < 60 && !allies.includes(id))
        .map(([id]) => ({ id, name: countries.find((c: any) => c.id === id)?.name || id, rel: playerCountry.relations[id] }));
      
      const recommendations: AdvisorResponse['recommendations'] = [];
      const warnings: string[] = [];
      const opportunities: string[] = [];

      if (hostileCountries.length > 0) {
        warnings.push(`We have hostile relations with ${hostileCountries.join(', ')}. These nations may pose a threat to our security. Consider diplomatic outreach or military preparedness.`);
      }

      for (const friendly of friendlyCountries.slice(0, 2)) {
        recommendations.push({
          action: { type: 'DIPLOMACY_IMPROVE_RELATIONS', targetCountryId: friendly.id },
          rationale: `${friendly.name} has favorable relations (${friendly.rel}) but is not yet an ally. Continued diplomatic engagement could lead to a formal alliance.`,
          riskLevel: 'LOW',
          expectedOutcome: 'Relations improve by +5, moving closer to alliance threshold',
        });
        opportunities.push(`${friendly.name} is receptive to closer ties - alliance possible with continued engagement`);
      }

      const potentialAllies = Object.entries(playerCountry.relations || {})
        .filter(([id, rel]) => (rel as number) >= 60 && !allies.includes(id))
        .slice(0, 1);
      
      for (const [allyId] of potentialAllies) {
        const allyName = countries.find((c: any) => c.id === allyId)?.name || allyId;
        recommendations.push({
          action: { type: 'DIPLOMACY_PROPOSE_ALLIANCE', targetCountryId: allyId },
          rationale: `${allyName} has excellent relations with us. They are likely to accept an alliance proposal.`,
          riskLevel: 'LOW',
          expectedOutcome: 'Formal military alliance established, mutual defense pact',
        });
      }

      return {
        role: 'FOREIGN_MINISTER',
        analysis: `Your Excellency, our diplomatic position is as follows: We maintain ${allies.length} formal alliance${allies.length !== 1 ? 's' : ''}. ${hostileCountries.length > 0 ? `${hostileCountries.length} nation${hostileCountries.length !== 1 ? 's' : ''} hold${hostileCountries.length === 1 ? 's' : ''} hostile views toward us.` : 'No nations currently hold hostile views.'} Global tension stands at ${worldState.globalTension}%, which ${worldState.globalTension > 60 ? 'is concerning and requires vigilance' : worldState.globalTension > 30 ? 'is moderate' : 'is relatively calm'}.`,
        recommendations,
        warnings: warnings.length > 0 ? warnings : undefined,
        opportunities: opportunities.length > 0 ? opportunities : undefined,
      };
    }

    case 'DEFENSE_MINISTER': {
      const atWar = playerCountry.atWarWith || [];
      const mobilization = playerCountry.mobilizationLevel || 0;
      const manpower = playerCountry.manpower || 0;
      const recommendations: AdvisorResponse['recommendations'] = [];
      const warnings: string[] = [];

      if (atWar.length > 0) {
        const enemyNames = atWar.map((id: string) => countries.find((c: any) => c.id === id)?.name || id);
        warnings.push(`We are currently at war with ${enemyNames.join(', ')}. This demands our full military attention.`);
        
        if (mobilization < 70) {
          recommendations.push({
            action: { type: 'MILITARY_MOBILIZE' },
            rationale: `Our mobilization level is only ${mobilization}%. In wartime, we need at least 70% mobilization to effectively prosecute the war.`,
            riskLevel: 'MEDIUM',
            expectedOutcome: 'Mobilization increases by 20%, slight stability decrease',
          });
        }

        for (const enemyId of atWar) {
          const war = worldState.wars?.find((w: any) => 
            (w.attackerId === playerCountry.id && w.defenderId === enemyId) ||
            (w.defenderId === playerCountry.id && w.attackerId === enemyId)
          );
          if (war) {
            const isAttacker = war.attackerId === playerCountry.id;
            const progress = isAttacker ? war.attackerProgress : war.defenderProgress;
            if (progress < 40) {
              recommendations.push({
                action: { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', targetCountryId: enemyId },
                rationale: `The war against ${countries.find((c: any) => c.id === enemyId)?.name || enemyId} is not going well (${progress}% progress). A ceasefire may be prudent.`,
                riskLevel: 'MEDIUM',
                expectedOutcome: 'War ends, relations reset to -20',
              });
            }
          }
        }
      } else {
        if (mobilization > 40) {
          recommendations.push({
            action: { type: 'MILITARY_DEMOBILIZE' },
            rationale: `We are at peace but maintaining ${mobilization}% mobilization. This is costly and unnecessary.`,
            riskLevel: 'LOW',
            expectedOutcome: 'Reduced military costs, improved stability',
          });
        }
      }

      const threats = countries.filter((c: any) => 
        c.id !== playerCountry.id && (playerCountry.relations?.[c.id] || 0) < -60
      );
      if (threats.length > 0) {
        warnings.push(`Potential military threats identified: ${threats.map((t: any) => t.name).join(', ')}. These nations have very hostile relations with us.`);
      }

      return {
        role: 'DEFENSE_MINISTER',
        analysis: `Minister reporting: Our armed forces number ${manpower.toLocaleString()} personnel with ${mobilization}% mobilization. ${atWar.length > 0 ? `We are engaged in ${atWar.length} active conflict${atWar.length !== 1 ? 's' : ''}.` : 'We are currently at peace.'} Air power stands at ${playerCountry.airpower?.toLocaleString() || 0} aircraft.`,
        recommendations,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    case 'FINANCE_MINISTER': {
      const gdp = playerCountry.gdp || 0;
      const growth = playerCountry.growthRate || 0;
      const debt = playerCountry.debtGdpRatio || 0;
      const milBudget = playerCountry.militaryBudgetPercent || 0;
      const recommendations: AdvisorResponse['recommendations'] = [];
      const warnings: string[] = [];
      const opportunities: string[] = [];

      if (growth < 0) {
        warnings.push(`Our economy is contracting at ${(growth * 100).toFixed(1)}% annually. This is unsustainable and will erode our national power.`);
      }
      if (debt > 1.0) {
        warnings.push(`National debt has reached ${(debt * 100).toFixed(0)}% of GDP. This is hampering economic growth.`);
      }
      if (milBudget > 8) {
        recommendations.push({
          action: { type: 'ECONOMY_ADJUST_MILITARY_BUDGET', value: milBudget - 1 },
          rationale: `Military spending at ${milBudget}% of GDP is high. Reducing it would free resources for economic development.`,
          riskLevel: 'LOW',
          expectedOutcome: 'Improved economic growth, slightly reduced military readiness',
        });
      }
      if (growth > 0.02) {
        opportunities.push(`Strong economic growth of ${(growth * 100).toFixed(1)}% provides resources for expansion`);
      }

      return {
        role: 'FINANCE_MINISTER',
        analysis: `Economic report: GDP stands at $${(gdp / 1e12).toFixed(2)} trillion with ${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}% growth. Debt-to-GDP ratio is ${(debt * 100).toFixed(0)}%. Military budget consumes ${milBudget}% of GDP.`,
        recommendations,
        warnings: warnings.length > 0 ? warnings : undefined,
        opportunities: opportunities.length > 0 ? opportunities : undefined,
      };
    }

    case 'INTELLIGENCE_CHIEF': {
      const warnings: string[] = [];
      const opportunities: string[] = [];

      if (worldState.globalTension > 70) {
        warnings.push(`Global tension is critically high at ${worldState.globalTension}%. The risk of a major war is elevated.`);
      } else if (worldState.globalTension > 50) {
        warnings.push(`Global tension is elevated at ${worldState.globalTension}%. Monitor the situation closely.`);
      }

      const unstableCountries = countries.filter((c: any) => c.id !== playerCountry.id && c.stability < 30);
      if (unstableCountries.length > 0) {
        opportunities.push(`Intelligence indicates instability in ${unstableCountries.map((c: any) => c.name).join(', ')}. This may present opportunities.`);
      }

      const activeWars = worldState.wars?.filter((w: any) => 
        w.attackerId !== playerCountry.id && w.defenderId !== playerCountry.id
      ) || [];
      if (activeWars.length > 0) {
        warnings.push(`${activeWars.length} conflict${activeWars.length !== 1 ? 's' : ''} ongoing globally that we are not involved in. These may affect regional stability.`);
      }

      return {
        role: 'INTELLIGENCE_CHIEF',
        analysis: `Intelligence assessment: Global tension at ${worldState.globalTension}%. ${worldState.wars?.length || 0} active conflicts worldwide. Our intelligence network coverage is at ${playerCountry.intelLevel || 50}%.`,
        recommendations: [],
        warnings: warnings.length > 0 ? warnings : undefined,
        opportunities: opportunities.length > 0 ? opportunities : undefined,
      };
    }

    case 'DOMESTIC_ADVISOR': {
      const stability = playerCountry.stability || 0;
      const legitimacy = playerCountry.legitimacy || 0;
      const recommendations: AdvisorResponse['recommendations'] = [];
      const warnings: string[] = [];

      if (stability < 40) {
        warnings.push(`Stability is dangerously low at ${stability}%. Civil unrest is likely if this continues.`);
        recommendations.push({
          action: { type: 'DOMESTIC_REFORM' },
          rationale: 'Implementing reforms will address public grievances and improve stability.',
          riskLevel: 'LOW',
          expectedOutcome: 'Stability +8, Legitimacy +3',
        });
      }
      if (legitimacy < 50) {
        recommendations.push({
          action: { type: 'DOMESTIC_PROPAGANDA' },
          rationale: `Government legitimacy at ${legitimacy}% is concerning. A propaganda campaign would boost public support.`,
          riskLevel: 'LOW',
          expectedOutcome: 'Legitimacy +5, Stability +2',
        });
      }
      if (stability > 70 && legitimacy > 70) {
        return {
          role: 'DOMESTIC_ADVISOR',
          analysis: `Domestic situation is stable. Public support at ${legitimacy}%, stability at ${stability}%. No immediate concerns.`,
          recommendations: [],
        };
      }

      return {
        role: 'DOMESTIC_ADVISOR',
        analysis: `Domestic report: Stability at ${stability}%, government legitimacy at ${legitimacy}%. ${stability < 50 ? 'The public mood is restless.' : 'The situation is manageable.'}`,
        recommendations,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    case 'CHIEF_OF_STAFF':
    default: {
      const atWar = playerCountry.atWarWith?.length > 0;
      const lowStability = playerCountry.stability < 40;
      const recommendations: AdvisorResponse['recommendations'] = [];

      if (atWar) {
        recommendations.push({
          action: { type: 'MILITARY_MOBILIZE' },
          rationale: 'War demands full military commitment.',
          riskLevel: 'MEDIUM',
          expectedOutcome: 'Increased war effectiveness',
        });
      }
      if (lowStability) {
        recommendations.push({
          action: { type: 'DOMESTIC_REFORM' },
          rationale: 'Internal stability must be addressed before external ambitions.',
          riskLevel: 'LOW',
          expectedOutcome: 'Improved stability',
        });
      }

      return {
        role: 'CHIEF_OF_STAFF',
        analysis: `Strategic overview for Turn ${worldState.turn}: ${atWar ? 'We are at war - this is our primary concern.' : 'We are at peace.'} ${lowStability ? 'Domestic stability requires attention.' : 'Domestic situation is stable.'} Global tension: ${worldState.globalTension}%. Our position is ${playerCountry.stability > 60 && !atWar ? 'strong' : 'challenging'}.`,
        recommendations,
      };
    }
  }
}

export function AdvisorModal() {
  const { activeModal, activeAdvisorRole, closeModal, setAdvisorRole, saveId, worldState } = useGameStore();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  // Auto-generate briefing when modal opens with a pre-selected advisor
  useEffect(() => {
    if (activeModal === 'advisor' && activeAdvisorRole && worldState && !initialFetchDone.current) {
      initialFetchDone.current = true;
      // Use local briefing generation for immediate response
      const localBriefing = generateLocalBriefing(activeAdvisorRole, worldState);
      setResponse(localBriefing);
    }
    if (activeModal !== 'advisor') {
      initialFetchDone.current = false;
      setResponse(null);
      setError(null);
    }
  }, [activeModal, activeAdvisorRole, worldState]);

  const fetchAdvisorBriefing = async (advisorId: string) => {
    // First, immediately show local briefing
    if (worldState) {
      const localBriefing = generateLocalBriefing(advisorId, worldState);
      setResponse(localBriefing);
    }

    // Optionally try to get enhanced response from backend
    if (!saveId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/chat/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveId, role: advisorId }),
      });
      const data = await res.json();
      if (data.success && data.response) {
        // Only use backend response if it has more content
        if (data.response.analysis && data.response.analysis.length > 50) {
          setResponse(data.response);
        }
      }
    } catch (err) {
      // Silently fail - we already have local briefing
      console.log('Backend advisor fetch failed, using local briefing');
    } finally {
      setLoading(false);
    }
  };

  if (activeModal !== 'advisor') return null;

  const handleSelectAdvisor = (advisorId: string) => {
    setAdvisorRole(advisorId);
    setError(null);
    // Immediately show local briefing
    if (worldState) {
      const localBriefing = generateLocalBriefing(advisorId, worldState);
      setResponse(localBriefing);
    }
    // Try to enhance with backend response
    fetchAdvisorBriefing(advisorId);
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
