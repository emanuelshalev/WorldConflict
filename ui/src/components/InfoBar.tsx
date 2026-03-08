import { useGameStore } from '../store/gameStore';
import './InfoBar.css';

interface Headline {
  id: string;
  title: string;
  category: string;
}

interface AdvisorSummary {
  role: string;
  icon: string;
  name: string;
  summary: string;
}

export function InfoBar() {
  const { worldState, openModal, setAdvisorRole } = useGameStore();

  if (!worldState) return null;

  // Get headlines from newspaper in world state or generate defaults
  const headlines: Headline[] = worldState.newspaper?.slice(0, 4).map((n, i) => ({
    id: String(i),
    title: n.headline,
    category: n.category || 'WORLD',
  })) ?? [
    { id: '1', title: 'Global tensions remain elevated as diplomatic efforts continue', category: 'WORLD' },
    { id: '2', title: 'Economic indicators show mixed signals across major markets', category: 'ECONOMY' },
    { id: '3', title: 'Regional security concerns prompt military readiness reviews', category: 'SECURITY' },
  ];

  // Advisor summaries based on current state
  const player = worldState.countries.find(c => c.id === worldState.playerCountryId);
  const advisorSummaries: AdvisorSummary[] = [
    {
      role: 'foreign',
      icon: '🌐',
      name: 'Foreign Minister',
      summary: player?.alliances.length 
        ? `${player.alliances.length} active alliance(s). Relations stable.`
        : 'No formal alliances. Consider diplomatic outreach.',
    },
    {
      role: 'defense',
      icon: '🎖️',
      name: 'Defense Minister',
      summary: player?.atWarWith.length 
        ? `At war with ${player.atWarWith.length} nation(s). Military engaged.`
        : `Forces at ${player?.mobilizationLevel ?? 0}% readiness.`,
    },
    {
      role: 'intelligence',
      icon: '🕵️',
      name: 'Intelligence Chief',
      summary: `Intel coverage at ${player?.intelLevel ?? 50}%. Monitoring threats.`,
    },
    {
      role: 'treasury',
      icon: '💰',
      name: 'Treasury Secretary',
      summary: player?.growthRate 
        ? `GDP growth: ${(player.growthRate * 100).toFixed(1)}%. Debt: ${player.debtGdpRatio?.toFixed(0) ?? 0}% of GDP.`
        : 'Economic indicators nominal.',
    },
  ];

  const handleHeadlineClick = (_headline: Headline) => {
    openModal('newspaper');
  };

  const handleViewAllNews = () => {
    openModal('newspaper');
  };

  const handleAdvisorClick = (role: string) => {
    setAdvisorRole(role);
    openModal('advisor');
  };

  const handleConsultAdvisors = () => {
    openModal('advisor');
  };

  return (
    <div className="info-bar">
      <div className="info-panel news-panel">
        <div className="panel-header">
          <span className="panel-icon">📰</span>
          <span className="panel-title">News & Media</span>
        </div>
        <div className="panel-content">
          <ul className="headline-list">
            {headlines.map((headline) => (
              <li 
                key={headline.id} 
                className="headline-item"
                onClick={() => handleHeadlineClick(headline)}
              >
                <span className="headline-category">{headline.category}</span>
                <span className="headline-title">{headline.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <button className="panel-action" onClick={handleViewAllNews}>
          View All News →
        </button>
      </div>

      <div className="info-panel advisor-panel">
        <div className="panel-header">
          <span className="panel-icon">📋</span>
          <span className="panel-title">Advisor Briefings</span>
        </div>
        <div className="panel-content">
          <ul className="advisor-list">
            {advisorSummaries.map((advisor) => (
              <li 
                key={advisor.role} 
                className="advisor-item"
                onClick={() => handleAdvisorClick(advisor.role)}
              >
                <span className="advisor-icon">{advisor.icon}</span>
                <span className="advisor-name">{advisor.name}:</span>
                <span className="advisor-summary">{advisor.summary}</span>
              </li>
            ))}
          </ul>
        </div>
        <button className="panel-action" onClick={handleConsultAdvisors}>
          Consult Advisors →
        </button>
      </div>
    </div>
  );
}
