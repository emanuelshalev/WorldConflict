/**
 * Scene vocabulary: every order, crisis and news story is staged as one of these
 * illustrated broadcast scenes. Art lives in ./art, one component per kind.
 */
export type SceneKind =
  | 'cabinet' // cabinet room, ministers around the table
  | 'tv_interview' // studio sit-down interview, two chairs, studio lights
  | 'press' // press-room podium, seal, camera flashes
  | 'parliament' // chamber hemicycle, live vote tally
  | 'econ_tv' // business-news set, falling/rising chart on the wall
  | 'field_visit' // outdoor walkabout, crowd, reporters with mics
  | 'summit' // photo op with another leader, flags, handshake
  | 'signing' // two leaders signing a treaty at a long table
  | 'exec_order' // leader signing an executive document at the desk
  | 'address' // address to the nation, desk, flag, teleprompter
  | 'war_room' // situation room, map wall, officers
  | 'deployment' // armour column on a highway, dust
  | 'airstrike' // jets over a night target, tracers
  | 'nuclear' // centrifuge hall / warning klaxons
  | 'covert' // intelligence ops room, screens, dossiers
  | 'streets' // protest, placards, police line
  | 'election' // results night, swingometer, ballot box
  | 'disaster' // storm, flood or attack aftermath, emergency lights
  | 'ceasefire' // negotiation table, mediator, white flags
  | 'un_vote'; // general assembly, vote board

export const SCENE_KINDS: SceneKind[] = [
  'cabinet', 'tv_interview', 'press', 'parliament', 'econ_tv', 'field_visit', 'summit',
  'signing', 'exec_order', 'address', 'war_room', 'deployment', 'airstrike', 'nuclear',
  'covert', 'streets', 'election', 'disaster', 'ceasefire', 'un_vote',
];

/** Broadcast framing per kind: the channel bug label and the accent hue family. */
export const SCENE_META: Record<SceneKind, { bug: string; tone: 'news' | 'war' | 'econ' | 'covert' | 'civic' }> = {
  cabinet: { bug: 'POOL FEED', tone: 'civic' },
  tv_interview: { bug: 'EXCLUSIVE', tone: 'news' },
  press: { bug: 'LIVE', tone: 'news' },
  parliament: { bug: 'LIVE · CHAMBER', tone: 'civic' },
  econ_tv: { bug: 'MARKETS', tone: 'econ' },
  field_visit: { bug: 'ON LOCATION', tone: 'news' },
  summit: { bug: 'SUMMIT', tone: 'civic' },
  signing: { bug: 'LIVE', tone: 'civic' },
  exec_order: { bug: 'POOL FEED', tone: 'civic' },
  address: { bug: 'LIVE · ADDRESS', tone: 'news' },
  war_room: { bug: 'DEFENSE DESK', tone: 'war' },
  deployment: { bug: 'DEFENSE DESK', tone: 'war' },
  airstrike: { bug: 'BREAKING', tone: 'war' },
  nuclear: { bug: 'ALERT', tone: 'war' },
  covert: { bug: 'CLASSIFIED', tone: 'covert' },
  streets: { bug: 'LIVE', tone: 'news' },
  election: { bug: 'DECISION DESK', tone: 'civic' },
  disaster: { bug: 'BREAKING', tone: 'news' },
  ceasefire: { bug: 'TALKS', tone: 'civic' },
  un_vote: { bug: 'LIVE · NEW YORK', tone: 'civic' },
};

const ACTION_SCENES: Record<string, SceneKind> = {
  DIPLOMACY_IMPROVE_RELATIONS: 'summit',
  DIPLOMACY_DENOUNCE: 'press',
  DIPLOMACY_PROPOSE_ALLIANCE: 'signing',
  DIPLOMACY_BREAK_ALLIANCE: 'press',
  DIPLOMACY_DECLARE_WAR: 'address',
  DIPLOMACY_PROPOSE_CEASEFIRE: 'ceasefire',
  DIPLOMACY_MEDIATE: 'ceasefire',
  MILITARY_MOBILIZE: 'deployment',
  MILITARY_DEMOBILIZE: 'deployment',
  MILITARY_PROCURE: 'war_room',
  MILITARY_AIRSTRIKE: 'airstrike',
  MILITARY_DEPLOY_BORDER: 'deployment',
  MILITARY_WITHDRAW_BORDER: 'deployment',
  NUCLEAR_FUND_PROGRAM: 'nuclear',
  NUCLEAR_STRIKE: 'nuclear',
  ECONOMY_ADJUST_MILITARY_BUDGET: 'parliament',
  INTEL_GATHER: 'covert',
  INTEL_SABOTAGE: 'covert',
  INTEL_DESTABILIZE: 'covert',
  INTEL_SUPPORT_REBELS: 'covert',
  INTEL_COUNTER_INTEL: 'covert',
  INTEL_MISINFORMATION: 'covert',
  INTEL_PROPAGANDA: 'covert',
  INTEL_ASSASSINATE: 'covert',
  INTEL_COUP: 'covert',
  DOMESTIC_PROPAGANDA: 'address',
  DOMESTIC_REFORM: 'exec_order',
  DOMESTIC_POLICING: 'streets',
};

