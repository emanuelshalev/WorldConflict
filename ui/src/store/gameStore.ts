import { create } from 'zustand';

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
  insurgencyLevel: string;
  policingTactic: string;
  nuclear: { status: string; progress: number; funded: boolean; warheads: number };
  borderDeployments: Array<{ targetCountryId: string; troops: number }>;
  underGlobalEmbargo: boolean;
  leader: Leader;
  politicalSystem: PoliticalSystem;
  history: HistoryProfile;
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
}

export interface PendingDecision {
  id: string;
  turn: number;
  title: string;
  situation: string;
  affectedCountries: string[];
  options: DecisionOption[];
  deadlineTurn: number;
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
  affordable: boolean;
  successChance: number | null;
  effects: PreviewEffect[];
  risks: string[];
  blocked: string | null;
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
}

export interface TurnFeedback {
  resolved: Array<{ type: string; targetCountryId?: string }>;
  rejected: Array<{ action: { type: string; targetCountryId?: string }; reason: string }>;
  governmentChanges: Array<{ countryId: string; kind: string; description: string }>;
}

// ============================================================================
// Store
// ============================================================================

export interface GameState {
  isLoading: boolean;
  error: string | null;
  saveId: string | null;
  worldState: WorldState | null;
  playerView: PlayerViewCountry[];
  pendingDecisions: PendingDecision[];
  decisionChoices: Record<string, string>; // decisionId → optionId
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
    | null;
  activeAdvisorRole: string | null;
  mapLayer: 'political' | 'military' | 'economic' | 'stability' | 'intelligence' | 'nuclear';
  debugMode: boolean;

  showSplash: boolean;
  currentPhase: TurnPhase;
  pendingActions: PendingAction[];
  lastTurnFeedback: TurnFeedback | null;

  llmPermissionGranted: boolean;
  llmProvider: string | null;
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

const API_BASE = 'http://localhost:8080/api';

export const PHASE_ORDER: TurnPhase[] = ['news', 'briefing', 'diplomacy', 'military', 'domestic', 'confirm'];

export const PHASE_LABELS: Record<TurnPhase, string> = {
  news: 'News',
  briefing: 'Briefing',
  diplomacy: 'Diplomacy',
  military: 'Military',
  domestic: 'Domestic',
  confirm: 'Confirm',
};

export const useGameStore = create<GameState>((set) => ({
  isLoading: false,
  error: null,
  saveId: null,
  worldState: null,
  playerView: [],
  pendingDecisions: [],
  decisionChoices: {},
  score: null,
  gameOver: null,
  playerBackstory: '',
  showBackstory: false,
  endReport: null,

  selectedCountryId: null,
  activeModal: null,
  activeAdvisorRole: null,
  mapLayer: 'political',
  debugMode: new URLSearchParams(window.location.search).get('debug') === '1',

  showSplash: true,
  currentPhase: 'news',
  pendingActions: [],
  lastTurnFeedback: null,

  llmPermissionGranted: false,
  llmProvider: null,
  advisorChatHistory: {},

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  applyServerPayload: (data, saveId) =>
    set({
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
  addPendingAction: (action) =>
    set((state) => ({ pendingActions: [...state.pendingActions, action] })),
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

export async function fetchScenarios(): Promise<
  Array<{ id: string; name: string; description: string; startYear: number }>
> {
  const response = await fetch(`${API_BASE}/scenarios`);
  const data = await response.json();
  return data.success ? data.scenarios : [];
}

export async function createNewGame(
  scenarioId: string,
  playerCountryId: string,
  saveName?: string,
): Promise<void> {
  const store = useGameStore.getState();
  store.setLoading(true);
  store.setError(null);
  try {
    const response = await fetch(`${API_BASE}/new-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, playerCountryId, saveName }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create game');
    store.applyServerPayload(data, data.saveId);
    useGameStore.setState({ showBackstory: true, currentPhase: 'briefing', endReport: null });
    store.closeModal();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to create game');
  } finally {
    store.setLoading(false);
  }
}

export async function executeTurn(): Promise<void> {
  const store = useGameStore.getState();
  const { saveId, pendingActions, decisionChoices } = store;
  if (!saveId) {
    store.setError('No active game');
    return;
  }
  store.setLoading(true);
  store.setError(null);
  try {
    const response = await fetch(`${API_BASE}/turn`, {
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
      }),
    });
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
      activeModal: 'newspaper',
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
    useGameStore.setState({ currentPhase: 'briefing', endReport: null });
    store.closeModal();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to load game');
  } finally {
    store.setLoading(false);
  }
}

export async function fetchSaves(): Promise<
  Array<{ id: string; name: string; turn: number; playerCountry: string }>
> {
  const response = await fetch(`${API_BASE}/saves`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch saves');
  return data.saves;
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
