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
  const advisorBriefings: AdvisorBriefing[] = [
    {
      role: 'foreign',
      icon: '🌐',
      name: 'Foreign Minister',
      summary: player?.alliances.length 
        ? `${player.alliances.length} active alliance(s). Relations with major powers stable. Consider expanding diplomatic ties.`
        : 'No formal alliances established. Diplomatic outreach recommended to strengthen our position.',
    },
    {
      role: 'defense',
      icon: '🎖️',
      name: 'Defense Minister',
      summary: player?.atWarWith.length 
        ? `Currently engaged in ${player.atWarWith.length} conflict(s). Military operations ongoing. Resources stretched.`
        : `Forces at ${player?.mobilizationLevel ?? 0}% readiness. ${player?.mobilizationLevel && player.mobilizationLevel < 50 ? 'Recommend increased mobilization.' : 'Adequate for current threat level.'}`,
    },
    {
      role: 'intelligence',
      icon: '🕵️',
      name: 'Intelligence Chief',
      summary: `Intel coverage at ${player?.intelLevel ?? 50}%. Monitoring regional threats. Covert options available if needed.`,
    },
    {
      role: 'treasury',
      icon: '💰',
      name: 'Treasury Secretary',
      summary: player?.growthRate 
        ? `GDP growth: ${(player.growthRate * 100).toFixed(1)}%. Debt at ${player.debtGdpRatio?.toFixed(0) ?? 0}% of GDP. ${player.growthRate > 0 ? 'Economy performing well.' : 'Economic concerns noted.'}`
        : 'Economic indicators nominal. Budget allocation stable.',
    },
    {
      role: 'interior',
      icon: '🏛️',
      name: 'Interior Minister',
      summary: player?.stability 
        ? `National stability at ${player.stability}%. ${player.stability < 50 ? 'Internal unrest requires attention.' : 'Domestic situation under control.'}`
        : 'Internal affairs stable. No major concerns.',
    },
  ];

  // Get news from world state
  const newsItems: NewsItem[] = worldState.newspaper?.map((n, i) => ({
    id: String(i),
    category: n.category || 'WORLD',
    headline: n.headline,
    content: n.content,
  })) ?? [
    { id: '1', category: 'WORLD', headline: 'Global tensions remain elevated', content: 'Diplomatic efforts continue as nations navigate complex geopolitical landscape.' },
    { id: '2', category: 'ECON', headline: 'Markets show mixed signals', content: 'Economic indicators vary across regions with uncertainty in key sectors.' },
    { id: '3', category: 'SEC', headline: 'Regional security concerns persist', content: 'Military activities in contested regions draw international attention.' },
  ];

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
            <div className="advisor-list">
              {advisorBriefings.map((advisor) => (
                <div key={advisor.role} className="advisor-card">
                  <div className="advisor-header">
                    <span className="advisor-icon">{advisor.icon}</span>
                    <span className="advisor-name">{advisor.name}</span>
                  </div>
                  <p className="advisor-summary">{advisor.summary}</p>
                  <button 
                    className="advisor-chat-btn"
                    onClick={() => handleAdvisorChat(advisor.role)}
                  >
                    Chat →
                  </button>
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
