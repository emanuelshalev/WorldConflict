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

// Advisor personas for realistic chat responses
const ADVISOR_PERSONAS: Record<string, { greeting: string; style: string; expertise: string[] }> = {
  FOREIGN_MINISTER: {
    greeting: "Excellency",
    style: "diplomatic and measured, using formal language",
    expertise: ["alliances", "treaties", "diplomatic relations", "international standing", "negotiations"]
  },
  DEFENSE_MINISTER: {
    greeting: "Commander",
    style: "direct and military-focused, using strategic terminology",
    expertise: ["military readiness", "troop deployments", "defense strategy", "threats", "warfare"]
  },
  FINANCE_MINISTER: {
    greeting: "Sir",
    style: "analytical and numbers-focused, citing statistics",
    expertise: ["economy", "budget", "GDP", "trade", "sanctions", "fiscal policy"]
  },
  INTELLIGENCE_CHIEF: {
    greeting: "Director",
    style: "cautious and secretive, speaking in measured terms",
    expertise: ["intelligence", "espionage", "covert operations", "threats", "surveillance"]
  },
  DOMESTIC_ADVISOR: {
    greeting: "Leader",
    style: "concerned with public opinion and internal stability",
    expertise: ["stability", "reforms", "public approval", "protests", "legitimacy"]
  },
  CHIEF_OF_STAFF: {
    greeting: "Chief",
    style: "strategic and comprehensive, considering all factors",
    expertise: ["overall strategy", "coordination", "priorities", "national security"]
  }
};

