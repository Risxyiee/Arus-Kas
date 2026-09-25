import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

/**
 * GET /api/subscription?user_id=xxx
 * POST /api/subscription — activate/upgrade plan
 * DELETE — cancel (revert to free)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // No subscription yet — return default free
      return NextResponse.json({
        data: { plan: "free", started_at: null, expires_at: null },
      });
    }
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, plan } = await req.json();
    if (!user_id || !plan)
      return NextResponse.json(
        { error: "user_id dan plan required" },
        { status: 400 }
      );

    const admin = supabaseAdmin();

    // Check if subscription exists
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .single();

    const expiresAt =
      plan === "pro"
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : null;

    let result;
    if (existing) {
      result = await admin
        .from("subscriptions")
        .update({ plan, started_at: new Date().toISOString(), expires_at: expiresAt })
        .eq("user_id", user_id)
        .select()
        .single();
    } else {
      result = await admin
        .from("subscriptions")
        .insert({ user_id, plan, expires_at: expiresAt })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
