'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/landing-page'
import '@/styles/landing.css'

export default function Home() {
  const [showApp, setShowApp] = useState(false)
  const [configStatus, setConfigStatus] = useState<'checking' | 'ok' | 'needs-setup'>('checking')

  useEffect(() => {
    // Check if Supabase is configured by hitting the API
    fetch('/api/')
      .then(r => r.json())
      .then(data => {
        if (data.setup) {
          setConfigStatus('needs-setup')
        } else {
          setConfigStatus('ok')
        }
      })
      .catch(() => {
        setConfigStatus('ok') // Don't block on network error
      })
  }, [])

  if (showApp) {
    return (
      <iframe
        src="/arus.html"
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
        title="Arus — Keuangan Pribadi"
      />
    )
  }

  return (
    <div className="lp" style={{ position: 'relative' }}>
      {configStatus === 'needs-setup' && (
        <div style={{
          background: '#FEF3C7',
          borderBottom: '1px solid #F59E0B',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          color: '#92400E',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Supabase belum dikonfigurasi.</strong> Login &amp; sinkronisasi cloud tidak akan berfungsi.
            <a href="/setup" style={{ color: '#92400E', fontWeight: 700, textDecoration: 'underline', marginLeft: 8 }}>
              Setup Sekarang →
            </a>
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Atau tambahkan NEXT_PUBLIC_SUPABASE_ANON_KEY di file .env
            </span>
          </div>
          <button
            onClick={() => setConfigStatus('ok')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: '#92400E',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}
      <LandingPage onOpenApp={() => setShowApp(true)} />
    </div>
  )
}