// Generate a response to a user's question based on advisor role and game state
function generateChatResponse(advisorId: string, userQuestion: string, worldState: any): string {
  const playerCountry = worldState?.countries?.find((c: any) => c.id === worldState?.playerCountryId);
  if (!playerCountry) return "I'm unable to assess the situation at this time.";

  const question = userQuestion.toLowerCase();
  const countries = worldState.countries || [];
  const persona = ADVISOR_PERSONAS[advisorId] || ADVISOR_PERSONAS.CHIEF_OF_STAFF;
  
  // Find relevant context based on question keywords
  const mentionedCountry = countries.find((c: any) => 
    question.includes(c.name.toLowerCase()) || question.includes(c.id.toLowerCase())
  );

  switch (advisorId) {
    case 'FOREIGN_MINISTER': {
      if (question.includes('alliance') || question.includes('ally')) {
        const allies = playerCountry.alliances || [];
        return allies.length > 0 
          ? `${persona.greeting}, we currently maintain formal alliances with ${allies.length} nation(s). These partnerships form the backbone of our collective security framework. ${mentionedCountry ? `As for ${mentionedCountry.name}, our bilateral relations stand at ${playerCountry.relations?.[mentionedCountry.id] || 0} - ${(playerCountry.relations?.[mentionedCountry.id] || 0) > 50 ? 'quite favorable for deepening ties.' : 'requiring careful diplomatic cultivation.'}` : 'Shall I elaborate on any specific partnership?'}`
          : `${persona.greeting}, I must report that we currently lack formal alliance commitments. This leaves us diplomatically isolated. I strongly recommend pursuing strategic partnerships with nations sharing our interests and values.`;
      }
      if (question.includes('war') || question.includes('conflict')) {
        const atWar = playerCountry.atWarWith?.length > 0;
        return atWar 
          ? `${persona.greeting}, we are presently engaged in armed conflict with ${playerCountry.atWarWith.length} nation(s). The international community is watching closely. I am working through diplomatic channels to either find a resolution or ensure our allies remain committed to our cause.`
          : `${persona.greeting}, I am pleased to report we are not currently engaged in any armed conflicts. However, global tensions remain at ${worldState.globalTension}%. I recommend we continue our diplomatic efforts to maintain this peace.`;
      }
      if (mentionedCountry) {
        const rel = playerCountry.relations?.[mentionedCountry.id] || 0;
        const relStatus = rel > 60 ? 'excellent - they are a trusted partner' : rel > 30 ? 'positive - room for growth' : rel > -20 ? 'neutral - neither friend nor foe' : rel > -50 ? 'strained - caution advised' : 'hostile - they pose a diplomatic threat';
        return `${persona.greeting}, regarding ${mentionedCountry.name}: Our relations stand at ${rel}, which I would characterize as ${relStatus}. Their internal stability is ${mentionedCountry.stability}%, and they maintain a ${mentionedCountry.regimeType} government. ${rel < 0 ? 'I recommend diplomatic outreach to improve this relationship.' : 'We should nurture this relationship further.'}`;
      }
      return `${persona.greeting}, I stand ready to advise on all matters of diplomacy, international relations, and alliance strategy. What specific aspect of our foreign policy concerns you?`;
    }
    
    case 'DEFENSE_MINISTER': {
      if (question.includes('military') || question.includes('army') || question.includes('force')) {
        return `${persona.greeting}, our military stands at ${playerCountry.mobilizationLevel}% mobilization. We field ${playerCountry.manpower?.toLocaleString() || 'substantial'} ground forces and ${playerCountry.airpower || 0} air assets. ${playerCountry.mobilizationLevel < 40 ? 'Frankly, we are underprepared. I recommend increasing mobilization immediately.' : playerCountry.mobilizationLevel < 70 ? 'We have adequate defensive capability, but offensive operations would strain our resources.' : 'We are combat-ready and capable of projecting power if needed.'}`;
      }
      if (question.includes('war') || question.includes('attack') || question.includes('invade')) {
        const atWar = playerCountry.atWarWith?.length > 0;
        if (atWar) {
          return `${persona.greeting}, we are currently engaged in combat operations. Our forces are committed and performing their duty. I recommend we focus all available resources on the war effort. Victory requires sustained commitment.`;
        }
        if (mentionedCountry) {
          const theirMil = mentionedCountry.mobilizationLevel || 50;
          return `${persona.greeting}, you ask about military action against ${mentionedCountry.name}. Their military readiness is at ${theirMil}% mobilization. ${theirMil > playerCountry.mobilizationLevel ? 'I must caution - they appear stronger than us currently. We would need to mobilize further before any offensive.' : 'Our forces are superior, but war always carries risks. Are you certain diplomatic options are exhausted?'}`;
        }
        return `${persona.greeting}, military action is always an option, but it should be the last resort. If you have a specific adversary in mind, I can provide a tactical assessment.`;
      }
      if (question.includes('defend') || question.includes('threat')) {
        const threats = countries.filter((c: any) => (playerCountry.relations?.[c.id] || 0) < -40 && c.mobilizationLevel > 50);
        return threats.length > 0 
          ? `${persona.greeting}, I've identified ${threats.length} potential military threat(s): ${threats.map((t: any) => `${t.name} (${t.mobilizationLevel}% mobilized)`).join(', ')}. These nations have hostile intent and significant military capability. I recommend we increase our own readiness.`
          : `${persona.greeting}, I detect no immediate military threats to our nation. However, a wise commander never lets their guard down. I recommend maintaining current readiness levels.`;
      }
      return `${persona.greeting}, I am prepared to advise on all military matters - force readiness, threat assessment, and strategic planning. What concerns you?`;
    }
    
    case 'FINANCE_MINISTER': {
      if (question.includes('economy') || question.includes('gdp') || question.includes('money') || question.includes('budget')) {
        const growth = playerCountry.growthRate * 100;
        const growthStatus = growth > 3 ? 'robust expansion' : growth > 1 ? 'healthy growth' : growth > 0 ? 'modest growth' : 'concerning contraction';
        return `${persona.greeting}, the economic indicators: GDP at $${(playerCountry.gdp / 1e9).toFixed(1)} billion, with ${growth.toFixed(1)}% growth - I would characterize this as ${growthStatus}. Military expenditure consumes ${playerCountry.militaryBudgetPercent}% of GDP. Our debt-to-GDP ratio stands at ${playerCountry.debtGdpRatio || 0}%. ${growth < 0 ? 'We must take action to stimulate the economy.' : 'The treasury is in acceptable condition.'}`;
      }
      if (question.includes('trade') || question.includes('sanction')) {
        return `${persona.greeting}, trade policy is intimately linked to our diplomatic standing. Nations with positive relations offer better trade terms. Sanctions are a powerful economic weapon - they can cripple an adversary's economy, but may invite retaliation. I recommend careful cost-benefit analysis before any trade actions.`;
      }
      return `${persona.greeting}, the economy is ${playerCountry.growthRate > 0.02 ? 'performing well' : playerCountry.growthRate < 0 ? 'struggling - we need intervention' : 'stable but could improve'}. What specific fiscal matter requires my attention?`;
    }
    
    case 'INTELLIGENCE_CHIEF': {
      if (question.includes('spy') || question.includes('intel') || question.includes('covert')) {
        return `${persona.greeting}, our intelligence apparatus is... operational. I cannot discuss specifics in detail, but we maintain assets in key regions. Covert operations are available - destabilization, intelligence gathering, even sabotage. Each carries risks of exposure. What did you have in mind?`;
      }
      if (mentionedCountry) {
        const intel = playerCountry.intelLevel || 50;
        return `${persona.greeting}, I can share what we know about ${mentionedCountry.name}. Internal stability: ${mentionedCountry.stability}%. Military mobilization: ${mentionedCountry.mobilizationLevel}%. Government type: ${mentionedCountry.regimeType}. ${intel > 70 ? 'Our sources there are reliable.' : intel > 40 ? 'Our intelligence is adequate but could be improved.' : 'Frankly, we are operating somewhat blind. I recommend deploying assets to gather more information.'}`;
      }
      return `${persona.greeting}, I monitor threats both foreign and domestic. My network provides eyes and ears across the globe. Ask me about specific nations, or if you wish to discuss... special operations.`;
    }
    
    case 'DOMESTIC_ADVISOR': {
      if (question.includes('stability') || question.includes('unrest') || question.includes('protest')) {
        const stab = playerCountry.stability;
        return `${persona.greeting}, national stability currently sits at ${stab}%. ${stab < 30 ? 'This is critical - we risk civil unrest or worse. Immediate action is required: either reforms to address grievances, or security measures to maintain order.' : stab < 50 ? 'The situation is concerning. The people are restless. I recommend addressing their concerns before discontent spreads.' : stab < 70 ? 'Stability is adequate, though there is always room for improvement.' : 'The nation is stable and the people content. A good foundation for ambitious policies.'}`;
      }
      if (question.includes('reform') || question.includes('policy')) {
        return `${persona.greeting}, reforms are a double-edged sword. They can improve long-term stability and legitimacy, but may cause short-term disruption. Our current legitimacy stands at ${playerCountry.legitimacy}%. ${playerCountry.legitimacy < 40 ? 'The government desperately needs to rebuild public trust. Bold reforms may be necessary.' : 'We have adequate public support to pursue moderate reforms if desired.'}`;
      }
      return `${persona.greeting}, the domestic situation: ${playerCountry.stability}% stability, ${playerCountry.legitimacy}% public approval. The people are ${playerCountry.stability > 60 ? 'generally content' : 'showing signs of discontent'}. What aspect of internal affairs shall we discuss?`;
    }
    
    case 'CHIEF_OF_STAFF':
    default: {
      const atWar = playerCountry.atWarWith?.length > 0;
      const threats = countries.filter((c: any) => (playerCountry.relations?.[c.id] || 0) < -40);
      const priorities = [];
      if (atWar) priorities.push('the ongoing war effort');
      if (playerCountry.stability < 50) priorities.push('domestic stability');
      if (threats.length > 0) priorities.push('external threats');
      if (playerCountry.growthRate < 0) priorities.push('economic recovery');
      
      return `${persona.greeting}, here is my strategic assessment: ${atWar ? 'We are at war - this dominates all other concerns.' : 'We are at peace, but must remain vigilant.'} Global tension: ${worldState.globalTension}%. Our stability: ${playerCountry.stability}%. ${priorities.length > 0 ? `Key priorities: ${priorities.join(', ')}.` : 'No critical issues require immediate attention.'} How may I assist with strategic planning?`;
    }
  }
}

