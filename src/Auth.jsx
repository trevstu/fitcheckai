import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','SF Pro Display',-apple-system,Helvetica,sans-serif", padding: '24px' }}>
      <style>{`
        @keyframes auth-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .auth-fade { animation: auth-fade 0.5s ease forwards; }
        .google-btn:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1) !important; }
      `}</style>

      <div className="auth-fade" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', marginBottom: 10 }}>STYLD</div>
        <div style={{ fontSize: 15, color: '#71717A', fontWeight: 400, lineHeight: 1.6, marginBottom: 48 }}>Your AI personal stylist.</div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="google-btn"
          style={{ width: '100%', padding: '14px 20px', background: '#FFFFFF', color: '#0A0A0A', border: '1px solid #E4E4E7', borderRadius: 14, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'box-shadow 0.2s', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  )
}
