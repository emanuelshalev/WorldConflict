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

// Generate a contextual response that acknowledges the user's specific question
function generateContextualResponse(advisorId: string, userQuestion: string, worldState: any): string {
  const playerCountry = worldState?.countries?.find((c: any) => c.id === worldState?.playerCountryId);
  
  if (!playerCountry) {
    return "I apologize, but I cannot access the current situation data. Please ensure a game is in progress.";
  }

  const question = userQuestion.toLowerCase();
  const countries = worldState.countries || [];
  
  // Find if user mentioned a specific country
  const mentionedCountry = countries.find((c: any) => 
    question.includes(c.name.toLowerCase()) || question.includes(c.id.toLowerCase())
  );
  
  // Analyze question intent - expanded keywords
  const isAboutWar = question.includes('war') || question.includes('attack') || question.includes('invade') || question.includes('fight') || question.includes('battle') || question.includes('combat');
  const isAboutPeace = question.includes('peace') || question.includes('treaty') || question.includes('ceasefire') || question.includes('negotiate') || question.includes('diplomacy');
  const isAboutAlliance = question.includes('alliance') || question.includes('ally') || question.includes('allies') || question.includes('partner') || question.includes('friend');
  const isAboutMilitary = question.includes('military') || question.includes('army') || question.includes('troops') || question.includes('force') || question.includes('soldier') || question.includes('weapon') || question.includes('defense') || question.includes('mobiliz');
  const isAboutEconomy = question.includes('economy') || question.includes('money') || question.includes('gdp') || question.includes('budget') || question.includes('trade') || question.includes('tax') || question.includes('spend') || question.includes('cost') || question.includes('financ');
  const isAboutStability = question.includes('stability') || question.includes('unrest') || question.includes('protest') || question.includes('people') || question.includes('riot') || question.includes('rebel') || question.includes('civil');
  const isAboutSpy = question.includes('spy') || question.includes('intel') || question.includes('covert') || question.includes('secret') || question.includes('espionage') || question.includes('sabotage');
  
  // Include the user's actual question in the response for variety
  const questionSnippet = userQuestion.length > 30 ? userQuestion.substring(0, 30) + '...' : userQuestion;
  
  // Build response based on advisor type and question content
  switch (advisorId) {
    case 'FOREIGN_MINISTER': {
      if (mentionedCountry) {
        const rel = playerCountry.relations?.[mentionedCountry.id] || 0;
        const relDesc = rel > 50 ? 'friendly' : rel > 0 ? 'neutral-positive' : rel > -30 ? 'cool' : 'hostile';
        return `Regarding ${mentionedCountry.name}: Our relations are currently ${relDesc} (${rel}). Their stability is ${mentionedCountry.stability}%, regime: ${mentionedCountry.regimeType}. ${isAboutAlliance ? `${rel > 40 ? 'An alliance may be possible with diplomatic effort.' : 'Relations must improve before alliance talks.'}` : ''} ${isAboutWar ? `${rel < -20 ? 'Conflict is a real possibility.' : 'War would damage our reputation unnecessarily.'}` : ''} What action do you wish to take?`;
      }
      if (isAboutAlliance) {
        const allies = playerCountry.alliances || [];
        return `On alliances: We have ${allies.length} formal alliance(s). ${allies.length > 0 ? `Partners: ${allies.join(', ')}.` : 'We stand alone diplomatically.'} Global tension is ${worldState.globalTension}%. ${allies.length === 0 ? 'I strongly recommend seeking allies.' : 'Our alliance network provides security.'} Which nation interests you?`;
      }
      if (isAboutWar || isAboutPeace) {
        const atWar = playerCountry.atWarWith?.length > 0;
        return `${atWar ? `We are at war with ${playerCountry.atWarWith.length} nation(s). Diplomatic resolution is possible but requires concessions.` : 'We are at peace. I advise maintaining this through active diplomacy.'} Global tension: ${worldState.globalTension}%. ${isAboutPeace ? 'Peace serves our long-term interests.' : 'War should be a last resort.'}`;
      }
      return `You ask: "${questionSnippet}" - From a diplomatic perspective: We have ${(playerCountry.alliances || []).length} allies, global tension at ${worldState.globalTension}%. Our relations vary across nations. Which specific country or diplomatic matter should I analyze?`;
    }
    
    case 'DEFENSE_MINISTER': {
      if (mentionedCountry) {
        const theirMil = mentionedCountry.mobilizationLevel || 50;
        const comparison = theirMil > playerCountry.mobilizationLevel ? 'stronger' : theirMil < playerCountry.mobilizationLevel ? 'weaker' : 'evenly matched';
        return `Military assessment of ${mentionedCountry.name}: They are at ${theirMil}% mobilization - ${comparison} than us (${playerCountry.mobilizationLevel}%). ${isAboutWar ? `${comparison === 'weaker' ? 'We could prevail, but casualties are certain.' : 'I advise caution - we need more preparation.'}` : 'Recommend monitoring their movements.'}`;
      }
      if (isAboutMilitary) {
        return `Military status: ${playerCountry.mobilizationLevel}% mobilization, ${playerCountry.manpower?.toLocaleString() || 'N/A'} troops, ${playerCountry.airpower || 0} air units. ${playerCountry.mobilizationLevel < 50 ? 'We are underprepared - recommend increasing readiness.' : 'Forces are combat-ready.'} What specific military action do you consider?`;
      }
      if (isAboutWar) {
        const atWar = playerCountry.atWarWith?.length > 0;
        return `${atWar ? 'We are engaged in active combat. All resources should focus on victory.' : 'We are not at war.'} Our readiness: ${playerCountry.mobilizationLevel}%. ${!atWar ? 'If you contemplate war, name the target and I will assess our chances.' : 'Current priority: winning the ongoing conflict.'}`;
      }
      return `You ask: "${questionSnippet}" - Commander, our forces stand at ${playerCountry.mobilizationLevel}% readiness. ${playerCountry.atWarWith?.length > 0 ? 'We are at war.' : 'No active conflicts.'} What military matter requires my assessment?`;
    }
    
    case 'FINANCE_MINISTER': {
      const growth = (playerCountry.growthRate * 100).toFixed(1);
      const gdpB = (playerCountry.gdp / 1e9).toFixed(1);
      if (isAboutEconomy) {
        return `Economic report: GDP $${gdpB}B, growth ${growth}%, military spending ${playerCountry.militaryBudgetPercent}% of GDP, debt ratio ${playerCountry.debtGdpRatio || 0}%. ${parseFloat(growth) < 0 ? 'The economy is contracting - we must act.' : parseFloat(growth) > 2 ? 'Strong growth continues.' : 'Modest but stable growth.'} What economic policy do you wish to discuss?`;
      }
      if (isAboutWar) {
        return `War is expensive. Current military spending: ${playerCountry.militaryBudgetPercent}% of GDP. ${parseFloat(growth) > 0 ? 'We can sustain a short conflict.' : 'Our economy cannot support prolonged warfare.'} Consider the fiscal implications carefully.`;
      }
      return `You ask: "${questionSnippet}" - The treasury reports: GDP $${gdpB}B at ${growth}% growth. ${parseFloat(growth) < 0 ? 'Economic intervention needed.' : 'Finances are manageable.'} How may I advise on fiscal matters?`;
    }
    
    case 'INTELLIGENCE_CHIEF': {
      if (mentionedCountry) {
        return `Intelligence on ${mentionedCountry.name}: Stability ${mentionedCountry.stability}%, mobilization ${mentionedCountry.mobilizationLevel}%, regime ${mentionedCountry.regimeType}. ${mentionedCountry.stability < 40 ? 'Internal weakness detected - vulnerable to destabilization.' : 'Internally stable - covert action would be risky.'} ${isAboutSpy ? 'Covert operations are possible. What do you have in mind?' : 'Shall I recommend intelligence operations?'}`;
      }
      if (isAboutSpy) {
        return `Our intelligence capabilities are operational. Options: espionage (gather intel), destabilization (weaken rivals), sabotage (damage infrastructure). Each carries exposure risk. Name a target nation for specific recommendations.`;
      }
      const hostileCount = countries.filter((c: any) => (playerCountry.relations?.[c.id] || 0) < -30).length;
      return `You ask: "${questionSnippet}" - Director's briefing: ${hostileCount} potentially hostile nations under surveillance. Global tension: ${worldState.globalTension}%. Our networks are active. Which nation or operation interests you?`;
    }
    
    case 'DOMESTIC_ADVISOR': {
      if (isAboutStability) {
        return `Domestic assessment: Stability ${playerCountry.stability}%, legitimacy ${playerCountry.legitimacy}%. ${playerCountry.stability < 40 ? 'CRITICAL: Civil unrest likely. Recommend immediate reforms or security measures.' : playerCountry.stability < 60 ? 'Some discontent exists. Monitor closely.' : 'The people are content.'} What domestic policy do you wish to pursue?`;
      }
      return `You ask: "${questionSnippet}" - The domestic situation: ${playerCountry.stability}% stability, ${playerCountry.approval}% public approval, ${playerCountry.legitimacy}% legitimacy. ${playerCountry.stability < 50 ? 'Attention needed - the people grow restless.' : 'Internal affairs are stable.'} What domestic matter concerns you?`;
    }
    
    default: {
      const atWar = playerCountry.atWarWith?.length > 0;
      const threats = countries.filter((c: any) => (playerCountry.relations?.[c.id] || 0) < -40).length;
      return `You ask: "${questionSnippet}" - ${atWar ? 'War is our priority.' : 'We are at peace.'} Stability: ${playerCountry.stability}%. Threats: ${threats} hostile nations. Economy: ${playerCountry.growthRate > 0 ? 'growing' : 'struggling'}. Global tension: ${worldState.globalTension}%. What strategic matter requires deeper analysis?`;
    }
  }
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
      const hostileCountryObjs = Object.entries(playerCountry.relations || {})
        .filter(([_, rel]) => (rel as number) < -50)
        .map(([id]) => countries.find((c: any) => c.id === id))
        .filter(Boolean);
      const hostileCountries = hostileCountryObjs.map((c: any) =>
        c.leader?.name ? `${c.name} (under ${c.leader.title} ${c.leader.name})` : c.name,
      );
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
            // frontline is 0-100; >50 means the attacker is advancing
            const isAttacker = war.attackerId === playerCountry.id;
            const progress = isAttacker ? war.frontline : 100 - war.frontline;
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

      const nuclearHostiles = countries.filter(
        (c: any) =>
          c.id !== playerCountry.id &&
          (playerCountry.relations?.[c.id] || 0) < -30 &&
          ['ARMED', 'TESTED', 'DEVELOPING'].includes(c.nuclear?.status),
      );
      if (nuclearHostiles.length > 0) {
        warnings.push(
          `Nuclear threat assessment: ${nuclearHostiles
            .map((c: any) =>
              c.nuclear.status === 'ARMED'
                ? `${c.name} is nuclear-armed (${c.nuclear.warheads} warheads)`
                : c.nuclear.status === 'TESTED'
                  ? `${c.name} has tested a nuclear device`
                  : `${c.name} is developing nuclear weapons`,
            )
            .join('; ')}. These hostile programs must factor into all military planning.`,
        );
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
      const approval = playerCountry.approval || 0;
      const insurgency = playerCountry.insurgencyLevel || 'NONE';
      const policing = playerCountry.policingTactic;
      const nextElectionTurn = playerCountry.politicalSystem?.nextElectionTurn ?? null;
      const monthsToElection =
        nextElectionTurn !== null ? nextElectionTurn - (worldState.turn || 0) : null;
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
      if (monthsToElection !== null && monthsToElection <= 6 && approval < 50) {
        warnings.push(
          `Elections are only ${monthsToElection} month${monthsToElection === 1 ? '' : 's'} away and approval stands at ${Math.round(approval)}%. We risk losing power at the ballot box.`,
        );
      }
      if (insurgency !== 'NONE') {
        warnings.push(
          `An insurgency is active (level: ${insurgency}). Current policing tactic: ${policing || 'standard'}. ${stability < 50 ? 'Heavy-handed measures may further inflame the population.' : 'The security services have it contained for now.'}`,
        );
      }

      const electionNote =
        monthsToElection !== null
          ? ` Next elections are ${monthsToElection} month${monthsToElection === 1 ? '' : 's'} away.`
          : ' No elections are scheduled under the current system.';
      const insurgencyNote =
        insurgency !== 'NONE'
          ? ` Insurgency level: ${insurgency} (policing: ${policing || 'standard'}).`
          : '';

      return {
        role: 'DOMESTIC_ADVISOR',
        analysis: `Domestic report: Approval at ${Math.round(approval)}%, stability at ${Math.round(stability)}%, government legitimacy at ${Math.round(legitimacy)}%.${electionNote}${insurgencyNote} ${stability < 50 ? 'The public mood is restless.' : 'The situation is manageable.'}`,
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

interface StoredChatMessage {
  role: 'user' | 'advisor';
  content: string;
  timestamp: string;
}

export function AdvisorModal() {
  const { activeModal, activeAdvisorRole, closeModal, setAdvisorRole, saveId, worldState, advisorChatHistory, addAdvisorMessage } = useGameStore();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Get chat history for current advisor from store
  const currentChatHistory = activeAdvisorRole ? (advisorChatHistory[activeAdvisorRole] || []) : [];

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
    if (!message.trim() || !activeAdvisorRole) return;

    const userMessage = message.trim();
    
    // Add user message to chat history in store
    addAdvisorMessage(activeAdvisorRole, { role: 'user', content: userMessage });
    setMessage('');
    setLoading(true);
    setError(null);

    // Generate response based on user's question
    if (worldState) {
      // Pass the actual user question to generate a contextual response
      const chatResponse = generateContextualResponse(activeAdvisorRole, userMessage, worldState);
      // Add a small delay to make it feel more natural
      setTimeout(() => {
        addAdvisorMessage(activeAdvisorRole, { role: 'advisor', content: chatResponse });
        setLoading(false);
      }, 300);
    } else {
      addAdvisorMessage(activeAdvisorRole, { role: 'advisor', content: "I'm unable to assess the situation - no game state available." });
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

          {/* Center: Briefing panel */}
          <div className="advisor-briefing">
            {!activeAdvisorRole ? (
              <div className="chat-placeholder">
                <p>Select an advisor to consult</p>
              </div>
            ) : (
              <>
                <div className="briefing-header">
                  <span className="advisor-icon">{selectedAdvisor?.icon}</span>
                  <h3>{selectedAdvisor?.name}'s Briefing</h3>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="briefing-content">
                  {response && (
                    <>
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: Chat panel */}
          {activeAdvisorRole && (
            <div className="advisor-chat-panel">
              <div className="chat-panel-header">
                <h4>💬 Chat with {selectedAdvisor?.name}</h4>
              </div>
              
              <div className="chat-messages-container">
                {currentChatHistory.length === 0 ? (
                  <div className="chat-empty">
                    <p>Ask {selectedAdvisor?.name} any questions about their area of expertise.</p>
                  </div>
                ) : (
                  <div className="chat-messages">
                    {currentChatHistory.map((msg: StoredChatMessage, i: number) => (
                      <div key={i} className={`chat-message ${msg.role}`}>
                        <div className="message-header">
                          <span className="message-role">
                            {msg.role === 'user' ? '👤 You' : `${selectedAdvisor?.icon} ${selectedAdvisor?.name}`}
                          </span>
                        </div>
                        <p className="message-content">{msg.content}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
                
                {loading && (
                  <div className="chat-loading">Consulting advisor...</div>
                )}
              </div>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
