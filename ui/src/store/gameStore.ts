import { create } from 'zustand';

export type TurnPhase = 'news' | 'briefing' | 'diplomacy' | 'military' | 'domestic' | 'confirm';

export interface CountryState {
  id: string;
  name: string;
  iso3: string;
  gdp: number;
  growthRate: number;
  militaryBudgetPercent: number;
  manpower: number;
  airpower: number;
  mobilizationLevel: number;
  stability: number;
  legitimacy: number;
  regimeType: string;
  relations: Record<string, number>;
  alliances: string[];
  atWarWith: string[];
  intelLevel: number;
  riskTolerance: number;
  debtGdpRatio: number;
}

export interface WorldState {
  turn: number;
  date: string;
  countries: CountryState[];
  wars: Array<{
    id: string;
    attackerId: string;
    defenderId: string;
    attackerProgress: number;
    defenderProgress: number;
  }>;
  globalTension: number;
  playerCountryId: string;
  newspaper: Array<{
    headline: string;
    content: string;
    category: string;
  }>;
}

export interface PendingAction {
  type: string;
  targetCountryId?: string;
  params?: Record<string, unknown>;
  preview?: ActionPreview;
}

export interface ActionPreview {
  effects: Array<{
    target: string;
    type: 'diplomatic' | 'economic' | 'military' | 'stability';
    change: number;
    description: string;
  }>;
  risks: string[];
  costs: { type: string; amount: number }[];
}

export interface GameState {
  isLoading: boolean;
  error: string | null;
  saveId: string | null;
  worldState: WorldState | null;
  selectedCountryId: string | null;
  activeModal: 'newGame' | 'saveLoad' | 'newspaper' | 'advisor' | 'actionPreview' | 'turnFeedback' | null;
  activeAdvisorRole: string | null;
  mapLayer: 'political' | 'military' | 'economic' | 'stability' | 'intelligence';
  debugMode: boolean;
  
  // Phase-based turn flow
  showSplash: boolean;
  currentPhase: TurnPhase;
  pendingActions: PendingAction[];
  lastTurnFeedback: Array<{ headline: string; effects: string[] }> | null;

  // LLM settings
  llmPermissionGranted: boolean;
  llmProvider: string | null;

  // Advisor chat history (persisted per advisor for game duration)
  advisorChatHistory: Record<string, Array<{ role: 'user' | 'advisor'; content: string; timestamp: string }>>;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setWorldState: (state: WorldState, saveId: string) => void;
  selectCountry: (countryId: string | null) => void;
  openModal: (modal: GameState['activeModal']) => void;
  closeModal: () => void;
  setAdvisorRole: (role: string | null) => void;
  setMapLayer: (layer: GameState['mapLayer']) => void;
  toggleDebugMode: () => void;
  reset: () => void;
  
  // Phase flow actions
  completeSplash: () => void;
  setPhase: (phase: TurnPhase) => void;
  advancePhase: () => void;
  addPendingAction: (action: PendingAction) => void;
  removePendingAction: (index: number) => void;
  clearPendingActions: () => void;
  setLastTurnFeedback: (feedback: GameState['lastTurnFeedback']) => void;

  // LLM actions
  setLLMPermission: (granted: boolean) => void;
  setLLMProvider: (provider: string | null) => void;

  // Advisor chat actions
  addAdvisorMessage: (advisorId: string, message: { role: 'user' | 'advisor'; content: string }) => void;
  clearAdvisorChat: (advisorId: string) => void;
}

const API_BASE = 'http://localhost:8080/api';

const PHASE_ORDER: TurnPhase[] = ['news', 'briefing', 'diplomacy', 'military', 'domestic', 'confirm'];

