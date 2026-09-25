# Arus Kas — Deployment Guide

## Arsitektur
- **Frontend**: Next.js 16 (App Router) + landing page + `public/arus.html` (SPA)
- **Backend API**: Next.js API Routes → Supabase (PostgreSQL)
- **Hosting**: Cloudflare Pages (via `@cloudflare/next-on-pages`)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Monetisasi**: 2 tier (Gratis + Pro Rp 29.000/bln)

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → paste isi `supabase/migrations/001_initial_schema.sql` → Run
3. Buka **Project Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Isi nilai-nilai itu di `.env` dan di Cloudflare Pages env vars

## 2. Deploy ke Cloudflare Pages

### Opsi A: CLI (recommended)

```bash
# Login ke Cloudflare
npx wrangler login

# Build & deploy sekali jalan
bun run deploy:cf
```

### Opsi B: GitHub Integration (auto-deploy)

1. Buka [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. **Create a project** → **Connect to Git**
3. Pilih repo `Risxyiee/Arus-Kas`
4. Set build config:
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Node.js version**: `20`
5. Tambahkan **Environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

Setiap push ke `main`, Cloudflare otomatis rebuild & deploy.

## 3. Custom Domain (opsional)

Di Cloudflare Pages → project → **Custom domains** → tambahkan domain kamu.

---

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/auth/signup` | Daftar akun (email+password) |
| POST | `/api/auth/login` | Login akun |
| GET/POST | `/api/transactions` | CRUD transaksi |
| GET/POST/PATCH/DELETE | `/api/debts` | CRUD utang/piutang |
| GET/POST/DELETE | `/api/wallets` | CRUD dompet (dengan limit check) |
| GET/POST | `/api/subscription` | Cek/upgrade plan |
| GET/POST | `/api/sync` | Sync localStorage ↔ Supabase (Pro only) |

---

## Plan Limits (di-enforce di API + DB)

| Fitur | Gratis | Pro |
|-------|--------|-----|
| Dompet | 2 | ∞ |
| Utang/piutang aktif | 5 | ∞ |
| Budget | 3 | ∞ |
| Kategori kustom | 3 | ∞ |
| Cloud sync | — | ✅ |
| Recurring | — | ✅ |
| Invoice | — | ✅ |
| P&L Report | — | ✅ |
| Branded PDF | — | ✅ |
| Push notif | — | ✅ |
