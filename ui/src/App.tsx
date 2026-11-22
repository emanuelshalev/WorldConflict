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
import { GoalLine } from './components/desk/GoalLine'
import { ScoreWhySheet } from './components/ScoreWhy'
import { MomentGallery } from './components/MomentGallery'
import { useScoreWhy } from './lib/scoreWhy'
import { Explainer } from './components/learn/Explainer'
import { SituationBriefing } from './components/learn/SituationBriefing'

function Ticker() {
  const world = useGameStore((s) => s.worldState)
  const show = useGameStore((s) => s.showTicker)
  const setShow = useGameStore((s) => s.setShowTicker)
  const me = usePlayerCountry()
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [at, setAt] = useState(0)
  if (!world || !show) return null
  const news = world.newspaper.length
    ? world.newspaper
    : [{ headline: 'No news yet: the first headlines arrive after your first month', relatedCountries: [] as string[] }]
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

/** Global keys: M switches Map and Desk, N shows or hides the news ticker, I hides the codex underlines for this session. */
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
      else if (e.key === 'i' || e.key === 'I') s.toggleCodexMarks()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}

/** The turn boundary: an "Orders sent" stamp and the calendar flipping to next month. */
function TurnStamp() {
  const world = useGameStore((s) => s.worldState)
  if (!world) return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
    </div>
  )
  const [y, m] = world.date.split('-').map(Number)
  const next = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1))
  const label = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()
  return (
    <div className="loading-overlay turn-stamp" role="status" aria-live="polite">
      <div className="ts-card">
        <span className="ts-stamp">Orders sent</span>
        <div className="ts-flip num">
          <span className="ts-from">{label(new Date(Date.UTC(y, m - 1, 1)))}</span>
          <span className="ts-to">{label(next)}</span>
        </div>
        <small>The world answers…</small>
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

/** Escape closes the topmost layer: modal, then Chronicle, then drawer, then dossier. */
function useEscapeToClose() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const s = useGameStore.getState()
      if (useScoreWhy.getState().open) useScoreWhy.getState().show(false)
      else if (s.showLogin) useGameStore.setState({ showLogin: false })
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
  if (window.location.hash === '#moments') return <MomentGallery />

  return (
    <>
      {screen === 'title' ? (
        <TitleScreen />
      ) : (
        <div className={`game mode-${gameOver ? 'map' : deskMode}`}>
          <div className="game-top">
            <Hud />
            <GoalLine />
          </div>
          <div className="game-body">
            <div className="map-stage">
              <MapView />
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
          <ScoreWhySheet />
          <Stinger />
          <DangerVignette />
          <EndScreen />
        </>
      )}
      {showLogin && <LoginScreen onClose={() => useGameStore.setState({ showLogin: false })} />}
      {isLoading && screen === 'game' && (
        <TurnStamp />
      )}
      <SituationBriefing />
      <Explainer />
      <Toast />
    </>
  )
}

export default App
