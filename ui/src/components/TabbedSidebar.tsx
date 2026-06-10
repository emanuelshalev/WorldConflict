import { useState } from 'react';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { ActionPanel } from './ActionPanel';
import { WarList } from './WarProgressBar';
import './TabbedSidebar.css';

type TabId = 'actions' | 'advisors' | 'wars' | 'news';

export function TabbedSidebar() {
  const { worldState, openModal, setAdvisorRole } = useGameStore();
  const player = usePlayerCountry();
  const [activeTab, setActiveTab] = useState<TabId>('actions');

  if (!worldState || !player) {
    return (
      <div className="tabbed-sidebar">
        <div className="sidebar-empty">
          <p>Start a new game to begin</p>
        </div>
      </div>
    );
  }

  const advisorBriefings = [
    {
      role: 'FOREIGN_MINISTER',
      icon: '🌐',
      name: 'Foreign Minister',
      summary: player.alliances.length
        ? `${player.alliances.length} active pact(s): ${player.alliances.join(', ')}. ${player.atWarWith.length ? 'Wartime diplomacy is consuming the ministry.' : 'Diplomatic channels open.'}`
        : 'No formal alliances. We stand alone — diplomatic outreach recommended.',
    },
    {
      role: 'DEFENSE_MINISTER',
      icon: '🎖️',
      name: 'Defense Minister',
      summary: player.atWarWith.length
        ? `At war with ${player.atWarWith.join(', ')}. Mobilization ${player.mobilizationLevel}%.`
        : `Forces at ${player.mobilizationLevel}% readiness; budget ${player.militaryBudgetPercent.toFixed(1)}% of GDP. ${player.nuclear.status === 'ARMED' ? `Arsenal: ${player.nuclear.warheads} warheads.` : ''}`,
    },
    {
      role: 'INTELLIGENCE_CHIEF',
      icon: '🕵️',
      name: 'Intelligence Chief',
      summary: `Intelligence capability ${player.intelLevel}/100. ${
        worldState.countries.some((c) => c.nuclear.status === 'DEVELOPING' && (player.relations[c.id] ?? 0) < -30)
          ? 'We are watching suspicious nuclear activity among our adversaries.'
          : 'Monitoring rival capitals; covert options stand ready.'
      }`,
    },
    {
      role: 'FINANCE_MINISTER',
      icon: '💰',
      name: 'Finance Minister',
      summary: `GDP $${(player.gdp / 1e12).toFixed(2)}T, growth ${(player.growthRate * 100).toFixed(1)}%/yr, debt ${player.debtGdpRatio.toFixed(0)}% of GDP.${player.underGlobalEmbargo ? ' The embargo is strangling trade.' : ''}`,
    },
    {
      role: 'DOMESTIC_ADVISOR',
      icon: '🏛️',
      name: 'Domestic Advisor',
      summary: `Approval ${Math.round(player.approval)}%, stability ${Math.round(player.stability)}%.${
        player.politicalSystem.nextElectionTurn !== null
          ? ` Elections in ${player.politicalSystem.nextElectionTurn - worldState.turn} months.`
          : ''
      }${player.insurgencyLevel !== 'NONE' ? ` Insurgency: ${player.insurgencyLevel}.` : ''}`,
    },
  ];

  const playerWarCount = worldState.wars.filter(
    (w) => w.attackerId === player.id || w.defenderId === player.id,
  ).length;

  return (
    <div className="tabbed-sidebar">
      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>
          <span className="tab-icon">⚡</span>
          <span className="tab-label">Actions</span>
        </button>
        <button className={`tab-button ${activeTab === 'advisors' ? 'active' : ''}`} onClick={() => setActiveTab('advisors')}>
          <span className="tab-icon">📋</span>
          <span className="tab-label">Cabinet</span>
        </button>
        <button className={`tab-button ${activeTab === 'wars' ? 'active' : ''}`} onClick={() => setActiveTab('wars')}>
          <span className="tab-icon">⚔️</span>
          <span className="tab-label">Wars{worldState.wars.length > 0 ? ` (${worldState.wars.length})` : ''}</span>
        </button>
        <button className={`tab-button ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
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
                  onClick={() => {
                    setAdvisorRole(advisor.role);
                    openModal('advisor');
                  }}
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

        {activeTab === 'wars' && (
          <div className="news-tab">
            <div className="tab-header">
              <h2>Active Conflicts</h2>
              <span className="turn-info">
                {playerWarCount > 0 ? `You are at war` : 'You are at peace'}
              </span>
            </div>
            <WarList />
          </div>
        )}

        {activeTab === 'news' && (
          <div className="news-tab">
            <div className="tab-header">
              <h2>World News</h2>
              <span className="turn-info">{worldState.date}</span>
            </div>
            <div className="news-list">
              {(worldState.newspaper ?? []).map((entry, i) => (
                <div key={i} className="news-card clickable" onClick={() => openModal('newspaper')}>
                  <div className="news-header">
                    <span className="news-category">{entry.category}</span>
                  </div>
                  <h3 className="news-headline">{entry.headline}</h3>
                  <p className="news-preview">{entry.description.slice(0, 140)}…</p>
                </div>
              ))}
              {(worldState.newspaper ?? []).length === 0 && (
                <p style={{ color: '#778', fontSize: 13, padding: 12 }}>The presses are quiet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
