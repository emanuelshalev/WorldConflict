import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

interface ScoreBreakdown {
  economy: number;
  security: number;
  diplomacy: number;
  stability: number;
  intelligence: number;
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

interface PolicyDecision {
  turn: number;
  date: string;
  action: string;
  target?: string;
  outcome: 'success' | 'failure' | 'neutral';
  impact: string;
}

interface GameScore {
  breakdown: ScoreBreakdown;
  rank: string;
  leadershipStyle: LeadershipStyle;
  achievements: string[];
  timeline: TurnSnapshot[];
  policies: PolicyDecision[];
}

// Score calculation based on spec
function calculateScore(worldState: any): ScoreBreakdown {
  const player = worldState.countries.find((c: any) => c.id === worldState.playerCountryId);
  if (!player) return { economy: 0, security: 0, diplomacy: 0, stability: 0, intelligence: 0, total: 0 };

  // Economy: GDP growth, debt ratio
  const economyScore = Math.min(100, Math.max(0,
    50 + (player.growthRate * 500) - (player.debtGdpRatio / 2)
  ));

  // Security: Military strength, no active wars, mobilization
  const atWar = player.atWarWith.length > 0;
  const securityScore = Math.min(100, Math.max(0,
    (atWar ? 30 : 70) + (player.mobilizationLevel / 5) + (player.manpower / 100000)
  ));

  // Diplomacy: Alliances, positive relations
  const positiveRelations = Object.values(player.relations).filter((r: any) => r > 0).length;
  const diplomacyScore = Math.min(100, Math.max(0,
    (player.alliances.length * 15) + (positiveRelations * 5)
  ));

  // Stability: Internal stability, legitimacy
  const stabilityScore = Math.min(100, Math.max(0,
    (player.stability * 0.6) + (player.legitimacy * 0.4)
  ));

  // Intelligence: Intel level
  const intelligenceScore = player.intelLevel ?? 50;

  // Total weighted average
  const total = Math.round(
    (economyScore * 0.25) +
    (securityScore * 0.2) +
    (diplomacyScore * 0.2) +
    (stabilityScore * 0.25) +
    (intelligenceScore * 0.1)
  );

  return {
    economy: Math.round(economyScore),
    security: Math.round(securityScore),
    diplomacy: Math.round(diplomacyScore),
    stability: Math.round(stabilityScore),
    intelligence: Math.round(intelligenceScore),
    total,
  };
}

function getRank(score: number): string {
  if (score >= 90) return 'S - Legendary';
  if (score >= 80) return 'A - Excellent';
  if (score >= 70) return 'B - Competent';
  if (score >= 60) return 'C - Adequate';
  if (score >= 50) return 'D - Struggling';
  return 'F - Failed';
}

function getLeadershipStyle(worldState: any): LeadershipStyle {
  const player = worldState.countries.find((c: any) => c.id === worldState.playerCountryId);
  if (!player) return { primary: 'Unknown', secondary: '', description: '' };

  const styles: { style: string; score: number }[] = [];

  // Analyze player's tendencies
  if (player.alliances.length >= 3) styles.push({ style: 'Master Diplomat', score: player.alliances.length * 10 });
  if (player.atWarWith.length > 0) styles.push({ style: 'War Leader', score: 50 });
  if (player.stability > 80) styles.push({ style: 'Pillar of Stability', score: player.stability });
  if (player.growthRate > 0.03) styles.push({ style: 'Economic Visionary', score: player.growthRate * 1000 });
  if (player.mobilizationLevel > 60) styles.push({ style: 'Military Strongman', score: player.mobilizationLevel });
  if (player.intelLevel > 70) styles.push({ style: 'Spymaster', score: player.intelLevel });

  styles.sort((a, b) => b.score - a.score);

  const primary = styles[0]?.style ?? 'Pragmatist';
  const secondary = styles[1]?.style ?? '';

  const descriptions: Record<string, string> = {
    'Master Diplomat': 'Built strong international relationships through careful diplomacy.',
    'War Leader': 'Led the nation through military conflict with determination.',
    'Pillar of Stability': 'Maintained internal order and public confidence.',
    'Economic Visionary': 'Prioritized economic growth and prosperity.',
    'Military Strongman': 'Kept the nation on a war footing, ready for any threat.',
    'Spymaster': 'Developed extensive intelligence networks.',
    'Pragmatist': 'Balanced competing priorities with practical decisions.',
  };

  return {
    primary,
    secondary,
    description: descriptions[primary] ?? 'A balanced approach to leadership.',
  };
}

export function EndGameReport() {
  const { worldState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'achievements' | 'policies'>('overview');

  if (!worldState) return null;

  // Calculate actual scores from game state
  const breakdown = useMemo(() => calculateScore(worldState), [worldState]);
  const rank = useMemo(() => getRank(breakdown.total), [breakdown.total]);
  const leadershipStyle = useMemo(() => getLeadershipStyle(worldState), [worldState]);

  // Generate achievements based on game state
  const achievements = useMemo(() => {
    const player = worldState.countries.find(c => c.id === worldState.playerCountryId);
    if (!player) return [];
    
    const achieved: string[] = [];
    if (player.alliances.length >= 5) achieved.push('🤝 Coalition Builder - Formed 5+ alliances');
    if (player.alliances.length >= 3) achieved.push('🤝 Alliance Maker - Formed 3+ alliances');
    if (player.stability >= 90) achieved.push('🏛️ Pillar of Stability - Achieved 90%+ stability');
    if (player.atWarWith.length === 0 && worldState.turn >= 12) achieved.push('🕊️ Peacekeeper - Avoided wars for a year');
    if (player.growthRate > 0.05) achieved.push('📈 Economic Boom - Achieved 5%+ GDP growth');
    if (player.intelLevel >= 80) achieved.push('🕵️ Intelligence Master - 80%+ intel coverage');
    if (worldState.wars.length === 0) achieved.push('🌍 World Peace - No active global conflicts');
    
    return achieved;
  }, [worldState]);

  const gameScore: GameScore = {
    breakdown,
    rank,
    leadershipStyle,
    achievements,
    timeline: [],
    policies: [],
  };

  const handleExportJSON = () => {
    const data = {
      worldState,
      score: gameScore,
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
                <span className="score-value">{gameScore.breakdown.total}</span>
                <span className="score-label">Overall Score</span>
                <span className="score-rank">{gameScore.rank}</span>
              </div>

              <div className="score-breakdown">
                <div className="score-item">
                  <span className="score-category">Economy</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${gameScore.breakdown.economy}%` }} />
                  </div>
                  <span className="score-value">{gameScore.breakdown.economy}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Security</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${gameScore.breakdown.security}%` }} />
                  </div>
                  <span className="score-value">{gameScore.breakdown.security}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Diplomacy</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${gameScore.breakdown.diplomacy}%` }} />
                  </div>
                  <span className="score-value">{gameScore.breakdown.diplomacy}</span>
                </div>
                <div className="score-item">
                  <span className="score-category">Stability</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${gameScore.breakdown.stability}%` }} />
                  </div>
                  <span className="score-value">{gameScore.breakdown.stability}</span>
                </div>
              </div>
            </div>

            <div className="leadership-card">
              <h3>Leadership Style</h3>
              <div className="leadership-badges">
                <span className="badge primary">{gameScore.leadershipStyle.primary}</span>
                <span className="badge secondary">{gameScore.leadershipStyle.secondary}</span>
              </div>
              <p className="leadership-description">{gameScore.leadershipStyle.description}</p>
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
              {gameScore.achievements.map((achievement, i) => (
                <div key={i} className="achievement-item">
                  {achievement}
                </div>
              ))}
            </div>
            {gameScore.achievements.length === 0 && (
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
