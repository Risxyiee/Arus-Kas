/**
 * Arus Kas — Cloudflare Worker (API Routes + Static Assets)
 * Pure CF Workers, no Vercel dependency.
 *
 * Routes:
 *   /api/*        → Supabase API handlers
 *   /*            → Static assets (landing page, arus.html, _next/static)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Env bindings ───────────────────────────────────────────────
interface Env {
  ASSETS: Fetcher;
  arus_kv: KVNamespace;            // Rate limiting, session cache, feature flags
  // R2 (ARUS_STORAGE) skipped — not bound. All /storage/* routes return 503.
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  MIDTRANS_SERVER_KEY: string;
  MIDTRANS_IS_PRODUCTION: string; // "true" or "false"
  ADMIN_EMAIL: string; // default: "riskiakbarp123@gmail.com"
}

// ─── R2 Disabled ────────────────────────────────────────────────
// R2 storage is NOT bound (cost control). All storage routes return 503.
function r2Disabled(): Response {
  return json({ error: "Cloud storage belum diaktifkan. Fitur ini memerlukan R2 yang belum dikonfigurasi.", r2_required: true }, 503);
}

// ─── KV Constants ───────────────────────────────────────────────
const SESSION_TTL = 3600;          // 1 hour session cache
const SUBSCRIPTION_CACHE_TTL = 300; // 5 min subscription cache
const FEATURE_FLAG_TTL = 0;       // No expiry for feature flags (manual control)

// ─── Default Feature Flags ─────────────────────────────────────
const DEFAULT_FEATURE_FLAGS: Record<string, string> = {
  "ff:pdf_export": "true",       // Pro: export PDF to cloud
  "ff:cloud_backup": "true",     // Pro: auto-backup to R2
  "ff:maintenance": "false",     // Global: maintenance mode
  "ff:registration": "true",     // Global: allow new signups
  "ff:max_free_transactions": "100", // Free tier limit
};

// ─── Helpers ────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getAdmin(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

async function getBody(req: Request): Promise<Record<string, unknown>> {
  return req.json() as Promise<Record<string, unknown>>;
}

function getParams(url: URL): Record<string, string> {
  const p: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (p[k] = v));
  return p;
}

// ─── Admin Auth Verification (with KV session cache) ───────────
async function verifyAdmin(req: Request, env: Env): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  // Check KV session cache first
  const cached = await getCachedSession(env, token);
  if (cached) {
    const adminEmail = env.ADMIN_EMAIL || "riskiakbarp123@gmail.com";
    if (cached.email !== adminEmail) return null;
    return cached;
  }

  // Verify token+cache session
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  const user = await res.json() as { id: string; email: string };

  const adminEmail = env.ADMIN_EMAIL || "riskiakbarp123@gmail.com";
  if (user.email !== adminEmail) return null;

  // Cache the session
  const sessionData = { userId: user.id, email: user.email };
  await cacheSession(env, token, sessionData);

  return sessionData;
}

// ─── API: /api/admin/* ────────────────────────────────────────
async function handleAdmin(req: Request, env: Env, path: string): Promise<Response> {
  // Verify admin access for all admin routes
  const admin = await verifyAdmin(req, env);
  if (!admin) return json({ error: "Akses ditolak. Halaman ini hanya untuk admin." }, 403);

  const sb = getAdmin(env);
  const url = new URL(req.url);

  // GET /api/admin/stats — Dashboard overview stats
  if (path === "/admin/stats" && req.method === "GET") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [profilesRes, subsRes, recentRes] = await Promise.all([
      sb.from("profiles").select("id, created_at", { count: "exact" }),
      sb.from("subscriptions").select("plan, expires_at"),
      sb.from("profiles").select("id").gte("created_at", sevenDaysAgo),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (subsRes.error) throw subsRes.error;
    if (recentRes.error) throw recentRes.error;

    const totalUsers = profilesRes.count ?? (profilesRes.data || []).length;
    const subs = subsRes.data || [];
    const proCount = subs.filter((s: { plan: string }) => s.plan === "pro").length;
    const freeCount = totalUsers - proCount;
    const now = new Date();
    const activePro = subs.filter((s: { plan: string; expires_at: string | null }) => s.plan === "pro" && s.expires_at && new Date(s.expires_at) >= now).length;
    const expiredPro = subs.filter((s: { plan: string; expires_at: string | null }) => s.plan === "pro" && s.expires_at && new Date(s.expires_at) < now).length;
    const recentSignups = (recentRes.data || []).length;
    const monthlyRevenue = proCount * 29000;

    return json({
      data: { totalUsers, proCount, freeCount, monthlyRevenue, recentSignups, activePro, expiredPro },
    });
  }

  // GET /api/admin/users — List all users with profile + subscription info
  if (path === "/admin/users" && req.method === "GET") {
    const [profilesRes, subsRes] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("subscriptions").select("user_id, plan, started_at, expires_at"),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (subsRes.error) throw subsRes.error;

    const profiles = profilesRes.data || [];
    const subMap = new Map<string, { plan: string; started_at: string | null; expires_at: string | null }>();
    for (const s of (subsRes.data || [])) {
      subMap.set(s.user_id, s);
    }

    // Try to get emails from auth.users via admin API (list users)
    let emailMap = new Map<string, string>();
    try {
      const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, apikey: env.SUPABASE_ANON_KEY },
      });
      if (authRes.ok) {
        const authData = await authRes.json() as { users: { id: string; email: string }[] };
        for (const u of (authData.users || [])) {
          emailMap.set(u.id, u.email);
        }
      }
    } catch {
      // If admin API not available, proceed without emails
    }

    const users = profiles.map((p: { id: string; user_id?: string; name?: string; created_at: string }) => {
      const uid = p.user_id || p.id;
      const sub = subMap.get(uid);
      return {
        user_id: uid,
        id: p.id,
        name: p.name || "—",
        email: emailMap.get(uid) || "—",
        plan: sub?.plan || "free",
        created_at: p.created_at,
      };
    });

    return json({ data: users });
  }

  // GET /api/admin/subscriptions/update — should be POST, reject GET
  // POST /api/admin/subscription/update — Manually update a user's plan
  if (path === "/admin/subscription/update" && req.method === "POST") {
    const body = await getBody(req);
    const userId = body.user_id as string;
    const plan = body.plan as string;
    const expiresAt = body.expires_at as string | undefined;

    if (!userId || !plan) return json({ error: "user_id dan plan required" }, 400);
    if (plan !== "free" && plan !== "pro") return json({ error: "Plan harus 'free' atau 'pro'" }, 400);

    // Check if subscription exists
    const { data: existing } = await sb.from("subscriptions").select("id").eq("user_id", userId).single();

    let result;
    if (existing) {
      const updateData: Record<string, unknown> = { plan, started_at: new Date().toISOString() };
      if (plan === "pro") {
        updateData.expires_at = expiresAt || new Date(Date.now() + 30 * 86400000).toISOString();
      } else {
        updateData.expires_at = expiresAt || null;
      }
      result = await sb.from("subscriptions").update(updateData).eq("user_id", userId).select().single();
    } else {
      const insertData: Record<string, unknown> = { user_id: userId, plan };
      if (plan === "pro") {
        insertData.expires_at = expiresAt || new Date(Date.now() + 30 * 86400000).toISOString();
      }
      result = await sb.from("subscriptions").insert(insertData).select().single();
    }

    if (result.error) throw result.error;
    return json({ data: result.data });
  }

  // GET /api/admin/subscriptions/update — method not allowed
  if (path === "/admin/subscription/update" && req.method === "GET") {
    return json({ error: "Method not allowed. Gunakan POST." }, 405);
  }

  // GET /api/admin/subscriptions — Alias for subscription/update GET (not needed, but for completeness)

  // GET /api/admin/subscriptions — List all subscriptions
  if (path === "/admin/subscriptions" || path === "/admin/subscriptions/") {
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const { data, error } = await sb.from("subscriptions").select("*").order("started_at", { ascending: false, nullsFirst: "last" });
    if (error) throw error;

    // Get emails
    let emailMap = new Map<string, string>();
    try {
      const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, apikey: env.SUPABASE_ANON_KEY },
      });
      if (authRes.ok) {
        const authData = await authRes.json() as { users: { id: string; email: string }[] };
        for (const u of (authData.users || [])) {
          emailMap.set(u.id, u.email);
        }
      }
    } catch {
      // proceed without emails
    }

    const subs = (data || []).map((s: { user_id: string; [key: string]: unknown }) => ({
      ...s,
      email: emailMap.get(s.user_id) || "—",
    }));

    return json({ data: subs });
  }

  // GET /api/admin/transactions — Recent transactions across all users
  if (path === "/admin/transactions" && req.method === "GET") {
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const type = url.searchParams.get("type");

    let query = sb
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("occurred_at", from);
    if (to) query = query.lte("occurred_at", to);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    // Get emails for the user_ids in the transactions
    const userIds = [...new Set((data || []).map((t: { user_id: string }) => t.user_id))];
    let emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      try {
        const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?limit=1000`, {
          headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, apikey: env.SUPABASE_ANON_KEY },
        });
        if (authRes.ok) {
          const authData = await authRes.json() as { users: { id: string; email: string }[] };
          for (const u of (authData.users || [])) {
            emailMap.set(u.id, u.email);
          }
        }
      } catch {
        // proceed without emails
      }
    }

    const txns = (data || []).map((t: { user_id: string; [key: string]: unknown }) => ({
      ...t,
      user_email: emailMap.get(t.user_id) || "—",
    }));

    return json({ data: txns });
  }

  return json({ error: "Not found" }, 404);
}

// ─── API: /api/wallets ──────────────────────────────────────────
async function handleWallets(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const admin = getAdmin(env);

  if (req.method === "GET") {
    const userId = url.searchParams.get("user_id");
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data, error } = await admin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return json({ data });
  }

  if (req.method === "POST") {
    const body = await getBody(req);
    const userId = body.user_id as string;

    // Check plan limit (with KV cache)
    const isPro = await isProUser(env, userId);
    if (!isPro) {
      const { count } = await admin
        .from("wallets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count || 0) >= 2) {
        return json(
          { error: "Limit dompet tercapai (2 untuk Gratis). Upgrade ke Pro untuk unlimited.", limit: "wallets" },
          403
        );
      }
    }

    const { data, error } = await admin.from("wallets").insert(body).select().single();
    if (error) throw error;
    return json({ data }, 201);
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await admin.from("wallets").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── API: /api/transactions ─────────────────────────────────────
async function handleTransactions(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const admin = getAdmin(env);

  if (req.method === "GET") {
    const userId = url.searchParams.get("user_id");
    if (!userId) return json({ error: "user_id required" }, 400);

    let query = admin
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const type = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const wallet = url.searchParams.get("wallet");

    if (from) query = query.gte("occurred_at", from);
    if (to) query = query.lte("occurred_at", to);
    if (type) query = query.eq("type", type);
    if (category) query = query.eq("category", category);
    if (wallet) query = query.eq("wallet_id", wallet);

    const { data, error } = await query;
    if (error) throw error;
    return json({ data });
  }

  if (req.method === "POST") {
    const body = await getBody(req);
    const { data, error } = await admin.from("transactions").insert(body).select().single();
    if (error) throw error;
    return json({ data }, 201);
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await admin.from("transactions").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── API: /api/debts ────────────────────────────────────────────
async function handleDebts(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const admin = getAdmin(env);

  if (req.method === "GET") {
    const userId = url.searchParams.get("user_id");
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data, error } = await admin
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return json({ data });
  }

  if (req.method === "POST") {
    const body = await getBody(req);
    const { data, error } = await admin.from("debts").insert(body).select().single();
    if (error) throw error;
    return json({ data }, 201);
  }

  if (req.method === "PATCH") {
    const body = await getBody(req);
    const { id, ...patch } = body;
    if (!id) return json({ error: "id required" }, 400);
    const { data, error } = await admin.from("debts").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return json({ data });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await admin.from("debts").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── API: /api/subscription ─────────────────────────────────────
async function handleSubscription(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const admin = getAdmin(env);

  if (req.method === "GET") {
    const userId = url.searchParams.get("user_id");
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data, error } = await admin.from("subscriptions").select("*").eq("user_id", userId).single();
    if (error && error.code === "PGRST116") {
      return json({ data: { plan: "free", started_at: null, expires_at: null } });
    }
    if (error) throw error;
    return json({ data });
  }

  if (req.method === "POST") {
    const body = await getBody(req);
    const userId = body.user_id as string;
    const plan = body.plan as string;
    if (!userId || !plan) return json({ error: "user_id dan plan required" }, 400);

    const { data: existing } = await admin.from("subscriptions").select("id").eq("user_id", userId).single();
    const expiresAt = plan === "pro" ? new Date(Date.now() + 30 * 86400000).toISOString() : null;

    let result;
    if (existing) {
      result = await admin
        .from("subscriptions")
        .update({ plan, started_at: new Date().toISOString(), expires_at: expiresAt })
        .eq("user_id", userId)
        .select()
        .single();
    } else {
      result = await admin.from("subscriptions").insert({ user_id: userId, plan, expires_at: expiresAt }).select().single();
    }
    if (result.error) throw result.error;
    return json({ data: result.data });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── API: /api/summary ──────────────────────────────────────────
async function handleSummary(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) return json({ error: "user_id required" }, 400);

  const admin = getAdmin(env);
  const [txnsRes, debtsRes] = await Promise.all([
    admin.from("transactions").select("*").eq("user_id", userId),
    admin.from("debts").select("*").eq("user_id", userId),
  ]);

  if (txnsRes.error) throw txnsRes.error;
  if (debtsRes.error) throw debtsRes.error;

  const transactions = txnsRes.data || [];
  const debts = debtsRes.data || [];

  const totalIncome = transactions.filter((t: { type: string }) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: { type: string }) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const activeBalance = totalIncome - totalExpenses;
  const totalDebt = debts.filter((d: { type: string; status: string }) => d.type === "debt" && d.status !== "paid").reduce((s: number, d: { amount: number; paid_amount: number }) => s + (d.amount - d.paid_amount), 0);
  const totalReceivable = debts.filter((d: { type: string; status: string }) => d.type === "receivable" && d.status !== "paid").reduce((s: number, d: { amount: number; paid_amount: number }) => s + (d.amount - d.paid_amount), 0);

  const now = new Date();
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const mTxns = transactions.filter((t: { occurred_at: string }) => { const d = new Date(t.occurred_at); return d >= mStart && d < mEnd; });
    const mIncome = mTxns.filter((t: { type: string }) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    const mExpenses = mTxns.filter((t: { type: string }) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    monthlyData.push({ month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), income: mIncome, expenses: mExpenses, net: mIncome - mExpenses });
  }

  return json({ activeBalance, totalIncome, totalExpenses, totalDebt, totalReceivable, monthlyData });
}

// ─── API: /api/categorize ───────────────────────────────────────
const CATEGORY_RULES: { keywords: string[]; category: string; type: "income" | "expense" }[] = [
  { keywords: ["food", "lunch", "dinner", "breakfast", "cafe", "coffee", "grocery", "makan", "beli", "restaurant"], category: "F&B", type: "expense" },
  { keywords: ["gas", "fuel", "uber", "taxi", "bus", "train", "parking", "transport", "ojek", "bensin"], category: "Transportation", type: "expense" },
  { keywords: ["rent", "mortgage", "electricity", "water", "utility", "internet", "listrik", "sewa"], category: "Housing", type: "expense" },
  { keywords: ["movie", "netflix", "spotify", "game", "entertainment", "hiburan"], category: "Entertainment", type: "expense" },
  { keywords: ["shop", "shopping", "clothes", "belanja", "purchase"], category: "Shopping", type: "expense" },
  { keywords: ["doctor", "hospital", "medicine", "health", "dokter", "obat"], category: "Healthcare", type: "expense" },
  { keywords: ["salary", "wage", "paycheck", "bonus", "freelance", "income", "gaji", "upah"], category: "Income", type: "income" },
  { keywords: ["transfer", "deposit", "withdrawal", "transfer"], category: "Transfer", type: "expense" },
  { keywords: ["gift", "donation", "hadiah", "sedekah"], category: "Gift", type: "expense" },
];

function autoCategorize(desc: string): { category: string; type: "income" | "expense" } {
  const lower = desc.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return { category: rule.category, type: rule.type };
    }
  }
  return { category: "Other", type: "expense" };
}

async function handleCategorize(req: Request): Promise<Response> {
  const body = await getBody(req);
  const description = body.description as string;
  if (!description) return json({ error: "Missing description" }, 400);
  return json(autoCategorize(description));
}

// ─── API: /api/auth/login ───────────────────────────────────────
async function handleLogin(req: Request, env: Env): Promise<Response> {
  const body = await getBody(req);
  const { email, password } = body as { email: string; password: string };

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error_description || data.msg || "Login gagal" }, res.status);
  return json(data);
}

// ─── API: /api/auth/signup ──────────────────────────────────────
async function handleSignup(req: Request, env: Env): Promise<Response> {
  // Check registration feature flag
  const registrationOpen = await getFeatureFlag(env, "registration");
  if (registrationOpen !== "true") {
    return json({ error: "Pendaftaran sedang ditutup sementara." }, 403);
  }

  const body = await getBody(req);
  const { email, password, name } = body as { email: string; password: string; name: string };

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password, data: { name: name || "Saya" } }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error_description || data.msg || "Signup gagal" }, res.status);
  return json(data);
}

// ─── API: /api/sync ─────────────────────────────────────────────
async function handleSync(req: Request, env: Env): Promise<Response> {
  const admin = getAdmin(env);

  if (req.method === "POST") {
    const body = await getBody(req);
    const userId = body.user_id as string;
    const syncData = body.data as Record<string, unknown>;
    if (!userId || !syncData) return json({ error: "user_id dan data required" }, 400);

    // Only Pro can sync (with KV cache)
    const isPro = await isProUser(env, userId);
    if (!isPro) return json({ error: "Sinkronisasi cloud cuma untuk paket Pro." }, 403);

    const results: Record<string, unknown> = {};

    if ((syncData.wallets as unknown[])?.length) {
      const wallets = (syncData.wallets as Record<string, unknown>[]).map((w) => ({
        id: w.id, user_id: userId, name: w.name, color: w.color || "#C9A962", initial_balance: w.initial || 0,
      }));
      const { data: r, error } = await admin.from("wallets").upsert(wallets, { onConflict: "id" });
      if (error) throw error;
      results.wallets = r;
    }

    if ((syncData.transactions as unknown[])?.length) {
      const txns = (syncData.transactions as Record<string, unknown>[]).map((t) => ({
        id: t.id, user_id: userId, wallet_id: t.wallet_id, type: t.type, category: t.category,
        description: t.description, amount: t.amount, occurred_at: t.occurred_at,
        source: t.source || "manual", ref_id: t.ref_id || null, recur: t.recur || "none", recur_parent: t.recur_parent || null,
      }));
      const { data: r, error } = await admin.from("transactions").upsert(txns, { onConflict: "id" });
      if (error) throw error;
      results.transactions = r;
    }

    if ((syncData.debts as unknown[])?.length) {
      const debts = (syncData.debts as Record<string, unknown>[]).map((d) => ({
        id: d.id, user_id: userId, name: d.name, type: d.type, amount: d.amount,
        paid_amount: d.paid_amount || 0, due_date: d.due_date || null, note: d.note || "",
        status: d.status || "unpaid", settled_at: d.settled_at || null,
      }));
      const { data: r, error } = await admin.from("debts").upsert(debts, { onConflict: "id" });
      if (error) throw error;
      results.debts = r;
    }

    return json({ ok: true, synced: Object.keys(results) });
  }

  // GET — pull all data
  if (req.method === "GET") {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    if (!userId) return json({ error: "user_id required" }, 400);

    const [wallets, transactions, debts, budgets, customCats, subscription] = await Promise.all([
      admin.from("wallets").select("*").eq("user_id", userId),
      admin.from("transactions").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }),
      admin.from("debts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      admin.from("budgets").select("*").eq("user_id", userId),
      admin.from("custom_categories").select("*").eq("user_id", userId),
      admin.from("subscriptions").select("*").eq("user_id", userId).single(),
    ]);

    return json({
      data: {
        wallets: wallets.data || [],
        transactions: transactions.data || [],
        debts: debts.data || [],
        budgets: (budgets.data || []).reduce((acc: Record<string, number>, b: { category: string; amount: number }) => { acc[b.category] = b.amount; return acc; }, {}),
        customCats: (customCats.data || []).map((c: { name: string; type: string; color: string; keywords: string[] }) => ({ name: c.name, type: c.type, color: c.color, kw: c.keywords })),
        subscription: subscription.data || { plan: "free" },
      },
    });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── API: /api/auth/me (get current user from Supabase) ──────────
async function handleAuthMe(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.msg || "Invalid token" }, res.status);
  return json({ data });
}

// ─── API: /api/auth/logout ──────────────────────────────────────
async function handleLogout(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  // Invalidate KV session cache
  await invalidateSession(env, token);

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  });
  return json({ ok: true });
}

// ─── Midtrans: Create Snap Transaction ──────────────────────────
async function handleMidtransCreate(req: Request, env: Env): Promise<Response> {
  const body = await getBody(req);
  const userId = body.user_id as string;
  const email = body.email as string;
  const name = body.name as string || "Saya";

  if (!userId) return json({ error: "user_id required" }, 400);

  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  const baseUrl = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const orderId = `ARUS-PRO-${userId.slice(0, 8)}-${Date.now()}`;

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: 29000, // Rp 29.000/bulan
    },
    item_details: [{
      id: "pro-monthly",
      price: 29000,
      quantity: 1,
      name: "Arus Pro — Bulanan",
      category: "Subscription",
    }],
    customer_details: {
      first_name: name,
      email: email || undefined,
    },
    callbacks: {
      finish: "?payment=done",
      error: "?payment=error",
      pending: "?payment=pending",
    },
    metadata: {
      user_id: userId,
      plan: "pro",
    },
  };

  const authKey = btoa(env.MIDTRANS_SERVER_KEY + ":");

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    return json({ error: data.error_messages?.[0] || "Midtrans error", details: data }, 400);
  }

  // Save pending order to Supabase
  const admin = getAdmin(env);
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan: "free",
    payment_method: "midtrans",
    transaction_id: orderId,
  }, { onConflict: "user_id" });

  return json({
    token: data.token,
    redirect_url: data.redirect_url,
    order_id: orderId,
  });
}

// ─── Midtrans: Webhook Handler ──────────────────────────────────
async function handleMidtransWebhook(req: Request, env: Env): Promise<Response> {
  const body = await getBody(req);

  const transactionStatus = body.transaction_status as string;
  const orderId = body.order_id as string;
  const paymentType = body.payment_type as string;
  const metadata = body.metadata as { user_id?: string; plan?: string } | undefined;
  const userId = metadata?.user_id || (body.custom_field1 as string);

  if (!orderId || !transactionStatus) {
    return json({ error: "Invalid webhook payload" }, 400);
  }

  // Verify signature (optional but recommended for production)
  // const signatureKey = body.signature_key;
  // ... verify with SHA512(order_id + status + gross_amount + server_key)

  const admin = getAdmin(env);

  // Determine if payment is successful
  const isSuccess =
    transactionStatus === "capture" ||
    transactionStatus === "settlement";

  const isPending = transactionStatus === "pending";
  const isFailure =
    transactionStatus === "deny" ||
    transactionStatus === "expire" ||
    transactionStatus === "cancel";

  if (isSuccess && userId) {
    // Activate Pro plan
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const { error } = await admin
      .from("subscriptions")
      .update({
        plan: "pro",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        payment_method: `midtrans_${paymentType}`,
        transaction_id: orderId,
      })
      .eq("user_id", userId);

    if (error) console.error("Failed to update subscription:", error);
  } else if (isFailure && userId) {
    // Revert to free
    await admin
      .from("subscriptions")
      .update({ plan: "free", transaction_id: orderId })
      .eq("user_id", userId);
  }

  // Always return 200 to Midtrans
  return json({ ok: true });
}

// ─── Router ─────────────────────────────────────────────────────
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api", "").replace("//", "/");

  try {
    // Route matching
    if (path === "/" || path === "") return json({ message: "Arus Kas API v3.1", status: "ok" });

    if (path === "/wallets" || path.startsWith("/wallets")) return await handleWallets(request, env);
    if (path === "/transactions" || path.startsWith("/transactions")) return await handleTransactions(request, env);
    if (path === "/debts" || path.startsWith("/debts")) return await handleDebts(request, env);
    if (path === "/subscription" || path.startsWith("/subscription")) return await handleSubscription(request, env);
    if (path === "/summary" || path.startsWith("/summary")) return await handleSummary(request, env);
    if (path === "/categorize" || path.startsWith("/categorize")) return await handleCategorize(request);
    if (path === "/auth/login") return await handleLogin(request, env);
    if (path === "/auth/signup") return await handleSignup(request, env);
    if (path === "/auth/me") return await handleAuthMe(request, env);
    if (path === "/auth/logout") return await handleLogout(request, env);
    if (path === "/sync" || path.startsWith("/sync")) return await handleSync(request, env);
    if (path === "/payment/create") return await handleMidtransCreate(request, env);
    if (path === "/payment/webhook") return await handleMidtransWebhook(request, env);
    // R2 storage routes — disabled (no R2 binding)
    if (path === "/storage/backup" || path.startsWith("/storage/backup")) return r2Disabled();
    if (path === "/storage/restore" || path.startsWith("/storage/restore")) return r2Disabled();
    if (path === "/storage" || path.startsWith("/storage")) return r2Disabled();
    if (path === "/cache" || path.startsWith("/cache")) return await handleCache(request, env);

    // Admin routes
    if (path.startsWith("/admin")) return await handleAdmin(request, env, path);

    return json({ error: "Not found" }, 404);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return json({ error: msg }, 500);
  }
}

// ─── Cron: Check expired Pro subscriptions ────────────────────
async function handleCron(env: Env): Promise<void> {
  const admin = getAdmin(env);
  const now = new Date().toISOString();

  // Find all Pro subscriptions that have expired
  const { data: expired, error } = await admin
    .from("subscriptions")
    .select("user_id, expires_at")
    .eq("plan", "pro")
    .lt("expires_at", now);

  if (error) {
    console.error("Cron: failed to query expired subscriptions:", error);
    return;
  }

  if (!expired || expired.length === 0) {
    console.log(`Cron: no expired subscriptions at ${now}`);
    return;
  }

  // Downgrade expired Pro users to Free
  const userIds = expired.map((s: { user_id: string }) => s.user_id);
  const { error: updateError } = await admin
    .from("subscriptions")
    .update({ plan: "free" })
    .in("user_id", userIds);

  if (updateError) {
    console.error("Cron: failed to downgrade:", updateError);
  } else {
    // Invalidate KV subscription caches for downgraded users
    for (const uid of userIds) {
      await invalidateSubscriptionCache(env, uid);
    }
    console.log(`Cron: downgraded ${userIds.length} expired Pro → Free`);
  }
}

// ─── Rate Limiting Helper (uses KV) ────────────────────────────
function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ||
         request.headers.get("x-forwarded-for")?.split(",")[0] ||
         "unknown";
}

async function checkRateLimit(request: Request, env: Env, limit = 60): Promise<boolean> {
  try {
    const ip = getClientIp(request);
    const key = `rl:${ip}`;
    const current = parseInt(await env.arus_kv.get(key) || "0", 10);
    if (current >= limit) return false; // Rate limited
    await env.arus_kv.put(key, String(current + 1), { expirationTtl: 60 }); // 1 min window
    return true;
  } catch {
    return true; // Graceful fallback if KV fails
  }
}

// ─── KV: Session Cache ──────────────────────────────────────────
// Caches Supabase auth verification results to reduce API calls
async function getCachedSession(env: Env, token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const cached = await env.arus_kv.get(`session:${token}`, "json");
    if (cached) return cached as { userId: string; email: string };
  } catch {}
  return null;
}

async function cacheSession(env: Env, token: string, data: { userId: string; email: string }): Promise<void> {
  try {
    await env.arus_kv.put(`session:${token}`, JSON.stringify(data), { expirationTtl: SESSION_TTL });
  } catch {}
}

async function invalidateSession(env: Env, token: string): Promise<void> {
  try { await env.arus_kv.delete(`session:${token}`); } catch {}
}

// ─── KV: Feature Flags ─────────────────────────────────────────
// Returns feature flag value, falls back to default if not set
async function getFeatureFlag(env: Env, flag: string): Promise<string> {
  try {
    const val = await env.arus_kv.get(`ff:${flag}`);
    if (val !== null) return val;
  } catch {}
  return DEFAULT_FEATURE_FLAGS[`ff:${flag}`] || "false";
}

async function setFeatureFlag(env: Env, flag: string, value: string): Promise<void> {
  await env.arus_kv.put(`ff:${flag}`, value);
}

// ─── KV: Subscription Cache ────────────────────────────────────
async function getCachedSubscription(env: Env, userId: string): Promise<string | null> {
  try {
    return await env.arus_kv.get(`sub:${userId}`);
  } catch { return null; }
}

async function cacheSubscription(env: Env, userId: string, plan: string): Promise<void> {
  try {
    await env.arus_kv.put(`sub:${userId}`, plan, { expirationTtl: SUBSCRIPTION_CACHE_TTL });
  } catch {}
}

async function invalidateSubscriptionCache(env: Env, userId: string): Promise<void> {
  try { await env.arus_kv.delete(`sub:${userId}`); } catch {}
}

// ─── Helper: Check Pro plan (with KV cache) ────────────────────
async function isProUser(env: Env, userId: string): Promise<boolean> {
  // Check KV cache first
  const cached = await getCachedSubscription(env, userId);
  if (cached !== null) return cached === "pro";

  // Fallback to Supabase
  const admin = getAdmin(env);
  const { data: sub } = await admin.from("subscriptions").select("plan").eq("user_id", userId).single();
  const plan = sub?.plan || "free";

  // Cache it
  await cacheSubscription(env, userId, plan);
  return plan === "pro";
}

// ─── R2 Handlers Removed ──────────────────────────────────────────
// handleStorage, handleBackup, handleRestore removed — R2 not bound.
// All /api/storage/* routes return 503 via r2Disabled().

// ─── API: /api/cache — KV Feature Flags, Cache & Sessions ──────
async function handleCache(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.pathname.replace("/api/cache", "").replace("//", "/");

  // ── Feature Flags ──
  if (subPath === "/flags" || subPath === "/flags/") {
    if (req.method === "GET") {
      // Get all feature flags (merged with defaults)
      const flags: Record<string, string> = { ...DEFAULT_FEATURE_FLAGS };
      try {
        const list = await env.arus_kv.list({ prefix: "ff:" });
        for (const k of list.keys) {
          const val = await env.arus_kv.get(k.name);
          if (val !== null) flags[k.name] = val;
        }
      } catch {}
      return json({ flags });
    }

    if (req.method === "PUT") {
      // Admin: set a feature flag
      const body = await getBody(req);
      const flag = body.flag as string;
      const value = body.value as string;
      if (!flag || value === undefined) return json({ error: "flag dan value required" }, 400);
      await setFeatureFlag(env, flag, value);
      return json({ ok: true, flag: `ff:${flag}`, value });
    }
  }

  // ── Generic KV Get/Put/Delete ──
  if (req.method === "GET") {
    const key = url.searchParams.get("key");
    if (key) {
      const value = await env.arus_kv.get(key);
      return json({ key, value });
    }
    // List all keys with prefix
    const prefix = url.searchParams.get("prefix") || "";
    const list = await env.arus_kv.list({ prefix });
    return json({ keys: list.keys.map((k) => ({ name: k.name, expiration: k.expiration })) });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);
    const key = body.key as string;
    const value = body.value as string;
    const ttl = body.ttl as number | undefined;
    if (!key || value === undefined) return json({ error: "key dan value required" }, 400);
    const opts = ttl ? { expirationTtl: ttl } : undefined;
    await env.arus_kv.put(key, value, opts);
    return json({ ok: true, key });
  }

  if (req.method === "DELETE") {
    const key = url.searchParams.get("key");
    if (!key) return json({ error: "key required" }, 400);
    await env.arus_kv.delete(key);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

// ─── Main Worker Export ─────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Global maintenance mode check (feature flag via KV)
    if (url.pathname.startsWith("/api")) {
      const maintenance = await getFeatureFlag(env, "maintenance");
      if (maintenance === "true" && !url.pathname.startsWith("/api/cache")) {
        return json({ error: "Sedang maintenance. Coba lagi nanti.", maintenance: true }, 503);
      }

      // Rate limiting on API routes
      const allowed = await checkRateLimit(request, env);
      if (!allowed) {
        return json({ error: "Terlalu banyak request. Coba lagi dalam 1 menit." }, 429);
      }
      return handleApi(request, env);
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  },

  // Cron trigger: runs daily at 09:00 WIB (02:00 UTC)
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleCron(env));
  },
} satisfies ExportedHandler<Env>;
