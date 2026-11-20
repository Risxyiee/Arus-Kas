import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

/** Admin akun: Pro selamanya (tidak bisa diturunkan via endpoint ini) */
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "riskiakbarp123@gmail.com";
const PRO_FOREVER = "2099-12-31T23:59:59.999Z";
const isAdminEmail = (e: string | null | undefined) =>
  !!e && e.toLowerCase() === ADMIN_EMAIL.toLowerCase();

/**
 * GET /api/subscription?user_id=xxx&email=xxx
 * POST /api/subscription — activate/upgrade plan
 * DELETE — cancel (revert to free)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    const email = req.nextUrl.searchParams.get("email");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    // Admin: Pro selamanya, tanpa cek DB
    if (isAdminEmail(email)) {
      return NextResponse.json({
        data: { plan: "pro", started_at: null, expires_at: PRO_FOREVER },
      });
    }

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
    const body = await req.json();
    const user_id = body.user_id as string;
    const email = (body.email as string) || "";
    const plan = (body.plan as string) || "free";
    if (!user_id || !plan)
      return NextResponse.json(
        { error: "user_id dan plan required" },
        { status: 400 }
      );

    const isAdmin = isAdminEmail(email);
    const effectivePlan = isAdmin ? "pro" : plan;
    const expiresAt = isAdmin
      ? PRO_FOREVER
      : effectivePlan === "pro"
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : null;

    const admin = supabaseAdmin();

    // Check if subscription exists
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .single();

    let result;
    if (existing) {
      result = await admin
        .from("subscriptions")
        .update({
          plan: effectivePlan,
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .eq("user_id", user_id)
        .select()
        .single();
    } else {
      result = await admin
        .from("subscriptions")
        .insert({ user_id, plan: effectivePlan, expires_at: expiresAt })
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
