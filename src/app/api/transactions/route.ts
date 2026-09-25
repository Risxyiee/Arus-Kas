import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/transactions?user_id=xxx&from=2024-01&to=2024-06&type=expense&category=Makanan&wallet=xxx
 * POST /api/transactions — create transaction
 * DELETE /api/transactions?id=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const userId = url.searchParams.get("user_id");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const admin = supabaseAdmin();
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

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("transactions")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = supabaseAdmin();
    const { error } = await admin.from("transactions").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
