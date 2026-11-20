import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Proxy forgot-password to Supabase Auth (/auth/v1/recover) */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      undefined;

    const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email, ...(redirectTo ? { redirect_to: redirectTo } : {}) }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const raw = String(data.error_description || data.msg || data.message || data.error || "Gagal mengirim link reset");
      const isKeyIssue = /invalid api key/i.test(raw);
      const error = isKeyIssue
        ? "Server sedang bermasalah (API key Supabase tidak valid). Coba lagi nanti."
        : raw;
      return NextResponse.json({ error, serverIssue: isKeyIssue }, { status: res.status });
    }

    // Supabase selalu 200 agar tidak membocorkan keberadaan email
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
