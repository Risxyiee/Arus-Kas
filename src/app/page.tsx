'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/landing-page'
import '@/styles/landing.css'

export default function Home() {
  const [showApp, setShowApp] = useState(false)

  // Register/update service worker from landing page
  // This ensures SW gets updated even if arus.html is cached/broken
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
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
      <LandingPage onOpenApp={() => setShowApp(true)} />
    </div>
  )
}
