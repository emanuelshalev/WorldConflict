import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/feel.css'
import App from './App.tsx'

const Gallery = lazy(() => import('./scenes/Gallery'))
const gallery = /^#(scenes|clip|mapfx)/.test(window.location.hash)
// The reveal gallery: every end-of-session stage from a fixture (components/reveal/RevealDemo.tsx)
const RevealDemo = lazy(() => import('./components/reveal/RevealDemo'))
const revealDemo = /^#reveal-demo/.test(window.location.hash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {revealDemo ? (
      <Suspense fallback={null}>
        <RevealDemo />
      </Suspense>
    ) : gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
