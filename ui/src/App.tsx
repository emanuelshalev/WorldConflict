import './App.css'
import './styles/wc.css'
import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { MapView } from './components/MapView'
import { SaveLoadModal } from './components/SaveLoadModal'
import { AdvisorModal } from './components/AdvisorModal'
import { ActionPreviewModal } from './components/ActionPreviewModal'
import { BackstoryModal } from './components/BackstoryModal'
import { SettingsModal } from './components/SettingsModal'
import { LoginScreen } from './components/LoginScreen'
import { TitleScreen } from './components/TitleScreen'
import { Hud } from './components/Hud'
import { Desk } from './components/Desk'
import { Drawers } from './components/Drawers'
import { Chronicle, DangerVignette, Stinger } from './components/Chronicle'
import { EndScreen } from './components/EndScreen'
import { useGameStore, usePlayerCountry } from './store/gameStore'

function ObjectiveChip() {
  const world = useGameStore((s) => s.worldState)
  const status = useGameStore((s) => s.objectiveStatus)
  const [open, setOpen] = useState(() => window.innerWidth > 900)
  if (!world?.objective) return null
  const primary = status.filter((s) => !s.bonus)
  return (
    <button
      className={`objective-chip ${open ? '' : 'collapsed'}`}
      onClick={() => setOpen((v) => !v)}
      style={{ textAlign: 'left', color: 'inherit' }}
      title={open ? 'Collapse' : 'Show mission'}
    >
      <div className="ttl">
        <span>◎ {world.objective.title}</span>
        <span className="num" style={{ color: 'var(--text-3)' }}>
          {world.maxTurns - world.turn} mo left
        </span>
      </div>
      <ul>
        {(primary.length ? primary : status.slice(0, 2)).map((c) => (
          <li key={c.label} className={c.failed ? 'failed' : c.met ? 'met' : ''}>
            {c.failed ? '✗' : c.met ? '✓' : '○'} {c.label}
          </li>
        ))}
        {primary.length === 0 && status.length === 0 && <li>Stay in power until the end.</li>}
      </ul>
    </button>
  )
}

function Ticker() {
  const world = useGameStore((s) => s.worldState)
  const me = usePlayerCountry()
  if (!world || world.newspaper.length === 0) return null
  return (
    <div className="ticker" aria-hidden>
      <div className="tag">LIVE</div>
      <div className="track">
        {world.newspaper.map((n, i) => (
          <span key={`${n.headline}-${i}`} className={me && n.relatedCountries.includes(me.id) ? 'mine' : ''}>
            ◆ {n.headline}
          </span>
        ))}
      </div>
    </div>
  )
}

function Toast() {
  const error = useGameStore((s) => s.error)
  const setError = useGameStore((s) => s.setError)
  if (!error) return null
  return (
    <div className="toast error" role="alert">
      {error}
      <button className="wc-btn ghost" style={{ padding: 4 }} onClick={() => setError(null)} aria-label="Dismiss">
        <IconX size={14} />
      </button>
    </div>
  )
}

function App() {
  const screen = useGameStore((s) => s.screen)
  const showLogin = useGameStore((s) => s.showLogin)
  const isLoading = useGameStore((s) => s.isLoading)

  return (
    <>
      {screen === 'title' ? (
        <TitleScreen />
      ) : (
        <div className="game">
          <Hud />
          <div className="map-stage">
            <MapView />
            <ObjectiveChip />
            <Ticker />
          </div>
          <Desk />
        </div>
      )}

      <Drawers />
      <SaveLoadModal />
      <AdvisorModal />
      <ActionPreviewModal />
      <SettingsModal />
      {screen === 'game' && (
        <>
          <BackstoryModal />
          <Chronicle />
          <Stinger />
          <DangerVignette />
          <EndScreen />
        </>
      )}
      {showLogin && <LoginScreen onClose={() => useGameStore.setState({ showLogin: false })} />}
      {isLoading && screen === 'game' && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <Toast />
    </>
  )
}

export default App
