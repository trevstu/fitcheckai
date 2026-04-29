import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import FitCheck from './FitCheck.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FitCheck />
    <Analytics />
  </StrictMode>,
)
