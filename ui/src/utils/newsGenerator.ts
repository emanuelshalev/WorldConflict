import type { WorldState } from '../store/gameStore';

export interface NewsArticle {
  id: string;
  category: string;
  headline: string;
  summary: string;
  content: string;
  relatedCountries?: string[];
  impact?: string;
}

export function generateNews(worldState: WorldState): NewsArticle[] {
  const news: NewsArticle[] = [];
  const countries = worldState.countries;
  const playerCountry = countries.find(c => c.id === worldState.playerCountryId);
  const otherCountries = countries.filter(c => c.id !== worldState.playerCountryId);

  // Check for wars - most important news
  if (worldState.wars && worldState.wars.length > 0) {
    for (const war of worldState.wars.slice(0, 2)) {
      const attacker = countries.find(c => c.id === war.attackerId);
      const defender = countries.find(c => c.id === war.defenderId);
      if (attacker && defender) {
        const isAttackerWinning = war.attackerProgress > war.defenderProgress;
        const progressDiff = Math.abs(war.attackerProgress - war.defenderProgress);
        
        let situation = 'continues with no clear advantage';
        if (progressDiff > 20) {
          situation = isAttackerWinning 
            ? `${attacker.name} forces advancing rapidly` 
            : `${defender.name} mounting successful defense`;
        } else if (progressDiff > 10) {
          situation = isAttackerWinning 
            ? `${attacker.name} gaining ground slowly` 
            : `${defender.name} holding firm`;
        }

        news.push({
          id: `war-${war.attackerId}-${war.defenderId}`,
          category: 'WAR',
          headline: `${attacker.name}-${defender.name} Conflict Intensifies`,
          summary: `Fighting continues as ${situation}. Casualties mount on both sides.`,
          content: `The ongoing conflict between ${attacker.name} and ${defender.name} has entered a critical phase. Military analysts report that ${situation}, with current progress standing at ${war.attackerProgress}% for ${attacker.name} and ${war.defenderProgress}% for ${defender.name}.\n\nInternational observers have called for an immediate ceasefire, but both sides appear committed to continued military operations. Humanitarian organizations warn of a growing refugee crisis as civilians flee the combat zones.\n\nDefense experts suggest that the conflict could continue for several more months unless diplomatic intervention succeeds. The economic toll on both nations is already substantial, with disruptions to trade and infrastructure damage mounting daily.`,
          relatedCountries: [attacker.name, defender.name],
          impact: `Regional stability affected. Trade disruptions likely. Casualties mounting on both sides.`,
        });
      }
    }
  }

  // High global tension
  if (worldState.globalTension > 60) {
    const tensionLevel = worldState.globalTension > 80 ? 'critical' : 'dangerous';
    news.push({
      id: 'tension-high',
      category: 'WORLD',
      headline: `Global Tensions Reach ${tensionLevel.charAt(0).toUpperCase() + tensionLevel.slice(1)} Levels`,
      summary: `International analysts warn of potential wider conflict as tensions hit ${worldState.globalTension}%.`,
      content: `The global political situation has deteriorated significantly, with international tension indices reaching ${worldState.globalTension}% - a level not seen in recent memory. Diplomatic sources indicate that multiple flashpoints around the world are contributing to this dangerous escalation.\n\nWorld leaders have issued statements calling for calm, but military preparations continue in several regions. The United Nations Security Council is scheduled to meet in emergency session to address the crisis.\n\nEconomic markets have reacted nervously to the news, with defense stocks rising while consumer confidence falls. Analysts warn that any miscalculation could trigger a broader conflict with devastating consequences.`,
      impact: `Risk of major conflict elevated. Markets volatile. Diplomatic channels strained.`,
    });
  }

  // Unstable countries
  const unstable = otherCountries.filter(c => c.stability < 40).slice(0, 2);
  for (const country of unstable) {
    const severity = country.stability < 25 ? 'Crisis deepens' : 'Unrest grows';
    news.push({
      id: `unstable-${country.id}`,
      category: 'CRISIS',
      headline: `${severity} in ${country.name}`,
      summary: `${country.name} faces internal turmoil as stability drops to ${country.stability}%.`,
      content: `${country.name} is experiencing significant internal challenges as national stability has fallen to ${country.stability}%. Reports indicate widespread protests in major cities, with demonstrators demanding political reforms and economic relief.\n\nThe government has deployed security forces to maintain order, but clashes have been reported in several locations. Opposition leaders are calling for dialogue, while hardliners within the regime advocate for a stronger response.\n\nInternational observers warn that continued instability could lead to a humanitarian crisis or even regime change. Neighboring countries are monitoring the situation closely, with some preparing for potential refugee flows.`,
      relatedCountries: [country.name],
      impact: `Regional instability. Potential refugee crisis. Investment climate deteriorating.`,
    });
  }

  // Military buildup
  const militarizing = otherCountries.filter(c => c.mobilizationLevel > 60).slice(0, 1);
  for (const country of militarizing) {
    news.push({
      id: `military-${country.id}`,
      category: 'SEC',
      headline: `${country.name} Increases Military Readiness`,
      summary: `Defense analysts note ${country.name} has raised mobilization to ${country.mobilizationLevel}%.`,
      content: `${country.name} has significantly increased its military readiness, with mobilization levels now at ${country.mobilizationLevel}%. Defense ministry officials cite "regional security concerns" as the reason for the buildup, though specific threats have not been identified.\n\nSatellite imagery shows increased activity at military bases, with reserve units being called up and equipment being moved to forward positions. Neighboring countries have expressed concern over the developments.\n\nMilitary analysts suggest this could be a defensive measure or preparation for potential offensive operations. The international community is urging restraint while diplomatic channels remain open.`,
      relatedCountries: [country.name],
      impact: `Regional security concerns. Potential arms race. Diplomatic tensions rising.`,
    });
  }

  // Alliance news
  const wellConnected = otherCountries.filter(c => c.alliances && c.alliances.length >= 3).slice(0, 1);
  for (const country of wellConnected) {
    news.push({
      id: `alliance-${country.id}`,
      category: 'DIPLO',
      headline: `${country.name} Strengthens Alliance Network`,
      summary: `${country.name} now maintains ${country.alliances.length} formal alliances, reshaping regional dynamics.`,
      content: `${country.name} has emerged as a key player in regional politics, having established formal alliance agreements with ${country.alliances.length} nations. This diplomatic achievement represents a significant shift in the balance of power.\n\nForeign policy experts note that this alliance network provides ${country.name} with substantial collective security guarantees and economic benefits. Partner nations have praised the agreements as "mutually beneficial" and "essential for regional stability."\n\nHowever, some observers warn that the growing bloc could increase tensions with non-member states, potentially leading to a new era of competing alliance systems.`,
      relatedCountries: [country.name],
      impact: `Power balance shifting. New diplomatic alignments forming.`,
    });
  }

  // Player country economic news
  if (playerCountry) {
    if (playerCountry.growthRate !== undefined) {
      if (playerCountry.growthRate > 0.02) {
        news.push({
          id: 'econ-growth',
          category: 'ECON',
          headline: 'Strong Economic Growth Reported',
          summary: `National economy shows robust ${(playerCountry.growthRate * 100).toFixed(1)}% growth this quarter.`,
          content: `The national economy has posted impressive growth figures, with GDP expanding by ${(playerCountry.growthRate * 100).toFixed(1)}% in the latest reporting period. Treasury officials credit sound fiscal policy, favorable trade conditions, and strong consumer confidence for the positive results.\n\nKey sectors driving growth include manufacturing, technology, and services. Employment figures have also improved, with unemployment falling to multi-year lows. Business leaders express optimism about continued expansion.\n\nAnalysts caution that global uncertainties could impact future growth, but the current trajectory suggests a healthy economic outlook for the coming months.`,
          impact: `Increased government revenue. Rising living standards. Enhanced international standing.`,
        });
      } else if (playerCountry.growthRate < -0.01) {
        news.push({
          id: 'econ-decline',
          category: 'ECON',
          headline: 'Economic Concerns Mount',
          summary: `Economy contracts by ${Math.abs(playerCountry.growthRate * 100).toFixed(1)}% amid challenging conditions.`,
          content: `The national economy has contracted by ${Math.abs(playerCountry.growthRate * 100).toFixed(1)}%, raising concerns among policymakers and business leaders. Treasury officials are working on stimulus measures to address the downturn.\n\nSeveral factors have contributed to the decline, including reduced consumer spending, trade disruptions, and decreased investment. Unemployment has risen in affected sectors, putting pressure on social services.\n\nThe government has announced plans for economic relief measures, though opposition leaders argue that more aggressive action is needed. International financial institutions are monitoring the situation closely.`,
          impact: `Budget pressures. Rising unemployment. Potential social unrest.`,
        });
      }
    }

    // Government approval
    if (playerCountry.legitimacy !== undefined) {
      const approvalStatus = playerCountry.legitimacy > 60 ? 'remains strong' : 
                            playerCountry.legitimacy > 40 ? 'holds steady' : 'faces challenges';
      news.push({
        id: 'local-approval',
        category: 'LOCAL',
        headline: `Government Approval ${approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}`,
        summary: `Latest polls show public support for the administration at ${playerCountry.legitimacy}%.`,
        content: `The latest public opinion surveys indicate that government approval ${approvalStatus}, with ${playerCountry.legitimacy}% of respondents expressing support for current policies. ${playerCountry.legitimacy > 60 ? 'Officials express confidence in their mandate to continue current initiatives.' : playerCountry.legitimacy > 40 ? 'Political analysts describe the situation as stable but requiring attention.' : 'Opposition parties are calling for policy changes and new elections.'}\n\nKey issues affecting public opinion include economic conditions, security concerns, and domestic policy decisions. The administration has pledged to address citizen concerns through upcoming legislative initiatives.\n\nPolitical observers note that approval ratings often fluctuate based on current events, and the government's response to emerging challenges will be crucial for maintaining public support.`,
        impact: `${playerCountry.legitimacy > 50 ? 'Stable governance. Policy continuity likely.' : 'Political pressure mounting. Policy changes possible.'}`,
      });
    }

    // Stability news
    if (playerCountry.stability !== undefined && playerCountry.stability < 50) {
      news.push({
        id: 'local-stability',
        category: 'LOCAL',
        headline: 'Domestic Stability Concerns Rise',
        summary: `National stability at ${playerCountry.stability}% as internal pressures mount.`,
        content: `Domestic stability indicators have fallen to ${playerCountry.stability}%, prompting concern among government officials and security analysts. Reports indicate growing public discontent over various issues, including economic conditions and political representation.\n\nSecurity forces have been placed on heightened alert in major urban centers, though officials emphasize that the situation remains under control. Community leaders are calling for dialogue to address underlying grievances.\n\nHistorical analysis suggests that stability below 40% significantly increases the risk of civil unrest or political upheaval. The government is reportedly considering reform measures to address public concerns.`,
        impact: `Governance challenges. Potential unrest. International attention.`,
      });
    }
  }

  // Default news if nothing specific
  if (news.length < 2) {
    news.push({
      id: 'default-diplomatic',
      category: 'WORLD',
      headline: 'Diplomatic Efforts Continue Worldwide',
      summary: 'Nations engage in ongoing negotiations as the international order remains stable.',
      content: `In a period of relative calm, diplomatic efforts continue across the globe as nations work to maintain stability and address shared challenges. Foreign ministries report productive discussions on trade, security, and environmental issues.\n\nMultilateral organizations are facilitating dialogue between nations with differing interests, seeking common ground on contentious issues. While tensions exist in various regions, the overall international climate remains conducive to peaceful resolution of disputes.\n\nAnalysts note that this period of stability provides an opportunity for constructive engagement and the building of stronger international institutions.`,
      impact: `Stable international environment. Opportunities for diplomatic initiatives.`,
    });
  }

  if (news.length < 3) {
    news.push({
      id: 'default-markets',
      category: 'ECON',
      headline: 'Global Markets Show Steady Performance',
      summary: 'Financial markets remain stable with moderate trading volumes.',
      content: `Global financial markets have posted steady results in recent trading sessions, with major indices showing modest gains. Investors appear cautiously optimistic about the near-term economic outlook, though concerns about geopolitical risks persist.\n\nCommodity prices have remained relatively stable, with oil and precious metals trading within established ranges. Currency markets have seen limited volatility, suggesting confidence in major economies.\n\nMarket analysts recommend a balanced approach to investment, noting that while current conditions are favorable, unexpected developments could quickly change the landscape.`,
      impact: `Stable investment climate. Moderate growth expectations.`,
    });
  }

  return news.slice(0, 6); // Limit to 6 news items
}
