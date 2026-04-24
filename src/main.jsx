import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FitCheck from './FitCheck.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FitCheck />
  </StrictMode>,
)
