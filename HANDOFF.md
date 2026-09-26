# ═══════════════════════════════════════════════════════════════
#  ARUS KAS — Project Handoff Document
#  Versi: 3.1.0 | Tanggal: 2025-07-09
# ═══════════════════════════════════════════════════════════════

## 1. IDENTITAS PROYEK

| Item | Detail |
|---|---|
| **Nama** | Arus Kas |
| **Tagline** | Buku Kas Pribadi & UMKM |
| **Versi** | 3.1.0 |
| **Repo** | https://github.com/Risxyiee/Arus-Kas.git |
| **Target** | UMKM Indonesia (kelas menengah-bawah) |
| **Admin** | riskiakbarp123@gmail.com |
| **Bahasa** | Indonesia (id-ID) |

---

## 2. ARSITEKTUR

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Worker (arus-kas)                    │
│  ├─ /api/*        → API handlers (Supabase)      │
│  ├─ /api/admin/*  → Admin-only endpoints         │
│  ├─ Cron 09:00    → Cek subscription expired     │
│  └─ /*            → Static assets (ASSETS)        │
│                                                    │
│  Static Assets (dari /out):                       │
│  ├─ index.html    → Landing page (Next.js export) │
│  ├─ arus.html     → Dashboard app (vanilla JS)    │
│  ├─ admin.html    → Admin dashboard               │
│  └─ _next/static  → CSS, JS, fonts               │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Supabase (evntvbqrprizgqogjyva)                 │
│  ├─ Auth          → Login, signup, email confirm  │
│  ├─ PostgreSQL    → 7 tables + RLS + indexes      │
│  └─ Storage       → (belum di-setup)              │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Midtrans (Sandbox — belum produksi)              │
│  └─ Snap Payment  → Pro plan Rp 29.000/bulan     │
└─────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Teknologi |
|---|---|
| **Landing Page** | Next.js 16 (static export) + React + Tailwind CSS |
| **Dashboard** | Vanilla HTML/CSS/JS (arus.html) — localStorage + Supabase |
| **Admin** | Vanilla HTML/CSS/JS (admin.html) |
| **API** | Cloudflare Worker (worker/index.ts) — 924 baris |
| **Database** | Supabase PostgreSQL — 7 tables, RLS, indexes |
| **Auth** | Supabase Auth (email + password) |
| **Payment** | Midtrans Snap (sandbox mode) |
| **Hosting** | Cloudflare Workers + Assets |

---

## 3. MONETISASI — 2 Tier

### Paket Gratis
- 2 dompet
- 5 utang/piutang aktif
- 3 budget
- 3 kategori kustom
- Kategori otomatis
- Backup JSON
- PIN kunci
- Laporan dasar

### Paket Pro — Rp 29.000/bulan
- **Unlimited** dompet, utang, budget, kategori
- ☁️ Cloud sync (Supabase)
- 📄 Laporan branded PDF
- 🔔 Notifikasi push
- 🔄 Transaksi berulang (recurring)
- 🧾 Faktur/invoice
- Tahunan: Rp 278.400/thn (hemat 20%)

### Feature Gating (di arus.html)
```
PLANS.free = { wallets:2, debts:5, budgets:3, customCats:3, recurring:false, cloudSync:false, ... }
PLANS.pro  = { wallets:∞, debts:∞, budgets:∞, customCats:∞, recurring:true, cloudSync:true, ... }
```

---

## 4. STRUKTUR FILE PENTING

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx          → Landing page (iframe ke arus.html)
│   │   └── layout.tsx        → SEO metadata + OG tags + fonts
│   ├── components/
│   │   └── landing-page.tsx  → Landing page component (774 baris)
│   └── styles/
│       └── landing.css       → Landing page CSS (1620 baris)
│
├── public/
│   ├── arus.html             → Dashboard utama (2176 baris)
│   └── admin.html            → Admin dashboard (841 baris)
│
├── worker/
│   └── index.ts              → Cloudflare Worker API (924 baris)
│
├── supabase/migrations/
│   └── 001_initial_schema.sql → Full DB schema (7 tables + RLS)
│
├── wrangler.toml              → CF Worker config (bindings, cron)
├── next.config.ts             → output: "export" (static only)
└── package.json               → v3.1.0
```

---

## 5. API ENDPOINTS

### User API
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/wallets?user_id=` | List dompet |
| POST | `/api/wallets` | Tambah dompet (cek limit) |
| DELETE | `/api/wallets?id=` | Hapus dompet |
| GET | `/api/transactions?user_id=` | List transaksi (filter: from, to, type, category, wallet) |
| POST | `/api/transactions` | Tambah transaksi |
| DELETE | `/api/transactions?id=` | Hapus transaksi |
| GET | `/api/debts?user_id=` | List utang/piutang |
| POST | `/api/debts` | Tambah utang/piutang |
| PATCH | `/api/debts` | Update utang (bayar cicilan) |
| DELETE | `/api/debts?id=` | Hapus utang |
| GET | `/api/subscription?user_id=` | Cek paket user |
| POST | `/api/subscription` | Update paket |
| GET | `/api/summary?user_id=` | Ringkasan keuangan |
| POST | `/api/categorize` | Auto-kategorisasi deskripsi |

### Auth API
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | Login (email + password) |
| POST | `/api/auth/signup` | Daftar akun baru |
| GET | `/api/auth/me` | Cek user saat ini (Bearer token) |
| POST | `/api/auth/logout` | Logout |

### Cloud Sync (Pro only)
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/sync` | Push data ke cloud |
| GET | `/api/sync?user_id=` | Pull data dari cloud |

### Payment (Midtrans)
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/payment/create` | Buat Snap transaction |
| POST | `/api/payment/webhook` | Midtrans webhook (aktifkan Pro) |

### Storage (R2, Pro only)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/storage?user_id=` | List file user di R2 |
| GET | `/api/storage?user_id=&id=` | Download file |
| PUT | `/api/storage?user_id=&id=` | Upload file (max 10MB, validated types) |
| DELETE | `/api/storage?user_id=&id=` | Hapus file |
| POST | `/api/storage/backup?user_id=` | Full data backup ke R2 |
| GET | `/api/storage/backup?user_id=` | List backup history |
| POST | `/api/storage/restore` | Restore dari R2 backup |

### Cache & Feature Flags (KV)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/cache/flags` | Semua feature flags (merged defaults) |
| PUT | `/api/cache/flags` | Set feature flag |
| GET | `/api/cache?key=` | Get single KV value |
| GET | `/api/cache?prefix=` | List keys by prefix |
| PUT | `/api/cache` | Set KV key+value (+ optional TTL) |
| DELETE | `/api/cache?key=` | Delete KV key |

### Admin API (hanya riskiakbarp123@gmail.com)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List semua user |
| GET | `/api/admin/subscriptions` | List semua langganan |
| POST | `/api/admin/subscription/update` | Manual update plan |
| GET | `/api/admin/transactions` | Transaksi semua user |

---

## 6. DATABASE SCHEMA (Supabase)

### Tables
| Table | Fungsi |
|---|---|
| `profiles` | 1:1 dengan auth.users (name, pin) |
| `wallets` | Multi-dompet per user |
| `transactions` | Pemasukan & pengeluaran |
| `debts` | Utang & piutang (status: unpaid/partially_paid/paid) |
| `budgets` | Budget per kategori |
| `custom_categories` | Kategori kustom user |
| `subscriptions` | Plan (free/pro), expires_at, payment_method |

### RLS Policies
- Users cuma bisa CRUD data sendiri (`auth.uid() = user_id`)
- Service role bisa insert subscription (untuk webhook Midtrans)

### Helper Functions
- `get_user_plan(uuid)` → 'free' atau 'pro'
- `can_add_wallet(uuid)` → boolean (free: max 2)
- `can_add_debt(uuid)` → boolean (free: max 5 active)
- `can_add_budget(uuid)` → boolean (free: max 3)
- `can_add_custom_cat(uuid)` → boolean (free: max 3)

---

## 7. CLOUDFLARE BINDINGS

### Aktif
| Binding | Status | Fungsi |
|---|---|---|
| `[assets]` | ✅ Aktif | Serve static files dari /out |
| `[triggers]` Cron | ✅ Aktif | Daily 09:00 WIB — cek Pro expired → downgrade + invalidate KV cache |
| **KV** (`ARUS_KV`) | ✅ Aktif | Rate limiting, session cache, feature flags, subscription cache |
| **R2** (`ARUS_STORAGE`) | ⏳ Optional | Pro: backup JSON, PDF reports, invoices — bind when ready |

### KV Usage Details
| Key Pattern | TTL | Fungsi |
|---|---|---|
| `rl:{ip}` | 60s | Rate limiting per IP (60 req/min) |
| `session:{token}` | 3600s | Auth session cache (reduce Supabase calls) |
| `sub:{userId}` | 300s | Subscription plan cache (5 min) |
| `ff:{name}` | ∞ (manual) | Feature flags (no auto-expiry) |
| `last-backup:{userId}` | ∞ | Timestamp of last R2 backup |

### Default Feature Flags
| Flag | Default | Fungsi |
|---|---|---|
| `ff:pdf_export` | true | Pro: export PDF ke cloud |
| `ff:cloud_backup` | true | Pro: auto-backup ke R2 |
| `ff:maintenance` | false | Global: maintenance mode (503) |
| `ff:registration` | true | Global: allow new signups |
| `ff:max_free_transactions` | 100 | Free tier transaction limit |

### R2 Storage Details
| Parameter | Value |
|---|---|
| Bucket | `arus-storage` |
| Max file size | 10 MB/file |
| Max files per user | 100 |
| Allowed types | JSON, PDF, CSV, TXT, PNG, JPEG, WEBP |
| Key structure | `users/{userId}/{filename}` |
| Backup key | `users/{userId}/backup_YYYY-MM-DD.json` |

### Cloudflare Free Tier Limits
| Resource | Free | Arus Kas Kebutuhan |
|---|---|---|
| Workers requests | 100K/hari | ✅ Cukup untuk awal |
| KV reads | 100K/hari | ✅ Cukup |
| KV writes | 1K/hari | ✅ Cukup untuk rate limit + cache |
| R2 storage | 10 GB | ✅ Cukup |
| R2 Class A ops | 1M/bulan | ✅ Cukup |
| R2 Class B ops | 10M/bulan | ✅ Cukup |
| Cron triggers | 5 | ✅ Hanya pakai 1 |
| **R2 BISA di free tier** | ✅ | Tidak perlu bayar |

---

## 8. SECRETS (WAJIB SET)

Jalankan per secret:

```bash
# Supabase (WAJIB — tanpa ini Worker crash)
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_KEY

# Midtrans (WAJIB untuk payment Pro)
npx wrangler secret put MIDTRANS_SERVER_KEY

# Verifikasi
npx wrangler secret list
```

**Jangan taruh secret di wrangler.toml atau GitHub!**

---

## 9. DEPLOY WORKFLOW

```bash
# Build static + deploy ke Cloudflare Workers
bun run deploy

# Atau step-by-step:
bun run build          # next build → output ke /out
npx wrangler deploy   # deploy Worker + assets

# Test lokal dengan Worker:
bun run build && npx wrangler dev
```

### Git Push (perlu credential)
```bash
# Set token (sekali saja):
git remote set-url origin https://<GITHUB_TOKEN>@github.com/Risxyiee/Arus-Kas.git

# Push:
git push origin main
```

---

## 10. AUTH FLOW — Cara Kerja

### User Baru
1. Buka arus.html → Onboard modal muncul
2. Pilih **"Masuk dengan akun"** (tombol primary)
3. Form login/signup muncul
4. Signup → Supabase kirim email konfirmasi
5. Toast: "Cek email untuk konfirmasi, lalu masuk lagi"
6. User klik link di email → kembali ke app
7. Login → dapat `access_token` + `user` object
8. Token disimpan di localStorage (`arus-auth-token`, `arus-current-user`)
9. Subscription di-sync dari server
10. Kalau Pro → auto pull cloud data

### User Lama (sudah login)
1. App load → cek token di localStorage
2. Verifikasi ke `/api/auth/me`
3. Kalau valid → auto-restore session + sync
4. Kalau expired → clear token, tampilkan "Masuk"

### Upgrade ke Pro
1. User klik "Upgrade ke Pro"
2. Kalau belum login → suruh login dulu
3. Call `/api/payment/create` → Midtrans Snap
4. `window.snap.pay(token)` → popup pembayaran
5. Midtrans webhook → `/api/payment/webhook`
6. Kalau success → update subscription ke 'pro' + expires_at +30 hari

---

## 11. ADMIN DASHBOARD

### Akses
- URL: `/admin.html`
- Login dengan `riskiakbarp123@gmail.com` + password
- Email lain → "Akses ditolak"

### Fitur
| Section | Fungsi |
|---|---|
| 📊 Dashboard | Total users, Pro count, revenue, recent signups |
| 👥 Pengguna | List user, search, detail modal (wallets/txns/debts count) |
| 💳 Langganan | List subscription, filter, edit plan + expiry |
| 💰 Transaksi | Transaksi semua user, filter date + type, pagination |
| ⚙️ Pengaturan | App status, manual plan management |
| ☁️ Infra (KV/R2) | Feature flags toggle, KV key browser, R2 file manager |

---

## 12. STATUS — SUDAH VS BELUM

### ✅ Sudah Selesai
- [x] Landing page (2-tier pricing, FAQ, trust badges, SEO, OG tags)
- [x] Dashboard app (arus.html) — 6 halaman, dark/light, PIN lock
- [x] 2-tier plan system (Gratis + Pro) dengan feature gating
- [x] Cloudflare Worker API (25+ endpoints)
- [x] Supabase schema (7 tables, RLS, indexes, helpers)
- [x] Auth flow (login, signup, email confirm, auto-restore session)
- [x] Cloud sync (push + pull, Pro only)
- [x] Midtrans Snap integration (sandbox)
- [x] Admin dashboard (admin.html + 5 admin API endpoints + Infra KV/R2 section)
- [x] Cron trigger (daily subscription expiry check + KV cache invalidation)
- [x] Rate limiting (KV-based, 60 req/min per IP)
- [x] **KV integration** — Rate limiting, session cache, subscription cache, feature flags with defaults
- [x] **R2 integration** — Pro file storage (10MB/file, 100 files/user), backup/restore, type validation
- [x] **Feature flags** — maintenance mode, registration toggle, PDF export, cloud backup, transaction limits
- [x] Onboard modal with "Masuk dengan akun" option
- [x] Cloud backup/restore UI for Pro users in Pengaturan

### ⏳ Belum / Perlu Dilakukan
- [ ] **Midtrans production** — Ganti `MIDTRANS_IS_PRODUCTION` ke `"true"` + set production server key
- [ ] **Supabase email templates** — Customize email konfirmasi/reset pakai branding Arus
- [ ] **R2 bucket setup** — Kalau butuh cloud storage: buat R2 bucket di dashboard, bind `ARUS_STORAGE` ke worker
- [ ] **Email transaksional** — Daftar Resend/SendGrid → set `RESEND_API_KEY` secret → implement welcome email, payment receipt
- [ ] **Landing page OG image** — Buat gambar 1200×630 untuk share di social media
- [ ] **Favicon proper** — Sekarang pakai inline SVG data-URI, ganti dengan .ico file
- [ ] **Analytics** — Tambah Cloudflare Analytics atau Plausible
- [ ] **Terms of Service + Privacy Policy** — Halaman legal untuk UMKM
- [ ] **Error monitoring** — Sentry atau Cloudflare Logpush untuk track error produksi
- [ ] **Load testing** — Test Worker dengan `wrangler dev` + artillery/k6 sebelum launch
- [ ] **Supabase Storage** — Setup bucket untuk profile avatar, PDF attachment (Pro)

---

## 13. COMMAND CHEAT SHEET

```bash
# Development
bun run dev                          # Next.js dev server (landing page only)
bun run build && npx wrangler dev    # Full stack local test

# Deploy
bun run deploy                       # Build + deploy ke Cloudflare

# Secrets
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put MIDTRANS_SERVER_KEY
npx wrangler secret list

# KV Setup
npx wrangler kv namespace create "ARUS_KV"
npx wrangler kv key list --namespace-id=<ID>

# R2 Setup
npx wrangler r2 bucket create "arus-storage"

# Database
bun run db:push                      # Push Prisma schema (jika dipakai)

# Lint
bun run lint                         # ESLint check

# Git
git add -A && git commit -m "msg" && git push origin main
```

---

## 14. KONTAK & REFERENSI

| Resource | URL |
|---|---|
| **GitHub** | https://github.com/Risxyiee/Arus-Kas.git |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/evntvbqrprizgqogjyva |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **Midtrans Dashboard** | https://dashboard.midtrans.com |
| **Midtrans Docs** | https://docs.midtrans.com |
| **Wrangler Docs** | https://developers.cloudflare.com/workers/wrangler |

---

*Dokumen ini dibuat pada 2025-07-09. Update sesuai perkembangan proyek.*
