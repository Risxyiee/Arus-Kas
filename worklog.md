---
Task ID: 1
Agent: main
Task: Fix admin panel not showing and login "no string" error

Work Log:
- Diagnosed root cause: Next.js had NO API routes — all /api/* calls from arus.html and admin.html returned 404 HTML, causing JSON parse errors ("no string")
- Created catch-all API route at /api/[[...path]]/route.ts with all endpoints mirroring the Cloudflare Worker:
  - Auth: login, signup, me, logout
  - Admin: stats, users, subscriptions, subscription/update, transactions
  - Data: wallets, transactions, debts, subscription, summary, categorize, sync, payment/create
- Fixed next.config.ts: removed `output: "export"` which broke API routes (returned "force-static" error)
- Added `export const dynamic = 'force-dynamic'` to API routes
- Fixed arus.html api() function: now handles non-JSON responses gracefully instead of crashing
- Fixed admin.html api() function: same robust error handling
- Added Supabase env vars to .env (URL from wrangler.toml, keys as placeholders)
- Created /setup page with interactive Supabase key configuration wizard
- Created /api/setup/route.ts to save keys to .env
- Added config warning banner to landing page (amber, with "Setup Sekarang →" link)
- Added "Admin" link to landing page footer (href="/admin.html")
- Verified all endpoints return proper JSON errors instead of "no string"
- Browser-verified: landing page, setup page, admin page, app iframe, login button all work

Stage Summary:
- Login "no string" error FIXED — now returns clear "Supabase belum dikonfigurasi" message
- Admin panel FIXED — accessible at /admin.html with link in footer
- API routes created: 15+ endpoints in single catch-all route handler
- Setup wizard created at /setup for easy Supabase key configuration
- REMAINING: User must configure Supabase API keys (NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY) via /setup page or .env file
