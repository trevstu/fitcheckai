import { useState } from 'react'
import { supabase } from './supabase'

export default function Waitlist({ onJoin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setError('Enter a valid email.'); return }
    setLoading(true); setError(null)
    const { error: sbError } = await supabase.from('waitlist').insert({ email: trimmed })
    if (sbError && sbError.code !== '23505') {
      setError('Something went wrong — try again.'); setLoading(false); return
    }
    setDone(true); setLoading(false)
    setTimeout(() => onJoin(trimmed), 1800)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','SF Pro Display',-apple-system,Helvetica,sans-serif", padding: '24px' }}>
      <style>{`
        @keyframes wl-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .wl-fade { animation: wl-fade 0.5s ease forwards; }
        .wl-input:focus { outline: none; border-color: #8B5CF6 !important; }
        .wl-input::placeholder { color: #A1A1AA; }
        .wl-btn:hover { opacity: 0.85; }
      `}</style>

      {done ? (
        <div className="wl-fade" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', marginBottom: 12 }}>You're in.</div>
          <div style={{ fontSize: 15, color: '#71717A', fontWeight: 400 }}>Taking you to STYLD now…</div>
        </div>
      ) : (
        <div className="wl-fade" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', marginBottom: 12 }}>STYLD</div>
          <div style={{ fontSize: 15, color: '#71717A', fontWeight: 400, lineHeight: 1.6, marginBottom: 40 }}>
            Your AI personal stylist.<br />Get early access.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="wl-input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="your@email.com"
              style={{ flex: 1, padding: '13px 20px', border: '1px solid #E4E4E7', background: '#FFFFFF', fontSize: 14, fontWeight: 400, color: '#0A0A0A', borderRadius: 26, transition: 'border-color 0.25s', fontFamily: 'inherit' }}
            />
            <button
              onClick={submit}
              disabled={loading}
              className="wl-btn"
              style={{ padding: '13px 22px', background: '#6D28D9', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', borderRadius: 26, opacity: loading ? 0.6 : 1, transition: 'opacity 0.25s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {loading ? '…' : 'Join'}
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
