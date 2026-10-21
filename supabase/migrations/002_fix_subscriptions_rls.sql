-- ══════════════════════════════════════════════════════════
-- 002 — S6: Tutup celah self-upgrade Pro di tabel subscriptions
-- ══════════════════════════════════════════════════════════
-- Celah (ditemukan audit TAHAP A):
--   1. Policy "Users update own subscription" FOR UPDATE USING
--      (auth.uid() = user_id) → user login cukup mengirim PATCH ke
--      Supabase REST (anon key + JWT sendiri) untuk mengubah
--      plan='pro' pada barisnya sendiri — Pro tanpa bayar.
--   2. Policy "Service insert subscription" FOR INSERT WITH CHECK
--      (true) berlaku untuk SEMUA peran (bukan cuma service role)
--      → siapa pun bisa menyisipkan baris subscription untuk
--      user_id mana pun.
--
-- Setelah keputusan #1 (aktivasi Pro HANYA via webhook Midtrans
-- terverifikasi), seluruh tulis ke tabel ini dilakukan worker dengan
-- SERVICE ROLE yang mem-bypass RLS. Klien hanya butuh MEMBACA.
--
-- Hasil akhir setelah migrasi ini:
--   - anon / authenticated : SELECT baris miliknya saja.
--   - INSERT / UPDATE / DELETE : ditolak (tidak ada policy).
--   - service role (worker/webhook) : lewat semua (bypass RLS).
--
-- Aman dijalankan berulang (idempotent).

-- 1) Hapus policy UPDATE milik user (sumber celah utama)
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;

-- 2) Hapus policy INSERT publik
DROP POLICY IF EXISTS "Service insert subscription" ON public.subscriptions;

-- 3) Pastikan RLS tetap aktif (no-op bila sudah)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4) Kembalikan policy baca milik user bila belum ada (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'subscriptions'
      AND policyname = 'Users read own subscription'
  ) THEN
    EXECUTE 'CREATE POLICY "Users read own subscription"
             ON public.subscriptions
             FOR SELECT
             USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 5) Verifikasi (jalankan manual setelah migrate):
--    SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename='subscriptions';
--    Harus menyisakan TEPAT 1 baris:
--      "Users read own subscription" | SELECT
