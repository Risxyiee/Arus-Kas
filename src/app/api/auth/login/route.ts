import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Proxy login to Supabase Auth */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
    }

    const { email, password } = await req.json();

    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const raw = String(data.error_description || data.msg || data.message || data.error || "Login gagal");
      const isKeyIssue = /invalid api key/i.test(raw) || (res.status === 401 && !data.error_description && !data.msg && !data.error);
      let error: string;
      if (isKeyIssue) {
        error = "Server login sedang bermasalah (API key Supabase tidak valid). Gunakan 'Masuk mode lokal' di bawah — data tetap aman di perangkat.";
      } else if (/invalid login credentials/i.test(raw)) {
        error = "Email atau password salah.";
      } else if (/email not confirmed/i.test(raw)) {
        error = "Email belum dikonfirmasi — cek inbox kamu, lalu coba masuk lagi.";
      } else {
        error = raw;
      }
      return NextResponse.json({ error, serverIssue: isKeyIssue }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
