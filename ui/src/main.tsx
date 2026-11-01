import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const Gallery = lazy(() => import('./scenes/Gallery'))
const gallery = /^#(scenes|clip)/.test(window.location.hash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
