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
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  MIDTRANS_SERVER_KEY: string;
  MIDTRANS_IS_PRODUCTION: string; // "true" or "false"
}

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

    // Check plan limit
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .single();

    if (sub?.plan !== "pro") {
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

    // Only Pro can sync
    const { data: sub } = await admin.from("subscriptions").select("plan").eq("user_id", userId).single();
    if (sub?.plan !== "pro") return json({ error: "Sinkronisasi cloud cuma untuk paket Pro." }, 403);

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

    return json({ error: "Not found" }, 404);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return json({ error: msg }, 500);
  }
}

// ─── Main Worker Export ─────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // API routes → Worker handlers
    if (url.pathname.startsWith("/api")) {
      return handleApi(request, env);
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
