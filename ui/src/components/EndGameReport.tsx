import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface ScoreBreakdown {
  economy: number;
  security: number;
  diplomacy: number;
  stability: number;
  total: number;
}

interface LeadershipStyle {
  primary: string;
  secondary: string;
  description: string;
}

interface TurnSnapshot {
  turn: number;
  date: string;
  score: number;
  gdp: number;
  stability: number;
  allies: number;
  wars: number;
  events: string[];
}

interface GameScore {
  breakdown: ScoreBreakdown;
  rank: string;
  leadershipStyle: LeadershipStyle;
  achievements: string[];
  timeline: TurnSnapshot[];
}

export function EndGameReport() {
  const { worldState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'achievements'>('overview');

  if (!worldState) return null;

  const mockScore: GameScore = {
    breakdown: {
      economy: 72,
      security: 68,
      diplomacy: 75,
      stability: 80,
      total: 73,
    },
    rank: 'B - Competent',
    leadershipStyle: {
      primary: 'Master Diplomat',
      secondary: 'Economic Visionary',
      description: 'Built strong international relationships. Prioritized economic growth and prosperity.',
    },
    achievements: [
      '🤝 Coalition Builder - Formed 5+ alliances',
      '🏛️ Pillar of Stability - Achieved 90%+ stability',
      '🕊️ Peacekeeper - Avoided all wars for a year',
    ],
    timeline: [],
  };

  const handleExportJSON = () => {
    const data = {
      worldState,
      score: mockScore,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-conflicts-report-${worldState.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="end-game-report">
      <div className="report-header">
        <h2>Leadership Report</h2>
        <p className="report-subtitle">
          {worldState.playerCountryId} | {worldState.date} | Turn {worldState.turn}
        </p>
      </div>

      <div className="report-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
      </div>

      <div className="report-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="score-card">
              <div className="total-score">
                <span className="score-value">{mockScore.breakdown.total}</span>
                <span className="score-label">Overall Score</span>
                <span className="score-rank">{mockScore.rank}</span>
              </div>

              <div className="score-breakdown">
                <div className="score-item">
                  <span className="score-category">Economy</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${mockScore.breakdown.economy}%` }} />
                  </div>
                  <span className="score-value">{mockScore.breakdown.economy}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Security</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${mockScore.breakdown.security}%` }} />
                  </div>
                  <span className="score-value">{mockScore.breakdown.security}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Diplomacy</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${mockScore.breakdown.diplomacy}%` }} />
                  </div>
                  <span className="score-value">{mockScore.breakdown.diplomacy}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Stability</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${mockScore.breakdown.stability}%` }} />
                  </div>
                  <span className="score-value">{mockScore.breakdown.stability}</span>
                </div>
              </div>
            </div>

            <div className="leadership-card">
              <h3>Leadership Style</h3>
              <div className="leadership-badges">
                <span className="badge primary">{mockScore.leadershipStyle.primary}</span>
                <span className="badge secondary">{mockScore.leadershipStyle.secondary}</span>
              </div>
              <p className="leadership-description">{mockScore.leadershipStyle.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <p className="timeline-placeholder">
              Timeline visualization will show score progression over turns.
            </p>
            <div className="timeline-stats">
              <div className="stat-card">
                <span className="stat-value">{worldState.turn}</span>
                <span className="stat-label">Turns Played</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{worldState.wars.length}</span>
                <span className="stat-label">Active Wars</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{worldState.globalTension}%</span>
                <span className="stat-label">Global Tension</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-tab">
            <div className="achievements-list">
              {mockScore.achievements.map((achievement, i) => (
                <div key={i} className="achievement-item">
                  {achievement}
                </div>
              ))}
            </div>
            {mockScore.achievements.length === 0 && (
              <p className="no-achievements">No achievements unlocked yet. Keep playing!</p>
            )}
          </div>
        )}
      </div>

      <div className="report-footer">
        <button className="btn btn-secondary" onClick={handleExportJSON}>
          Export JSON
        </button>
      </div>
    </div>
  );
}
