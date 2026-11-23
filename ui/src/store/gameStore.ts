import { create } from 'zustand';
import { pcCost } from '../lib/actions';
import { type CodexPayload, type LearnLevel, LEVEL_RULES } from '../lib/codexMatch';
import * as learnLib from '../lib/learn';
import { type MonthView, availabilityOf, defenseCostM, needsTarget, orderKeyOf } from '../lib/availability';
import { pointAt } from '../lib/pointAt';
import { logOrder } from '../lib/orderLog';
import { orderFor } from '../lib/orders';
import { browserGuestStores, resolveGuestId } from '../lib/guest';

export type TurnPhase = 'news' | 'briefing' | 'diplomacy' | 'military' | 'domestic' | 'confirm';

// ============================================================================
// Types mirroring the backend contract
// ============================================================================

export interface Leader {
  name: string;
  title: string;
  style: string;
  origin: string;
  sinceTurn: number;
}

export interface PoliticalSystem {
  type: string;
  powerCenters: string[];
  electionCycleMonths: number;
  nextElectionTurn: number | null;
  leaderTitle: string;
}

export interface UncertainRange {
  estimate: number;
  low: number;
  high: number;
  confidence: number;
}

export interface HistoryProfile {
  keyEvents: Array<{ year: number; event: string; impact: string }>;
  historicalRivals: string[];
  historicalAllies: string[];
  sphereOfInfluence: string[];
  foreignPolicyOrientation: string;
  narrative?: string;
}

export interface CountryFull {
  fallout?: number; // radiation severity 0-100 after a nuclear strike
  nukedTurn?: number;
  id: string;
  name: string;
  iso3: string;
  gdp: number;
  growthRate: number;
  realGrowth?: number; // actual annualised GDP change (what the HUD shows)
  trendGrowth?: number;
  debtGdpRatio: number;
  militaryBudgetPercent: number;
  manpower: number;
  airpower: number;
  mobilizationLevel: number;
  stability: number;
  legitimacy: number;
  approval: number;
  regimeType: string;
  relations: Record<string, number>;
  alliances: string[];
  atWarWith: string[];
  intelLevel: number;
  counterIntelLevel: number;
  insurgencyLevel: string;
  policingTactic: string;
  internalDivisions: Array<{ kind: string; name: string; strength: number; tension: number }>;
  nuclear: { status: string; progress: number; funded: boolean; warheads: number };
  borderDeployments: Array<{ targetCountryId: string; troops: number }>;
  underGlobalEmbargo: boolean;
  leader: Leader;
  politicalSystem: PoliticalSystem;
  history: HistoryProfile;
  capital?: [number, number];
  collapsed?: boolean;
}

export interface PlayerViewCountry {
  id: string;
  name: string;
  iso3: string;
  isPlayer: boolean;
  regimeType: string;
  leader: Leader;
  politicalSystem: PoliticalSystem;
  alliances: string[];
  atWarWith: string[];
  relationWithPlayer: number;
  diplomaticLevel: string;
  insurgencyLevel: string;
  history: HistoryProfile;
  gdp: UncertainRange;
  militaryStrength: UncertainRange;
  manpower: UncertainRange;
  stability: UncertainRange;
  nuclearStatus: string;
  nuclearProgress: UncertainRange | null;
  intelConfidence: number;
  growth?: number; // smoothed annual real growth (public statistics)
  underEmbargo?: boolean;
  fallout?: number; // radiation severity 0-100 after a nuclear strike
  full?: CountryFull;
}

export interface War {
  id: string;
  attackerId: string;
  defenderId: string;
  startTurn: number;
  frontline: number;
  attackerCasualties: number;
  defenderCasualties: number;
  exhaustion: number;
}

export interface NewspaperEntry {
  headline: string;
  description: string;
  relatedCountries: string[];
  turn: number;
  category: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  effects: Record<string, number>;
  tensionDelta: number;
  actions: Array<{ type: string; targetCountryId?: string }>;
  backedBy: string[];
  followUp?: { templateId: string; delay: number };
}

export interface PendingDecision {
  id: string;
  turn: number;
  title: string;
  situation: string;
  affectedCountries: string[];
  options: DecisionOption[];
  deadlineTurn: number;
  templateId: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EXISTENTIAL';
  defaultOptionId?: string;
}

/** A meeting on the leader's calendar (src/core/meetings.ts). */
export interface Meeting extends PendingDecision {
  kind: 'CALL' | 'STAFF' | 'VISIT' | 'PRESS';
  withCountry?: string;
  speaker: string;
}
/** Meetings the player can attend in person each month (MEETING_SLOTS in meetings.ts). */
export const MEETING_SLOTS = 3;

export type GameMode = 'FLASHPOINT' | 'TERM' | 'LEGACY';
export type Difficulty = 'ANALYST' | 'STATESMAN' | 'STRONGMAN';

export interface ObjectiveCondition {
  kind: string;
  label: string;
  targetId?: string;
  otherId?: string;
  level?: 'NONE' | 'UNREST' | 'REBELLION' | 'GUERILLA';
  stat?: 'approval' | 'stability' | 'legitimacy';
  min?: number;
  maxStatus?: 'LATENT' | 'DEVELOPING' | 'TESTED' | 'ARMED';
  /** Short goal-chip label (authored, optional). */
  short?: string;
}

export interface Objective {
  title: string;
  briefing: string;
  primary: ObjectiveCondition[];
  bonus: ObjectiveCondition[];
  par: number;
  debrief: string;
}

/** Mirrors src/core/objectives.ts: the goal line fields come with every payload. */
export type ObjectiveState = 'on_track' | 'close' | 'off_track' | 'failed';
export type ObjectiveUnit = '%' | 'front' | 'score' | 'view';

export interface ObjectiveHelp {
  kind: 'crisis' | 'meeting' | 'order';
  id?: string;
  optionId?: string;
  label: string;
  action?: { type: string; targetCountryId?: string; value?: number; params?: Record<string, unknown> };
}

export interface ConditionStatus {
  label: string;
  met: boolean;
  failed: boolean;
  bonus: boolean;
  short?: string;
  now?: number;
  need?: number;
  unit?: ObjectiveUnit;
  /** Change over last month. */
  trend?: number;
  state?: ObjectiveState;
  helps?: ObjectiveHelp[];
  /** This month's step objective. */
  step?: boolean;
}

/** Mirrors src/core/missionImpact.ts Impact: which objectives an option or order moves. */
export interface Impact {
  helps: string[];
  hurts: string[];
  breaks: string[];
  bonusHelps: string[];
  bonusHurts: string[];
  score: number;
  links: Array<{ index: number; effect: 'helps' | 'hurts' | 'breaks'; bonus: boolean }>;
}

/** Mirrors src/core/advisors.ts Suggestion / Advice. */
export interface AdviceSuggestion {
  who: string;
  label: string;
  why: string;
  action: { type: string; label: string; targetCountryId?: string; value?: number; params?: Record<string, unknown> };
}

export interface Advice {
  suggestions: AdviceSuggestion[];
  /** decisionId → optionId: the cabinet's consensus (may hurt the mission on STATESMAN/STRONGMAN). */
  cabinetPicks: Record<string, string>;
  /** decisionId → optionId: the best option for the mission. */
  missionPicks: Record<string, string>;
  /** meetingId → optionId: what the staff answer in person (within the slots). */
  meetingPicks: Record<string, string>;
  /** Meetings that go to a deputy on Approve all. */
  deputies: string[];
  /** The orders the staff queue on their own (variety rules applied, safe, affordable). */
  staffOrders: Array<AdviceSuggestion & { successChance: number | null }>;
  /** decisionId → what the desk may say about the mission pick (src/core/advisors.ts MissionNote). */
  missionNotes?: Record<string, MissionNote>;
  /**
   * "Your call" (D-84, decision-accept-all.md R1): the month's things Accept all never decides.
   * Built by the engine on branch build-your-call; until it lands the UI derives the same set
   * (lib/agenda.ts callsFor). Field names are the UI's assumption, adapted at merge.
   */
  calls?: AdviceCall[];
}

/** One of the month's calls (D-84 R1, R4, R5, R6): two named sides, the Guide me sentence. */
export interface AdviceCall {
  /** 'crisis' (a decision id), 'meeting' (a meeting id) or 'move' (the mission move). */
  kind: 'crisis' | 'meeting' | 'move';
  id: string;
  /** The sides two advisers recommend by name; `optionId` for a crisis or meeting, `label` for a move's order. */
  sides: Array<{ optionId?: string; label?: string; who: string; reason: string; aim: 'mission' | 'calm' }>;
  /** The Chief of Staff's sentence at Guide me: "For your mission: X. To keep things calm: Y." */
  guide?: string;
  /** Political capital the mission side costs on top of its written cost (R6). */
  pushPc?: number;
}

export interface MissionNote {
  optionId: string;
  kind: 'best' | 'tradeoff' | 'least';
  /** "Best for your mission", "Best trade-off: helps Front, costs Approval", "Least harm ..." */
  text: string;
  helps: string[];
  costs: string[];
  /** Offer a switch only when the cabinet pick hurts a goal the mission pick does not. */
  switchFrom: { cabinetId: string; goal: string; breaks: boolean } | null;
}

