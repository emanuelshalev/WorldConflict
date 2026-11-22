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
  gaza_flare: 'airstrike',
  gaza_world_reacts: 'un_vote',
  gaza_crossings: 'disaster',
  gaza_isf: 'deployment',
  gaza_isf_casualties: 'war_room',
  gaza_disarm: 'cabinet',
  gaza_reconstruction: 'summit',
  gaza_un_vote: 'un_vote',
  westbank_settlers: 'streets',
  westbank_annexation: 'parliament',
  westbank_raid: 'deployment',
  pa_gaza_role: 'signing',
  sanctions_vote: 'un_vote',
  assassination_attempt: 'cabinet', // R7: its own frame (cabinet, mood bad), not the refugee walkabout
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
  // One Term "Start with" openings (src/core/opening.ts), by situation kind
  opening_war: 'war_room',
  opening_sea: 'war_room',
  opening_regime: 'cabinet',
  opening_nuclear: 'nuclear',
  opening_truce: 'war_room',
  meeting_call: 'summit', // both leaders on screen (a phone call is a two-sided scene)
  meeting_staff: 'cabinet',
  meeting_visit: 'summit',
  meeting_press: 'tv_interview',
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

// ---------------------------------------------------------------------------
// Art matches outcome (design-feel.md section 7, rules R1 to R7). The picture on a card is the
// picture you get back in the debrief, lit by the result. Pure functions, no dependencies, so
// tests/ui/kinds.spec.ts can check them from the backend test runner.
// ---------------------------------------------------------------------------

export type SceneFamily = 'diplomacy' | 'domestic' | 'military' | 'intel';
export type OutcomeVerdict = 'good' | 'bad' | 'mixed' | 'neutral';

/** Scenes that show force. Diplomacy and domestic items never render these (R4). */
export const MILITARY_SCENES: ReadonlySet<SceneKind> = new Set<SceneKind>(['airstrike', 'deployment', 'war_room', 'nuclear']);
/** Scenes that celebrate. Military items never render these (R4), failures never do (R3). */
export const CELEBRATORY_SCENES: ReadonlySet<SceneKind> = new Set<SceneKind>(['summit', 'signing', 'ceasefire']);

export const ACTION_SCENE_TABLE: Readonly<Record<string, SceneKind>> = ACTION_SCENES;

/** The family of an engine action type, from its prefix. */
export function actionFamily(type: string): SceneFamily {
  if (/^(MILITARY_|NUCLEAR_)/.test(type)) return 'military';
  if (/^INTEL_/.test(type)) return 'intel';
  if (/^(DOMESTIC_|ECONOMY_)/.test(type)) return 'domestic';
  return 'diplomacy';
}

/**
 * R1(b): keywords on the chosen option's label, checked before the crisis's own scene. First
 * match wins, so the specific phrases come first (a labour "strike" before an air strike, a
 * "call for unity" is not a phone call).
 */
export const OPTION_KEYWORDS: ReadonlyArray<{ re: RegExp; scene: SceneKind; family: SceneFamily }> = [
  { re: /back ?channel|\btalks?\b|\btalking\b|envoy|mediat|ceasefire|truce|deconfliction|hotline|negotiat|at the table|behind closed doors|intermediar/i, scene: 'ceasefire', family: 'diplomacy' },
  { re: /break the strike|crackdown|police|curfew|clear the squares|\barrest|ringleaders|lock the country down/i, scene: 'streets', family: 'domestic' },
  { re: /visit the victims|mourn|relief|airlift|humanitarian|\baid\b|open the borders|open the crossings|open rafah|let them in/i, scene: 'field_visit', family: 'domestic' },
  { re: /\bcall\b(?! (it|for)\b)|\bvisit\b|summit|\bcourt\b|rally your allies|lean on|press washington|counter-offer|restrain/i, scene: 'summit', family: 'diplomacy' },
  { re: /air ?strikes?|\bstrikes?\b|\bbomb|\bair\b|missile|\bdrones?\b|\bshell|hit their|\bhit the\b|\bsink\b|special forces/i, scene: 'airstrike', family: 'military' },
  { re: /troops|deploy|mobili[sz]|\bborder|reinforce|battalion|offensive|finish the job|join the war|send weapons|\bstorm\b|garrison|convoys?|escorts?|hold the line/i, scene: 'deployment', family: 'military' },
  { re: /address|speech|rally the nation|televised|national unity|apolog|concede|announce/i, scene: 'address', family: 'domestic' },
  { re: /sanction|\bun\b|united nations|resolution|vote (yes|no|for|against)|abstain/i, scene: 'un_vote', family: 'diplomacy' },
  { re: /\bwhip\b|\bvotes?\b|pass it|inquiry|commission|legali[sz]e|shelve/i, scene: 'parliament', family: 'domestic' },
  { re: /\bspy|covert|sabotage|back a coup|\b(re)?arm(s|ing)?\b|\bhack|counter-intel|intelligence|cut-outs|in kind|purge|plotters|buy the generals/i, scene: 'covert', family: 'intel' },
  { re: /reform|decree|\border\b|emergency (security )?powers|stimulus|subsidi[sz]e|bail out|austerity|\btax|fire them|prosecute/i, scene: 'exec_order', family: 'domestic' },
  { re: /condemn|denounc|statement|name and shame|expose|blame|\bdeny|reject it publicly|downplay|forgery/i, scene: 'press', family: 'diplomacy' },
  { re: /\bpact\b|treaty|\bsign\b|sign it|\bdeal\b|accord|agreement|pledge/i, scene: 'signing', family: 'diplomacy' },
  { re: /run on|campaign|promise/i, scene: 'election', family: 'domestic' },
  { re: /markets|\bfuel\b|producers|\boil\b/i, scene: 'econ_tv', family: 'domestic' },
];

