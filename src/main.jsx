import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import FitCheck from './FitCheck.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FitCheck />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