export interface ScoreTerm {
  label: string;
  points: number;
}
export interface ScorePart {
  before: number;
  after: number;
  /** Where this part is heading (target x 0.9); the terms sum to it. */
  target: number;
  terms: ScoreTerm[];
}
export interface ScoreMove {
  before: number;
  after: number;
  /** The total if nothing changes. */
  heading: number;
  components: Record<'economic' | 'security' | 'approval' | 'prestige', ScorePart>;
}

/** The engine's outcome vocabulary (src/core/types.ts OutcomeStatusSchema). */
export type OutcomeStatus = 'DONE' | 'PARTLY' | 'FAILED' | 'REFUSED' | 'NO_EFFECT';

export interface TurnReport {
  turn: number;
  orders: Array<{
    label: string;
    ok: boolean;
    detail: string;
    type?: string;
    target?: string;
    story?: string;
    facts?: ReportFact[];
    reaction?: Reaction;
    watch?: string;
    /** Why a refused order was refused (OrderBlockCode); absent on chance failures. */
    code?: string;
    /** Times this order ran in the last 6 months (when more than once). */
    again?: number;
    /** Same order, same result as last month. */
    repeat?: boolean;
    /** The engine's one outcome status (src/core/status.ts) and why. */
    status?: OutcomeStatus;
    reason?: string;
  }>;
  decisions: Array<{
    title: string;
    choice: string;
    templateId?: string;
    kind?: 'CRISIS' | 'CALL' | 'VISIT' | 'STAFF' | 'PRESS';
    optionId?: string;
    withCountry?: string;
    speaker?: string;
    attended?: boolean;
    headline?: string;
    facts?: ReportFact[];
    reaction?: Reaction;
    watch?: string;
    repeat?: boolean;
    status?: OutcomeStatus;
    reason?: string;
  }>;
  deltas: Record<string, { before: number; after: number }>;
  causes: string[];
  moments: string[];
  relations?: Array<{ id: string; before: number; after: number }>;
  /** Your own view of the countries you dealt with, month start to month end (QA3R-2a). */
  yourView?: Array<{ id: string; before: number; after: number }>;
  world?: Array<{ actor: string; type: string; target?: string; label: string; status?: OutcomeStatus }>;
  wars?: Array<{ vs: string; frontBefore: number; frontAfter: number; ended: boolean }>;
  hot?: Array<{ id: string; name: string; metric: string; before: number; after: number; phase: string }>;
  tension?: { before: number; after: number };
  highlight?: { ref: 'decision' | 'order' | 'war'; index: number };
  /** The player's own biggest move ("What your choice did"); never a front that moved on its own. */
  yourMove?: { ref: 'decision' | 'order'; index: number };
  /** Why the score moved (scoring.ts scoreBreakdown). */
  score?: ScoreMove;
  /** Movement not caused by the month's choices, per stat (approval, stability, legitimacy). */
  drift?: Record<string, number>;
  /** Delayed outcomes set up this month (due = turn number). */
  followUps?: Array<{ title: string; due: number; templateId?: string }>;
  /** Delayed outcomes that came due this month: the decision that set them up and the news. */
  followUpsResolved?: Array<{ title: string; headline: string; templateId: string }>;
  /** Index into objectiveStatus of the step objective of the month just played. */
  stepObjective?: number;
  /** Each objective's value at the start of the month (null: no number). */
  missionBefore?: Array<number | null>;
  momentum?: boolean;
  /** Causes that also moved last month ("Still: ..."). */
  causesRepeated?: string[];
}

export interface ReportFact {
  label: string;
  before: number;
  after: number;
  unit?: string;
  good?: boolean;
  /** UI only (lib/numbers.ts): one move's share of a month stat, shown as a signed change. */
  share?: boolean;
}

/** How the other side answered (src/core/reactions.ts): the tone follows the measured change. */
export interface Reaction {
  who: string;
  line: string;
  tone: 'warm' | 'cold' | 'angry' | 'neutral';
}

export interface Outcome {
  victory: boolean;
  stars: number;
  conditions: Array<{ label: string; met: boolean; bonus: boolean }>;
}

export interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  fallbacks: number;
}

export interface LeaderStatement {
  countryId: string;
  leader: string;
  text: string;
}

export interface FlashpointInfo {
  id: string;
  title: string;
  tagline: string;
  hook: string;
  date?: string;
  turns: number;
  playable: Array<{ countryId: string; role: string; difficulty: 'STEADY' | 'TOUGH' | 'BRUTAL' }>;
  objectives: Record<string, { title: string; briefing: string }>;
  /** What kind of fire it is (title globe pin): see ui/src/lib/crisisKind.ts. */
  kind?: 'WAR' | 'SEA' | 'REGIME' | 'NUCLEAR';
  /** Who is fighting or facing off when it opens (lines on the title globe). */
  rivals?: Array<[string, string]>;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  startYear: number;
  globalTension: number;
}

export interface DailyInfo {
  date: string;
  flashpointId: string;
  countryId: string;
  title: string;
}

export interface Score {
  economic: number;
  security: number;
  approval: number;
  prestige: number;
  total: number;
}

export interface GameOver {
  reason: string;
  description: string;
  turn: number;
}

/** A hot zone that is not a state: Gaza, the West Bank (src/core/systems/hotspots.ts). */
export interface Hotspot {
  id: string;
  name: string;
  mapId: string;
  center: [number, number];
  occupier: string;
  people: string;
  phase: 'CALM' | 'TENSE' | 'CEASEFIRE' | 'WAR' | 'UPRISING';
  phaseSince: number;
  violence: number;
  humanitarian: number;
  aid: number;
  control: number;
  governance: number;
  incidents: { turn: number; kind: string; title: string }[];
}

export interface WorldState {
  turn: number;
  date: string;
  scenarioId: string;
  /** How the session started (replay and branch); absent on older saves. Mirrors SessionOriginSchema. */
  origin?: {
    scenarioId: string;
    playerCountryId: string;
    seed: number;
    mode: GameMode;
    difficulty: Difficulty;
    flashpointId: string | null;
    leaderName?: string;
    whatIf?: boolean;
    opening?: string;
  };
  /** The player's inputs per resolved month (MonthInputSchema). */
  inputs?: Array<{ actions: unknown[]; decisions: Array<{ decisionId: string; optionId: string }>; tier?: string }>;
  mode: GameMode;
  difficulty: Difficulty;
  maxTurns: number;
  flashpointId: string | null;
  objective: Objective | null;
  politicalCapital: number;
  director: { closeCalls: number; rallies: number; inDanger: boolean; lowPoint: number; record?: Record<string, number>; counterIntelUntil?: number; denounceTurns?: number[]; ledger?: Record<string, Array<{ turn: number; value: number; target?: string }>>; shocks?: Array<{ kind: string; by?: string; target?: string; turn: number }> };
  turnReport: TurnReport | null;
  outcome: Outcome | null;
  pendingDecisions: PendingDecision[];
  agenda?: Meeting[];
  hotspots?: Hotspot[];
  gameOver: GameOver | null;
  score: Score;
  countries: CountryFull[];
  wars: War[];
  globalTension: number;
  playerCountryId: string;
  newspaper: NewspaperEntry[];
  timeline: Array<{ turn: number; date: string; category: string; description: string }>;
  scoreHistory: Array<{ turn: number; gdp: number; stability: number; approval: number; globalTension: number; score: number }>;
}

export interface PreviewEffect {
  target: string;
  metric: string;
  delta: string;
  note: string;
}

export interface ActionPreview {
  summary: string;
  costM: number;
  budgetM: number;
  costPC: number;
  pcAvailable: number;
  affordable: boolean;
  successChance: number | null;
  effects: PreviewEffect[];
  risks: string[];
  blocked: string | null;
  /** The rule-layer reason as a code (src/core/availability.ts); blocked === block?.reason. */
  block?: OrderBlock | null;
  /** Declare war, nuclear strike: confirm on a separate face. */
  irreversible?: boolean;
  missionWarning?: string | null;
}

/** Mirrors src/core/availability.ts (types are duplicated, see CLAUDE.md). */
export type OrderBlockCode =
  | 'NO_CAPITAL' | 'NO_DEFENSE_BUDGET' | 'ORDER_LIMIT'
  | 'DUPLICATE' | 'NEEDS_TARGET'
  | 'GAME_OVER' | 'SELF_TARGET' | 'TARGET_COLLAPSED' | 'NOT_A_STATE' | 'INVALID_VALUE'
  | 'AT_WAR' | 'NOT_AT_WAR' | 'ALREADY_AT_WAR' | 'TARGET_NOT_AT_WAR' | 'PARTY_TO_WAR'
  | 'NOT_ALLIED' | 'PACT_REFUSED' | 'RELATIONS_MAXED' | 'NO_WARHEADS' | 'PROGRAM_MAXED' | 'FULLY_MOBILIZED'
  | 'TOO_PROTECTED' | 'TOO_STABLE' | 'NO_TROOPS';

