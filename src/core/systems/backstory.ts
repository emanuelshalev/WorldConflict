import { CountryState, RegimeType, PersonalityTraits } from '../types.js';

export interface LeaderBackstory {
  name: string;
  title: string;
  riseTopower: string;
  initialFactionSupport: FactionSupport[];
  mandate: 'REFORMIST' | 'STABILITY' | 'EXPANSIONIST' | 'ISOLATIONIST';
  keyTraits: string[];
  vulnerabilities: string[];
}

export interface FactionSupport {
  faction: string;
  support: number; // 0-100
  expectation: string;
}

// Templates for rise-to-power narratives based on regime type
const RISE_TEMPLATES: Record<RegimeType, string[]> = {
  DEMOCRACY: [
    "Won a landslide election on promises of {mandate}",
    "Rose through party ranks over two decades before winning the presidency",
    "Former military general turned politician, elected on security platform",
    "Charismatic outsider who captured the public imagination",
    "Veteran diplomat who unified fractured coalition parties",
  ],
  AUTOCRACY: [
    "Seized power in a bloodless coup, promising stability",
    "Inherited power from predecessor through party succession",
    "Rose through intelligence services to become supreme leader",
    "Former general who consolidated military support",
    "Emerged victorious from internal power struggle",
  ],
  THEOCRACY: [
    "Appointed by religious council after years of theological study",
    "Rose through clerical hierarchy to become supreme religious authority",
    "Unified religious factions under single leadership",
    "Declared divine mandate after predecessor's death",
    "Led religious revival movement that swept to power",
  ],
  MILITARY_JUNTA: [
    "Led successful military coup against corrupt civilian government",
    "Senior general who unified armed forces command",
    "Rose through ranks during prolonged civil conflict",
    "Took power to prevent national collapse",
    "Military strongman who eliminated rival officers",
  ],
  COMMUNIST: [
    "Party secretary who outmaneuvered rivals in politburo",
    "Revolutionary leader who led armed struggle",
    "Rose through party apparatus over three decades",
    "Ideological purist who purged reformist elements",
    "Pragmatic administrator who modernized party structure",
  ],
  MONARCHY: [
    "Ascended to throne after father's death",
    "Crowned after elder sibling renounced succession",
    "Restored monarchy after period of instability",
    "Young ruler guided by council of advisors",
    "Consolidated power after palace intrigue",
  ],
};

// Faction types by regime
const FACTIONS: Record<RegimeType, string[]> = {
  DEMOCRACY: ['Military', 'Business Elite', 'Labor Unions', 'Religious Groups', 'Urban Progressives', 'Rural Conservatives'],
  AUTOCRACY: ['Security Services', 'Oligarchs', 'Military', 'Technocrats', 'Regional Governors', 'State Media'],
  THEOCRACY: ['Clerical Council', 'Revolutionary Guards', 'Merchants', 'Reformists', 'Hardliners', 'Youth'],
  MILITARY_JUNTA: ['Army', 'Navy', 'Air Force', 'Police', 'Business Elite', 'Civil Service'],
  COMMUNIST: ['Party Hardliners', 'Reformists', 'Military', 'State Enterprises', 'Regional Committees', 'Youth League'],
  MONARCHY: ['Royal Court', 'Military', 'Nobility', 'Merchants', 'Religious Leaders', 'Tribal Chiefs'],
};

// Mandate expectations
const MANDATE_EXPECTATIONS: Record<LeaderBackstory['mandate'], string[]> = {
  REFORMIST: ['economic modernization', 'political liberalization', 'anti-corruption measures', 'international integration'],
  STABILITY: ['maintain order', 'preserve traditions', 'steady economic growth', 'avoid foreign entanglements'],
  EXPANSIONIST: ['restore national greatness', 'reclaim lost territories', 'project power abroad', 'military modernization'],
  ISOLATIONIST: ['protect sovereignty', 'reduce foreign influence', 'self-sufficiency', 'border security'],
};

export function generateLeaderBackstory(
  country: CountryState,
  seed?: number
): LeaderBackstory {
  const rng = createSeededRandom(seed ?? Date.now());
  
  // Determine mandate based on personality
  const mandate = determineMandate(country.personality);
  
  // Select rise-to-power narrative
  const templates = RISE_TEMPLATES[country.regimeType];
  const riseTemplate = templates[Math.floor(rng() * templates.length)];
  const riseTopower = riseTemplate.replace('{mandate}', mandate.toLowerCase());
  
  // Generate faction support
  const factions = FACTIONS[country.regimeType];
  const initialFactionSupport = factions.slice(0, 4).map(faction => ({
    faction,
    support: Math.floor(40 + rng() * 40), // 40-80 initial support
    expectation: MANDATE_EXPECTATIONS[mandate][Math.floor(rng() * MANDATE_EXPECTATIONS[mandate].length)],
  }));
  
  // Generate traits based on personality
  const keyTraits = generateKeyTraits(country.personality, rng);
  const vulnerabilities = generateVulnerabilities(country, rng);
  
  // Generate name (placeholder - would use country-specific name generator)
  const name = generateLeaderName(country, rng);
  const title = getLeaderTitle(country.regimeType);
  
  return {
    name,
    title,
    riseTopower,
    initialFactionSupport,
    mandate,
    keyTraits,
    vulnerabilities,
  };
}

