import './App.css'
import './styles/wc.css'
import { useEffect, useState } from 'react'
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
import { CommandStrip } from './components/desk/CommandRail'
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
            {/score/i.test(c.label) && (
              <span className="num" style={{ color: c.met ? 'var(--good)' : 'var(--accent)' }}>
                {' '}· now {world.score?.total ?? 0}
              </span>
            )}
          </li>
        ))}
        {primary.length === 0 && status.length === 0 && <li>Stay in power until the end.</li>}
      </ul>
    </button>
  )
}

function Ticker() {
  const world = useGameStore((s) => s.worldState)
  const show = useGameStore((s) => s.showTicker)
  const setShow = useGameStore((s) => s.setShowTicker)
  const me = usePlayerCountry()
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [at, setAt] = useState(0)
  if (!world || world.newspaper.length === 0 || !show) return null
  const news = world.newspaper
  const mine = (n: (typeof news)[number]) => (me && n.relatedCountries.includes(me.id) ? 'mine' : '')
  const one = news[at % news.length]
  return (
    <div className="ticker" role="region" aria-label="News ticker">
      <div className="tag">LIVE</div>
      {reduced ? (
        <div className="still">
          <button className="ticker-btn" onClick={() => setAt((a) => (a + news.length - 1) % news.length)} aria-label="Previous headline">‹</button>
          <span className={mine(one)}>{one.headline}</span>
          <button className="ticker-btn" onClick={() => setAt((a) => a + 1)} aria-label="Next headline">›</button>
        </div>
      ) : (
        <div className="track-wrap" aria-hidden>
          <div className="track">
            {news.map((n, i) => (
              <span key={`${n.headline}-${i}`} className={mine(n)}>
                ◆ {n.headline}
              </span>
            ))}
          </div>
        </div>
      )}
      <button className="ticker-hide" onClick={() => setShow(false)} title="Hide the news ticker (N)">
        Hide
      </button>
    </div>
  )
}

/** Global keys: M switches Map and Desk, N shows or hides the news ticker. */
function useModeKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const s = useGameStore.getState()
      if (s.screen !== 'game' || s.activeModal || s.showChronicle) return
      if (e.key === 'm' || e.key === 'M') s.setDeskMode(s.deskMode === 'map' ? 'desk' : 'map')
      else if (e.key === 'n' || e.key === 'N') s.setShowTicker(!s.showTicker)
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
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

/** Escape closes the topmost layer: modal, then Chronicle, then drawer, then dossier. */
function useEscapeToClose() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const s = useGameStore.getState()
      if (s.showLogin) useGameStore.setState({ showLogin: false })
      else if (s.activeModal === 'actionPreview') {
        // Same as the backdrop: a blocked order never stays queued
        const last = s.pendingActions.length - 1
        if (last >= 0 && s.pendingActions[last].preview?.blocked) s.removePendingAction(last)
        s.closeModal()
      } else if (s.activeModal && s.activeModal !== 'endGame') s.closeModal()
      else if (s.showChronicle) {
        s.setShowChronicle(false)
        if (s.gameOver) s.openModal('endGame')
      }
      else if (s.drawer) s.setDrawer(null)
      else if (s.showBackstory) s.dismissBackstory()
      else if (s.selectedCountryId) s.selectCountry(null)
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}

function App() {
  useEscapeToClose()
  useModeKeys()
  const screen = useGameStore((s) => s.screen)
  const deskMode = useGameStore((s) => s.deskMode)
  const gameOver = useGameStore((s) => s.gameOver)
  const showLogin = useGameStore((s) => s.showLogin)
  const isLoading = useGameStore((s) => s.isLoading)

  return (
    <>
      {screen === 'title' ? (
        <TitleScreen />
      ) : (
        <div className={`game mode-${gameOver ? 'map' : deskMode}`}>
          <Hud />
          <div className="game-body">
            <div className="map-stage">
              <MapView />
              <ObjectiveChip />
            </div>
            {(deskMode === 'map' || gameOver) && !gameOver && <CommandStrip />}
            <Desk />
          </div>
          <Ticker />
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
