// Helper functions for game state display

export type StabilityLevel = 'VERY_SOLID' | 'SOLID' | 'MODERATE' | 'UNSTABLE' | 'COLLAPSING';
export type InsurgencyLevel = 'NONE' | 'UNREST' | 'REBELLION' | 'GUERILLA';

export function getStabilityLevel(stability: number): StabilityLevel {
  if (stability >= 80) return 'VERY_SOLID';
  if (stability >= 60) return 'SOLID';
  if (stability >= 40) return 'MODERATE';
  if (stability >= 20) return 'UNSTABLE';
  return 'COLLAPSING';
}

export function getStabilityLabel(level: StabilityLevel): string {
  const labels: Record<StabilityLevel, string> = {
    VERY_SOLID: 'Very Solid',
    SOLID: 'Solid',
    MODERATE: 'Moderate',
    UNSTABLE: 'Unstable',
    COLLAPSING: 'Collapsing',
  };
  return labels[level];
}

export function getStabilityColor(level: StabilityLevel): string {
  const colors: Record<StabilityLevel, string> = {
    VERY_SOLID: '#4caf50',
    SOLID: '#8bc34a',
    MODERATE: '#ffeb3b',
    UNSTABLE: '#ff9800',
    COLLAPSING: '#f44336',
  };
  return colors[level];
}

export function getInsurgencyIcon(level: InsurgencyLevel): string {
  const icons: Record<InsurgencyLevel, string> = {
    NONE: '',
    UNREST: '⚠️',
    REBELLION: '🔥',
    GUERILLA: '💥',
  };
  return icons[level];
}

export function getInsurgencyLabel(level: InsurgencyLevel): string {
  const labels: Record<InsurgencyLevel, string> = {
    NONE: 'None',
    UNREST: 'Civil Unrest',
    REBELLION: 'Active Rebellion',
    GUERILLA: 'Guerilla Warfare',
  };
  return labels[level];
}

export function getDiplomaticLevelFromRelation(relation: number): string {
  if (relation >= 80) return 'MILITARY_PACT';
  if (relation >= 60) return 'PROFITABLE';
  if (relation >= 40) return 'BENEFICIAL';
  if (relation >= 20) return 'FAVOURABLE';
  if (relation >= 0) return 'SATISFACTORY';
  if (relation >= -50) return 'LAMENTABLE';
  return 'WAR';
}

export function getDiplomaticLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    MILITARY_PACT: 'Military Pact',
    PROFITABLE: 'Profitable',
    BENEFICIAL: 'Beneficial',
    FAVOURABLE: 'Favourable',
    SATISFACTORY: 'Satisfactory',
    LAMENTABLE: 'Lamentable',
    WAR: 'At War',
  };
  return labels[level] ?? level;
}

export function getDiplomaticLevelColor(level: string): string {
  const colors: Record<string, string> = {
    MILITARY_PACT: '#4caf50',
    PROFITABLE: '#8bc34a',
    BENEFICIAL: '#cddc39',
    FAVOURABLE: '#ffeb3b',
    SATISFACTORY: '#ffc107',
    LAMENTABLE: '#ff9800',
    WAR: '#f44336',
  };
  return colors[level] ?? '#888';
}

// Format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toString();
}

// Calculate fog-of-information opacity based on intel level
export function getFogOpacity(intelLevel: number, isPlayer: boolean): number {
  if (isPlayer) return 1.0;
  // Intel level 0-100 maps to opacity 0.3-1.0
  return 0.3 + (intelLevel / 100) * 0.7;
}

// Get war indicator for a country
export function getWarIndicator(atWarWith: string[]): { icon: string; color: string } | null {
  if (atWarWith.length === 0) return null;
  return {
    icon: '⚔️',
    color: '#f44336',
  };
}

// Get alliance indicator
export function getAllianceIndicator(alliances: string[]): { icon: string; color: string } | null {
  if (alliances.length === 0) return null;
  return {
    icon: '🤝',
    color: '#4caf50',
  };
}

// Get nuclear status indicator
export function getNuclearIndicator(status: string | undefined): { icon: string; color: string } | null {
  if (!status || status === 'NONE') return null;
  const indicators: Record<string, { icon: string; color: string }> = {
    LATENT: { icon: '☢️', color: '#ff9800' },
    DEVELOPING: { icon: '☢️', color: '#f44336' },
    ARMED: { icon: '💣', color: '#9c27b0' },
  };
  return indicators[status] ?? null;
}