export type PointTarget = 'capital' | 'orders' | 'meetings' | 'defense' | 'tray' | 'target' | 'mission';

export interface OrderBlock {
  code: OrderBlockCode;
  reason: string;
  fix: string | null;
  points: PointTarget | null;
  alt?: { type: string; params?: Record<string, unknown> };
  need?: { have: number; need: number; refill?: number };
}

export interface OrderAvailability {
  state: 'available' | 'unaffordable' | 'invalid' | 'queued';
  block: OrderBlock | null;
}

export interface PendingAction {
  type: string;
  label: string;
  targetCountryId?: string;
  value?: number;
  params?: Record<string, unknown>;
  preview?: ActionPreview;
  /** Queued by the staff as this month's default (the player can remove it). */
  origin?: 'staff' | 'player';
  /** The advisor's one-line reason, for staff orders. */
  why?: string;
  /**
   * A staff proposal (F-02-4): it holds no political capital, defense money or order slot until
   * the player approves it (on the card, in the tray or with Approve all), and Execute leaves an
   * unapproved proposal out. The balance harness's staff policy is Approve all.
   */
  proposed?: boolean;
}

/** The orders that will run: everything in the month except unapproved staff proposals. */
export function committedActions<T extends Pick<PendingAction, 'proposed'>>(actions: readonly T[]): T[] {
  return actions.filter((a) => !a.proposed);
}

/** What the desk's detail pane shows. */
export interface DeskFocus {
  kind: 'mission' | 'crisis' | 'meeting' | 'suggestions' | 'catalog' | 'order';
  id?: string;
}

export interface EndReport {
  country: string;
  leader: Leader | null;
  turnsServed: number;
  finalDate: string;
  gameOver: GameOver | null;
  score: Score;
  assessment: { classification: string; justification: string; grade: string };
  timeline: Array<{ turn: number; date: string; category: string; description: string }>;
  scoreHistory: WorldState['scoreHistory'];
  backstory: string;
  mode: GameMode;
  outcome: Outcome | null;
  objective: Objective | null;
  closeCalls: number;
  comebacks: number;
}

export interface TurnFeedback {
  resolved: Array<{ type: string; targetCountryId?: string }>;
  rejected: Array<{ action: { type: string; targetCountryId?: string }; reason: string }>;
  governmentChanges: Array<{ countryId: string; kind: string; description: string }>;
}

// ============================================================================
// Store
// ============================================================================

export interface PlayerAccount {
  id: string;
  name: string;
}

export type Screen = 'title' | 'game';

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'on';
  } catch {
    return fallback;
  }
}
function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
}

export interface GameState extends CodexSlice {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  guestId: string;
  objectiveStatus: ConditionStatus[];
  /** The month's advice from the server (advisors.ts); null before the first payload. */
  advice: Advice | null;
  /** Mission impact of every option on the desk: decision or meeting id → option id → impact. */
  missionImpact: Record<string, Record<string, Impact>>;
  /** Mission impact of each suggested order, by suggestion label. */
  orderImpact: Record<string, Impact>;
  /** The desk layout: Focus view or the full desk (remembered per browser). */
  deskView: 'focus' | 'full';
  setDeskView: (view: 'focus' | 'full') => void;
  aiTotalUsage: UsageTotals | null;
  aiTurnUsage: UsageTotals | null;
  aiNotice: string | null;
  leaderStatements: LeaderStatement[];
  lastEvents: Array<{ id: string; title: string; description: string; severity: string; type: string; affectedCountries: string[] }>;
  showChronicle: boolean;
  /** The news ticker along the bottom (remembered per browser). */
  showTicker: boolean;
  setShowTicker: (show: boolean) => void;
  setShowChronicle: (show: boolean) => void;
  showLogin: boolean;
  isDaily: boolean;
  drawer: 'cabinet' | 'world' | 'chronicle' | 'objective' | 'codex' | null;
  setDrawer: (drawer: GameState['drawer']) => void;
  isLoading: boolean;
  /** The global toast: network and server problems only (predictable refusals live on the order card). */
  error: string | null;
  /** The toast's message without its "×n" count, and how many times it repeated (deduped). */
  errorBase: string | null;
  errorCount: number;
  /** This month's political capital refill and the bank's cap (payload `pcIncome`, `pcCap`). */
  pcIncome: number;
  pcCap: number;
  player: PlayerAccount | null;
  setPlayer: (player: PlayerAccount | null) => void;
  saveId: string | null;
  worldState: WorldState | null;
  playerView: PlayerViewCountry[];
  pendingDecisions: PendingDecision[];
  decisionChoices: Record<string, string>; // decisionId (or meeting id) → optionId
  /** Crises and meetings the player answered themselves (the rest are staff picks or pending). */
  reviewed: Record<string, true>;
  /** Staff orders the player removed this month (order keys): never re-added. */
  dismissedStaff: string[];
  /** Agenda items the player skipped on purpose this month (lib/agenda.ts keys, design-agenda 0.3). */
  skipped: Record<string, true>;
  /** The agenda item on the Thing (lib/agenda.ts key); null = the first one still to do. */
  agendaKey: string | null;
  /** "Check what will happen": the review page replaces the Thing and the Plan. */
  review: boolean;
  /** The See all panel (laptops and tablets) or sheet (phones) is open. */
  listOpen: boolean;
  /** `${saveId}:${turn}` once this month's defaults are applied. */
  monthKey: string | null;
  deskMode: 'map' | 'desk';
  setDeskMode: (mode: 'map' | 'desk') => void;
  /** The country the desk catalog aims its orders at ('' for none): CountryPicker or a map tap. */
  orderTarget: string;
  setOrderTarget: (id: string) => void;
  /** "Pick on the map": the next tap on a foreign country sets the target and returns to the desk. */
  mapPick: boolean;
  setMapPick: (on: boolean) => void;
  /** Month 1: the player asked for the whole desk (advisors, budgets, meetings) before month 2. */
  deskShown: boolean;
  showDesk: () => void;
  focus: DeskFocus;
  setFocus: (focus: DeskFocus) => void;
  /** Settings: the staff pre-queue up to 3 orders each month. */
  staffOrders: boolean;
  /** Settings (D-84, off by default): "Let the Chief of Staff make my calls": Choose all decides calls too. */
  chiefCalls: boolean;
  setChiefCalls: (on: boolean) => void;
  setStaffOrders: (on: boolean) => void;
  advisorDraft: string | null; // a question pre-filled when you consult from a crisis or meeting
  consult: (role: string, question: string) => void;
  score: Score | null;
  gameOver: GameOver | null;
  playerBackstory: string;
  showBackstory: boolean;
  endReport: EndReport | null;

  selectedCountryId: string | null;
  activeModal:
    | 'newGame'
    | 'saveLoad'
    | 'newspaper'
    | 'advisor'
    | 'actionPreview'
    | 'turnFeedback'
    | 'endGame'
    | 'settings'
    | null;
  activeAdvisorRole: string | null;
  mapLayer: 'relations' | 'political' | 'military' | 'economic' | 'stability' | 'intelligence' | 'nuclear';
  debugMode: boolean;

  showSplash: boolean;
  currentPhase: TurnPhase;
  pendingActions: PendingAction[];
  lastTurnFeedback: TurnFeedback | null;

  llmPermissionGranted: boolean;
  llmProvider: string | null;
  llmSettings: LLMSettings;
  setLLMSettings: (settings: LLMSettings) => void;
  advisorChatHistory: Record<string, Array<{ role: 'user' | 'advisor'; content: string; timestamp: string }>>;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  applyServerPayload: (data: Record<string, unknown>, saveId: string) => void;
  selectCountry: (countryId: string | null) => void;
  openModal: (modal: GameState['activeModal']) => void;
  closeModal: () => void;
  setAdvisorRole: (role: string | null) => void;
  setMapLayer: (layer: GameState['mapLayer']) => void;
  reset: () => void;

  completeSplash: () => void;
  dismissBackstory: () => void;
  setPhase: (phase: TurnPhase) => void;
  advancePhase: () => void;
  chooseDecision: (decisionId: string, optionId: string) => void;
  addPendingAction: (action: PendingAction) => void;
  removePendingAction: (index: number) => void;
  /** Turn a staff proposal into an order of this month (no checks: use approveProposal()). */
  approvePendingAction: (index: number) => void;
  clearPendingActions: () => void;

  setLLMPermission: (granted: boolean) => void;
  setLLMProvider: (provider: string | null) => void;
  addAdvisorMessage: (advisorId: string, message: { role: 'user' | 'advisor'; content: string }) => void;
}

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

// ============================================================================
// LLM settings (BYO model): persisted in localStorage
// ============================================================================

export type AITier = 'ALGORITHMIC' | 'KEY_DECISIONS' | 'FULL_LLM';

export interface LLMSettings {
  provider: 'builtin' | 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'local';
  apiKey: string;
  model: string;
  baseUrl: string;
  tier: AITier; // who drives the world's other leaders
  budgetUsd: number; // per-game spending cap (0 = none)
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'builtin',
  apiKey: '',
  model: '',
  baseUrl: '',
  tier: 'ALGORITHMIC',
  budgetUsd: 1,
};

