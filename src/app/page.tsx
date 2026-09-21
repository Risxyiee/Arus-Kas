'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/landing-page'
import '@/styles/landing.css'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardView } from '@/components/views/dashboard-view'
import { TransactionView } from '@/components/views/transaction-view'
import { DebtsView } from '@/components/views/debts-view'
import { ReportsView } from '@/components/views/reports-view'
import { useAppStore } from '@/lib/store'

function AppDashboard({ onBack }: { onBack: () => void }) {
  const { activeView } = useAppStore()

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← Kembali ke Beranda
            </button>
          </div>
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'transactions' && <TransactionView />}
          {activeView === 'debts' && <DebtsView />}
          {activeView === 'reports' && <ReportsView />}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default function Home() {
  const [showApp, setShowApp] = useState(false)
  const { refreshAll } = useAppStore()

  useEffect(() => {
    if (showApp) {
      refreshAll()
    }
  }, [showApp, refreshAll])

  if (showApp) {
    return (
      <div className="flex min-h-screen">
        <AppDashboard onBack={() => setShowApp(false)} />
      </div>
    )
  }

  return (
    <div className="lp">
      <LandingPage onOpenApp={() => setShowApp(true)} />
    </div>
  )
}
