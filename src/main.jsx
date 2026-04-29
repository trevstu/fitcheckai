import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import FitCheck from './FitCheck.jsx'
import Waitlist from './Waitlist.jsx'

function App() {
  const [admitted, setAdmitted] = useState(() => !!localStorage.getItem('styld_email'))

  const handleJoin = (email) => {
    localStorage.setItem('styld_email', email)
    setAdmitted(true)
  }

  return admitted ? <FitCheck /> : <Waitlist onJoin={handleJoin} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