export const LLM_MODEL_DEFAULTS: Record<string, string> = {
  anthropic: 'claude-haiku-5-5',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  ollama: 'llama3.2',
  local: 'local-model',
};

/** The ai block for /turn: only when an LLM is configured and the tier uses one. */
export function aiRequestBody(settings: LLMSettings) {
  if (settings.provider === 'builtin' || settings.tier === 'ALGORITHMIC') return undefined;
  return {
    tier: settings.tier,
    provider: settings.provider,
    apiKey: settings.apiKey || undefined,
    model: settings.model || LLM_MODEL_DEFAULTS[settings.provider],
    baseUrl: settings.baseUrl || undefined,
    budgetUsd: settings.budgetUsd > 0 ? settings.budgetUsd : undefined,
  };
}

function loadLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem('worldconflict.llm');
    if (raw) return { ...DEFAULT_LLM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* corrupted settings → defaults */
  }
  return DEFAULT_LLM_SETTINGS;
}

export function llmRequestBody(settings: LLMSettings) {
  // The free tier never calls an LLM, advisors use the built-in brain
  if (settings.provider === 'builtin' || settings.tier === 'ALGORITHMIC') return undefined;
  return {
    provider: settings.provider,
    apiKey: settings.apiKey || undefined,
    model: settings.model || LLM_MODEL_DEFAULTS[settings.provider],
    baseUrl: settings.baseUrl || undefined,
  };
}

export const PHASE_ORDER: TurnPhase[] = ['news', 'briefing', 'diplomacy', 'military', 'domestic', 'confirm'];

export const PHASE_LABELS: Record<TurnPhase, string> = {
  news: 'News',
  briefing: 'Briefing',
  diplomacy: 'Diplomacy',
  military: 'Military',
  domestic: 'Domestic',
  confirm: 'Confirm',
};

/** The guest id survives cleared storage through its cookie mirror (lib/guest.ts, F-02-6). */
function loadGuestId(): string {
  return resolveGuestId(browserGuestStores());
}

export function lastSaveId(): string | null {
  try {
    return localStorage.getItem('worldconflict.lastSave');
  } catch {
    return null;
  }
}

function rememberSave(saveId: string | null): void {
  try {
    if (saveId) localStorage.setItem('worldconflict.lastSave', saveId);
    else localStorage.removeItem('worldconflict.lastSave');
  } catch {
    /* storage unavailable */
  }
}

/** Record a finished daily challenge; returns the current streak in days. */
export function recordDailyResult(date: string, stars: number): { streak: number; best: number } {
  try {
    const raw = JSON.parse(localStorage.getItem('worldconflict.daily') ?? '{}') as {
      last?: string;
      streak?: number;
      best?: number;
      results?: Record<string, number>;
    };
    const results = { ...(raw.results ?? {}), [date]: Math.max(stars, raw.results?.[date] ?? 0) };
    let streak = raw.streak ?? 0;
    if (raw.last !== date) {
      const yesterday = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
      streak = raw.last === yesterday ? streak + 1 : 1;
    }
    const best = Math.max(raw.best ?? 0, streak);
    localStorage.setItem('worldconflict.daily', JSON.stringify({ last: date, streak, best, results }));
    return { streak, best };
  } catch {
    return { streak: 1, best: 1 };
  }
}

/** Saves belong to the signed-in account, or to this browser's guest id. */
export function ownerId(): string {
  const { player, guestId } = useGameStore.getState();
  return player?.id ?? guestId;
}

function loadPlayer(): PlayerAccount | null {
  try {
    const raw = localStorage.getItem('worldconflict.player');
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted → re-login */
  }
  return null;
}

/** When the toast last showed a message (setError dedupes repeats within 10 s). */
let lastErrorAt = 0;