const isSceneKind = (s: unknown): s is SceneKind => typeof s === 'string' && (SCENE_KINDS as string[]).includes(s);

/** The label without the engine's suffixes ("(no decision taken)", "(you did not attend)"). */
export const cleanChoice = (label: string) => label.replace(/\s*\((no decision taken|you did not attend)\)\s*$/, '').trim();

/** The keyword entry an option label matches, if any. */
export function optionKeyword(label: string): (typeof OPTION_KEYWORDS)[number] | undefined {
  // A negated phrase names what you will not do: "More escorts, no strikes" is not an air strike
  const l = cleanChoice(label).replace(/\b(no|not|never|without|nor)\s+(more\s+)?\w+/gi, ' ');
  return OPTION_KEYWORDS.find((k) => k.re.test(l));
}

/**
 * R1: the picture follows the choice, not the crisis. (a) An explicit `scene` on the option
 * (data) wins; (b) keywords on the option label; (c) the crisis's own scene (or `fallback`).
 */
export function sceneForChoice(templateId: string | undefined, title: string, optionLabel: string, opts: { scene?: string; fallback?: SceneKind; situation?: string } = {}): SceneKind {
  if (isSceneKind(opts.scene)) return opts.scene;
  const k = optionKeyword(optionLabel);
  if (k) return k.scene;
  if (opts.fallback && !(templateId && CRISIS_SCENES[templateId])) return opts.fallback;
  return sceneForCrisis(templateId, title, opts.situation);
}

const MEETING_SCENES: Record<string, SceneKind> = { CALL: 'summit', VISIT: 'summit', STAFF: 'cabinet', PRESS: 'tv_interview' };

/**
 * One entry point for a decision (crisis or meeting option) so the desk thumbnail and the debrief
 * decision card always agree (acceptance 21). Meetings fall back to their room (summit, cabinet,
 * interview) instead of the crisis keywords.
 */
export function sceneForDecision(d: { kind?: string; templateId?: string; title: string; label: string; scene?: string }): SceneKind {
  const fallback = d.kind ? MEETING_SCENES[d.kind] : undefined;
  return sceneForChoice(d.templateId, d.title, d.label, { scene: d.scene, fallback });
}

/** R2: mood follows the verdict. Never a good mood on a failure. */
export function moodForVerdict(verdict: OutcomeVerdict | undefined, ok = true): 'good' | 'bad' | 'neutral' {
  if (!ok || verdict === 'bad') return 'bad';
  return verdict === 'good' ? 'good' : 'neutral';
}

/**
 * R3: celebratory scenes never illustrate a failure. Summit, signing and ceasefire become the
 * cold press room; an executive order becomes the chamber; the UN vote board shows the loss as
 * it is; military scenes stay military.
 */
export function sceneForOutcome(kind: SceneKind, verdict: OutcomeVerdict | undefined, ok = true): SceneKind {
  const failed = !ok || verdict === 'bad';
  if (!failed) return kind;
  if (CELEBRATORY_SCENES.has(kind)) return 'press';
  if (kind === 'exec_order') return 'parliament';
  return kind;
}

/** R4: keep a scene inside its family (diplomacy and domestic never show force; military never celebrates). */
export function guardFamily(kind: SceneKind, family: SceneFamily | undefined): SceneKind {
  if ((family === 'diplomacy' || family === 'domestic') && MILITARY_SCENES.has(kind)) return family === 'diplomacy' ? 'press' : 'cabinet';
  if (family === 'military' && CELEBRATORY_SCENES.has(kind)) return 'war_room';
  return kind;
}

/** A crisis frame's own mood before any choice (the assassination attempt is lit as a threat). */
export function crisisMood(templateId: string | undefined): 'good' | 'bad' | 'neutral' | undefined {
  return templateId === 'assassination_attempt' ? 'bad' : undefined;
}

/** Same family, different room: the backdrop used when a crisis would repeat last month's (R7). */
const ALTERNATE: Record<SceneKind, SceneKind> = {
  cabinet: 'press',
  tv_interview: 'press',
  press: 'tv_interview',
  parliament: 'cabinet',
  econ_tv: 'cabinet',
  field_visit: 'disaster',
  summit: 'signing',
  signing: 'summit',
  exec_order: 'cabinet',
  address: 'press',
  war_room: 'deployment',
  deployment: 'war_room',
  airstrike: 'war_room',
  nuclear: 'war_room',
  covert: 'cabinet',
  streets: 'press',
  election: 'parliament',
  disaster: 'field_visit',
  ceasefire: 'summit',
  un_vote: 'parliament',
};

/** R7: no repeat backdrop month to month, unless the crisis is a follow-up of the last one. */
/** The alternate backdrop of a scene (same family, different room). */
export const alternateScene = (kind: SceneKind): SceneKind => ALTERNATE[kind];

export function avoidRepeat(kind: SceneKind, previous: SceneKind | undefined, followUp = false): SceneKind {
  return !followUp && previous === kind ? ALTERNATE[kind] : kind;
}
