import { create } from 'zustand';

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

export interface GameState {
  isLoading: boolean;
  error: string | null;
  saveId: string | null;
  worldState: WorldState | null;
  selectedCountryId: string | null;
  activeModal: 'newGame' | 'saveLoad' | 'newspaper' | 'advisor' | null;
  activeAdvisorRole: string | null;
  mapLayer: 'political' | 'military' | 'economic' | 'stability' | 'intelligence';
  debugMode: boolean;

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
}

const API_BASE = 'http://localhost:8080/api';

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
  }),
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

    store.setWorldState(data.worldState, saveId);

    if (data.newspaper && data.newspaper.length > 0) {
      store.openModal('newspaper');
    }
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
