"use client";

import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardView } from "@/components/views/dashboard-view";
import { TransactionView } from "@/components/views/transaction-view";
import { DebtsView } from "@/components/views/debts-view";
import { ReportsView } from "@/components/views/reports-view";
import { useAppStore } from "@/lib/store";

function ActiveView() {
  const { activeView } = useAppStore();

  switch (activeView) {
    case "dashboard":
      return <DashboardView />;
    case "transactions":
      return <TransactionView />;
    case "debts":
      return <DebtsView />;
    case "reports":
      return <ReportsView />;
    default:
      return <DashboardView />;
  }
}

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  debts: "Debts & Receivables",
  reports: "Reports",
};

export default function Home() {
  const { activeView, refreshAll } = useAppStore();

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {VIEW_TITLES[activeView] ?? "Dashboard"}
          </span>
        </header>
        <div className="flex-1">
          <ActiveView />
        </div>
        <footer className="mt-auto border-t px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>FinTrack — Personal Finance Tracker</span>
            <span>Built with Next.js & shadcn/ui</span>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