export const useGameStore = create<GameState>((set) => ({
  ...createCodexSlice(set),
  screen: 'title',
  setScreen: (screen) => set({ screen }),
  guestId: loadGuestId(),
  objectiveStatus: [],
  advice: null,
  missionImpact: {},
  orderImpact: {},
  deskView: (() => {
    try {
      return localStorage.getItem('worldconflict.deskView') === 'full' ? 'full' : 'focus';
    } catch {
      return 'focus';
    }
  })(),
  setDeskView: (view) => {
    try {
      localStorage.setItem('worldconflict.deskView', view);
    } catch {
      /* storage unavailable */
    }
    set({ deskView: view });
  },
  aiTotalUsage: null,
  aiTurnUsage: null,
  aiNotice: null,
  leaderStatements: [],
  lastEvents: [],
  showChronicle: false,
  setShowChronicle: (show) => set({ showChronicle: show }),
  showLogin: false,
  isDaily: false,
  drawer: null,
  setDrawer: (drawer) => set({ drawer }),
  isLoading: false,
  error: null,
  errorBase: null,
  errorCount: 0,
  pcIncome: 2,
  pcCap: 6,
  player: loadPlayer(),
  setPlayer: (player) => {
    try {
      if (player) localStorage.setItem('worldconflict.player', JSON.stringify(player));
      else localStorage.removeItem('worldconflict.player');
    } catch {
      /* storage unavailable */
    }
    set({ player });
  },
  saveId: null,
  worldState: null,
  playerView: [],
  pendingDecisions: [],
  decisionChoices: {},
  reviewed: {},
  dismissedStaff: [],
  skipped: {},
  agendaKey: null,
  review: false,
  listOpen: false,
  monthKey: null,
  deskMode: 'desk',
  setDeskMode: (mode) => set({ deskMode: mode }),
  orderTarget: '',
  setOrderTarget: (id) => set({ orderTarget: id }),
  mapPick: false,
  setMapPick: (on) => set(on ? { mapPick: true, deskMode: 'map', selectedCountryId: null } : { mapPick: false }),
  deskShown: false,
  showDesk: () => set({ deskShown: true }),
  focus: { kind: 'mission' },
  setFocus: (focus) => set({ focus, deskMode: 'desk' }),
  staffOrders: readFlag('worldconflict.staffOrders', true),
  setStaffOrders: (on) => {
    writeFlag('worldconflict.staffOrders', on);
    set({ staffOrders: on });
  },
  chiefCalls: readFlag('worldconflict.chiefCalls', false),
  setChiefCalls: (on) => {
    writeFlag('worldconflict.chiefCalls', on);
    set({ chiefCalls: on });
  },
  advisorDraft: null,
  consult: (role, question) => set({ activeAdvisorRole: role, advisorDraft: question, activeModal: 'advisor', drawer: null }),
  score: null,
  gameOver: null,
  playerBackstory: '',
  showBackstory: false,
  endReport: null,

  selectedCountryId: null,
  activeModal: null,
  activeAdvisorRole: null,
  mapLayer: 'relations',
  showTicker: (() => {
    try {
      const v = localStorage.getItem('worldconflict.ticker');
      return v === null ? window.innerWidth > 900 : v !== 'off';
    } catch {
      return true;
    }
  })(),
  setShowTicker: (show) => {
    try {
      localStorage.setItem('worldconflict.ticker', show ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
    set({ showTicker: show });
  },
  debugMode: new URLSearchParams(window.location.search).get('debug') === '1',

  showSplash: true,
  currentPhase: 'news',
  pendingActions: [],
  lastTurnFeedback: null,

  llmPermissionGranted: false,
  llmProvider: null,
  llmSettings: loadLLMSettings(),
  setLLMSettings: (settings) => {
    try {
      localStorage.setItem('worldconflict.llm', JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
    set({ llmSettings: settings });
  },
  advisorChatHistory: {},

  setLoading: (loading) => set({ isLoading: loading }),
  // Identical messages within 10 s collapse into one toast with a count ("Connection failed ×3"),
  // even when a retry cleared the toast in between
  setError: (error) =>
    set((s) => {
      if (!error) return { error: null };
      const repeat = s.errorBase === error && Date.now() - lastErrorAt < 10_000;
      lastErrorAt = Date.now();
      const count = repeat ? s.errorCount + 1 : 1;
      return { error: count > 1 ? `${error} ×${count}` : error, errorBase: error, errorCount: count };
    }),
  applyServerPayload: (data, saveId) =>
    set({
      pcIncome: typeof data.pcIncome === 'number' ? data.pcIncome : 2,
      pcCap: typeof data.pcCap === 'number' ? data.pcCap : 6,
      objectiveStatus: (data.objectiveStatus as ConditionStatus[]) ?? [],
      advice: (data.advice as Advice) ?? null,
      missionImpact: (data.missionImpact as Record<string, Record<string, Impact>>) ?? {},
      orderImpact: (data.orderImpact as Record<string, Impact>) ?? {},
      worldState: data.worldState as WorldState,
      playerView: (data.playerView as PlayerViewCountry[]) ?? [],
      pendingDecisions: (data.pendingDecisions as PendingDecision[]) ?? [],
      score: (data.score as Score) ?? null,
      gameOver: (data.gameOver as GameOver) ?? null,
      playerBackstory: (data.playerBackstory as string) ?? '',
      saveId,
      decisionChoices: {},
      reviewed: {},
      dismissedStaff: [],
      skipped: {},
      agendaKey: null,
      review: false,
      listOpen: false,
      monthKey: null,
      error: null,
      errorBase: null,
      errorCount: 0,
    }),
  selectCountry: (countryId) => set({ selectedCountryId: countryId }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, activeAdvisorRole: null }),
  setAdvisorRole: (role) => set({ activeAdvisorRole: role }),
  setMapLayer: (layer) => set({ mapLayer: layer }),
  reset: () =>
    set({
      isLoading: false,
      error: null,
      saveId: null,
      worldState: null,
      playerView: [],
      pendingDecisions: [],
      decisionChoices: {},
      score: null,
      gameOver: null,
      endReport: null,
      selectedCountryId: null,
      orderTarget: '',
      mapPick: false,
      deskShown: false,
      activeModal: null,
      activeAdvisorRole: null,
      currentPhase: 'news',
      pendingActions: [],
      reviewed: {},
      dismissedStaff: [],
      skipped: {},
      agendaKey: null,
      review: false,
      listOpen: false,
      monthKey: null,
      lastTurnFeedback: null,
      advisorChatHistory: {},
      screen: 'title',
      showChronicle: false,
      objectiveStatus: [],
      advice: null,
      missionImpact: {},
      orderImpact: {},
      aiTotalUsage: null,
      aiTurnUsage: null,
      aiNotice: null,
      leaderStatements: [],
      lastEvents: [],
    }),

  completeSplash: () => set({ showSplash: false }),
  dismissBackstory: () => set({ showBackstory: false }),
  setPhase: (phase) => set({ currentPhase: phase }),
  advancePhase: () =>
    set((state) => {
      const i = PHASE_ORDER.indexOf(state.currentPhase);
      return i < PHASE_ORDER.length - 1 ? { currentPhase: PHASE_ORDER[i + 1] } : state;
    }),
  chooseDecision: (decisionId, optionId) =>
    set((state) => ({
      decisionChoices: { ...state.decisionChoices, [decisionId]: optionId },
      reviewed: { ...state.reviewed, [decisionId]: true },
    })),
  // Same rules as the engine (turn.ts): one of each order per target, at most 6 a month. A
  // refusal here is silent (the order card shows why before any tap); a success clears the toast.
  addPendingAction: (action) =>
    set((state) => {
      if (state.pendingActions.some((a) => orderKey(a) === orderKey(action))) return state;
      // Proposals use no order slot until approved (F-02-4)
      if (!action.proposed && committedActions(state.pendingActions).length >= 6) return state;
      if (!action.proposed) logPick('pick', action, state.worldState?.turn);
      return { pendingActions: [...state.pendingActions, action], error: null, errorBase: null, errorCount: 0 };
    }),
  removePendingAction: (index) =>
    set((state) => {
      const gone = state.pendingActions[index];
      if (gone) logPick('remove', gone, state.worldState?.turn);
      return {
        pendingActions: state.pendingActions.filter((_, i) => i !== index),
        dismissedStaff: gone?.origin === 'staff' ? [...state.dismissedStaff, orderKey(gone)] : state.dismissedStaff,
      };
    }),
  clearPendingActions: () => set({ pendingActions: [] }),
  approvePendingAction: (index) =>
    set((state) => {
      const a = state.pendingActions[index];
      if (!a?.proposed) return state;
      logPick('pick', a, state.worldState?.turn);
      const pendingActions = state.pendingActions.slice();
      pendingActions[index] = { ...a, proposed: false };
      return { pendingActions };
    }),

  setLLMPermission: (granted) => set({ llmPermissionGranted: granted }),
  setLLMProvider: (provider) => set({ llmProvider: provider }),
  addAdvisorMessage: (advisorId, message) =>
    set((state) => ({
      advisorChatHistory: {
        ...state.advisorChatHistory,
        [advisorId]: [
          ...(state.advisorChatHistory[advisorId] || []),
          { ...message, timestamp: new Date().toISOString() },
        ],
      },
    })),
}));

// The toast clears itself after 6 s (and on success or a new month: see addPendingAction and
// applyServerPayload), so a stale message never outlives its moment (backlog B-08)
export const TOAST_MS = 6000;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
useGameStore.subscribe((s, prev) => {
  if (s.error === prev.error) return;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = s.error ? setTimeout(() => useGameStore.getState().setError(null), TOAST_MS) : null;
});

// ============================================================================
// API calls
// ============================================================================

export async function fetchCatalog(): Promise<{
  scenarios: ScenarioInfo[];
  flashpoints: FlashpointInfo[];
  daily: DailyInfo | null;
}> {
  const response = await fetch(`${API_BASE}/scenarios`);
  const data = await response.json();
  if (!data.success) return { scenarios: [], flashpoints: [], daily: null };
  return { scenarios: data.scenarios, flashpoints: data.flashpoints ?? [], daily: data.daily ?? null };
}

export async function fetchScenarios(): Promise<ScenarioInfo[]> {
  return (await fetchCatalog()).scenarios;
}

export async function loginOrRegister(
  mode: 'login' | 'register',
  name: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    const data = await response.json();
    if (!data.success) return { ok: false, error: data.error ?? 'Failed' };
    useGameStore.getState().setPlayer(data.player);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export function logout(): void {
  const store = useGameStore.getState();
  store.setPlayer(null);
  store.reset();
  rememberSave(null);
}

export interface NewGameRequest {
  playerCountryId: string;
  mode: GameMode;
  scenarioId?: string;
  flashpointId?: string;
  difficulty?: Difficulty;
  leaderName?: string;
  daily?: boolean;
  /** Replay same opening: the finished run's seed (same seat, same first crisis). */
  seed?: number;
  /** Play this seed: a seed code ("HC-USA-3PX") names the seat and the seed; the server parses it. */
  seedCode?: string;
  /** D-56: lead a nation that is not a state in the era, as alternate history. */
  whatIf?: boolean;
  /** One Term "Start with": the era situation the opening crisis is about. */
  opening?: string;
}

export async function startGame(req: NewGameRequest): Promise<boolean> {
  const store = useGameStore.getState();
  store.setLoading(true);
  store.setError(null);
  try {
    const response = await fetch(`${API_BASE}/new-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, playerId: ownerId() }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create game');
    store.reset();
    store.applyServerPayload(data, data.saveId);
    rememberSave(data.saveId);
    useGameStore.setState({
      screen: 'game',
      showBackstory: true,
      deskShown: false,
      orderTarget: '',
      endReport: null,
      lastEvents: [],
      isDaily: !!req.daily,
    });
    return true;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to create game');
    return false;
  } finally {
    store.setLoading(false);
  }
}

/** Legacy entry point kept for older components. */
export async function createNewGame(
  scenarioId: string,
  playerCountryId: string,
  _saveName?: string,
  leaderName?: string,
): Promise<void> {
  await startGame({ scenarioId, playerCountryId, leaderName, mode: 'TERM' });
}

export async function executeTurn(): Promise<void> {
  const store = useGameStore.getState();
  const { saveId, pendingActions, decisionChoices, llmSettings } = store;
  if (!saveId) {
    store.setError('No active game');
    return;
  }
  store.setLoading(true);
  store.setError(null);
  try {
    const post = () => fetch(`${API_BASE}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saveId,
        // Unapproved staff proposals never run (F-02-4)
        playerActions: committedActions(pendingActions).map((a) => ({
          type: a.type,
          targetCountryId: a.targetCountryId,
          value: a.value,
          params: a.params,
        })),
        decisions: Object.entries(decisionChoices).map(([decisionId, optionId]) => ({
          decisionId,
          optionId,
        })),
        ai: aiRequestBody(llmSettings),
      }),
    });
    // Rate-limited: wait and retry quietly instead of failing
    let response = await post();
    for (let attempt = 0; attempt < 3 && response.status === 429; attempt++) {
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      response = await post();
    }
    // This month is already being resolved (a double submit): never run it twice
    if (response.status === 409) return;
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to execute turn');

    store.applyServerPayload(data, saveId);
    const playerCountryId = (data.worldState as WorldState).playerCountryId;
    useGameStore.setState({
      lastTurnFeedback: {
        resolved: (data.resolvedActions?.[playerCountryId] as TurnFeedback['resolved']) ?? [],
        rejected: (data.rejectedActions?.[playerCountryId] as TurnFeedback['rejected']) ?? [],
        governmentChanges: data.governmentChanges ?? [],
      },
      pendingActions: [],
      currentPhase: 'news',
      showChronicle: true,
      selectedCountryId: null,
      mapPick: false,
      lastEvents: data.events ?? [],
      aiTurnUsage: data.ai?.turnUsage ?? null,
      aiTotalUsage: data.ai?.totalUsage ?? store.aiTotalUsage,
      aiNotice: data.ai?.notice ?? null,
      leaderStatements: data.ai?.statements ?? [],
    });

    if (data.gameOver) {
      await fetchEndReport();
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to execute turn');
  } finally {
    store.setLoading(false);
  }
}

export async function fetchPreview(action: {
  type: string;
  targetCountryId?: string;
  value?: number;
  params?: Record<string, unknown>;
}): Promise<ActionPreview | null> {
  const { saveId } = useGameStore.getState();
  if (!saveId) return null;
  try {
    const response = await fetch(`${API_BASE}/preview-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveId, action }),
    });
    const data = await response.json();
    return data.success ? (data.preview as ActionPreview) : null;
  } catch {
    return null;
  }
}

/**
 * Political capital left this month: the bank, plus or minus the crisis answers (an unanswered
 * crisis falls to its default option, so it counts), minus the orders already queued.
 */
export function capitalLeft(state: GameState = useGameStore.getState()): number {
  const world = state.worldState;
  if (!world) return 0;
  const crisisPc = state.pendingDecisions.reduce((sum, d) => {
    const option = d.options.find((o) => o.id === (state.decisionChoices[d.id] ?? d.defaultOptionId ?? d.options[0]?.id));
    return sum + (option?.effects.pc ?? 0);
  }, 0);
  // Meetings you attend can cost capital too (a state visit, a hotline); deputies cost nothing
  const meetingPc = (world.agenda ?? []).reduce((sum, m) => {
    const option = m.options.find((o) => o.id === state.decisionChoices[m.id]);
    return sum + (option?.effects.pc ?? 0);
  }, 0);
  // Staff proposals hold nothing until approved (F-02-4)
  return Math.max(0, world.politicalCapital + crisisPc + meetingPc) - committedActions(state.pendingActions).reduce((s, a) => s + pcCost(a.type), 0);
}

/** The key the engine uses for "one of each order per target" (turn.ts). */
export function orderKey(a: Pick<PendingAction, 'type' | 'targetCountryId' | 'params'>): string {
  return `${a.type}:${a.targetCountryId ?? ''}:${String(a.params?.targetType ?? a.params?.tactic ?? '')}`;
}

/**
 * The unsent month as the order cards' month layer sees it (lib/availability.ts): capital left,
 * orders this month, defense budget used, what is already queued. Same capital rule as
 * capitalLeft() and the rail.
 */
export function monthView(state: GameState = useGameStore.getState()): MonthView {
  const world = state.worldState;
  const me = world?.countries.find((c) => c.id === world.playerCountryId);
  const budgetM = me ? (me.gdp * (me.militaryBudgetPercent / 100)) / 12 / 1e6 : 0;
  // Staff proposals are not in the month until approved (F-02-4)
  const queued = committedActions(state.pendingActions);
  return {
    pcLeft: capitalLeft(state),
    bank: world?.politicalCapital ?? 0,
    pcIncome: state.pcIncome,
    pcCap: state.pcCap,
    ordersUsed: queued.length,
    queuedKeys: queued.map(orderKeyOf),
    queuedCosts: queued.map((a) => pcCost(a.type)),
    queuedLabels: queued.map((a) => a.label),
    queuedStaff: queued.map((a) => a.origin === 'staff'),
    defenseUsedM: queued.reduce((sum, a) => sum + defenseCostM(a, budgetM), 0),
    budgetM,
    gameOver: !!(world?.gameOver ?? state.gameOver),
  };
}

/** Why an order needs a second, explicit action before it is queued (the card's confirm face). */
export interface ConfirmNeed {
  /** Declare war, nuclear strike: there is no undo. */
  irreversible: boolean;
  /** The order fails or endangers the session objective (amber, shown once on the face). */
  missionWarning: string | null;
  preview: ActionPreview | null;
}

/**
 * What queueOrder() did. `block`: refused for a predictable reason (the card renders it and the
 * meter it names is pointed at; never a toast). `confirm`: the order needs the confirm face, call
 * again with `{ confirmed: true }` after the player's explicit second action.
 */
export type QueueResult =
  | { ok: true; index: number }
  | { ok: false; block: OrderBlock; confirm?: undefined }
  | { ok: false; confirm: ConfirmNeed; block?: undefined };

/** D-75 validation in real use: picks and removals by registry order id (lib/orderLog.ts). */
function logPick(kind: 'pick' | 'remove', a: PendingAction, month: number | undefined) {
  logOrder(kind, orderFor(a)?.id, { target: a.targetCountryId, month, origin: a.proposed ? 'recommended' : a.origin });
}

/**
 * Queue an order the same way from every surface (desk catalog and search, staff picks, map menu,
 * dossier): month layer and rule layer first (lib/availability.ts), then the server preview, then
 * the confirm step for irreversible orders and mission warnings, then add it. Never opens a native
 * dialog and never raises a toast for a refusal: refusals come back as `block` and point at the
 * resource they name. Only network trouble reaches the toast (fetchPreview stays quiet and the
 * order is queued without a forecast, as before).
 */
export async function queueOrder(a: PendingAction, opts: { confirmed?: boolean } = {}): Promise<QueueResult> {
  const refuse = (block: OrderBlock, slots?: number[]): QueueResult => {
    if (block.points) pointAt(block.points, { slots, detail: block.code === 'NO_CAPITAL' ? `${a.label} needs ◆ ${pcCost(a.type)}` : undefined });
    return { ok: false, block };
  };
  // The same order as a staff proposal: giving it approves the proposal (F-02-4)
  const proposal = useGameStore.getState().pendingActions.findIndex((x) => x.proposed && orderKey(x) === orderKey(a));
  if (proposal >= 0) return approveProposal(proposal);
  const first = availabilityOf({ ...a, targeted: needsTarget(a.type) }, monthView());
  if (first.block && first.state !== 'available') return refuse(first.block, first.block.slots);
  const preview = await fetchPreview({ type: a.type, targetCountryId: a.targetCountryId, value: a.value, params: a.params });
  if (preview?.block) return refuse(preview.block);
  if (preview?.blocked) return refuse({ code: 'INVALID_VALUE', reason: preview.blocked, fix: null, points: null });
  const irreversible = !!preview?.irreversible || a.type === 'DIPLOMACY_DECLARE_WAR' || a.type === 'NUCLEAR_STRIKE';
  const missionWarning = preview?.missionWarning ?? null;
  if ((irreversible || missionWarning) && !opts.confirmed)
    return { ok: false, confirm: { irreversible, missionWarning, preview: preview ?? null } };
  // The month may have changed while the preview was in flight
  const again = availabilityOf({ ...a, targeted: needsTarget(a.type) }, monthView());
  if (again.block && again.state !== 'available') return refuse(again.block, again.block.slots);
  useGameStore.getState().addPendingAction({ ...a, preview: preview ?? undefined });
  const index = useGameStore.getState().pendingActions.findIndex((x) => orderKey(x) === orderKey(a));
  if (index < 0) return refuse({ code: 'ORDER_LIMIT', reason: 'All 6 orders this month are used.', fix: 'Remove an order', points: 'orders' });
  return { ok: true, index };
}

/**
 * Approve one staff proposal (F-02-4): the same month checks as any order (capital, order slots,
 * defense budget); a refusal points at the meter it names, like queueOrder().
 */
export function approveProposal(index: number): QueueResult {
  const a = useGameStore.getState().pendingActions[index];
  if (!a) return { ok: false, block: { code: 'DUPLICATE', reason: 'This proposal is gone.', fix: null, points: null } };
  if (!a.proposed) return { ok: true, index };
  const m = monthView();
  const check = availabilityOf({ ...a, targeted: needsTarget(a.type) }, m);
  if (check.block && check.state !== 'available') {
    const block = check.block;
    if (block.points) pointAt(block.points, { slots: block.slots, detail: block.code === 'NO_CAPITAL' ? `${a.label} needs ◆ ${pcCost(a.type)}` : undefined });
    return { ok: false, block };
  }
  useGameStore.getState().approvePendingAction(index);
  return { ok: true, index };
}

export async function fetchEndReport(): Promise<void> {
  const { saveId } = useGameStore.getState();
  if (!saveId) return;
  try {
    const response = await fetch(`${API_BASE}/report/${saveId}`);
    const data = await response.json();
    if (data.success) {
      useGameStore.setState({ endReport: data.report as EndReport });
    }
  } catch {
    /* report unavailable */
  }
}

export async function loadGame(saveId: string): Promise<void> {
  const store = useGameStore.getState();
  store.setLoading(true);
  store.setError(null);
  try {
    const response = await fetch(`${API_BASE}/load/${saveId}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to load game');
    store.applyServerPayload(data, data.saveId);
    rememberSave(data.saveId);
    useGameStore.setState({ currentPhase: 'briefing', endReport: null, screen: 'game' });
    store.closeModal();
    if (data.gameOver) await fetchEndReport();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to load game');
  } finally {
    store.setLoading(false);
  }
}

/** A row of Saved games (GET /api/saves): what Resume, Replay and Branch need. */
export interface SaveRecord {
  id: string;
  name: string;
  turn: number;
  playerCountry: string;
  leaderName?: string | null;
  updatedAt?: string;
  seed: number;
  mode?: GameMode;
  scenarioId?: string;
  flashpointId?: string | null;
  difficulty?: Difficulty;
  maxTurns?: number;
  gameOver?: boolean;
  /** False for saves made before the replay record existed. */
  branchable: boolean;
  whatIf?: boolean;
  opening?: string;
  /** The world's current date (YYYY-MM): the branch picker names each month's date. */
  date?: string;
}

/** Saves of the signed-in account and of this browser's guest id together. */
export async function fetchSaves(): Promise<SaveRecord[]> {
  const { player, guestId } = useGameStore.getState();
  const query = `?guestId=${encodeURIComponent(guestId)}${player ? `&playerId=${encodeURIComponent(player.id)}` : ''}`;
  const response = await fetch(`${API_BASE}/saves${query}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch saves');
  return data.saves;
}

/** "Replay same opening" for a saved game: the same seat, seed and opening, from month 0. */
export function replaySave(s: SaveRecord): Promise<boolean> {
  return startGame({
    mode: s.mode ?? 'TERM',
    playerCountryId: s.playerCountry,
    flashpointId: s.flashpointId ?? undefined,
    scenarioId: s.flashpointId ? undefined : s.scenarioId,
    difficulty: s.difficulty,
    seed: s.seed,
    ...(s.whatIf ? { whatIf: true } : {}),
    ...(s.opening ? { opening: s.opening } : {}),
  });
}

/** "Branch from this month": a new save rebuilt from the same seed up to that month. */
export async function branchGame(saveId: string, month: number): Promise<boolean> {
  const store = useGameStore.getState();
  store.setLoading(true);
  store.setError(null);
  try {
    const response = await fetch(`${API_BASE}/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveId, month, playerId: ownerId() }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not branch this game');
    store.reset();
    store.applyServerPayload(data, data.saveId);
    rememberSave(data.saveId);
    useGameStore.setState({ currentPhase: 'briefing', endReport: null, screen: 'game', orderTarget: '', lastEvents: [] });
    store.closeModal();
    return true;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Could not branch this game');
    return false;
  } finally {
    store.setLoading(false);
  }
}

/** Resolve a country id to its display name from the current world state. */
export function countryName(id: string | null | undefined): string {
  if (!id) return '';
  const { worldState } = useGameStore.getState();
  return worldState?.countries.find((c) => c.id === id)?.name ?? id;
}

export function countryNames(ids: string[]): string {
  return ids.map((id) => countryName(id)).join(', ');
}

// Convenience selectors
export function usePlayerCountry(): CountryFull | null {
  const worldState = useGameStore((s) => s.worldState);
  if (!worldState) return null;
  return worldState.countries.find((c) => c.id === worldState.playerCountryId) ?? null;
}

export function useViewCountry(id: string | null): PlayerViewCountry | null {
  const playerView = useGameStore((s) => s.playerView);
  if (!id) return null;
  return playerView.find((c) => c.id === id) ?? null;
}

// ============================================================================
// The reveal (design-reveal.md): payload types mirrored from src/core/reveal.ts, fetchReveal and
// postRun. Owned by the reveal UI (ui/src/components/reveal/*); keep in sync with the backend.
// ============================================================================

export type RarityTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';
export type TruthVerdict = 'BETTER' | 'SAME' | 'WORSE' | 'CONTEXT' | 'OPEN';

export interface BenchmarkStats {
  p10: number;
  p50: number;
  p90: number;
  max: number;
  n: number;
  q: number[];
}

export interface PresidencyPart {
  id: 'mission' | 'timing' | 'leadership' | 'finish';
  label: string;
  value: number;
  max: number;
  detail: string;
}

export interface PresidencyScore {
  total: number;
  raw: number;
  parts: PresidencyPart[];
  modifier: { kind: 'NONE' | 'DEPOSED' | 'NUCLEAR'; factor: number; label: string };
  career: { factor: number; total: number; label: string };
}

export interface AchievementView {
  id: string;
  name: string;
  rule: string;
  hint: string;
  infamy: boolean;
  signature: boolean;
  tier: RarityTier;
  rate: number | null;
  turn: number | null;
  month: number | null;
}

export type MomentKind =
  | 'CRISIS'
  | 'ORDER'
  | 'WAR_START'
  | 'WAR_END'
  | 'PACT'
  | 'ELECTION'
  | 'CLOSE_CALL'
  | 'COMEBACK'
  | 'OBJECTIVE_MET'
  | 'OBJECTIVE_LOST'
  | 'NUCLEAR'
  | 'COVERT_EXPOSED'
  | 'RECORD';

export interface MomentView {
  turn: number;
  month: number;
  kind: MomentKind;
  title: string;
  consequence: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  weight: number;
  with?: string;
}

export interface SeriesView {
  id: 'approval' | 'realGrowth' | 'stability' | 'tension' | 'score' | 'gdp';
  label: string;
  unit: string;
  higherIsBetter: boolean;
  months: number[];
  values: number[];
  start: number;
  end: number;
  min: number;
  max: number;
  best: number;
  worst: number;
}

export interface RelationRow {
  id: string;
  name: string;
  before: number;
  after: number;
  label: 'Closer' | 'Cooler' | 'Thaw' | 'Rupture' | 'Steady';
  objective: boolean;
}

export interface DeclassifiedCard {
  id: 'nuclear' | 'military' | 'plots';
  label: string;
  subject: string;
  believed: number | null;
  actual: number;
  unit: string;
  note: string;
}

export interface TruthRow {
  topic: string;
  yours: string;
  real: string;
  verdict: TruthVerdict;
  met: boolean | null;
}

export interface PressQuote {
  role: 'home' | 'ally' | 'rival';
  outlet: string;
  quote: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface RunRecord {
  seatKey: string;
  seed: number;
  seedCode: string;
  difficulty: Difficulty;
  mode: GameMode;
  scenarioId: string;
  flashpointId: string | null;
  countryId: string;
  presidencyScore: number;
  parts: [number, number, number, number];
  grade: string;
  stars: number;
  verdict: string;
  victory: boolean;
  achievements: string[];
  series: { approval: number[]; score: number[] };
  choices: Array<{ turn: number; title: string; choice: string }>;
  aiTier: string;
  saveId?: string;
  date?: string;
}

export interface RevealPayload {
  version: 1;
  reduced: boolean;
  seat: {
    seatKey: string;
    mode: GameMode;
    scenarioId: string;
    flashpointId: string | null;
    countryId: string;
    countryName: string;
    leader: string;
    difficulty: Difficulty;
    seatDifficulty: 'STEADY' | 'TOUGH' | 'BRUTAL' | null;
    title: string;
    regime?: string;
    months: number;
    maxTurns: number;
    finalDate: string;
  };
  verdict: {
    victory: boolean;
    stars: number;
    grade: string;
    reason: string | null;
    label: string;
    description: string;
    classification: string;
    justification: string;
    conditions: Array<{ label: string; met: boolean; bonus: boolean }>;
    /** Primary goals missed at the end (src/core/reveal.ts MissedGoal); absent on old payloads. */
    missed?: Array<{ label: string; short: string; now: number | null; need: number | null; gap: number | null; unit: string | null }>;
    /** "You missed Israel relations 61+ by 1 (60 of 61)."; null on a win. */
    missedLine?: string | null;
    score: number;
    par: number;
  };
  presidency: PresidencyScore;
  achievements: { earned: AchievementView[]; locked: AchievementView[]; catalogue: number };
  moments: {
    months: number;
    best: MomentView | null;
    worst: MomentView | null;
    turningPoint: { turn: number; month: number; from: number; to: number; delta: number } | null;
    well: MomentView[];
    bad: MomentView[];
    timing: Array<{ month: number; text: string }>;
  };
  perception: {
    approval: SeriesView;
    elections: Array<{ turn: number; month: number; won: boolean }>;
    caption: string;
    relations: RelationRow[];
    press: PressQuote[];
    judgement: string;
  };
  numbers: {
    series: SeriesView[];
    counts: {
      wars: number;
      deals: number;
      orders: number;
      crises: number;
      livesLost: number;
      covertOk: number;
      covertExposed: number;
    };
  };
  declassified: DeclassifiedCard[];
  truth: {
    asOf: string;
    rows: TruthRow[];
    fear: string | null;
    sources: string[];
    debrief: string;
  } | null;
  replay: {
    seed: number;
    seedCode: string;
    seatKey: string;
    mode: GameMode;
    scenarioId: string;
    flashpointId: string | null;
    countryId: string;
    difficulty: Difficulty;
    deterministic: boolean;
    aiTiersUsed: string[];
  };
  ranking: {
    seatKey: string;
    benchmarks: Partial<Record<'none' | 'random' | 'smart', BenchmarkStats>> | null;
    ticks: Array<{ id: string; label: string; score: number }>;
    percentile: number | null;
    percentileLabel: string | null;
    personalBest: number | null;
  };
  beatNext: string;
  run: RunRecord;
}

/** The end-of-session reveal for a finished save (null when the API cannot build one). */
export async function fetchReveal(saveId: string): Promise<RevealPayload | null> {
  try {
    const response = await fetch(
      `${API_BASE}/reveal/${encodeURIComponent(saveId)}?playerId=${encodeURIComponent(ownerId())}`,
    );
    const data = await response.json();
    return data.success ? (data.reveal as RevealPayload) : null;
  } catch {
    return null;
  }
}

/** POST /api/runs: record a finished run server-side (the server derives it from the save). */
export async function postRun(saveId: string): Promise<{ position: number; of: number } | null> {
  try {
    const response = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveId, playerId: ownerId() }),
    });
    const data = await response.json();
    return data.success ? (data.rank as { position: number; of: number }) : null;
  } catch {
    return null;
  }
}