// Generate a contextual response that acknowledges the user's specific question
function generateContextualResponse(advisorId: string, userQuestion: string, worldState: any): string {
  const playerCountry = worldState?.countries?.find((c: any) => c.id === worldState?.playerCountryId);
  if (!playerCountry) return "I'm unable to assess the situation at this time.";

  const persona = ADVISOR_PERSONAS[advisorId] || ADVISOR_PERSONAS.CHIEF_OF_STAFF;
  const question = userQuestion.toLowerCase();
  
  // First try the keyword-based response
  const keywordResponse = generateChatResponse(advisorId, userQuestion, worldState);
  
  // Check if we got a generic "I can advise on..." response (fallback)
  const isGenericResponse = keywordResponse.includes('I can advise on') || 
                            keywordResponse.includes('I stand ready') ||
                            keywordResponse.includes('I am prepared to advise') ||
                            keywordResponse.includes('I monitor threats') ||
                            keywordResponse.includes('What aspect of');
  
  if (!isGenericResponse) {
    return keywordResponse;
  }
  
  // Generate a more contextual response based on the question
  const countries = worldState.countries || [];
  const mentionedCountry = countries.find((c: any) => 
    question.includes(c.name.toLowerCase()) || question.includes(c.id.toLowerCase())
  );
  
  // Provide a thoughtful response that references the question
  const questionAck = userQuestion.length > 50 
    ? `Regarding your question about "${userQuestion.substring(0, 40)}..."` 
    : `You ask: "${userQuestion}"`;
  
  switch (advisorId) {
    case 'FOREIGN_MINISTER':
      if (mentionedCountry) {
        const rel = playerCountry.relations?.[mentionedCountry.id] || 0;
        return `${persona.greeting}, ${questionAck} - Let me address this. ${mentionedCountry.name} has relations of ${rel} with us. ${rel > 30 ? 'They are favorably disposed.' : rel < -20 ? 'Relations are strained.' : 'They are neutral toward us.'} Their stability is ${mentionedCountry.stability}%. I recommend ${rel < 0 ? 'diplomatic outreach to improve ties.' : 'maintaining our current approach.'}`;
      }
      return `${persona.greeting}, ${questionAck} - From a diplomatic perspective, our international standing is ${playerCountry.stability > 60 ? 'strong' : 'in need of attention'}. We have ${(playerCountry.alliances || []).length} alliance(s). Global tension is at ${worldState.globalTension}%. What specific nation or diplomatic matter should I focus on?`;
      
    case 'DEFENSE_MINISTER':
      return `${persona.greeting}, ${questionAck} - Militarily speaking, we stand at ${playerCountry.mobilizationLevel}% readiness with ${playerCountry.manpower?.toLocaleString() || 'adequate'} troops. ${playerCountry.atWarWith?.length > 0 ? 'We are currently at war - this is our primary concern.' : 'No active conflicts, but we must remain vigilant.'} Is there a specific military matter you wish me to address?`;
      
    case 'FINANCE_MINISTER':
      return `${persona.greeting}, ${questionAck} - Economically, our GDP is $${(playerCountry.gdp / 1e9).toFixed(1)}B with ${(playerCountry.growthRate * 100).toFixed(1)}% growth. Military spending is ${playerCountry.militaryBudgetPercent}% of GDP. ${playerCountry.growthRate < 0 ? 'The economy needs attention.' : 'Finances are stable.'} What economic aspect concerns you most?`;
      
    case 'INTELLIGENCE_CHIEF':
      if (mentionedCountry) {
        return `${persona.greeting}, ${questionAck} - Our intelligence on ${mentionedCountry.name}: Stability ${mentionedCountry.stability}%, mobilization ${mentionedCountry.mobilizationLevel}%, regime type ${mentionedCountry.regimeType}. ${mentionedCountry.stability < 50 ? 'They appear vulnerable to internal pressure.' : 'They seem internally stable.'} Shall I recommend any covert actions?`;
      }
      return `${persona.greeting}, ${questionAck} - Our intelligence network is monitoring global developments. Current global tension: ${worldState.globalTension}%. We have ${countries.filter((c: any) => (playerCountry.relations?.[c.id] || 0) < -30).length} potentially hostile nations under surveillance. What specific intelligence do you require?`;
      
    case 'DOMESTIC_ADVISOR':
      return `${persona.greeting}, ${questionAck} - Domestically, stability is at ${playerCountry.stability}% and public legitimacy at ${playerCountry.legitimacy}%. ${playerCountry.stability < 50 ? 'The people are restless - we should consider reforms or security measures.' : 'The nation is relatively stable.'} What domestic concern should I address?`;
      
    default:
      return `${persona.greeting}, ${questionAck} - Let me provide my assessment. Our nation's stability: ${playerCountry.stability}%. Global tension: ${worldState.globalTension}%. ${playerCountry.atWarWith?.length > 0 ? 'We are at war.' : 'We are at peace.'} Economy: ${playerCountry.growthRate > 0 ? 'growing' : 'struggling'}. How can I help you further?`;
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

    // Try backend first if saveId exists
    if (saveId) {
      try {
        const res = await fetch('http://localhost:8080/api/chat/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saveId, role: activeAdvisorRole, message: userMessage }),
        });
        const data = await res.json();
        if (data.success && data.response) {
          setResponse(data.response);
          addAdvisorMessage(activeAdvisorRole, {
            role: 'advisor',
            content: data.response.analysis || 'I understand your question. Let me analyze the situation.',
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Backend chat failed, using local response');
      }
    }

    // Fallback to local response generation based on user's question
    if (worldState) {
      const chatResponse = generateContextualResponse(activeAdvisorRole, userMessage, worldState);
      addAdvisorMessage(activeAdvisorRole, { role: 'advisor', content: chatResponse });
    }
    setLoading(false);
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
