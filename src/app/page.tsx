'use client'

import { useState } from 'react'
import LandingPage from '@/components/landing-page'
import '@/styles/landing.css'

export default function Home() {
  const [showApp, setShowApp] = useState(false)

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
    <div className="lp">
      <LandingPage onOpenApp={() => setShowApp(true)} />
    </div>
  )
}