/** GET /api/runs: this player's runs (optionally on one seat), newest first. */
export async function fetchRemoteRuns(seat?: string): Promise<Array<Record<string, unknown>>> {
  try {
    const q = `?playerId=${encodeURIComponent(ownerId())}${seat ? `&seat=${encodeURIComponent(seat)}` : ''}`;
    const response = await fetch(`${API_BASE}/runs${q}`);
    const data = await response.json();
    return data.success ? (data.runs as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

// ============================================================================
// Codex and learn store (design-learn.md §7-8, D-53): codex payload per game,
// familiarity level and local learn progress. Learn data stays in localStorage.
// ============================================================================

export type { CodexEntry, CodexPayload, LearnLevel, Situation } from '../lib/codexMatch';
export type { LearnPrefs, LearnState, NudgeKey } from '../lib/learn';

export interface CodexSlice {
  /** `GET /api/codex` for the current game; null before it loads or if it failed. */
  codex: CodexPayload | null;
  codexStatus: 'idle' | 'loading' | 'ready' | 'error';
  learn: learnLib.LearnState;
  /** Entries no longer marked (learned or faded): pass to `match({ known, knownVersion })`. */
  codexKnown: Set<string>;
  codexKnownVersion: number;
  /** `I` key: marks hidden for this page session only (the saved level is unchanged). */
  codexMarksHidden: boolean;
  setLearnLevel: (level: LearnLevel) => void;
  /** The familiarity question was answered or skipped ("Take office" keeps the preselection). */
  markFamiliarityAsked: () => void;
  setLearnPref: <K extends keyof learnLib.LearnPrefs>(key: K, value: learnLib.LearnPrefs[K]) => void;
  toggleCodexMarks: (hidden?: boolean) => void;
  /** Entries rendered on a screen; returns the ids met for the first time. */
  noteCodexSeen: (ids: Iterable<string>, where: { title: string; date: string }) => string[];
  noteCodexOpened: (id: string, layer?: 1 | 2) => void;
  markCodexLearned: (id: string) => void;
  resetCodexLearned: () => void;
  clearCodexProgress: () => void;
  noteLearnNudge: (key: learnLib.NudgeKey) => void;
}

type SetState = (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void;

function createCodexSlice(set: SetState): CodexSlice {
  const initial = learnLib.noteSession(learnLib.loadLearn());
  learnLib.saveLearn(initial);
  /** Apply a learn update, persist it, and bump the known version when the known set changed. */
  const update = (fn: (l: learnLib.LearnState) => learnLib.LearnState) =>
    set((s) => {
      const learn = fn(s.learn);
      learnLib.saveLearn(learn);
      const known = learnLib.knownIds(learn);
      const same = known.size === s.codexKnown.size && [...known].every((id) => s.codexKnown.has(id));
      return same ? { learn } : { learn, codexKnown: known, codexKnownVersion: s.codexKnownVersion + 1 };
    });
  return {
    codex: null,
    codexStatus: 'idle',
    learn: initial,
    codexKnown: learnLib.knownIds(initial),
    codexKnownVersion: 0,
    codexMarksHidden: false,
    setLearnLevel: (level) => update((l) => learnLib.setLevel(l, level)),
    markFamiliarityAsked: () => update(learnLib.markAsked),
    setLearnPref: (key, value) => update((l) => learnLib.setPref(l, key, value)),
    toggleCodexMarks: (hidden) => set((s) => ({ codexMarksHidden: hidden ?? !s.codexMarksHidden })),
    noteCodexSeen: (ids, where) => {
      let met: string[] = [];
      update((l) => {
        const r = learnLib.noteSeen(l, ids, where);
        met = r.newlyMet;
        return r.state;
      });
      return met;
    },
    noteCodexOpened: (id, layer = 1) => update((l) => learnLib.noteOpened(l, id, layer)),
    markCodexLearned: (id) => update((l) => learnLib.markLearned(l, id)),
    resetCodexLearned: () => update(learnLib.resetLearned),
    clearCodexProgress: () => update(learnLib.clearProgress),
    noteLearnNudge: (key) => update((l) => learnLib.noteNudge(l, key)),
  };
}

/** Whether text gets underlines right now: Guide me, and not hidden with `I` (D-53). */
export function codexMarksOn(s: Pick<GameState, 'learn' | 'codexMarksHidden'>): boolean {
  return !s.codexMarksHidden && LEVEL_RULES[s.learn.level].marks;
}

let codexInFlight: string | null = null;

/**
 * Load the codex for a game once (new game, load). Failures leave `codex` null and the game
 * fully playable. The request carries only the scenario and flashpoint ids.
 */
export async function fetchCodex(scenarioId: string, flashpointId: string | null): Promise<void> {
  const current = useGameStore.getState().codex;
  const key = `${scenarioId}|${flashpointId ?? ''}`;
  if (current && `${current.scenarioId}|${current.flashpointId ?? ''}` === key) return;
  if (codexInFlight === key) return;
  codexInFlight = key;
  useGameStore.setState({ codexStatus: 'loading' });
  try {
    const params = new URLSearchParams();
    if (scenarioId) params.set('scenario', scenarioId);
    if (flashpointId) params.set('flashpoint', flashpointId);
    const response = await fetch(`${API_BASE}/codex?${params.toString()}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Codex unavailable');
    if (codexInFlight !== key) return; // a newer game asked for another codex meanwhile
    const payload = { ...(data as CodexPayload & { success?: true }) };
    delete payload.success;
    useGameStore.setState({ codex: payload, codexStatus: 'ready' });
  } catch {
    if (codexInFlight === key) useGameStore.setState({ codexStatus: 'error' });
  } finally {
    if (codexInFlight === key) codexInFlight = null;
  }
}

// Fetch the codex whenever a different game (scenario or flashpoint) is in the store
useGameStore.subscribe((s, prev) => {
  const w = s.worldState;
  if (!w) return;
  const p = prev.worldState;
  if (p && p.scenarioId === w.scenarioId && p.flashpointId === w.flashpointId && s.codex) return;
  void fetchCodex(w.scenarioId ?? '', w.flashpointId ?? null);
});

// Era map (title globe; WP-W3). Mirrors src/core/era-map.ts and the era fields
// of ScenarioSchema in src/core/data-loader.ts (types are duplicated, not shared).
// ============================================================================

export type SituationKind = 'WAR' | 'SEA' | 'REGIME' | 'NUCLEAR' | 'TRUCE';
export type SituationPhase = 'ACTIVE' | 'BREWING' | 'FROZEN';
export type BlocSide = 'WEST' | 'WEST2' | 'EAST' | 'EAST2' | 'NONALIGNED' | 'OTHER';
export type LngLat = [number, number];

export interface EraSituation {
  id: string;
  title: string;
  kind: SituationKind;
  phase: SituationPhase;
  at: LngLat;
  countries: string[];
  line?: { from: string; to: string; style: 'front' | 'rival' | 'blockade' };
  weight: number;
  blurb: string;
  since?: string;
  flashpointId?: string;
  codexId?: string;
  sources: string[];
}

export interface EraBloc {
  id: string;
  name: string;
  side: BlocSide;
  members: string[];
  note?: string;
}

export interface EraMapCountry {
  id: string;
  name: string;
  leader?: { name: string; title: string; sinceDate?: string };
  stability: number;
  bloc?: string;
  status: 'STATE' | 'PART_OF' | 'NOT_INDEPENDENT';
  partOf?: string;
  label?: string;
  note?: string;
  nuclear: string;
}

export interface EraMapLabel {
  at: LngLat;
  name: string;
  rank: number;
}

export interface EraMap {
  scenarioId: string;
  year: number;
  month: number;
  name: string;
  tension: number;
  focus: LngLat;
  countries: EraMapCountry[];
  blocs: EraBloc[];
  situations: EraSituation[];
  wars: Array<{ a: string; b: string }>;
  rivals: Array<{ a: string; b: string; relation: number }>;
  merged: Array<{ id: string; partOf: string }>;
  hotspots: Array<{ id: string; name: string; center: LngLat; phase: string }>;
  labels: EraMapLabel[];
  labelAllow?: string[];
}

const eraMapCache = new Map<string, Promise<EraMap>>();

/** The era map for a scenario, cached in memory per session (a failed fetch is retried next call). */
export function fetchEraMap(scenarioId: string): Promise<EraMap> {
  const hit = eraMapCache.get(scenarioId);
  if (hit) return hit;
  const p = fetch(`${API_BASE}/scenarios/${encodeURIComponent(scenarioId)}/map`)
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) throw new Error(data.error || 'Failed to fetch era map');
      return data.map as EraMap;
    });
  p.catch(() => eraMapCache.delete(scenarioId));
  eraMapCache.set(scenarioId, p);
  return p;
}
