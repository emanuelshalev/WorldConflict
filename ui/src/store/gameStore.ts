import { create } from 'zustand';
import { pcCost } from '../lib/actions';

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
}

export interface Objective {
  title: string;
  briefing: string;
  primary: ObjectiveCondition[];
  bonus: ObjectiveCondition[];
  par: number;
  debrief: string;
}

export interface ConditionStatus {
  label: string;
  met: boolean;
  failed: boolean;
  bonus: boolean;
}

export interface TurnReport {
  turn: number;
  orders: Array<{
    label: string;
    ok: boolean;
    detail: string;
    type?: string;
    target?: string;
    story?: string;
    facts?: Array<{ label: string; before: number; after: number; unit?: string; good?: boolean }>;
  }>;
  decisions: Array<{ title: string; choice: string; templateId?: string }>;
  deltas: Record<string, { before: number; after: number }>;
  causes: string[];
  moments: string[];
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

export interface WorldState {
  turn: number;
  date: string;
  scenarioId: string;
  mode: GameMode;
  difficulty: Difficulty;
  maxTurns: number;
  flashpointId: string | null;
  objective: Objective | null;
  politicalCapital: number;
  director: { closeCalls: number; rallies: number; inDanger: boolean; lowPoint: number; record?: Record<string, number>; counterIntelUntil?: number; denounceTurns?: number[]; ledger?: Record<string, Array<{ turn: number; value: number; target?: string }>> };
  turnReport: TurnReport | null;
  outcome: Outcome | null;
  pendingDecisions: PendingDecision[];
  agenda?: Meeting[];
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
  missionWarning?: string | null;
}

export interface PendingAction {
  type: string;
  label: string;
  targetCountryId?: string;
  value?: number;
  params?: Record<string, unknown>;
  preview?: ActionPreview;
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

export interface GameState {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  guestId: string;
  objectiveStatus: ConditionStatus[];
  aiTotalUsage: UsageTotals | null;
  aiTurnUsage: UsageTotals | null;
  aiNotice: string | null;
  leaderStatements: LeaderStatement[];
  lastEvents: Array<{ id: string; title: string; description: string; severity: string; type: string; affectedCountries: string[] }>;
  showChronicle: boolean;
  setShowChronicle: (show: boolean) => void;
  showLogin: boolean;
  isDaily: boolean;
  drawer: 'cabinet' | 'world' | 'chronicle' | 'objective' | null;
  setDrawer: (drawer: GameState['drawer']) => void;
  isLoading: boolean;
  error: string | null;
  player: PlayerAccount | null;
  setPlayer: (player: PlayerAccount | null) => void;
  saveId: string | null;
  worldState: WorldState | null;
  playerView: PlayerViewCountry[];
  pendingDecisions: PendingDecision[];
  decisionChoices: Record<string, string>; // decisionId (or meeting id) → optionId
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
  clearPendingActions: () => void;

  setLLMPermission: (granted: boolean) => void;
  setLLMProvider: (provider: string | null) => void;
  addAdvisorMessage: (advisorId: string, message: { role: 'user' | 'advisor'; content: string }) => void;
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

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

function loadGuestId(): string {
  try {
    const existing = localStorage.getItem('worldconflict.guest');
    if (existing) return existing;
    const id = `guest-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    localStorage.setItem('worldconflict.guest', id);
    return id;
  } catch {
    return `guest-${Math.random().toString(36).slice(2)}`;
  }
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

export const useGameStore = create<GameState>((set) => ({
  screen: 'title',
  setScreen: (screen) => set({ screen }),
  guestId: loadGuestId(),
  objectiveStatus: [],
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
  setError: (error) => set({ error }),
  applyServerPayload: (data, saveId) =>
    set({
      objectiveStatus: (data.objectiveStatus as ConditionStatus[]) ?? [],
      worldState: data.worldState as WorldState,
      playerView: (data.playerView as PlayerViewCountry[]) ?? [],
      pendingDecisions: (data.pendingDecisions as PendingDecision[]) ?? [],
      score: (data.score as Score) ?? null,
      gameOver: (data.gameOver as GameOver) ?? null,
      playerBackstory: (data.playerBackstory as string) ?? '',
      saveId,
      decisionChoices: {},
      error: null,
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
      activeModal: null,
      activeAdvisorRole: null,
      currentPhase: 'news',
      pendingActions: [],
      lastTurnFeedback: null,
      advisorChatHistory: {},
      screen: 'title',
      showChronicle: false,
      objectiveStatus: [],
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
    set((state) => ({ decisionChoices: { ...state.decisionChoices, [decisionId]: optionId } })),
  // Same rules as the engine (turn.ts): one of each order per target, at most 6 a month
  addPendingAction: (action) =>
    set((state) => {
      if (state.pendingActions.some((a) => orderKey(a) === orderKey(action)))
        return { error: `"${action.label}" is already on your desk this month` };
      if (state.pendingActions.length >= 6) return { error: 'At most 6 orders a month' };
      return { pendingActions: [...state.pendingActions, action] };
    }),
  removePendingAction: (index) =>
    set((state) => ({ pendingActions: state.pendingActions.filter((_, i) => i !== index) })),
  clearPendingActions: () => set({ pendingActions: [] }),

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
        playerActions: pendingActions.map((a) => ({
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
  return Math.max(0, world.politicalCapital + crisisPc + meetingPc) - state.pendingActions.reduce((s, a) => s + pcCost(a.type), 0);
}

/** The key the engine uses for "one of each order per target" (turn.ts). */
export function orderKey(a: Pick<PendingAction, 'type' | 'targetCountryId' | 'params'>): string {
  return `${a.type}:${a.targetCountryId ?? ''}:${String(a.params?.targetType ?? a.params?.tactic ?? '')}`;
}

/**
 * Queue an order exactly as the desk does: confirm a nuclear strike, check political capital,
 * fetch the server preview, refuse a blocked order, confirm a mission warning, then add it
 * (the store still refuses duplicates and a 7th order). Resolves true when the order was queued.
 * Used by the desk and by the map's action menu so both paths behave identically.
 */
export async function queueOrder(a: PendingAction): Promise<boolean> {
  const store = useGameStore.getState();
  if (
    a.type === 'NUCLEAR_STRIKE' &&
    !window.confirm(
      `${a.label}?\n\nThis cannot be undone. Hundreds of thousands will die, the world will embargo you, and retaliation may end everything.`,
    )
  )
    return false;
  if (pcCost(a.type) > capitalLeft(store)) {
    store.setError(`Not enough political capital for "${a.label}" (${pcCost(a.type)} needed)`);
    return false;
  }
  const preview = await fetchPreview({ type: a.type, targetCountryId: a.targetCountryId, value: a.value, params: a.params });
  if (preview?.blocked) {
    useGameStore.getState().setError(preview.blocked);
    return false;
  }
  if (preview?.missionWarning && !window.confirm(`${preview.missionWarning}\n\nGive the order "${a.label}" anyway?`)) return false;
  const before = useGameStore.getState().pendingActions.length;
  useGameStore.getState().addPendingAction({ ...a, preview: preview ?? undefined });
  return useGameStore.getState().pendingActions.length > before;
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

export async function fetchSaves(): Promise<
  Array<{ id: string; name: string; turn: number; playerCountry: string; leaderName?: string }>
> {
  const query = `?playerId=${encodeURIComponent(ownerId())}`;
  const response = await fetch(`${API_BASE}/saves${query}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch saves');
  return data.saves;
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
