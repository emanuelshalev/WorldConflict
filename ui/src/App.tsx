import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MapView } from './components/MapView'
import { NewGameModal } from './components/NewGameModal'
import { SaveLoadModal } from './components/SaveLoadModal'
import { AdvisorModal } from './components/AdvisorModal'
import { NewspaperModal } from './components/NewspaperModal'
import { SplashScreen } from './components/SplashScreen'
import { ActionPreviewModal } from './components/ActionPreviewModal'
import { TurnFeedbackModal } from './components/TurnFeedbackModal'
import { CrisisDecisionModal } from './components/CrisisDecisionModal'
import { BackstoryModal } from './components/BackstoryModal'
import { EndGameReport } from './components/EndGameReport'
import { useGameStore } from './store/gameStore'

function App() {
  const { error, isLoading, showSplash, completeSplash } = useGameStore()

  if (showSplash) {
    return <SplashScreen onComplete={completeSplash} />
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <MapView />
        <Sidebar />
      </main>

      <NewGameModal />
      <SaveLoadModal />
      <AdvisorModal />
      <NewspaperModal />
      <ActionPreviewModal />
      <TurnFeedbackModal />
      <CrisisDecisionModal />
      <BackstoryModal />
      <EndGameReport />

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {error && (
        <div className="error-toast">
          {error}
          <button onClick={() => useGameStore.getState().setError(null)}>×</button>
        </div>
      )}
    </div>
  )
}

export default App
