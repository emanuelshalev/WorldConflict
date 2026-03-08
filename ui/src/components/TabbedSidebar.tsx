import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ActionPanel } from './ActionPanel';
import './TabbedSidebar.css';

type TabId = 'actions' | 'advisors' | 'news';

interface AdvisorBriefing {
  role: string;
  icon: string;
  name: string;
  summary: string;
}

interface NewsItem {
  id: string;
  category: string;
  headline: string;
  content: string;
}

export function TabbedSidebar() {
  const { worldState, openModal, setAdvisorRole } = useGameStore();
  const [activeTab, setActiveTab] = useState<TabId>('actions');

  if (!worldState) {
    return (
      <div className="tabbed-sidebar">
        <div className="sidebar-empty">
          <p>Start a new game to begin</p>
        </div>
      </div>
    );
  }

  const player = worldState.countries.find(c => c.id === worldState.playerCountryId);

  // Generate advisor briefings based on current state
  // Role IDs must match AdvisorModal's ADVISORS array
  const advisorBriefings: AdvisorBriefing[] = [
    {
      role: 'FOREIGN_MINISTER',
      icon: '🌐',
      name: 'Foreign Minister',
      summary: player?.alliances.length 
        ? `${player.alliances.length} active alliance(s). Relations with major powers stable. Consider expanding diplomatic ties.`
        : 'No formal alliances established. Diplomatic outreach recommended to strengthen our position.',
    },
    {
      role: 'DEFENSE_MINISTER',
      icon: '🎖️',
      name: 'Defense Minister',
      summary: player?.atWarWith.length 
        ? `Currently engaged in ${player.atWarWith.length} conflict(s). Military operations ongoing. Resources stretched.`
        : `Forces at ${player?.mobilizationLevel ?? 0}% readiness. ${player?.mobilizationLevel && player.mobilizationLevel < 50 ? 'Recommend increased mobilization.' : 'Adequate for current threat level.'}`,
    },
    {
      role: 'INTELLIGENCE_CHIEF',
      icon: '🕵️',
      name: 'Intelligence Chief',
      summary: `Intel coverage at ${player?.intelLevel ?? 50}%. Monitoring regional threats. Covert options available if needed.`,
    },
    {
      role: 'FINANCE_MINISTER',
      icon: '💰',
      name: 'Finance Minister',
      summary: player?.growthRate 
        ? `GDP growth: ${(player.growthRate * 100).toFixed(1)}%. Debt at ${player.debtGdpRatio?.toFixed(0) ?? 0}% of GDP. ${player.growthRate > 0 ? 'Economy performing well.' : 'Economic concerns noted.'}`
        : 'Economic indicators nominal. Budget allocation stable.',
    },
    {
      role: 'DOMESTIC_ADVISOR',
      icon: '🏛️',
      name: 'Domestic Advisor',
      summary: player?.stability 
        ? `National stability at ${player.stability}%. ${player.stability < 50 ? 'Internal unrest requires attention.' : 'Domestic situation under control.'}`
        : 'Internal affairs stable. No major concerns.',
    },
  ];

  // Generate news from world state or simulate based on current situation
  const generateSimulatedNews = (): NewsItem[] => {
    const news: NewsItem[] = [];
    const countries = worldState.countries;
    const otherCountries = countries.filter(c => c.id !== worldState.playerCountryId);
    
    // Check for wars
    if (worldState.wars && worldState.wars.length > 0) {
      for (const war of worldState.wars.slice(0, 2)) {
        const attacker = countries.find(c => c.id === war.attackerId);
        const defender = countries.find(c => c.id === war.defenderId);
        if (attacker && defender) {
          const progress = war.attackerProgress > war.defenderProgress ? 'advancing' : 'facing resistance';
          news.push({
            id: `war-${war.id}`,
            category: 'WAR',
            headline: `${attacker.name}-${defender.name} conflict continues`,
            content: `Fighting intensifies as ${attacker.name} forces are ${progress}. Casualties mount on both sides as the international community calls for ceasefire.`,
          });
        }
      }
    }

    // Check for high global tension
    if (worldState.globalTension > 60) {
      news.push({
        id: 'tension',
        category: 'WORLD',
        headline: 'Global tensions reach dangerous levels',
        content: `International analysts warn that global tension at ${worldState.globalTension}% could trigger wider conflict. Diplomatic channels remain open but strained.`,
      });
    }

    // Check for unstable countries
    const unstable = otherCountries.filter(c => c.stability < 40);
    if (unstable.length > 0) {
      const country = unstable[0];
      news.push({
        id: `unstable-${country.id}`,
        category: 'CRISIS',
        headline: `Unrest grows in ${country.name}`,
        content: `${country.name} faces internal turmoil as stability drops to ${country.stability}%. Protests reported in major cities as government struggles to maintain order.`,
      });
    }

    // Economic news based on player country
    if (player) {
      if (player.growthRate > 0.03) {
        news.push({
          id: 'econ-growth',
          category: 'ECON',
          headline: 'Strong economic growth reported',
          content: `National economy shows robust ${(player.growthRate * 100).toFixed(1)}% growth this quarter. Analysts credit sound fiscal policy and favorable trade conditions.`,
        });
      } else if (player.growthRate < -0.01) {
        news.push({
          id: 'econ-decline',
          category: 'ECON',
          headline: 'Economic concerns mount',
          content: `Economy contracts by ${Math.abs(player.growthRate * 100).toFixed(1)}% amid challenging conditions. Treasury officials working on stimulus measures.`,
        });
      }
    }

    // Military buildup news
    const militarizing = otherCountries.filter(c => c.mobilizationLevel > 60);
    if (militarizing.length > 0) {
      const country = militarizing[0];
      news.push({
        id: `military-${country.id}`,
        category: 'SEC',
        headline: `${country.name} increases military readiness`,
        content: `${country.name} has raised mobilization to ${country.mobilizationLevel}%. Defense analysts monitoring the situation closely for potential regional implications.`,
      });
    }

    // Alliance news
    const recentAllies = otherCountries.filter(c => c.alliances && c.alliances.length > 2);
    if (recentAllies.length > 0) {
      const country = recentAllies[0];
      news.push({
        id: `alliance-${country.id}`,
        category: 'DIPLO',
        headline: `${country.name} strengthens alliance network`,
        content: `${country.name} now maintains ${country.alliances.length} formal alliances, signaling a shift in regional power dynamics.`,
      });
    }

    // Default news if nothing specific
    if (news.length === 0) {
      news.push(
        { id: 'default-1', category: 'WORLD', headline: 'Diplomatic efforts continue worldwide', content: 'Nations engage in ongoing negotiations as the international order remains stable. Trade agreements and cultural exchanges proceed as planned.' },
        { id: 'default-2', category: 'ECON', headline: 'Global markets show steady performance', content: 'Financial markets remain stable with moderate trading volumes. Investors cautiously optimistic about near-term outlook.' },
      );
    }

    // Always add a local news item
    if (player) {
      news.push({
        id: 'local',
        category: 'LOCAL',
        headline: `Government approval at ${player.legitimacy}%`,
        content: `Latest polls show public support for the administration at ${player.legitimacy}%. ${player.legitimacy > 60 ? 'Officials express confidence in continued mandate.' : 'Opposition calls for policy changes.'}`,
      });
    }

    return news.slice(0, 5); // Limit to 5 news items
  };

  const newsItems: NewsItem[] = worldState.newspaper?.length > 0 
    ? worldState.newspaper.map((n, i) => ({
        id: String(i),
        category: n.category || 'WORLD',
        headline: n.headline,
        content: n.content,
      }))
    : generateSimulatedNews();

  const handleAdvisorChat = (role: string) => {
    setAdvisorRole(role);
    openModal('advisor');
  };

  const handleReadMore = (_newsId: string) => {
    openModal('newspaper');
  };

  return (
    <div className="tabbed-sidebar">
      <div className="tab-bar">
        <button 
          className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          <span className="tab-icon">⚡</span>
          <span className="tab-label">Actions</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'advisors' ? 'active' : ''}`}
          onClick={() => setActiveTab('advisors')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">Advisors</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <span className="tab-icon">📰</span>
          <span className="tab-label">News</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'actions' && <ActionPanel />}

        {activeTab === 'advisors' && (
          <div className="advisors-tab">
            <div className="tab-header">
              <h2>Cabinet Briefings</h2>
              <span className="turn-info">Turn {worldState.turn}</span>
            </div>
            <div className="advisors-list">
              {advisorBriefings.map((advisor) => (
                <div 
                  key={advisor.role} 
                  className="advisor-card clickable"
                  onClick={() => handleAdvisorChat(advisor.role)}
                >
                  <div className="advisor-header">
                    <span className="advisor-icon">{advisor.icon}</span>
                    <span className="advisor-name">{advisor.name}</span>
                  </div>
                  <p className="advisor-summary">{advisor.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="news-tab">
            <div className="tab-header">
              <h2>World News</h2>
              <span className="turn-info">{worldState.date}</span>
            </div>
            <div className="news-list">
              {newsItems.map((news) => (
                <div key={news.id} className="news-card">
                  <div className="news-header">
                    <span className="news-category">{news.category}</span>
                  </div>
                  <h3 className="news-headline">{news.headline}</h3>
                  <p className="news-preview">{news.content.slice(0, 100)}...</p>
                  <button 
                    className="news-read-more"
                    onClick={() => handleReadMore(news.id)}
                  >
                    Read More →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
