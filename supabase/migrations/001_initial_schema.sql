-- Arus Kas — Supabase Database Schema
-- Target: UMKM Indonesia, 2-tier (Gratis + Pro) monetization
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════
-- ENABLE EXTENSIONS
-- ══════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════
-- PROFILES (1:1 dengan auth.users)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Saya',
  pin_enabled BOOLEAN NOT NULL DEFAULT false,
  pin_hash    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Saya'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════════════
-- WALLETS
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#C9A962',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TRANSACTIONS
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id     UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category      TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  occurred_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  source        TEXT NOT NULL DEFAULT 'manual',
  ref_id        UUID,
  recur         TEXT NOT NULL DEFAULT 'none' CHECK (recur IN ('none', 'monthly')),
  recur_parent  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- DEBTS (Utang & Piutang)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.debts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('debt', 'receivable')),
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  paid_amount   NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_date      DATE,
  note          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  settled_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- BUDGETS (per kategori per user)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- ══════════════════════════════════════════════════════════
-- CUSTOM CATEGORIES
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.custom_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color       TEXT NOT NULL DEFAULT '#8B8474',
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- ══════════════════════════════════════════════════════════
-- SUBSCRIPTIONS (2-tier: free / pro)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  payment_method   TEXT,
  transaction_id   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users CRUD own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own custom_categories" ON public.custom_categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert subscription (for webhook/payment)
CREATE POLICY "Service insert subscription" ON public.subscriptions FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════════
-- INDEXES untuk performa
-- ══════════════════════════════════════════════════════════
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_ref ON public.transactions(ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX idx_debts_user_status ON public.debts(user_id, status);
CREATE INDEX idx_debts_due ON public.debts(due_date) WHERE due_date IS NOT NULL AND status != 'paid';
CREATE INDEX idx_wallets_user ON public.wallets(user_id);
CREATE INDEX idx_budgets_user ON public.budgets(user_id);
CREATE INDEX idx_custom_cats_user ON public.custom_categories(user_id);

-- ══════════════════════════════════════════════════════════
-- HELPER: Plan limit checker
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions WHERE user_id = p_user_id),
    'free'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user can add wallet (free=2, pro=unlimited)
CREATE OR REPLACE FUNCTION public.can_add_wallet(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.get_user_plan(p_user_id) = 'pro'
    OR (SELECT COUNT(*) FROM public.wallets WHERE user_id = p_user_id) < 2;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can add debt (free=5 active, pro=unlimited)
CREATE OR REPLACE FUNCTION public.can_add_debt(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.get_user_plan(p_user_id) = 'pro'
    OR (SELECT COUNT(*) FROM public.debts WHERE user_id = p_user_id AND status != 'paid') < 5;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can add budget (free=3, pro=unlimited)
CREATE OR REPLACE FUNCTION public.can_add_budget(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.get_user_plan(p_user_id) = 'pro'
    OR (SELECT COUNT(*) FROM public.budgets WHERE user_id = p_user_id) < 3;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can add custom category (free=3, pro=unlimited)
CREATE OR REPLACE FUNCTION public.can_add_custom_cat(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.get_user_plan(p_user_id) = 'pro'
    OR (SELECT COUNT(*) FROM public.custom_categories WHERE user_id = p_user_id) < 3;
$$ LANGUAGE sql SECURITY DEFINER;
