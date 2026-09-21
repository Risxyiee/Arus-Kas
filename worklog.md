---
Task ID: 1
Agent: Main
Task: Build comprehensive Personal Finance Web App (FinTrack)

Work Log:
- Created Prisma schema with Transaction and Debt models, pushed to SQLite
- Installed jspdf and jspdf-autotable for PDF export
- Created auto-categorization utility with keyword-based category detection
- Created API routes: /api/transactions (GET/POST/DELETE), /api/debts (GET/POST/PUT/DELETE), /api/summary (GET), /api/categorize (POST)
- Built Zustand store for state management with CRUD operations and auto-refresh
- Built AppSidebar component with navigation, FinTrack branding, and theme toggle
- Built DashboardView with 5 summary cards and monthly cash flow BarChart (Recharts + shadcn/ui ChartContainer)
- Built TransactionView with add form, auto-categorization on blur, transaction history table with delete
- Built DebtsView with add form, Debts/Receivables tabs, settle/partial payment actions
- Built ReportsView with month filter, 3 data tables, PDF download with jspdf
- Updated layout.tsx with ThemeProvider from next-themes for dark mode
- Updated globals.css with emerald/green primary accent color
- Fixed date formatting errors by adding safeFormat/safeFormatDistance helpers
- Fixed Set.add vs Set.set bug in reports view
- Verified all 4 views work in Agent Browser
- Tested auto-categorization (Lunch at McDonalds → F&B, Expense)
- Tested dark mode toggle
- Verified responsive layout on mobile viewport
- Confirmed footer is sticky at bottom

Stage Summary:
- Full-featured Personal Finance Web App "FinTrack" is complete and running
- All 5 required features implemented: Dashboard, Transaction Entry + Auto-Categorization, Debt/Receivable Module, Reports + PDF Export, SaaS-style UI with Dark Mode
- Database schema: Transaction (amount, date, description, category, type) + Debt (personName, amount, paidAmount, dueDate, type, status)
- All API endpoints return 200, no runtime errors, lint passes cleanly