function determineMandate(personality?: PersonalityTraits): LeaderBackstory['mandate'] {
  if (!personality) return 'STABILITY';
  
  const scores = {
    REFORMIST: personality.diplomaticFlexibility,
    STABILITY: 100 - personality.riskTolerance,
    EXPANSIONIST: personality.expansionism + personality.warPropensity,
    ISOLATIONIST: personality.isolationism,
  };
  
  let maxMandate: LeaderBackstory['mandate'] = 'STABILITY';
  let maxScore = 0;
  
  for (const [mandate, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxMandate = mandate as LeaderBackstory['mandate'];
    }
  }
  
  return maxMandate;
}

function generateKeyTraits(personality: PersonalityTraits | undefined, rng: () => number): string[] {
  const traits: string[] = [];
  
  if (!personality) {
    return ['Pragmatic', 'Cautious'];
  }
  
  if (personality.warPropensity > 60) traits.push('Hawkish');
  else if (personality.warPropensity < 40) traits.push('Dovish');
  
  if (personality.diplomaticFlexibility > 60) traits.push('Diplomatic');
  else if (personality.diplomaticFlexibility < 40) traits.push('Rigid');
  
  if (personality.riskTolerance > 60) traits.push('Bold');
  else if (personality.riskTolerance < 40) traits.push('Cautious');
  
  if (personality.allianceLoyalty > 60) traits.push('Loyal');
  else if (personality.allianceLoyalty < 40) traits.push('Opportunistic');
  
  if (personality.expansionism > 60) traits.push('Ambitious');
  if (personality.isolationism > 60) traits.push('Nationalist');
  
  // Ensure at least 2 traits
  while (traits.length < 2) {
    const fallbackTraits = ['Pragmatic', 'Calculating', 'Determined', 'Shrewd'];
    traits.push(fallbackTraits[Math.floor(rng() * fallbackTraits.length)]);
  }
  
  return traits.slice(0, 4);
}

function generateVulnerabilities(country: CountryState, rng: () => number): string[] {
  const vulnerabilities: string[] = [];
  
  if (country.stability < 50) vulnerabilities.push('Domestic unrest threatens legitimacy');
  if (country.legitimacy < 50) vulnerabilities.push('Questions about mandate to rule');
  if (country.debtGdpRatio > 80) vulnerabilities.push('Economic pressures limit options');
  if (country.atWarWith.length > 0) vulnerabilities.push('War fatigue eroding support');
  if (country.insurgencyLevel && country.insurgencyLevel !== 'NONE') {
    vulnerabilities.push('Internal security challenges');
  }
  
  // Add random vulnerability if none exist
  if (vulnerabilities.length === 0) {
    const randomVulnerabilities = [
      'Relies heavily on key advisors',
      'Limited foreign policy experience',
      'Factional tensions within government',
      'Public expectations may be unrealistic',
    ];
    vulnerabilities.push(randomVulnerabilities[Math.floor(rng() * randomVulnerabilities.length)]);
  }
  
  return vulnerabilities.slice(0, 3);
}

function generateLeaderName(country: CountryState, rng: () => number): string {
  // Simplified name generation - in production would use country-specific names
  const firstNames: Record<string, string[]> = {
    USA: ['James', 'Robert', 'Michael', 'William', 'David'],
    CHN: ['Wei', 'Ming', 'Jian', 'Feng', 'Yong'],
    RUS: ['Vladimir', 'Dmitri', 'Sergei', 'Alexei', 'Mikhail'],
    DEU: ['Hans', 'Klaus', 'Wolfgang', 'Friedrich', 'Heinrich'],
    GBR: ['William', 'James', 'Charles', 'Edward', 'George'],
    FRA: ['Jean', 'Pierre', 'François', 'Michel', 'Philippe'],
    default: ['Alexander', 'Victor', 'Marcus', 'Anton', 'Stefan'],
  };
  
  const lastNames: Record<string, string[]> = {
    USA: ['Anderson', 'Mitchell', 'Harrison', 'Crawford', 'Bennett'],
    CHN: ['Zhang', 'Wang', 'Li', 'Chen', 'Liu'],
    RUS: ['Volkov', 'Petrov', 'Sokolov', 'Kozlov', 'Novikov'],
    DEU: ['Müller', 'Schmidt', 'Weber', 'Wagner', 'Fischer'],
    GBR: ['Churchill', 'Thatcher', 'Blair', 'Cameron', 'Wilson'],
    FRA: ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau'],
    default: ['Novak', 'Kowalski', 'Silva', 'Santos', 'Fernandez'],
  };
  
  const firstList = firstNames[country.iso3] ?? firstNames.default;
  const lastList = lastNames[country.iso3] ?? lastNames.default;
  
  const firstName = firstList[Math.floor(rng() * firstList.length)];
  const lastName = lastList[Math.floor(rng() * lastList.length)];
  
  return `${firstName} ${lastName}`;
}

function getLeaderTitle(regimeType: RegimeType): string {
  const titles: Record<RegimeType, string> = {
    DEMOCRACY: 'President',
    AUTOCRACY: 'Supreme Leader',
    THEOCRACY: 'Supreme Religious Leader',
    MILITARY_JUNTA: 'General',
    COMMUNIST: 'General Secretary',
    MONARCHY: 'King',
  };
  return titles[regimeType];
}

// Simple seeded random number generator
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function getBackstorySummary(backstory: LeaderBackstory): string {
  const factionSummary = backstory.initialFactionSupport
    .map(f => `${f.faction} (${f.support}%)`)
    .join(', ');
  
  return `${backstory.title} ${backstory.name}
${backstory.riseTopower}

Mandate: ${backstory.mandate}
Key Traits: ${backstory.keyTraits.join(', ')}
Vulnerabilities: ${backstory.vulnerabilities.join('; ')}

Faction Support: ${factionSummary}`;
}