export const useGameStore = create<GameState>((set) => ({
  isLoading: false,
  error: null,
  saveId: null,
  worldState: null,
  selectedCountryId: null,
  activeModal: null,
  activeAdvisorRole: null,
  mapLayer: 'political',
  debugMode: new URLSearchParams(window.location.search).get('debug') === '1',
  
  // Phase-based turn flow
  showSplash: true,
  currentPhase: 'news',
  pendingActions: [],
  lastTurnFeedback: null,

  // LLM settings
  llmPermissionGranted: false,
  llmProvider: null,

  // Advisor chat history
  advisorChatHistory: {},

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setWorldState: (worldState, saveId) => set({ worldState, saveId, error: null }),
  selectCountry: (countryId) => set({ selectedCountryId: countryId }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, activeAdvisorRole: null }),
  setAdvisorRole: (role) => set({ activeAdvisorRole: role }),
  setMapLayer: (layer) => set({ mapLayer: layer }),
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  reset: () => set({
    isLoading: false,
    error: null,
    saveId: null,
    worldState: null,
    selectedCountryId: null,
    activeModal: null,
    activeAdvisorRole: null,
    currentPhase: 'news',
    pendingActions: [],
    lastTurnFeedback: null,
  }),
  
  // Phase flow actions
  completeSplash: () => set({ showSplash: false }),
  setPhase: (phase) => set({ currentPhase: phase }),
  advancePhase: () => set((state) => {
    const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      return { currentPhase: PHASE_ORDER[currentIndex + 1] };
    }
    return state;
  }),
  addPendingAction: (action) => set((state) => ({
    pendingActions: [...state.pendingActions, action]
  })),
  removePendingAction: (index) => set((state) => ({
    pendingActions: state.pendingActions.filter((_, i) => i !== index)
  })),
  clearPendingActions: () => set({ pendingActions: [] }),
  setLastTurnFeedback: (feedback) => set({ lastTurnFeedback: feedback }),

  // LLM actions
  setLLMPermission: (granted) => set({ llmPermissionGranted: granted }),
  setLLMProvider: (provider) => set({ llmProvider: provider }),

  // Advisor chat actions
  addAdvisorMessage: (advisorId, message) => set((state) => ({
    advisorChatHistory: {
      ...state.advisorChatHistory,
      [advisorId]: [
        ...(state.advisorChatHistory[advisorId] || []),
        { ...message, timestamp: new Date().toISOString() },
      ],
    },
  })),
  clearAdvisorChat: (advisorId) => set((state) => ({
    advisorChatHistory: {
      ...state.advisorChatHistory,
      [advisorId]: [],
    },
  })),
}));

export async function createNewGame(
  scenarioId: string,
  playerCountryId: string,
  saveName?: string
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

    if (!data.success) {
      throw new Error(data.error || 'Failed to create game');
    }

    store.setWorldState(data.worldState, data.saveId);
    store.closeModal();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to create game');
  } finally {
    store.setLoading(false);
  }
}

export async function executeTurn(playerActions: Array<{ type: string; targetCountryId?: string }>): Promise<void> {
  const store = useGameStore.getState();
  const { saveId } = store;

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
      body: JSON.stringify({ saveId, playerActions }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to execute turn');
    }

    console.log('[Turn] Before:', store.worldState?.turn, 'After:', data.worldState.turn);
    console.log('[Turn] Date:', data.worldState.date, 'Tension:', data.worldState.globalTension);
    
    // Create a new object reference to ensure React detects the change
    const newWorldState = { ...data.worldState };
    store.setWorldState(newWorldState, saveId);

    // Generate turn feedback from newspaper headlines
    const feedback = newWorldState.newspaper?.map((entry: { headline: string; content: string }) => ({
      headline: entry.headline,
      effects: [entry.content]
    })) || [];
    store.setLastTurnFeedback(feedback);

    // Clear pending actions and reset to news phase for next turn
    store.clearPendingActions();
    store.setPhase('news');
    
    // Show newspaper at START of next turn (showing events from the turn that just ended)
    store.openModal('newspaper');
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to execute turn');
  } finally {
    store.setLoading(false);
  }
}

export async function loadGame(saveId: string): Promise<void> {
  const store = useGameStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const response = await fetch(`${API_BASE}/load/${saveId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load game');
    }

    store.setWorldState(data.worldState, data.saveId);
    store.closeModal();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Failed to load game');
  } finally {
    store.setLoading(false);
  }
}

export async function fetchSaves(): Promise<Array<{ id: string; name: string; turn: number; playerCountry: string }>> {
  const response = await fetch(`${API_BASE}/saves`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch saves');
  }

  return data.saves;
}