export function sceneForAction(type: string | undefined): SceneKind {
  return (type && ACTION_SCENES[type]) || 'cabinet';
}

const CRISIS_SCENES: Record<string, SceneKind> = {
  military_incident: 'war_room',
  standoff_escalates: 'war_room',
  corruption_scandal: 'tv_interview',
  scandal_second_leak: 'press',
  ouster_vote: 'parliament',
  coup_plot: 'cabinet',
  streets_boiling: 'streets',
  crackdown_aftermath: 'streets',
  rival_ultimatum: 'war_room',
  ultimatum_expires: 'war_room',
  ally_plea: 'cabinet',
  nuclear_threshold: 'nuclear',
  refugee_wave: 'field_visit',
  energy_shock: 'econ_tv',
  hostage_crisis: 'cabinet',
  rescue_outcome: 'war_room',
  hostage_talks: 'ceasefire',
  sanctions_vote: 'un_vote',
  assassination_attempt: 'field_visit',
  general_strike: 'streets',
  pact_offer: 'signing',
  trade_offer: 'summit',
  deal_strings: 'summit',
  cyberattack: 'covert',
  foreign_interference: 'covert',
  shock_market_crash: 'econ_tv',
  shock_pandemic: 'disaster',
  shock_second_wave: 'disaster',
  shock_terror: 'disaster',
  shock_disaster: 'disaster',
  election_campaign: 'election',
};

/** Keyword fallback for scripted flashpoint crises and news stories. */
const KEYWORDS: Array<[RegExp, SceneKind]> = [
  [/nuclear|enrich|warhead|centrifuge|uranium/i, 'nuclear'],
  [/ceasefire|truce|talks|negotiat|mediat|armistice|peace/i, 'ceasefire'],
  [/airstrike|air cover|strike|missile|drone|bomb|jets/i, 'airstrike'],
  [/troops|border|convoy|mobili|invasion|offensive|front/i, 'deployment'],
  [/blockade|quarantine|navy|warship|carrier|strait/i, 'war_room'],
  [/vote|parliament|congress|senate|knesset|bundestag|assembly|impeach|no-confidence/i, 'parliament'],
  [/security council|united nations|\bun\b|sanction/i, 'un_vote'],
  [/election|ballot|poll|campaign/i, 'election'],
  [/protest|riot|strike|street|unrest|march|crackdown/i, 'streets'],
  [/market|oil|gdp|recession|inflation|currency|trade|tariff|economy|energy/i, 'econ_tv'],
  [/spy|intel|cyber|hack|leak|covert|agent|plot/i, 'covert'],
  [/pact|alliance|treaty|accord|agreement/i, 'signing'],
  [/summit|visit|meets|state visit/i, 'summit'],
  [/earthquake|flood|storm|typhoon|hurricane|pandemic|attack|refugee|famine/i, 'disaster'],
  [/scandal|interview|corruption/i, 'tv_interview'],
  [/address|speech|nation/i, 'address'],
];

export function sceneForText(text: string, fallback: SceneKind = 'press'): SceneKind {
  for (const [re, kind] of KEYWORDS) if (re.test(text)) return kind;
  return fallback;
}

export function sceneForCrisis(templateId: string | undefined, title = '', situation = ''): SceneKind {
  if (templateId && CRISIS_SCENES[templateId]) return CRISIS_SCENES[templateId];
  return sceneForText(title, sceneForText(situation, 'cabinet'));
}

const NEWS_SCENES: Record<string, SceneKind> = {
  WAR: 'deployment',
  DIPLOMACY: 'summit',
  GOVERNMENT: 'parliament',
  ECONOMY: 'econ_tv',
  NUCLEAR: 'nuclear',
  COVERT: 'covert',
  DOMESTIC: 'streets',
  WORLD: 'press',
};

export function sceneForNews(category: string, headline: string): SceneKind {
  return sceneForText(headline, NEWS_SCENES[category] ?? 'press');
}
