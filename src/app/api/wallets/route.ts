import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/wallets?user_id=xxx
 * POST /api/wallets — create wallet
 * DELETE /api/wallets?id=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

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

    // Check plan limit
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", body.user_id)
      .single();

    if (sub?.plan !== "pro") {
      const { count } = await admin
        .from("wallets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", body.user_id);

      if ((count || 0) >= 2) {
        return NextResponse.json(
          {
            error: "Limit dompet tercapai (2 untuk Gratis). Upgrade ke Pro untuk unlimited.",
            limit: "wallets",
          },
          { status: 403 }
        );
      }
    }

    const { data, error } = await admin
      .from("wallets")
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
    const { error } = await admin.from("wallets").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
