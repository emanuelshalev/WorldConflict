import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/feel.css'
import './styles/learn.css'
import App from './App.tsx'
// After App: the iteration 2 layout fixes win over the older rules (same specificity)
import './styles/ease.css'

const Gallery = lazy(() => import('./scenes/Gallery'))
const OrdersGallery = lazy(() => import('./components/orders/OrdersGallery'))
const gallery = /^#(scenes|clip|mapfx)/.test(window.location.hash)
// The reveal gallery: every end-of-session stage from a fixture (components/reveal/RevealDemo.tsx)
const RevealDemo = lazy(() => import('./components/reveal/RevealDemo'))
const revealDemo = /^#reveal-demo/.test(window.location.hash)
const ordersGallery = /^#orders/.test(window.location.hash)

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
    ) : ordersGallery ? (
      <Suspense fallback={null}>
        <OrdersGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
