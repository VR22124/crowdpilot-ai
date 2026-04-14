import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dashboard.css'
import App from './App.tsx'
import { HealthPage } from './pages/HealthPage'
import { DevPage } from './pages/DevPage'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const routedApp = normalizedPath === '/health' ? <HealthPage /> : normalizedPath === '/dev' ? <DevPage /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {routedApp}
  </StrictMode>,
)
