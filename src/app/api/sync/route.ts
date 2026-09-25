import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/sync — Full data sync from localStorage → Supabase
 * Used when user first connects to cloud (Pro feature)
 *
 * Body: { user_id, data: { wallets, transactions, debts, budgets, customCats, profile } }
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, data } = await req.json();
    if (!user_id || !data)
      return NextResponse.json(
        { error: "user_id dan data required" },
        { status: 400 }
      );

    const admin = supabaseAdmin();

    // Check plan — only Pro can sync
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user_id)
      .single();

    if (sub?.plan !== "pro") {
      return NextResponse.json(
        { error: "Sinkronisasi cloud cuma untuk paket Pro." },
        { status: 403 }
      );
    }

    const results: Record<string, unknown> = {};

    // 1. Upsert wallets
    if (data.wallets?.length) {
      const wallets = data.wallets.map((w: Record<string, unknown>) => ({
        id: w.id,
        user_id,
        name: w.name,
        color: w.color || "#C9A962",
        initial_balance: w.initial || 0,
      }));
      const { data: r, error } = await admin
        .from("wallets")
        .upsert(wallets, { onConflict: "id" });
      if (error) throw error;
      results.wallets = r;
    }

    // 2. Upsert transactions
    if (data.transactions?.length) {
      const txns = data.transactions.map((t: Record<string, unknown>) => ({
        id: t.id,
        user_id,
        wallet_id: t.wallet_id,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
        occurred_at: t.occurred_at,
        source: t.source || "manual",
        ref_id: t.ref_id || null,
        recur: t.recur || "none",
        recur_parent: t.recur_parent || null,
      }));
      const { data: r, error } = await admin
        .from("transactions")
        .upsert(txns, { onConflict: "id" });
      if (error) throw error;
      results.transactions = r;
    }

    // 3. Upsert debts
    if (data.debts?.length) {
      const debts = data.debts.map((d: Record<string, unknown>) => ({
        id: d.id,
        user_id,
        name: d.name,
        type: d.type,
        amount: d.amount,
        paid_amount: d.paid_amount || 0,
        due_date: d.due_date || null,
        note: d.note || "",
        status: d.status || "unpaid",
        settled_at: d.settled_at || null,
      }));
      const { data: r, error } = await admin
        .from("debts")
        .upsert(debts, { onConflict: "id" });
      if (error) throw error;
      results.debts = r;
    }

    // 4. Upsert budgets
    if (data.budgets) {
      const budgetRows = Object.entries(data.budgets)
        .filter(([, v]) => (v as number) > 0)
        .map(([cat, amt]) => ({
          user_id,
          category: cat,
          amount: amt as number,
        }));
      if (budgetRows.length) {
        // Delete existing then insert
        await admin.from("budgets").delete().eq("user_id", user_id);
        const { data: r, error } = await admin
          .from("budgets")
          .insert(budgetRows);
        if (error) throw error;
        results.budgets = r;
      }
    }

    // 5. Upsert custom categories
    if (data.customCats?.length) {
      const cats = data.customCats.map((c: Record<string, unknown>) => ({
        user_id,
        name: c.name,
        type: c.type,
        color: c.color || "#8B8474",
        keywords: c.kw || [],
      }));
      await admin.from("custom_categories").delete().eq("user_id", user_id);
      const { data: r, error } = await admin
        .from("custom_categories")
        .insert(cats);
      if (error) throw error;
      results.customCats = r;
    }

    return NextResponse.json({
      ok: true,
      synced: Object.keys(results),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/sync?user_id=xxx — Pull all data from Supabase to client
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const admin = supabaseAdmin();

    const [wallets, transactions, debts, budgets, customCats, subscription] =
      await Promise.all([
        admin.from("wallets").select("*").eq("user_id", userId),
        admin
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false }),
        admin
          .from("debts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        admin.from("budgets").select("*").eq("user_id", userId),
        admin
          .from("custom_categories")
          .select("*")
          .eq("user_id", userId),
        admin
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

    return NextResponse.json({
      data: {
        wallets: wallets.data || [],
        transactions: transactions.data || [],
        debts: debts.data || [],
        budgets: (budgets.data || []).reduce(
          (acc: Record<string, number>, b: { category: string; amount: number }) => {
            acc[b.category] = b.amount;
            return acc;
          },
          {}
        ),
        customCats: (customCats.data || []).map(
          (c: { name: string; type: string; color: string; keywords: string[] }) => ({
            name: c.name,
            type: c.type,
            color: c.color,
            kw: c.keywords,
          })
        ),
        subscription: subscription.data || { plan: "free" },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
